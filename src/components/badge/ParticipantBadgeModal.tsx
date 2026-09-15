import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import type { Registration, Participant, Event } from '../../types';
import { X, Download, Printer, Copy, Check, ShieldCheck, Bed } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ParticipantBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: Registration;
  participant: Participant;
  event: Event;
}

export const ParticipantBadgeModal: React.FC<ParticipantBadgeModalProps> = ({
  isOpen,
  onClose,
  registration,
  participant,
  event,
}) => {
  const { data } = useApp();
  const badgeRef = useRef<HTMLDivElement>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  // Find room details if assigned
  const room = registration.roomAssignmentId
    ? data.rooms.find(r => r.id === registration.roomAssignmentId)
    : null;

  const handleDownloadPNG = async () => {
    if (!badgeRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(badgeRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `Badge_${participant.fullName.replace(/\s+/g, '_')}_${event.name.slice(0, 15)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export badge image', err);
      alert('Could not download badge image directly. Please try printing or screenshotting.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/badge/${registration.qrIdentifier}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 overflow-y-auto">
      {/* Print stylesheet for single badge printing */}
      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 8mm;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-badge-container {
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 90mm !important;
            max-width: 90mm !important;
            border: 1px solid #E4E4E1 !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="bg-[#FAFAF9] border border-[#E4E4E1] rounded-lg shadow-xl w-full max-w-lg flex flex-col my-8">
        {/* Header */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-[#E4E4E1] bg-white rounded-t-lg">
          <div>
            <h2 className="text-base font-bold text-[#1C1C1A] font-heading">
              Digital Participant Badge
            </h2>
            <p className="text-xs text-[#6B6B66]">Official event identifier and check-in QR pass.</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 text-[#6B6B66] hover:bg-[#FAFAF9] rounded flex items-center justify-center cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Badge Card Container */}
        <div className="p-6 flex flex-col items-center justify-center space-y-4">
          {/* Printable Badge Target */}
          <div
            ref={badgeRef}
            className="printable-badge-container w-full max-w-sm bg-white border border-[#E4E4E1] rounded-xl shadow-md overflow-hidden relative"
          >
            {/* Badge Top Header */}
            <div className="bg-[#14595A] text-white p-4 text-center space-y-1" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <div className="flex items-center justify-center space-x-1 text-[10px] font-bold uppercase tracking-wider text-white/80">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Verified Delegate Pass</span>
              </div>
              <h3 className="font-heading font-bold text-sm leading-tight text-white px-2">
                {event.name}
              </h3>
              <p className="text-[11px] text-white/80 font-medium">
                {new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            {/* Badge Body */}
            <div className="p-6 text-center space-y-4 bg-white">
              {/* Participant Name & Title */}
              <div>
                <h2 className="font-heading font-bold text-xl text-[#1C1C1A] tracking-tight">
                  {participant.fullName}
                </h2>
                {participant.organization && (
                  <p className="text-xs font-semibold text-[#14595A] mt-0.5">
                    {participant.organization}
                  </p>
                )}
                {participant.jobTitle && (
                  <p className="text-[11px] text-[#6B6B66]">
                    {participant.jobTitle}
                  </p>
                )}
              </div>

              {/* QR Code Centerpiece */}
              <div className="bg-[#FAFAF9] p-3 rounded-lg border border-[#E4E4E1] inline-block shadow-2xs" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <QRCodeSVG
                  value={registration.qrIdentifier}
                  size={140}
                  level="H"
                  includeMargin={true}
                />
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
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#EBF4F4] text-[#14595A] text-xs font-bold mt-2" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <Bed className="h-3.5 w-3.5" />
                    <span>Assigned Room: {room.roomNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Badge Footer */}
            <div className="bg-[#FAFAF9] px-4 py-2 border-t border-[#E4E4E1] flex items-center justify-between text-[10px] text-[#6B6B66]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <span>PIMS Digital ID System</span>
              <span className="font-semibold text-[#2F7D4F] flex items-center space-x-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2F7D4F]" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
                <span>CONFIRMED</span>
              </span>
            </div>
          </div>

          {/* Badge Action Buttons */}
          <div className="no-print flex flex-wrap items-center justify-center gap-2 w-full pt-2">
            <button
              onClick={handleDownloadPNG}
              disabled={downloading}
              className="flex items-center space-x-1.5 h-9 px-4 bg-[#14595A] text-white text-xs font-medium rounded-md hover:bg-[#0E4243] transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="h-4 w-4" />
              <span>{downloading ? 'Exporting...' : 'Download PNG Badge'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 h-9 px-3.5 bg-white border border-[#E4E4E1] text-[#1C1C1A] text-xs font-medium rounded-md hover:bg-[#FAFAF9] transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4 text-[#6B6B66]" />
              <span>Print Badge</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center space-x-1.5 h-9 px-3.5 bg-white border border-[#E4E4E1] text-[#1C1C1A] text-xs font-medium rounded-md hover:bg-[#FAFAF9] transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="h-4 w-4 text-[#2F7D4F]" /> : <Copy className="h-4 w-4 text-[#6B6B66]" />}
              <span>{copiedLink ? 'Link Copied!' : 'Share Pass Link'}</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#E4E4E1] bg-white rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="px-4 h-8 bg-white border border-[#E4E4E1] text-xs font-medium text-[#1C1C1A] rounded-md hover:bg-[#FAFAF9] cursor-pointer"
          >
            Close Badge
          </button>
        </div>
      </div>
    </div>
  );
};
