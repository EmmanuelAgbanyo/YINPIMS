import React, { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import type { Registration, Participant, Event, ParticipantBadgeType } from '../../types';
import { X, Download, Printer, Copy, Check, ShieldCheck, Bed, Tag, ExternalLink, Building, RectangleHorizontal, RectangleVertical } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { getPassUrl } from '../../utils/qrUtils';

interface ParticipantBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: Registration;
  participant: Participant;
  event: Event;
}

export const getBadgeTitleTheme = (type?: ParticipantBadgeType) => {
  switch (type) {
    case 'Speaker':
      return { bg: 'bg-gradient-to-r from-amber-600 to-amber-700', text: 'text-white', label: 'SPEAKER', border: 'border-amber-500' };
    case 'Contestant':
      return { bg: 'bg-gradient-to-r from-purple-600 to-indigo-700', text: 'text-white', label: 'CONTESTANT', border: 'border-purple-500' };
    case 'Volunteer':
      return { bg: 'bg-gradient-to-r from-emerald-600 to-teal-700', text: 'text-white', label: 'VOLUNTEER', border: 'border-emerald-500' };
    case 'Staff':
      return { bg: 'bg-gradient-to-r from-[#14595A] to-[#0E4243]', text: 'text-white', label: 'STAFF', border: 'border-teal-500' };
    case 'Delegate':
    default:
      return { bg: 'bg-gradient-to-r from-slate-800 to-slate-900', text: 'text-white', label: 'DELEGATE', border: 'border-slate-700' };
  }
};

export const ParticipantBadgeModal: React.FC<ParticipantBadgeModalProps> = ({
  isOpen,
  onClose,
  registration,
  participant,
  event,
}) => {
  const { data, refreshData } = useApp();
  const badgeRef = useRef<HTMLDivElement>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [badgeOrientation, setBadgeOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [currentBadgeType, setCurrentBadgeType] = useState<ParticipantBadgeType>(
    registration.badgeType || participant.badgeType || 'Delegate'
  );

  if (!isOpen) return null;

  // Derive effective institution from participant record or form answers
  const effectiveInstitution = useMemo(() => {
    if (participant.organization?.trim()) return participant.organization.trim();
    if (!registration.responses) return '';
    for (const [key, val] of Object.entries(registration.responses)) {
      if (typeof val === 'string' && val.trim()) {
        const q = data.questions.find(quest => quest.id === key);
        const label = (q?.label || key).toLowerCase();
        if (
          label.includes('institution') ||
          label.includes('school') ||
          label.includes('organization') ||
          label.includes('university') ||
          label.includes('college') ||
          label.includes('company')
        ) {
          return val.trim();
        }
      }
    }
    return '';
  }, [participant.organization, registration.responses, data.questions]);

  // Find room details if assigned
  const room = registration.roomAssignmentId
    ? data.rooms.find(r => r.id === registration.roomAssignmentId)
    : null;

  const handleBadgeTypeChange = (newType: ParticipantBadgeType) => {
    setCurrentBadgeType(newType);
    // Update locally in DB
    try {
      db.updateData((prev) => ({
        ...prev,
        registrations: prev.registrations.map(r => r.id === registration.id ? { ...r, badgeType: newType } : r),
        participants: prev.participants.map(p => p.id === participant.id ? { ...p, badgeType: newType } : p),
      }));
      refreshData();
    } catch (e) {
      console.warn('Failed to update badge type', e);
    }
  };

  const theme = getBadgeTitleTheme(currentBadgeType);

  const handleDownloadPNG = async () => {
    if (!badgeRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(badgeRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `Badge_${currentBadgeType}_${participant.fullName.replace(/\s+/g, '_')}_${badgeOrientation}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export badge image', err);
      alert('Could not download badge image directly. Please try printing or screenshotting.');
    } finally {
      setDownloading(false);
    }
  };

  const passUrl = useMemo(
    () => getPassUrl(registration.qrIdentifier, { registration, participant, event }),
    [registration, participant, event]
  );

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(passUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Track modal open state on body to isolate during printing
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('single-badge-modal-active');
      return () => {
        document.body.classList.remove('single-badge-modal-active');
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="single-badge-print-portal single-badge-modal-root fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto font-body">
      {/* Print stylesheet for single badge printing */}
      <style>{`
        @media print {
          /* Complete isolation: hide all elements attached to body except our print portal */
          body > *:not(.single-badge-print-portal) {
            display: none !important;
            visibility: hidden !important;
          }

          body.single-badge-modal-active > #root {
            display: none !important;
          }

          @page {
            size: ${badgeOrientation === 'landscape' ? 'landscape' : 'portrait'};
            margin: 8mm;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            background: #FFFFFF !important;
            background-color: #FFFFFF !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .single-badge-print-portal,
          .single-badge-modal-root {
            display: block !important;
            background: #FFFFFF !important;
            background-color: #FFFFFF !important;
            position: static !important;
            inset: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-badge-container {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            transform: none !important;
            border: 1px solid #E4E4E1 !important;
            box-shadow: none !important;
            background: #FFFFFF !important;
            background-color: #FFFFFF !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .printable-badge-container.portrait-badge {
            margin: 20mm auto !important;
            width: 90mm !important;
            max-width: 90mm !important;
          }
          .printable-badge-container.landscape-badge {
            margin: 15mm auto !important;
            width: 145mm !important;
            max-width: 145mm !important;
          }
        }
      `}</style>

      <div className={`bg-[#FAFAF9] border border-[#E4E4E1] rounded-2xl shadow-2xl w-full ${badgeOrientation === 'landscape' ? 'max-w-2xl' : 'max-w-md'} flex flex-col my-8 overflow-hidden transition-all duration-200`}>
        {/* Header */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-[#E4E4E1] bg-white">
          <div>
            <h2 className="text-base font-bold text-[#1C1C1A] font-heading">
              Digital ID Card & Pass Badge
            </h2>
            <p className="text-xs text-[#6B6B66]">Official event badge pass with title category and orientation options.</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 text-[#6B6B66] hover:bg-[#FAFAF9] rounded-lg flex items-center justify-center cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Customization Toolbar: Orientation & Role Selection */}
        <div className="no-print p-4 bg-white border-b border-[#E4E4E1] space-y-3">
          {/* Orientation Selector */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#1C1C1A] flex items-center space-x-1.5">
              <span>Card Orientation:</span>
            </label>
            <div className="inline-flex p-0.5 bg-[#FAFAF9] border border-[#E4E4E1] rounded-lg">
              <button
                type="button"
                onClick={() => setBadgeOrientation('portrait')}
                className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  badgeOrientation === 'portrait'
                    ? 'bg-[#14595A] text-white shadow-2xs'
                    : 'text-[#6B6B66] hover:text-[#1C1C1A]'
                }`}
              >
                <RectangleVertical className="h-3.5 w-3.5" />
                <span>Portrait</span>
              </button>
              <button
                type="button"
                onClick={() => setBadgeOrientation('landscape')}
                className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  badgeOrientation === 'landscape'
                    ? 'bg-[#14595A] text-white shadow-2xs'
                    : 'text-[#6B6B66] hover:text-[#1C1C1A]'
                }`}
              >
                <RectangleHorizontal className="h-3.5 w-3.5" />
                <span>Landscape</span>
              </button>
            </div>
          </div>

          {/* Badge Title / Role Selector Bar */}
          <div className="space-y-1.5 pt-2.5 border-t border-[#E4E4E1]">
            <label className="block text-xs font-bold text-[#1C1C1A] flex items-center space-x-1">
              <Tag className="h-3.5 w-3.5 text-[#14595A]" />
              <span>Select Participant Badge Title:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(['Delegate', 'Contestant', 'Speaker', 'Volunteer', 'Staff'] as ParticipantBadgeType[]).map(t => (
                <button
                  key={t}
                  onClick={() => handleBadgeTypeChange(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentBadgeType === t
                      ? `${getBadgeTitleTheme(t).bg} text-white shadow-2xs scale-105`
                      : 'bg-[#FAFAF9] text-[#6B6B66] hover:text-[#1C1C1A] border border-[#E4E4E1]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Badge Card Container */}
        <div className="p-6 flex flex-col items-center justify-center space-y-4">
          {badgeOrientation === 'portrait' ? (
            /* PORTRAIT BADGE TARGET */
            <div
              ref={badgeRef}
              className="printable-badge-container portrait-badge w-full max-w-sm bg-white border-2 border-[#E4E4E1] rounded-2xl shadow-xl overflow-hidden relative"
            >
              {/* Badge Top Header */}
              <div className="bg-[#14595A] text-white p-4 text-center space-y-1" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <div className="flex items-center justify-center space-x-1 text-[10px] font-bold uppercase tracking-widest text-white/80">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verified Official Pass</span>
                </div>
                <h3 className="font-heading font-bold text-sm leading-tight text-white px-2">
                  {event.name}
                </h3>
                <p className="text-[11px] text-white/80 font-medium">
                  {new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              {/* Prominent Badge Title / Role Banner */}
              <div 
                className={`w-full py-2 text-center text-xs font-extrabold font-heading tracking-widest uppercase shadow-xs ${theme.bg} ${theme.text}`}
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                ★ {theme.label} ★
              </div>

              {/* Badge Body */}
              <div className="p-6 text-center space-y-4 bg-white">
                {/* Participant Name & Organization / Institution */}
                <div>
                  <h2 className="font-heading font-bold text-xl text-[#1C1C1A] tracking-tight">
                    {participant.fullName}
                  </h2>
                  {effectiveInstitution && (
                    <div className="mt-1.5 inline-flex items-center justify-center space-x-1.5 px-3 py-1 bg-[#EBF4F4] text-[#14595A] rounded-full border border-[#14595A]/20" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <Building className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider">{effectiveInstitution}</span>
                    </div>
                  )}
                  {participant.jobTitle && (
                    <p className="text-[11px] text-[#6B6B66] mt-1 font-medium">
                      {participant.jobTitle}
                    </p>
                  )}
                </div>

                {/* QR Code Centerpiece */}
                <div className="space-y-1.5">
                  <a
                    href={passUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#FAFAF9] p-3 rounded-xl border border-[#E4E4E1] inline-block shadow-2xs hover:border-[#14595A] hover:shadow-md transition-all cursor-pointer group"
                    style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                    title="Click to open and test live mobile pass view"
                  >
                    <QRCodeSVG
                      value={passUrl}
                      size={140}
                      level="H"
                      includeMargin={true}
                    />
                    <div className="no-print mt-1.5 flex items-center justify-center space-x-1 text-[10px] font-bold text-[#14595A] group-hover:underline">
                      <ExternalLink className="h-3 w-3" />
                      <span>Click to Test Pass</span>
                    </div>
                  </a>
                </div>

                {/* Registration ID & Room details */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-[#6B6B66] uppercase tracking-wider">
                    Registration Pass ID
                  </div>
                  <div className="text-xs font-mono font-bold text-[#1C1C1A] tracking-wider tabular-nums">
                    {registration.id}
                  </div>

                  {room && (
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#EBF4F4] text-[#14595A] text-xs font-bold mt-2" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <Bed className="h-3.5 w-3.5" />
                      <span>Assigned Room: {room.roomNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Badge Footer */}
              <div className="bg-[#FAFAF9] px-4 py-2.5 border-t border-[#E4E4E1] flex items-center justify-between text-[10px] text-[#6B6B66]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <span className="font-semibold">PIMS ID Pass System</span>
                <span className="font-semibold text-[#2F7D4F] flex items-center space-x-1">
                  <span className="h-2 w-2 rounded-full bg-[#2F7D4F]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
                  <span>ACTIVE</span>
                </span>
              </div>
            </div>
          ) : (
            /* LANDSCAPE BADGE TARGET */
            <div
              ref={badgeRef}
              className="printable-badge-container landscape-badge w-full max-w-xl bg-white border-2 border-[#E4E4E1] rounded-2xl shadow-xl overflow-hidden relative"
            >
              {/* Badge Top Header */}
              <div className="bg-[#14595A] text-white px-5 py-2.5 flex items-center justify-between" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-white/90">
                  <ShieldCheck className="h-3.5 w-3.5 text-white shrink-0" />
                  <span>Verified Official Pass</span>
                  <span className="text-white/40">•</span>
                  <span className="font-heading font-bold text-xs truncate max-w-[260px] text-white">{event.name}</span>
                </div>
                <p className="text-[11px] text-white/80 font-medium shrink-0">
                  {new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              {/* Prominent Badge Title / Role Banner */}
              <div 
                className={`w-full py-1.5 px-5 flex items-center justify-between text-xs font-extrabold font-heading tracking-widest uppercase shadow-xs ${theme.bg} ${theme.text}`}
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                <span>★ {theme.label} ★</span>
                <span className="text-[10px] opacity-90 font-mono tracking-normal">YIN-PIMS OFFICIAL PASS</span>
              </div>

              {/* Badge Body: 2-Column Horizontal Split */}
              <div className="p-5 bg-white grid grid-cols-12 gap-5 items-center">
                {/* Left Column: QR Code & ID */}
                <div className="col-span-5 flex flex-col items-center justify-center space-y-2 border-r border-[#E4E4E1] pr-3">
                  <a
                    href={passUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#FAFAF9] p-2.5 rounded-xl border border-[#E4E4E1] inline-block shadow-2xs hover:border-[#14595A] hover:shadow-md transition-all cursor-pointer group"
                    style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                    title="Click to open and test live mobile pass view"
                  >
                    <QRCodeSVG
                      value={passUrl}
                      size={115}
                      level="H"
                      includeMargin={true}
                    />
                    <div className="no-print mt-1 flex items-center justify-center space-x-1 text-[9px] font-bold text-[#14595A] group-hover:underline">
                      <ExternalLink className="h-2.5 w-2.5" />
                      <span>Test Pass</span>
                    </div>
                  </a>

                  <div className="text-center">
                    <div className="text-[9px] font-bold text-[#6B6B66] uppercase tracking-wider">
                      Pass ID
                    </div>
                    <div className="text-xs font-mono font-bold text-[#1C1C1A] tracking-wider tabular-nums">
                      {registration.id}
                    </div>
                  </div>
                </div>

                {/* Right Column: Participant Details */}
                <div className="col-span-7 flex flex-col justify-center space-y-2.5 text-left pl-1">
                  <div>
                    <h2 className="font-heading font-extrabold text-2xl text-[#1C1C1A] tracking-tight uppercase leading-snug">
                      {participant.fullName}
                    </h2>

                    {effectiveInstitution && (
                      <div className="mt-1.5 inline-flex items-center space-x-1.5 px-3 py-1 bg-[#EBF4F4] text-[#14595A] rounded-full border border-[#14595A]/20 max-w-full" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        <Building className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wider truncate">{effectiveInstitution}</span>
                      </div>
                    )}

                    {participant.jobTitle && (
                      <p className="text-xs text-[#6B6B66] mt-1 font-medium truncate">
                        {participant.jobTitle}
                      </p>
                    )}
                  </div>

                  {room && (
                    <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#EBF4F4] text-[#14595A] text-xs font-bold w-fit" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <Bed className="h-3.5 w-3.5 shrink-0" />
                      <span>Room {room.roomNumber} ({room.genderGroup} Wing)</span>
                    </div>
                  )}

                  <div className="pt-1 flex items-center space-x-1.5 text-[11px] font-semibold text-[#2F7D4F]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <span className="h-2 w-2 rounded-full bg-[#2F7D4F]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
                    <span>Verified Active Credential</span>
                  </div>
                </div>
              </div>

              {/* Badge Footer */}
              <div className="bg-[#FAFAF9] px-5 py-2.5 border-t border-[#E4E4E1] flex items-center justify-between text-[10px] text-[#6B6B66]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <span className="font-semibold">Young Investors Network — PIMS ID System</span>
                <span className="font-semibold text-[#2F7D4F] flex items-center space-x-1">
                  <span className="h-2 w-2 rounded-full bg-[#2F7D4F]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
                  <span>ACTIVE</span>
                </span>
              </div>
            </div>
          )}

          {/* Badge Action Buttons */}
          <div className="no-print flex flex-wrap items-center justify-center gap-2 w-full pt-2">
            <a
              href={passUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 h-9 px-3.5 bg-[#EBF4F4] text-[#14595A] text-xs font-bold rounded-xl hover:bg-[#D7E9E9] transition-colors cursor-pointer shadow-2xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open Live Pass</span>
            </a>

            <button
              onClick={handleDownloadPNG}
              disabled={downloading}
              className="flex items-center space-x-1.5 h-9 px-4 bg-[#14595A] text-white text-xs font-medium rounded-xl hover:bg-[#0E4243] transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="h-4 w-4" />
              <span>{downloading ? 'Exporting...' : 'Download PNG Badge'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 h-9 px-3.5 bg-white border border-[#E4E4E1] text-[#1C1C1A] text-xs font-medium rounded-xl hover:bg-[#FAFAF9] transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4 text-[#6B6B66]" />
              <span>Print Badge</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center space-x-1.5 h-9 px-3.5 bg-white border border-[#E4E4E1] text-[#1C1C1A] text-xs font-medium rounded-xl hover:bg-[#FAFAF9] transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="h-4 w-4 text-[#2F7D4F]" /> : <Copy className="h-4 w-4 text-[#6B6B66]" />}
              <span>{copiedLink ? 'Link Copied!' : 'Share Pass Link'}</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#E4E4E1] bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-4 h-8 bg-white border border-[#E4E4E1] text-xs font-medium text-[#1C1C1A] rounded-xl hover:bg-[#FAFAF9] cursor-pointer"
          >
            Close Badge
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
