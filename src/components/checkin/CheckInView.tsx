import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import type { Registration, Participant, ParticipantBadgeType, Event } from '../../types';
import { BatchBadgePrintModal } from '../badge/BatchBadgePrintModal';
import { ParticipantBadgeModal, getBadgeTitleTheme } from '../badge/ParticipantBadgeModal';
import { EditParticipantModal } from '../participants/EditParticipantModal';
import { extractPassIdentifier, playSuccessBeep, triggerHapticFeedback, findRegistrationFromInput } from '../../utils/qrUtils';
import { getFirestoreDoc } from '../../services/firebase';
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  Camera,
  Calendar,
  Sparkles,
  Plus,
  Printer,
  X,
  Bed,
  Tag,
  Undo2,
  Check,
  Users,
  ArrowUpDown,
  Phone,
  Mail,
  Building2,
  QrCode,
  BadgeAlert,
  Pencil,
} from 'lucide-react';

interface CheckInViewProps {
  filterEventId?: string;
}

export const CheckInView: React.FC<CheckInViewProps> = ({ filterEventId }) => {
  const { data, selectedEventId, setSelectedEventId, refreshData } = useApp();

  const [activeEventId, setActiveEventId] = useState<string>(
    filterEventId || (selectedEventId !== 'all' ? selectedEventId : data.events[0]?.id || '')
  );

  const activeEvent = data.events.find(e => e.id === activeEventId);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'checked_in'>('all');
  const [badgeFilter, setBadgeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'recent_checkin' | 'id'>('name_asc');

  // Modals & Camera Toggles
  const [showCamera, setShowCamera] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showBatchPrintModal, setShowBatchPrintModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [badgeModalData, setBadgeModalData] = useState<{
    registration: Registration;
    participant: Participant;
    event: Event;
  } | null>(null);

  // Toast feedback state
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    participantName: string;
    regId: string;
    action: 'checkin' | 'undo';
  } | null>(null);

  // Scanning Result State
  const [scanResult, setScanResult] = useState<{
    status: 'success' | 'already_checked_in' | 'wrong_event' | 'invalid' | 'waitlisted';
    message: string;
    participant?: Participant;
    registration?: Registration;
  } | null>(null);

  // Walk-in form state
  const [walkInForm, setWalkInForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: 'Prefer not to say',
    organization: '',
    badgeType: 'Delegate' as ParticipantBadgeType,
    accommodationRequired: false,
    checkInImmediately: true,
  });
  const [walkInSubmitting, setWalkInSubmitting] = useState(false);
  const [walkInError, setWalkInError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedEventId !== 'all') {
      setActiveEventId(selectedEventId);
    }
  }, [selectedEventId]);

  // Keyboard shortcut: Press "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Handle Scan Logic
  const handleScanCode = async (qrCodeString: string) => {
    let match = findRegistrationFromInput(data.registrations, data.participants, qrCodeString);

    // If not found locally, try on-demand fetch from Cloud Firestore
    if (!match) {
      const cleanCode = extractPassIdentifier(qrCodeString);
      const regMatch = cleanCode.match(/reg-[a-z0-9-]+/i) || qrCodeString.match(/reg-[a-z0-9-]+/i);
      const targetRegId = regMatch ? regMatch[0].toLowerCase() : (cleanCode.startsWith('reg-') ? cleanCode.toLowerCase() : null);

      if (targetRegId) {
        try {
          const cloudReg = (await getFirestoreDoc('registrations', targetRegId)) as Registration | null;
          if (cloudReg) {
            db.mergeRegistrationsFromCloud([cloudReg]);
            if (cloudReg.participantId) {
              const cloudPrt = (await getFirestoreDoc('participants', cloudReg.participantId)) as Participant | null;
              if (cloudPrt) db.mergeParticipantsFromCloud([cloudPrt]);
            }
            refreshData();
            match = {
              registration: cloudReg,
              participant: data.participants.find(p => p.id === cloudReg.participantId)
            };
          }
        } catch (e) {
          console.warn('On-demand checkin scan Firestore fetch note:', e);
        }
      }
    }

    if (!match || !match.registration) {
      setScanResult({
        status: 'invalid',
        message: `Invalid QR Code scanned: "${qrCodeString}". No matching registration record found in system.`,
      });
      return;
    }

    const reg = match.registration;

    if (!activeEvent || reg.eventId !== activeEvent.id) {
      const otherEvent = data.events.find(e => e.id === reg.eventId);
      setScanResult({
        status: 'wrong_event',
        message: `QR Code belongs to another event: "${otherEvent?.name || 'Unknown Event'}".`,
        registration: reg,
        participant: data.participants.find(p => p.id === reg.participantId),
      });
      return;
    }

    if (reg.status === 'Waitlisted') {
      setScanResult({
        status: 'waitlisted',
        message: `Participant is currently on the WAITLIST (Position #${reg.waitlistPosition}). Cannot check in.`,
        registration: reg,
        participant: data.participants.find(p => p.id === reg.participantId),
      });
      return;
    }

    const participant = data.participants.find(p => p.id === reg.participantId);

    if (reg.checkInStatus === 'Checked In') {
      setScanResult({
        status: 'already_checked_in',
        message: `Participant ${participant?.fullName || ''} was ALREADY checked in on ${new Date(reg.checkInTimestamp || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        participant,
        registration: reg,
      });
      return;
    }

    // Perform Check-in
    const res = db.updateCheckInStatus(reg.id, true);
    refreshData();
    playSuccessBeep();
    triggerHapticFeedback();

    setScanResult({
      status: 'success',
      message: `Check-in Verified for ${participant?.fullName || ''}!`,
      participant,
      registration: res.registration,
    });

    if (participant) {
      setToast({
        id: Date.now(),
        message: `${participant.fullName} checked in successfully!`,
        participantName: participant.fullName,
        regId: reg.id,
        action: 'checkin',
      });
    }
  };

  // Perform Manual Check-In or Undo
  const handleToggleCheckIn = (regId: string, checkIn: boolean, participantName: string) => {
    db.updateCheckInStatus(regId, checkIn);
    refreshData();
    if (checkIn) {
      playSuccessBeep();
      triggerHapticFeedback();
    }

    setToast({
      id: Date.now(),
      message: checkIn
        ? `${participantName} checked in successfully!`
        : `Check-in reverted for ${participantName}`,
      participantName,
      regId,
      action: checkIn ? 'checkin' : 'undo',
    });
  };

  // Walk-in Registration Submit
  const handleWalkInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventId) return;

    if (!walkInForm.fullName.trim() || !walkInForm.email.trim()) {
      setWalkInError('Please provide both full name and email.');
      return;
    }

    setWalkInSubmitting(true);
    setWalkInError(null);

    try {
      const result = db.registerParticipant(
        activeEventId,
        {
          fullName: walkInForm.fullName.trim(),
          email: walkInForm.email.trim(),
          phone: walkInForm.phone.trim(),
          gender: walkInForm.gender,
          organization: walkInForm.organization.trim() || undefined,
          badgeType: walkInForm.badgeType,
        },
        {},
        walkInForm.accommodationRequired
      );

      if (walkInForm.checkInImmediately && result.registration.status === 'Confirmed') {
        db.updateCheckInStatus(result.registration.id, true);
      }

      refreshData();
      setShowWalkInModal(false);

      // Reset form
      setWalkInForm({
        fullName: '',
        email: '',
        phone: '',
        gender: 'Prefer not to say',
        organization: '',
        badgeType: 'Delegate',
        accommodationRequired: false,
        checkInImmediately: true,
      });

      setToast({
        id: Date.now(),
        message: `${result.participant.fullName} registered ${walkInForm.checkInImmediately ? 'and checked in' : ''} successfully!`,
        participantName: result.participant.fullName,
        regId: result.registration.id,
        action: 'checkin',
      });
    } catch (err: any) {
      setWalkInError(err?.message || 'Failed to register walk-in attendee.');
    } finally {
      setWalkInSubmitting(false);
    }
  };

  // Setup HTML5 Camera Scanner
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (showCamera) {
      scanner = new Html5QrcodeScanner(
        'qr-reader-camera',
        { fps: 10, qrbox: { width: 240, height: 240 } },
        false
      );

      scanner.render(
        (decodedText) => {
          handleScanCode(decodedText);
          scanner?.clear();
          setShowCamera(false);
        },
        () => {
          // ignore silent scan errors
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [showCamera, activeEventId]);

  // Confirmed registrations for the active event
  const confirmedRegistrations = useMemo(() => {
    return data.registrations.filter(
      r => r.eventId === activeEventId && r.status === 'Confirmed'
    );
  }, [data.registrations, activeEventId]);

  const totalConfirmed = confirmedRegistrations.length;
  const checkedInList = useMemo(() => {
    return confirmedRegistrations.filter(r => r.checkInStatus === 'Checked In');
  }, [confirmedRegistrations]);
  const checkedInCount = checkedInList.length;
  const pendingCount = totalConfirmed - checkedInCount;
  const checkInPercentage = totalConfirmed > 0 ? Math.round((checkedInCount / totalConfirmed) * 100) : 0;

  // Filtered and Sorted Attendees List for Manual Terminal
  const displayRegistrations = useMemo(() => {
    return confirmedRegistrations
      .filter(reg => {
        const p = data.participants.find(part => part.id === reg.participantId);
        if (!p) return false;

        // Status filter
        if (statusFilter === 'pending' && reg.checkInStatus === 'Checked In') return false;
        if (statusFilter === 'checked_in' && reg.checkInStatus !== 'Checked In') return false;

        // Badge filter
        if (badgeFilter !== 'all') {
          const effectiveBadge = reg.badgeType || p.badgeType || 'Delegate';
          if (effectiveBadge !== badgeFilter) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const cleanQ = extractPassIdentifier(q).toLowerCase();
          const nameMatch = p.fullName.toLowerCase().includes(q);
          const emailMatch = p.email.toLowerCase().includes(q);
          const phoneMatch = p.phone ? p.phone.toLowerCase().includes(q) : false;
          const regIdMatch = reg.id.toLowerCase().includes(q) || reg.id.toLowerCase().includes(cleanQ);
          const qrMatch = reg.qrIdentifier
            ? reg.qrIdentifier.toLowerCase().includes(q) || reg.qrIdentifier.toLowerCase().includes(cleanQ)
            : false;
          const orgMatch = p.organization ? p.organization.toLowerCase().includes(q) : false;
          const badgeMatch = (reg.badgeType || p.badgeType || '').toLowerCase().includes(q);
          if (!nameMatch && !emailMatch && !phoneMatch && !regIdMatch && !qrMatch && !orgMatch && !badgeMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const pA = data.participants.find(p => p.id === a.participantId);
        const pB = data.participants.find(p => p.id === b.participantId);
        const nameA = pA?.fullName.toLowerCase() || '';
        const nameB = pB?.fullName.toLowerCase() || '';

        if (sortBy === 'name_asc') {
          return nameA.localeCompare(nameB);
        }
        if (sortBy === 'name_desc') {
          return nameB.localeCompare(nameA);
        }
        if (sortBy === 'recent_checkin') {
          const timeA = a.checkInTimestamp ? new Date(a.checkInTimestamp).getTime() : 0;
          const timeB = b.checkInTimestamp ? new Date(b.checkInTimestamp).getTime() : 0;
          return timeB - timeA;
        }
        if (sortBy === 'id') {
          return a.id.localeCompare(b.id);
        }
        return 0;
      });
  }, [confirmedRegistrations, data.participants, statusFilter, badgeFilter, searchQuery, sortBy]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-[#1C1C1A] text-white px-4 py-3 rounded-lg shadow-xl border border-white/10 animate-in fade-in slide-in-from-top-4 duration-200 max-w-md">
          <CheckCircle2 className="h-5 w-5 text-[#2F7D4F] shrink-0" />
          <div className="text-xs flex-1">
            <span className="font-semibold">{toast.message}</span>
          </div>
          {toast.action === 'checkin' && (
            <button
              onClick={() => {
                handleToggleCheckIn(toast.regId, false, toast.participantName);
                setToast(null);
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-[#E4E4E1] hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded cursor-pointer transition-colors"
            >
              <Undo2 className="h-3 w-3" />
              Undo
            </button>
          )}
          <button
            onClick={() => setToast(null)}
            className="text-white/60 hover:text-white p-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E4E4E1]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-[#14595A]/10 text-[#14595A] rounded">
              On-Site Desk
            </span>
            <span className="text-xs text-[#6B6B66]">Fast Check-In Terminal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C1C1A] tracking-tight font-heading mt-1">
            Event Check-In Terminal
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B66] mt-0.5">
            Quick manual search roster, 1-click delegate verification, and on-site badge printing.
          </p>
        </div>

        {/* Controls & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Event Selector */}
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-md border border-[#E4E4E1] shadow-2xs">
            <Calendar className="h-4 w-4 text-[#14595A] shrink-0" />
            <select
              value={activeEventId}
              onChange={e => {
                setActiveEventId(e.target.value);
                setSelectedEventId(e.target.value);
                setScanResult(null);
              }}
              className="h-8 text-xs font-semibold bg-transparent text-[#1C1C1A] focus:outline-none cursor-pointer pr-2"
            >
              {data.events.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Print Badges Button */}
          <button
            onClick={() => setShowBatchPrintModal(true)}
            className="flex items-center space-x-1.5 h-9 px-3 text-xs font-semibold text-[#1C1C1A] bg-white border border-[#E4E4E1] rounded-md hover:bg-[#FAFAF9] transition-colors shadow-2xs cursor-pointer"
            title="Batch print attendee badges"
          >
            <Printer className="h-3.5 w-3.5 text-[#6B6B66]" />
            <span className="hidden sm:inline">Print Badges</span>
          </button>

          {/* Optional QR Camera Toggle */}
          <button
            onClick={() => setShowCamera(!showCamera)}
            className={`flex items-center space-x-1.5 h-9 px-3 text-xs font-semibold rounded-md border transition-colors cursor-pointer shadow-2xs ${
              showCamera
                ? 'bg-[#14595A] text-white border-[#14595A]'
                : 'bg-white text-[#1C1C1A] border-[#E4E4E1] hover:bg-[#FAFAF9]'
            }`}
            title="Toggle optional Camera QR Scanner"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>{showCamera ? 'Close Camera' : 'Camera QR'}</span>
          </button>

          {/* + Walk-In Registration Button */}
          <button
            onClick={() => {
              setShowWalkInModal(true);
              setWalkInError(null);
            }}
            className="flex items-center space-x-1.5 h-9 px-3.5 text-xs font-bold text-white bg-[#14595A] rounded-md hover:bg-[#0E4243] transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Walk-In</span>
          </button>
        </div>
      </div>

      {/* Collapsible Camera Scanner Box (Tucked away when not needed) */}
      {showCamera && (
        <div className="bg-white p-5 rounded-xl border-2 border-[#14595A]/30 shadow-md space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Camera className="h-4 w-4 text-[#14595A]" />
              <h3 className="text-sm font-bold text-[#1C1C1A]">Camera QR Code Scanner</h3>
            </div>
            <button
              onClick={() => setShowCamera(false)}
              className="text-xs text-[#6B6B66] hover:text-[#1C1C1A] flex items-center space-x-1"
            >
              <X className="h-4 w-4" />
              <span>Hide Camera</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div id="qr-reader-camera" className="rounded-lg overflow-hidden border border-[#E4E4E1]" />

            <div className="space-y-3 flex flex-col justify-center">
              <p className="text-xs text-[#6B6B66]">
                Point delegate's badge QR code or mobile ticket directly at the camera.
              </p>

              {/* Developer Test Trigger Simulator */}
              <div className="p-3 bg-[#EBF4F4] rounded-lg border border-[#14595A]/20 space-y-2">
                <div className="text-[11px] font-bold text-[#14595A] flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span>Instant Test Scans</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {confirmedRegistrations.slice(0, 4).map(r => {
                    const p = data.participants.find(part => part.id === r.participantId);
                    return (
                      <button
                        key={r.id}
                        onClick={() => handleScanCode(r.qrIdentifier)}
                        className="h-7 px-2 bg-white text-[10px] font-medium rounded border border-[#E4E4E1] hover:bg-[#FAFAF9] text-left truncate cursor-pointer"
                        title={r.qrIdentifier}
                      >
                        {p?.fullName || r.id} ({r.checkInStatus === 'Checked In' ? 'Checked In' : 'Pending'})
                      </button>
                    );
                  })}
                  {confirmedRegistrations.length === 0 && (
                    <span className="text-[10px] text-[#6B6B66] col-span-2">No confirmed attendees for this event yet.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Scan Result Feedback (if scanner used) */}
      {scanResult && (
        <div
          className={`p-4 rounded-xl border space-y-2 transition-all ${
            scanResult.status === 'success'
              ? 'bg-[#F0F9F3] border-[#2F7D4F]/30 text-[#2F7D4F]'
              : scanResult.status === 'already_checked_in'
              ? 'bg-[#FDF9F0] border-[#C17F16]/30 text-[#C17F16]'
              : 'bg-[#FDF2F2] border-[#B0413E]/30 text-[#B0413E]'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2.5">
              {scanResult.status === 'success' && <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />}
              {scanResult.status === 'already_checked_in' && <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />}
              {scanResult.status !== 'success' && scanResult.status !== 'already_checked_in' && (
                <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
              )}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  {scanResult.status === 'success' && 'CHECK-IN VERIFIED SUCCESS'}
                  {scanResult.status === 'already_checked_in' && 'ALREADY CHECKED IN'}
                  {scanResult.status === 'wrong_event' && 'WRONG EVENT QR CODE'}
                  {scanResult.status === 'invalid' && 'UNRECOGNIZED QR CODE'}
                  {scanResult.status === 'waitlisted' && 'WAITLISTED PARTICIPANT'}
                </h3>
                <p className="text-xs mt-0.5 font-medium leading-relaxed">{scanResult.message}</p>
                {scanResult.status === 'wrong_event' && scanResult.registration && (
                  <button
                    onClick={() => {
                      setActiveEventId(scanResult.registration!.eventId);
                      setSelectedEventId(scanResult.registration!.eventId);
                      handleScanCode(scanResult.registration!.qrIdentifier);
                    }}
                    className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1 bg-[#14595A] text-white text-[11px] font-bold rounded-md hover:bg-[#0E4243] cursor-pointer"
                  >
                    <span>Switch to this Event & Check In</span>
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setScanResult(null)}
              className="text-current/60 hover:text-current text-xs font-bold"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Overall Progress & Stats Banner */}
      <div className="bg-white p-5 rounded-xl border border-[#E4E4E1] shadow-2xs space-y-4">
        {/* Progress Bar & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-[#14595A]" />
            <span className="text-xs font-bold text-[#1C1C1A] uppercase tracking-wider">
              Check-In Progress
            </span>
          </div>
          <div className="text-xs font-semibold text-[#6B6B66]">
            <span className="font-bold text-[#1C1C1A]">{checkedInCount}</span> of{' '}
            <span className="font-bold text-[#1C1C1A]">{totalConfirmed}</span> attendees verified (
            <span className="text-[#2F7D4F] font-bold">{checkInPercentage}%</span>)
          </div>
        </div>

        {/* Progress Track */}
        <div className="w-full bg-[#E4E4E1]/50 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-[#2F7D4F] h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${checkInPercentage}%` }}
          />
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-1">
          <div className="bg-[#FAFAF9] p-3 rounded-lg border border-[#E4E4E1] text-center sm:text-left">
            <span className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-wider block">
              Total Confirmed
            </span>
            <div className="text-xl sm:text-2xl font-bold font-heading text-[#1C1C1A] mt-0.5 tabular-nums">
              {totalConfirmed}
            </div>
          </div>

          <div className="bg-[#F0F9F3] p-3 rounded-lg border border-[#2F7D4F]/20 text-center sm:text-left">
            <span className="text-[11px] font-semibold text-[#2F7D4F] uppercase tracking-wider block">
              Checked In
            </span>
            <div className="text-xl sm:text-2xl font-bold font-heading text-[#2F7D4F] mt-0.5 tabular-nums">
              {checkedInCount}
            </div>
          </div>

          <div className="bg-[#FDF9F0] p-3 rounded-lg border border-[#C17F16]/20 text-center sm:text-left">
            <span className="text-[11px] font-semibold text-[#C17F16] uppercase tracking-wider block">
              Pending Check-In
            </span>
            <div className="text-xl sm:text-2xl font-bold font-heading text-[#C17F16] mt-0.5 tabular-nums">
              {pendingCount}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Check-In Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E4E4E1] shadow-2xs space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#6B6B66]" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, phone, badge ID, institution... (Press '/' to focus)"
            className="w-full h-10 pl-9 pr-8 text-sm rounded-lg border border-[#E4E4E1] bg-[#FAFAF9] focus:bg-white focus:outline-none focus:border-[#14595A] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-[#6B6B66] hover:text-[#1C1C1A]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Tabs & Selectors */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Status Segmented Tabs */}
          <div className="flex items-center p-1 bg-[#FAFAF9] rounded-lg border border-[#E4E4E1] overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-[#1C1C1A] shadow-xs font-bold'
                  : 'text-[#6B6B66] hover:text-[#1C1C1A]'
              }`}
            >
              All Attendees ({totalConfirmed})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-white text-[#C17F16] shadow-xs font-bold'
                  : 'text-[#6B6B66] hover:text-[#C17F16]'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-[#C17F16]" />
              <span>Pending ({pendingCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('checked_in')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'checked_in'
                  ? 'bg-white text-[#2F7D4F] shadow-xs font-bold'
                  : 'text-[#6B6B66] hover:text-[#2F7D4F]'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-[#2F7D4F]" />
              <span>Checked In ({checkedInCount})</span>
            </button>
          </div>

          {/* Secondary Filters: Badge Type & Sort */}
          <div className="flex items-center gap-2">
            {/* Badge Type Filter */}
            <div className="flex items-center space-x-1.5 bg-[#FAFAF9] px-2.5 py-1 rounded-lg border border-[#E4E4E1] text-xs">
              <Tag className="h-3.5 w-3.5 text-[#6B6B66]" />
              <select
                value={badgeFilter}
                onChange={e => setBadgeFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-[#1C1C1A] focus:outline-none cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="Delegate">Delegate</option>
                <option value="Speaker">Speaker</option>
                <option value="Volunteer">Volunteer</option>
                <option value="Contestant">Contestant</option>
                <option value="Staff">Staff</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center space-x-1.5 bg-[#FAFAF9] px-2.5 py-1 rounded-lg border border-[#E4E4E1] text-xs">
              <ArrowUpDown className="h-3.5 w-3.5 text-[#6B6B66]" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-semibold text-[#1C1C1A] focus:outline-none cursor-pointer"
              >
                <option value="name_asc">Name (A → Z)</option>
                <option value="name_desc">Name (Z → A)</option>
                <option value="recent_checkin">Recent Check-In</option>
                <option value="id">Badge ID</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Check-In Attendees Roster */}
      <div className="bg-white rounded-xl border border-[#E4E4E1] shadow-2xs overflow-hidden">
        {displayRegistrations.length > 0 ? (
          <div className="divide-y divide-[#E4E4E1]">
            {displayRegistrations.map(reg => {
              const participant = data.participants.find(p => p.id === reg.participantId);
              if (!participant) return null;

              const isCheckedIn = reg.checkInStatus === 'Checked In';
              const badgeType = reg.badgeType || participant.badgeType || 'Delegate';
              const badgeTheme = getBadgeTitleTheme(badgeType);
              const room = reg.roomAssignmentId ? data.rooms.find(r => r.id === reg.roomAssignmentId) : null;

              // Initials for avatar
              const initials = participant.fullName
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <div
                  key={reg.id}
                  className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    isCheckedIn ? 'bg-[#FAFCFA]/60 hover:bg-[#F2F8F4]' : 'hover:bg-[#FAFAF9]'
                  }`}
                >
                  {/* Left: Attendee Details */}
                  <div className="flex items-start space-x-3.5">
                    {/* Avatar with Initials */}
                    <div className="relative shrink-0">
                      <div className="h-11 w-11 rounded-full bg-[#14595A]/10 text-[#14595A] font-bold text-sm flex items-center justify-center border border-[#14595A]/20">
                        {initials}
                      </div>
                      {isCheckedIn && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-[#2F7D4F] text-white rounded-full flex items-center justify-center ring-2 ring-white">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm sm:text-base font-bold text-[#1C1C1A]">
                          {participant.fullName}
                        </span>

                        {/* Role Badge */}
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeTheme.border} ${badgeTheme.bg} ${badgeTheme.text}`}
                        >
                          {badgeTheme.label}
                        </span>

                        {/* Organization / Institution */}
                        {participant.organization && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6B6B66] bg-[#FAFAF9] px-2 py-0.5 rounded border border-[#E4E4E1]">
                            <Building2 className="h-3 w-3 text-[#6B6B66]" />
                            <span>{participant.organization}</span>
                          </span>
                        )}
                      </div>

                      {/* Contact & Registration IDs */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6B6B66]">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 text-[#6B6B66]" />
                          <span>{participant.email}</span>
                        </span>
                        {participant.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-[#6B6B66]" />
                            <span>{participant.phone}</span>
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-[#1C1C1A] bg-[#FAFAF9] px-1.5 py-0.5 rounded border border-[#E4E4E1]">
                          ID: {reg.id}
                        </span>
                      </div>

                      {/* Accommodation / Room Tag */}
                      {reg.accommodationRequired && (
                        <div className="pt-0.5">
                          {room ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#14595A] bg-[#EBF4F4] px-2 py-0.5 rounded border border-[#14595A]/20">
                              <Bed className="h-3 w-3" />
                              <span>
                                Room {room.roomNumber} ({room.genderGroup} • Cap: {room.capacity})
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#C17F16] bg-[#FDF9F0] px-2 py-0.5 rounded border border-[#C17F16]/20">
                              <Bed className="h-3 w-3" />
                              <span>Accommodation Requested (Unassigned)</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Instant Check-In / Undo Button & Badge preview */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                    {/* View/Print Badge Button */}
                    <button
                      onClick={() =>
                        activeEvent &&
                        setBadgeModalData({
                          registration: reg,
                          participant,
                          event: activeEvent,
                        })
                      }
                      className="h-9 px-2.5 text-xs font-semibold text-[#6B6B66] hover:text-[#1C1C1A] bg-white border border-[#E4E4E1] rounded-lg hover:bg-[#FAFAF9] transition-colors cursor-pointer"
                      title="Preview / Print individual badge"
                    >
                      <Tag className="h-3.5 w-3.5" />
                    </button>

                    {/* Edit Attendee Details */}
                    <button
                      onClick={() => setEditingParticipant(participant)}
                      className="h-9 px-2.5 text-xs font-semibold text-[#6B6B66] hover:text-[#14595A] bg-white border border-[#E4E4E1] rounded-lg hover:bg-[#FAFAF9] transition-colors cursor-pointer"
                      title="Edit participant information"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    {/* Main 1-Click Check In / Verified Button */}
                    {isCheckedIn ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center space-x-1.5 h-10 px-3.5 bg-[#F0F9F3] text-[#2F7D4F] border border-[#2F7D4F]/30 rounded-lg text-xs font-bold">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>
                            Checked In
                            {reg.checkInTimestamp && (
                              <span className="font-normal text-[11px] ml-1 opacity-80">
                                {new Date(reg.checkInTimestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Undo checkin button */}
                        <button
                          onClick={() => handleToggleCheckIn(reg.id, false, participant.fullName)}
                          className="h-10 px-2.5 text-xs font-semibold text-[#6B6B66] hover:text-[#B0413E] hover:bg-[#FDF2F2] rounded-lg border border-transparent hover:border-[#B0413E]/20 transition-colors cursor-pointer"
                          title="Undo check-in"
                        >
                          <Undo2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleToggleCheckIn(reg.id, true, participant.fullName)}
                        className="flex items-center space-x-2 h-10 px-5 bg-[#2F7D4F] hover:bg-[#256640] text-white rounded-lg text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-98 cursor-pointer"
                      >
                        <UserCheck className="h-4 w-4" />
                        <span>Check In</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Clean Empty State */
          <div className="p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-[#FAFAF9] border border-[#E4E4E1] flex items-center justify-center mx-auto text-[#6B6B66]">
              {statusFilter === 'pending' && checkedInCount === totalConfirmed && totalConfirmed > 0 ? (
                <Sparkles className="h-6 w-6 text-[#2F7D4F]" />
              ) : (
                <Search className="h-6 w-6 text-[#6B6B66]" />
              )}
            </div>

            <div className="max-w-sm mx-auto space-y-1">
              <h3 className="text-sm font-bold text-[#1C1C1A]">
                {statusFilter === 'pending' && checkedInCount === totalConfirmed && totalConfirmed > 0
                  ? 'All Confirmed Delegates Checked In!'
                  : 'No Matching Delegates Found'}
              </h3>
              <p className="text-xs text-[#6B6B66]">
                {statusFilter === 'pending' && checkedInCount === totalConfirmed && totalConfirmed > 0
                  ? 'Great job! 100% of confirmed attendees for this event have been verified.'
                  : searchQuery
                  ? `No attendees match "${searchQuery}". Try searching another name, email, or badge ID.`
                  : 'No registrations match your current filter selection.'}
              </p>
            </div>

            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs font-semibold text-[#14595A] hover:underline cursor-pointer"
              >
                Clear search filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick Walk-In Registration Modal */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E4E4E1] max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E4E4E1]">
              <div className="flex items-center space-x-2">
                <Plus className="h-5 w-5 text-[#14595A]" />
                <h3 className="text-base font-bold text-[#1C1C1A] font-heading">
                  Quick On-Site Walk-In Registration
                </h3>
              </div>
              <button
                onClick={() => setShowWalkInModal(false)}
                className="text-[#6B6B66] hover:text-[#1C1C1A] p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleWalkInSubmit} className="p-4 sm:p-5 space-y-4">
              {walkInError && (
                <div className="p-3 bg-[#FDF2F2] border border-[#B0413E]/30 rounded-lg text-xs text-[#B0413E] flex items-center gap-2">
                  <BadgeAlert className="h-4 w-4 shrink-0" />
                  <span>{walkInError}</span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#1C1C1A] mb-1">
                    Full Name <span className="text-[#B0413E]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={walkInForm.fullName}
                    onChange={e => setWalkInForm({ ...walkInForm, fullName: e.target.value })}
                    placeholder="e.g. Kwame Mensah"
                    className="w-full h-9 px-3 rounded-md border border-[#E4E4E1] bg-[#FAFAF9] focus:bg-white focus:outline-none focus:border-[#14595A]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#1C1C1A] mb-1">
                      Email Address <span className="text-[#B0413E]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={walkInForm.email}
                      onChange={e => setWalkInForm({ ...walkInForm, email: e.target.value })}
                      placeholder="kwame@example.com"
                      className="w-full h-9 px-3 rounded-md border border-[#E4E4E1] bg-[#FAFAF9] focus:bg-white focus:outline-none focus:border-[#14595A]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1C1C1A] mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={walkInForm.phone}
                      onChange={e => setWalkInForm({ ...walkInForm, phone: e.target.value })}
                      placeholder="+233 24 123 4567"
                      className="w-full h-9 px-3 rounded-md border border-[#E4E4E1] bg-[#FAFAF9] focus:bg-white focus:outline-none focus:border-[#14595A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#1C1C1A] mb-1">
                      Organization / School
                    </label>
                    <input
                      type="text"
                      value={walkInForm.organization}
                      onChange={e => setWalkInForm({ ...walkInForm, organization: e.target.value })}
                      placeholder="e.g. Ashesi University"
                      className="w-full h-9 px-3 rounded-md border border-[#E4E4E1] bg-[#FAFAF9] focus:bg-white focus:outline-none focus:border-[#14595A]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1C1C1A] mb-1">Badge Role</label>
                    <select
                      value={walkInForm.badgeType}
                      onChange={e =>
                        setWalkInForm({ ...walkInForm, badgeType: e.target.value as ParticipantBadgeType })
                      }
                      className="w-full h-9 px-2.5 rounded-md border border-[#E4E4E1] bg-[#FAFAF9] focus:bg-white focus:outline-none focus:border-[#14595A]"
                    >
                      <option value="Delegate">Delegate</option>
                      <option value="Speaker">Speaker</option>
                      <option value="Volunteer">Volunteer</option>
                      <option value="Contestant">Contestant</option>
                      <option value="Staff">Staff</option>
                      <option value="Coordinator">Coordinator</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#1C1C1A] mb-1">Gender</label>
                    <select
                      value={walkInForm.gender}
                      onChange={e => setWalkInForm({ ...walkInForm, gender: e.target.value })}
                      className="w-full h-9 px-2.5 rounded-md border border-[#E4E4E1] bg-[#FAFAF9] focus:bg-white focus:outline-none focus:border-[#14595A]"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={walkInForm.accommodationRequired}
                        onChange={e =>
                          setWalkInForm({ ...walkInForm, accommodationRequired: e.target.checked })
                        }
                        className="rounded border-[#E4E4E1] text-[#14595A] focus:ring-[#14595A]"
                      />
                      <span className="text-xs font-semibold text-[#1C1C1A]">
                        Needs Accommodation
                      </span>
                    </label>
                  </div>
                </div>

                {/* Check In Immediately Checkbox */}
                <div className="p-3 bg-[#F0F9F3] border border-[#2F7D4F]/20 rounded-lg">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={walkInForm.checkInImmediately}
                      onChange={e =>
                        setWalkInForm({ ...walkInForm, checkInImmediately: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-[#2F7D4F] text-[#2F7D4F] focus:ring-[#2F7D4F]"
                    />
                    <div>
                      <span className="text-xs font-bold text-[#2F7D4F] block">
                        Check In Immediately
                      </span>
                      <span className="text-[11px] text-[#6B6B66]">
                        Verify and mark attendee as checked in right now upon registration.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E4E4E1]">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="h-9 px-3 text-xs font-semibold text-[#6B6B66] hover:text-[#1C1C1A] rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={walkInSubmitting}
                  className="h-9 px-4 text-xs font-bold text-white bg-[#14595A] hover:bg-[#0E4243] rounded-md transition-colors cursor-pointer"
                >
                  {walkInSubmitting ? 'Registering...' : 'Register Walk-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Individual Participant Badge Modal */}
      {badgeModalData && (
        <ParticipantBadgeModal
          isOpen={true}
          onClose={() => setBadgeModalData(null)}
          registration={badgeModalData.registration}
          participant={badgeModalData.participant}
          event={badgeModalData.event}
        />
      )}

      {/* Batch Badge Print Modal */}
      <BatchBadgePrintModal
        isOpen={showBatchPrintModal}
        onClose={() => setShowBatchPrintModal(false)}
        initialEventId={activeEventId}
      />

      {/* Edit Attendee Details Modal */}
      <EditParticipantModal
        isOpen={!!editingParticipant}
        participant={editingParticipant}
        onClose={() => setEditingParticipant(null)}
      />
    </div>
  );
};
