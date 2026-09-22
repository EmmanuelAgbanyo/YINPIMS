import React, { useRef, useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import { getBadgeTitleTheme } from '../badge/ParticipantBadgeModal';
import {
  getPassUrl,
  playSuccessBeep,
  triggerHapticFeedback,
  extractPassIdentifier
} from '../../utils/qrUtils';
import {
  fetchAllRegistrationsFromFirestore,
  fetchAllParticipantsFromFirestore,
  fetchAllEventsFromFirestore,
  fetchAllRoomsFromFirestore
} from '../../services/firebase';
import type { ParticipantBadgeType } from '../../types';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Calendar,
  Building,
  UserCheck,
  Bed,
  Download,
  Printer,
  Check,
  ArrowLeft,
  LogIn,
  Search,
  AlertCircle,
  Mail,
  Phone,
  User,
  MapPin,
  Award,
  Share2
} from 'lucide-react';

interface PublicPassViewProps {
  passIdentifier: string;
  onClose?: () => void;
  onOpenPortal?: () => void;
}

export const PublicPassView: React.FC<PublicPassViewProps> = ({
  passIdentifier: initialIdentifier,
  onClose,
  onOpenPortal,
}) => {
  const { data, refreshData } = useApp();
  const passCardRef = useRef<HTMLDivElement>(null);

  const [currentId, setCurrentId] = useState<string>(initialIdentifier);
  const [searchInput, setSearchInput] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [loadingCloud, setLoadingCloud] = useState(false);

  // Live ticking security clock to assure pass validity
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const cleanPassId = extractPassIdentifier(currentId);

  // Locate registration record in local memory (exact or partial fallback)
  const registration = data.registrations.find(r => {
    const qId = (r.qrIdentifier || '').toLowerCase().trim();
    const regId = (r.id || '').toLowerCase().trim();
    const target = cleanPassId.toLowerCase().trim();
    const rawTarget = currentId.toLowerCase().trim();

    return (
      qId === target ||
      regId === target ||
      qId === rawTarget ||
      regId === rawTarget ||
      (target.length >= 6 && (qId.includes(target) || target.includes(qId)))
    );
  });

  // If not found in local state on a cold device, auto-fetch from Cloud Firestore
  useEffect(() => {
    if (!registration) {
      setLoadingCloud(true);
      Promise.all([
        fetchAllRegistrationsFromFirestore(),
        fetchAllParticipantsFromFirestore(),
        fetchAllEventsFromFirestore(),
        fetchAllRoomsFromFirestore(),
      ])
        .then(([regs, parts, evts, rms]) => {
          let updated = false;
          if (regs && regs.length > 0) {
            db.mergeRegistrationsFromCloud(regs);
            updated = true;
          }
          if (parts && parts.length > 0) {
            db.mergeParticipantsFromCloud(parts);
            updated = true;
          }
          if (evts && evts.length > 0) {
            db.mergeEventsFromCloud(evts);
            updated = true;
          }
          if (rms && rms.length > 0) {
            db.mergeRoomsFromCloud(rms);
            updated = true;
          }
          if (updated) {
            refreshData();
          }
        })
        .catch(err => {
          console.warn('Cloud pass hydration note:', err);
        })
        .finally(() => {
          setLoadingCloud(false);
        });
    }
  }, [currentId, registration, refreshData]);

  const participant = registration
    ? data.participants.find(p => p.id === registration.participantId)
    : data.participants.find(p => p.id.toLowerCase() === cleanPassId.toLowerCase());

  const event = registration
    ? data.events.find(e => e.id === registration.eventId)
    : data.events[0] || null;

  const room = registration?.roomAssignmentId
    ? data.rooms.find(r => r.id === registration.roomAssignmentId)
    : null;

  const badgeType = (registration?.badgeType || participant?.badgeType || 'Delegate') as ParticipantBadgeType;
  const theme = getBadgeTitleTheme(badgeType);
  const isCheckedIn = registration?.checkInStatus === 'Checked In';

  // Extract institution / organization either from participant or custom registration responses
  const effectiveInstitution = useMemo(() => {
    if (participant?.organization?.trim()) return participant.organization.trim();
    if (!registration?.responses) return '';
    for (const [key, val] of Object.entries(registration.responses)) {
      if (typeof val === 'string' && val.trim()) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('institution') ||
          lowerKey.includes('school') ||
          lowerKey.includes('organization') ||
          lowerKey.includes('university') ||
          lowerKey.includes('college')
        ) {
          return val.trim();
        }
      }
    }
    return '';
  }, [participant?.organization, registration?.responses]);

  // Check In / Undo Action
  const handlePerformCheckIn = (newStatus: boolean) => {
    if (!registration) return;

    db.updateCheckInStatus(registration.id, newStatus);
    refreshData();

    if (newStatus) {
      playSuccessBeep();
      triggerHapticFeedback();
      setJustCheckedIn(true);
      setTimeout(() => setJustCheckedIn(false), 5000);
    }
  };

  const handleDownloadPNG = async () => {
    if (!passCardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(passCardRef.current, { cacheBust: true, pixelRatio: 2.5 });
      const link = document.createElement('a');
      link.download = `YIN_Pass_${badgeType}_${(participant?.fullName || 'Attendee').replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export pass image', err);
      alert('Could not download pass directly. You can take a screenshot or print this page.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (!registration) return;
    const url = getPassUrl(registration.qrIdentifier);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    const term = searchInput.trim().toLowerCase();
    const foundReg = data.registrations.find(r => {
      if (r.id.toLowerCase() === term || r.qrIdentifier.toLowerCase() === term) return true;
      const p = data.participants.find(part => part.id === r.participantId);
      if (p && (p.fullName.toLowerCase().includes(term) || p.email.toLowerCase().includes(term))) {
        return true;
      }
      return false;
    });

    if (foundReg) {
      setCurrentId(foundReg.qrIdentifier);
      setSearchInput('');
    } else {
      alert(`No registration record found for "${searchInput}".`);
    }
  };

  // Helper for participant initials
  const getInitials = (name?: string) => {
    if (!name) return 'YIN';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="public-pass-root min-h-screen bg-gradient-to-b from-[#F0F5F5] via-[#FAFAF9] to-[#EBEBE8] text-[#1C1C1A] flex flex-col font-body selection:bg-[#14595A] selection:text-white pb-16">
      {/* Print Stylesheet */}
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
          html, body {
            background: #FFFFFF !important;
            background-color: #FFFFFF !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .public-pass-root {
            background: #FFFFFF !important;
            background-color: #FFFFFF !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-pass {
            width: 100% !important;
            max-width: 90mm !important;
            margin: 5mm auto !important;
            border: 1px solid #CCC !important;
            box-shadow: none !important;
            background: #FFFFFF !important;
            background-color: #FFFFFF !important;
          }
        }
      `}</style>

      {/* Top Brand & Navigation Header */}
      <header className="no-print bg-white/90 backdrop-blur-md border-b border-[#E4E4E1] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#14595A] to-[#0A3233] text-white flex items-center justify-center font-heading font-bold text-base shadow-xs">
              P
            </div>
            <div>
              <span className="font-heading font-bold text-sm tracking-tight block leading-tight text-[#1C1C1A]">
                YIN PIMS
              </span>
              <span className="text-[9px] font-semibold text-[#14595A] uppercase tracking-wider block leading-none">
                Young Investors Network
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onClose && (
              <button
                onClick={onClose}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#E4E4E1] bg-[#FAFAF9] hover:bg-white text-xs font-semibold text-[#1C1C1A] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exit Pass</span>
              </button>
            )}

            {onOpenPortal ? (
              <button
                onClick={onOpenPortal}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#14595A] hover:bg-[#0E4243] text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Staff Portal</span>
              </button>
            ) : (
              <a
                href="/"
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#14595A] hover:bg-[#0E4243] text-white text-xs font-semibold transition-colors shadow-2xs"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Staff Login</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-6 flex flex-col items-center">
        {/* Cloud Loading State */}
        {loadingCloud && !registration && (
          <div className="w-full bg-white rounded-3xl border border-[#E4E4E1] p-10 shadow-xl text-center space-y-4 my-auto">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[#14595A] border-r-transparent" />
            <div>
              <h3 className="font-heading font-bold text-base text-[#1C1C1A]">
                Verifying Attendee Credentials...
              </h3>
              <p className="text-xs text-[#6B6B66] mt-1">
                Connecting to YIN-PIMS Cloud to load the official pass.
              </p>
            </div>
          </div>
        )}

        {/* If record not found after checking local & cloud */}
        {!loadingCloud && (!registration || !participant || !event) ? (
          <div className="w-full bg-white rounded-3xl border border-[#E4E4E1] p-8 shadow-xl text-center space-y-4 my-auto">
            <div className="h-16 w-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1C1C1A] font-heading">
                Attendee Pass Not Found
              </h2>
              <p className="text-xs text-[#6B6B66] mt-1.5 max-w-xs mx-auto leading-relaxed">
                No active registration record was located matching code:
              </p>
              <div className="mt-2">
                <code className="bg-[#FAFAF9] px-2.5 py-1 rounded-lg border border-[#E4E4E1] font-mono text-xs font-bold text-[#14595A]">
                  {cleanPassId || 'EMPTY'}
                </code>
              </div>
            </div>

            {/* Quick Search Form */}
            <form onSubmit={handleSearchSubmit} className="pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6B66]" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search by participant name, email, or pass ID..."
                  className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-[#E4E4E1] bg-[#FAFAF9] focus:bg-white focus:outline-none focus:border-[#14595A] focus:ring-1 focus:ring-[#14595A]"
                />
              </div>
              <button
                type="submit"
                className="w-full mt-2.5 h-10 bg-[#14595A] hover:bg-[#0E4243] text-white text-xs font-bold rounded-xl shadow-2xs cursor-pointer transition-all"
              >
                Search Attendee Pass
              </button>
            </form>

            <div className="pt-4 border-t border-[#E4E4E1]">
              <a
                href="/"
                className="text-xs text-[#14595A] font-bold hover:underline inline-flex items-center space-x-1"
              >
                <span>Return to Portal Home & Login</span>
              </a>
            </div>
          </div>
        ) : registration && participant && event ? (
          /* Found Valid Pass - Render Beautiful Holder Information Page */
          <div className="w-full space-y-4">
            {/* Live Just Checked In Toast Banner */}
            {justCheckedIn && (
              <div className="no-print bg-[#2F7D4F] text-white p-4 rounded-2xl shadow-xl flex items-center space-x-3 animate-bounce">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-200" />
                <div className="text-xs">
                  <span className="font-bold block text-sm">Check-In Successfully Recorded!</span>
                  <span className="text-emerald-100 font-medium">
                    {participant.fullName} has been officially admitted and marked Present.
                  </span>
                </div>
              </div>
            )}

            {/* Dynamic Security & Integrity Bar */}
            <div className="no-print bg-white/90 backdrop-blur-sm border border-[#E4E4E1] rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-2xs text-xs">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-bold text-[#14595A] uppercase tracking-wider">
                  Live Verified Credential
                </span>
              </div>
              <div className="flex items-center space-x-1.5 font-mono text-xs font-bold text-[#1C1C1A]">
                <Clock className="h-3.5 w-3.5 text-[#6B6B66]" />
                <span>{currentTime}</span>
              </div>
            </div>

            {/* Main Pass Target Card for Display, Printing & PNG Export */}
            <div
              ref={passCardRef}
              className="printable-pass w-full bg-white rounded-3xl border border-[#E4E4E1] shadow-xl overflow-hidden relative"
            >
              {/* Event Header Ribbon */}
              <div
                className="bg-gradient-to-r from-[#14595A] via-[#0E4243] to-[#0A3233] text-white p-5 text-center space-y-1.5 relative overflow-hidden"
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                {/* Background decorative watermark seal */}
                <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
                <div className="absolute -left-6 -top-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

                <div className="flex items-center justify-center space-x-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Young Investors Network • Official Pass</span>
                </div>

                <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-white leading-tight px-2 tracking-tight">
                  {event.name}
                </h1>

                <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-white/85 font-medium pt-0.5">
                  <span className="inline-flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(event.startDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </span>
                  {event.location && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{event.location}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Prominent Badge Role / Category Banner */}
              <div
                className={`w-full py-2 text-center text-xs font-black font-heading tracking-widest uppercase shadow-xs ${theme.bg} ${theme.text}`}
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                ★ {theme.label} PASS ★
              </div>

              {/* Card Body: Holder Profile & Credentials */}
              <div className="p-6 text-center space-y-6 bg-white">
                {/* Holder Avatar / Monogram & Name */}
                <div className="space-y-3">
                  {/* Monogram Seal */}
                  <div className="relative inline-block mx-auto">
                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#EBF4F4] via-[#FAFAF9] to-[#D7E9E9] border-2 border-[#14595A]/30 text-[#14595A] font-heading font-extrabold text-2xl flex items-center justify-center shadow-md">
                      {getInitials(participant.fullName)}
                    </div>
                    <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-[#2F7D4F] text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Holder Name */}
                  <div>
                    <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#1C1C1A] tracking-tight uppercase leading-snug">
                      {participant.fullName}
                    </h2>

                    {effectiveInstitution && (
                      <p className="text-xs sm:text-sm font-bold text-[#14595A] mt-1 inline-flex items-center justify-center space-x-1.5">
                        <Building className="h-4 w-4 shrink-0" />
                        <span>{effectiveInstitution}</span>
                      </p>
                    )}

                    {participant.jobTitle && (
                      <p className="text-xs text-[#6B6B66] font-medium mt-0.5">
                        {participant.jobTitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Scannable Centerpiece QR Code */}
                <div className="space-y-2 py-1">
                  <div
                    className="bg-[#FAFAF9] p-4 rounded-3xl border-2 border-[#E4E4E1] inline-block shadow-md hover:border-[#14595A] transition-colors"
                    style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                  >
                    <QRCodeSVG
                      value={getPassUrl(registration.qrIdentifier)}
                      size={170}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <p className="text-[11px] text-[#6B6B66] font-medium max-w-xs mx-auto">
                    Scan with any mobile phone camera or gate terminal for instant verification
                  </p>
                </div>

                {/* Real-Time Admission & Check-In Status Card */}
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between text-left transition-all ${
                    isCheckedIn
                      ? 'bg-[#F0F9F3] border-[#2F7D4F]/30 text-[#1C4D2E]'
                      : 'bg-[#FDF9F0] border-[#C17F16]/30 text-[#6B4300]'
                  }`}
                  style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                >
                  <div className="flex items-center space-x-3">
                    {isCheckedIn ? (
                      <div className="h-10 w-10 rounded-xl bg-[#2F7D4F] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-[#C17F16] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <UserCheck className="h-6 w-6" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs sm:text-sm font-bold font-heading">
                        {isCheckedIn ? 'OFFICIALLY CHECKED IN' : 'READY FOR ADMISSION'}
                      </div>
                      <div className="text-[11px] opacity-90 font-medium">
                        {isCheckedIn
                          ? `Admitted at ${new Date(registration.checkInTimestamp || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'Valid pass presented for entrance check-in'}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider ${
                      isCheckedIn
                        ? 'bg-[#2F7D4F] text-white'
                        : 'bg-[#C17F16] text-white'
                    }`}
                  >
                    {isCheckedIn ? 'ADMITTED' : 'PENDING'}
                  </span>
                </div>

                {/* Holder Contact & Credentials Detail Grid */}
                <div className="bg-[#FAFAF9] p-4 rounded-2xl border border-[#E4E4E1] space-y-2.5 text-xs text-left">
                  <div className="text-[10px] font-bold text-[#6B6B66] uppercase tracking-wider pb-1 border-b border-[#E4E4E1]">
                    Holder Profile Details
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                    {/* Email */}
                    <div className="flex items-center space-x-2 text-[#1C1C1A]">
                      <Mail className="h-3.5 w-3.5 text-[#14595A] shrink-0" />
                      <a href={`mailto:${participant.email}`} className="truncate hover:underline text-[#14595A] font-semibold">
                        {participant.email}
                      </a>
                    </div>

                    {/* Phone */}
                    {participant.phone && (
                      <div className="flex items-center space-x-2 text-[#1C1C1A]">
                        <Phone className="h-3.5 w-3.5 text-[#14595A] shrink-0" />
                        <a href={`tel:${participant.phone}`} className="truncate hover:underline text-[#14595A] font-semibold font-mono">
                          {participant.phone}
                        </a>
                      </div>
                    )}

                    {/* Institution / School */}
                    {effectiveInstitution && (
                      <div className="flex items-center space-x-2 text-[#1C1C1A]">
                        <Building className="h-3.5 w-3.5 text-[#14595A] shrink-0" />
                        <span className="font-semibold truncate">{effectiveInstitution}</span>
                      </div>
                    )}

                    {/* Category */}
                    <div className="flex items-center space-x-2 text-[#1C1C1A]">
                      <Award className="h-3.5 w-3.5 text-[#14595A] shrink-0" />
                      <span className="font-semibold">{badgeType} Status</span>
                    </div>

                    {/* Gender / Demographic */}
                    {participant.gender && participant.gender !== 'Prefer not to say' && (
                      <div className="flex items-center space-x-2 text-[#1C1C1A]">
                        <User className="h-3.5 w-3.5 text-[#14595A] shrink-0" />
                        <span>{participant.gender}</span>
                      </div>
                    )}
                  </div>

                  {/* Room Assignment (if assigned) */}
                  {room && (
                    <div className="pt-2 border-t border-[#E4E4E1] flex items-center justify-between text-[#14595A] font-bold">
                      <span className="flex items-center space-x-1.5 text-xs">
                        <Bed className="h-4 w-4" />
                        <span>Accommodation Assignment</span>
                      </span>
                      <span className="text-xs bg-[#EBF4F4] px-2.5 py-0.5 rounded-md font-mono">
                        Room {room.roomNumber} ({room.genderGroup} Wing)
                      </span>
                    </div>
                  )}

                  {/* Registration References */}
                  <div className="pt-2 border-t border-[#E4E4E1] flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#6B6B66] gap-1">
                    <div>
                      <span>Pass ID: </span>
                      <span className="font-mono font-bold text-[#1C1C1A]">{registration.id}</span>
                    </div>
                    <div>
                      <span>QR Ref: </span>
                      <span className="font-mono text-[#14595A] truncate max-w-[180px] inline-block align-bottom" title={registration.qrIdentifier}>
                        {registration.qrIdentifier}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pass Card Footer */}
              <div
                className="bg-[#FAFAF9] px-6 py-3 border-t border-[#E4E4E1] flex items-center justify-between text-[10px] text-[#6B6B66]"
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                <span>Official YIN-PIMS Credential</span>
                <span className="font-bold text-[#14595A] uppercase tracking-wider">
                  Young Investors Network
                </span>
              </div>
            </div>

            {/* Interactive Functional Controls Bar */}
            <div className="no-print space-y-2.5 pt-1">
              {/* Primary 1-Tap Check-In / Revert Action */}
              {!isCheckedIn ? (
                <button
                  onClick={() => handlePerformCheckIn(true)}
                  className="w-full h-12 bg-[#2F7D4F] hover:bg-[#25663F] text-white rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Confirm Gate Check-In for {participant.fullName}</span>
                </button>
              ) : (
                <button
                  onClick={() => handlePerformCheckIn(false)}
                  className="w-full h-10 bg-white border border-[#E4E4E1] hover:bg-rose-50 text-rose-700 rounded-2xl font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
                >
                  <span>Undo / Revert Check-In</span>
                </button>
              )}

              {/* Utility Tools: Save PNG, Print Pass, Share Link */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleDownloadPNG}
                  disabled={downloading}
                  className="h-10 bg-white border border-[#E4E4E1] hover:bg-[#FAFAF9] rounded-2xl text-xs font-bold text-[#1C1C1A] flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Download className="h-4 w-4 text-[#14595A]" />
                  <span>{downloading ? 'Saving...' : 'Save PNG'}</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="h-10 bg-white border border-[#E4E4E1] hover:bg-[#FAFAF9] rounded-2xl text-xs font-bold text-[#1C1C1A] flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Printer className="h-4 w-4 text-[#14595A]" />
                  <span>Print Pass</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="h-10 bg-white border border-[#E4E4E1] hover:bg-[#FAFAF9] rounded-2xl text-xs font-bold text-[#1C1C1A] flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-4 w-4 text-[#2F7D4F]" />
                      <span className="text-[#2F7D4F]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 text-[#14595A]" />
                      <span>Share Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};
