import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/db';
import type { Registration, Participant } from '../../types';
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  UserCheck,
  UserX,
  Camera,
  Calendar,
  Sparkles,
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

  // Search query for manual fallback
  const [searchQuery, setSearchQuery] = useState('');

  // Scanning Result State
  const [scanResult, setScanResult] = useState<{
    status: 'success' | 'already_checked_in' | 'wrong_event' | 'invalid' | 'waitlisted';
    message: string;
    participant?: Participant;
    registration?: Registration;
  } | null>(null);

  const [scannerActive, setScannerActive] = useState(false);

  useEffect(() => {
    if (selectedEventId !== 'all') {
      setActiveEventId(selectedEventId);
    }
  }, [selectedEventId]);

  // Handle Scan Logic
  const handleScanCode = (qrCodeString: string) => {
    if (!activeEvent) return;

    const allRegs = data.registrations;
    const reg = allRegs.find(r => r.qrIdentifier === qrCodeString || r.id === qrCodeString);

    if (!reg) {
      setScanResult({
        status: 'invalid',
        message: `Invalid QR Code scanned: "${qrCodeString}". No matching registration record found.`,
      });
      return;
    }

    if (reg.eventId !== activeEvent.id) {
      const otherEvent = data.events.find(e => e.id === reg.eventId);
      setScanResult({
        status: 'wrong_event',
        message: `QR Code belongs to another event: "${otherEvent?.name || 'Unknown Event'}".`,
      });
      return;
    }

    if (reg.status === 'Waitlisted') {
      setScanResult({
        status: 'waitlisted',
        message: `Participant is currently on the WAITLIST (Position #${reg.waitlistPosition}). Cannot check in.`,
      });
      return;
    }

    const participant = data.participants.find(p => p.id === reg.participantId);

    if (reg.checkInStatus === 'Checked In') {
      setScanResult({
        status: 'already_checked_in',
        message: `Participant ${participant?.fullName || ''} was ALREADY checked in on ${new Date(reg.checkInTimestamp || '').toLocaleTimeString()}.`,
        participant,
        registration: reg,
      });
      return;
    }

    // Perform Check-in
    const res = db.updateCheckInStatus(reg.id, true);
    refreshData();

    setScanResult({
      status: 'success',
      message: `Check-in Verified for ${participant?.fullName || ''}!`,
      participant,
      registration: res.registration,
    });
  };

  // Setup HTML5 Camera Scanner
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (scannerActive) {
      scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 220, height: 220 } },
        false
      );

      scanner.render(
        (decodedText) => {
          handleScanCode(decodedText);
          scanner?.clear();
          setScannerActive(false);
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
  }, [scannerActive, activeEventId]);

  // Filter registrations for manual check-in list
  const confirmedRegistrations = data.registrations.filter(r => r.eventId === activeEventId && r.status === 'Confirmed');

  const filteredManualList = confirmedRegistrations.filter(reg => {
    const p = data.participants.find(part => part.id === reg.participantId);
    if (!p) return false;

    const query = searchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(query) ||
      p.email.toLowerCase().includes(query) ||
      p.phone.includes(query) ||
      reg.id.toLowerCase().includes(query)
    );
  });

  const checkedInCount = confirmedRegistrations.filter(r => r.checkInStatus === 'Checked In').length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E4E1]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1C1A] tracking-tight">
            Event Check-In Terminal
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B66] mt-0.5">
            Scan participant QR code badges or perform instant manual search check-in.
          </p>
        </div>

        {/* Event Scope Switcher */}
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-[#14595A]" />
          <select
            value={activeEventId}
            onChange={e => {
              setActiveEventId(e.target.value);
              setSelectedEventId(e.target.value);
              setScanResult(null);
            }}
            className="h-9 px-3 text-xs font-semibold rounded-md border border-[#E4E4E1] bg-white text-[#1C1C1A] focus:outline-none focus:border-[#14595A] cursor-pointer"
          >
            {data.events.map(e => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Real-time Check-In Statistics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[#E4E4E1] shadow-2xs">
          <span className="text-xs font-semibold text-[#6B6B66]">Total Confirmed</span>
          <div className="text-xl font-bold font-heading text-[#1C1C1A] mt-1 tabular-nums">
            {confirmedRegistrations.length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E4E4E1] shadow-2xs">
          <span className="text-xs font-semibold text-[#6B6B66]">Checked In Delegates</span>
          <div className="text-xl font-bold font-heading text-[#2F7D4F] mt-1 tabular-nums">
            {checkedInCount} ({confirmedRegistrations.length > 0 ? Math.round((checkedInCount / confirmedRegistrations.length) * 100) : 0}%)
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E4E4E1] shadow-2xs">
          <span className="text-xs font-semibold text-[#6B6B66]">Remaining Expected</span>
          <div className="text-xl font-bold font-heading text-[#C17F16] mt-1 tabular-nums">
            {confirmedRegistrations.length - checkedInCount}
          </div>
        </div>
      </div>

      {/* QR Scanner & Simulator Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera / Simulator Panel */}
        <div className="bg-white p-5 rounded-lg border border-[#E4E4E1] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1C1C1A] font-heading flex items-center space-x-2">
              <QrCode className="h-4 w-4 text-[#14595A]" />
              <span>QR Code Scanner Terminal</span>
            </h2>

            <button
              onClick={() => setScannerActive(!scannerActive)}
              className="flex items-center space-x-1.5 h-8 px-3 text-xs font-medium text-white bg-[#14595A] rounded-md hover:bg-[#0E4243] transition-colors cursor-pointer shadow-2xs"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>{scannerActive ? 'Stop Camera' : 'Start Device Camera'}</span>
            </button>
          </div>

          {/* Camera Viewport */}
          {scannerActive ? (
            <div id="qr-reader" className="w-full rounded-md border border-[#E4E4E1] overflow-hidden" />
          ) : (
            <div className="h-48 bg-[#FAFAF9] rounded-md border border-dashed border-[#E4E4E1] flex flex-col items-center justify-center text-center p-4 space-y-2">
              <Camera className="h-8 w-8 text-[#6B6B66]" />
              <div className="text-xs font-semibold text-[#1C1C1A]">Camera Scanner Ready</div>
              <p className="text-[11px] text-[#6B6B66] max-w-xs">
                Click "Start Device Camera" to scan badges via webcam, or use test pass buttons below.
              </p>
            </div>
          )}

          {/* Test Pass Scanner Simulator */}
          <div className="p-3 bg-[#EBF4F4] border border-[#14595A]/20 rounded-md space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#14595A]">
              <span className="flex items-center space-x-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Test QR Simulator (Instant Dev Scan)</span>
              </span>
              <span className="text-[10px] text-[#6B6B66] font-normal">Click to trigger scan</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                onClick={() => handleScanCode('QR-PIMS-EVT101-PRT001-REG01')}
                className="h-8 px-2 bg-white border border-[#E4E4E1] text-[#1C1C1A] text-[11px] font-medium rounded hover:bg-[#FAFAF9] text-left truncate cursor-pointer"
              >
                Scan: Elena Rostova (Valid)
              </button>
              <button
                onClick={() => handleScanCode('QR-PIMS-EVT101-PRT002-REG02')}
                className="h-8 px-2 bg-white border border-[#E4E4E1] text-[#1C1C1A] text-[11px] font-medium rounded hover:bg-[#FAFAF9] text-left truncate cursor-pointer"
              >
                Scan: Marcus Vance (Valid)
              </button>
              <button
                onClick={() => handleScanCode('QR-PIMS-EVT102-PRT004-REG01')}
                className="h-8 px-2 bg-white border border-[#E4E4E1] text-[#1C1C1A] text-[11px] font-medium rounded hover:bg-[#FAFAF9] text-left truncate cursor-pointer"
              >
                Scan: Wrong Event Pass
              </button>
              <button
                onClick={() => handleScanCode('QR-INVALID-TEST-STRING')}
                className="h-8 px-2 bg-white border border-[#E4E4E1] text-[#1C1C1A] text-[11px] font-medium rounded hover:bg-[#FAFAF9] text-left truncate cursor-pointer"
              >
                Scan: Fake QR Code
              </button>
            </div>
          </div>

          {/* Validation Result Display Banner */}
          {scanResult && (
            <div className={`p-4 rounded-md border space-y-2 ${
              scanResult.status === 'success'
                ? 'bg-[#F0F9F3] border-[#2F7D4F]/30 text-[#2F7D4F]'
                : scanResult.status === 'already_checked_in'
                ? 'bg-[#FDF9F0] border-[#C17F16]/30 text-[#C17F16]'
                : 'bg-[#FDF2F2] border-[#B0413E]/30 text-[#B0413E]'
            }`}>
              <div className="flex items-start space-x-2.5">
                {scanResult.status === 'success' && <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />}
                {scanResult.status === 'already_checked_in' && <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />}
                {(scanResult.status === 'wrong_event' || scanResult.status === 'invalid' || scanResult.status === 'waitlisted') && (
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
                  <p className="text-xs mt-0.5 font-medium leading-relaxed">
                    {scanResult.message}
                  </p>
                </div>
              </div>

              {scanResult.participant && (
                <div className="pt-2 border-t border-current/20 text-xs flex justify-between font-medium">
                  <span>Participant: <strong>{scanResult.participant.fullName}</strong></span>
                  <span>ID: <code className="tabular-nums font-mono">{scanResult.registration?.id}</code></span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manual Fallback Check-In Search */}
        <div className="bg-white p-5 rounded-lg border border-[#E4E4E1] shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#1C1C1A] font-heading flex items-center space-x-2">
              <Search className="h-4 w-4 text-[#14595A]" />
              <span>Manual Search Check-In</span>
            </h2>

            {/* Instant Search Bar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#6B6B66]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by participant name, registration ID, email..."
                className="w-full h-9 pl-8 pr-3 text-xs rounded-md border border-[#E4E4E1] bg-[#FAFAF9] focus:bg-white focus:outline-none focus:border-[#14595A]"
              />
            </div>

            {/* Matching Participants List */}
            <div className="divide-y divide-[#E4E4E1] max-h-80 overflow-y-auto pr-1">
              {filteredManualList.length > 0 ? (
                filteredManualList.map(reg => {
                  const p = data.participants.find(part => part.id === reg.participantId);
                  if (!p) return null;

                  const isCheckedIn = reg.checkInStatus === 'Checked In';

                  return (
                    <div key={reg.id} className="py-2.5 flex items-center justify-between gap-2 first:pt-0">
                      <div>
                        <div className="text-xs font-bold text-[#1C1C1A]">{p.fullName}</div>
                        <div className="text-[11px] text-[#6B6B66]">{p.email} • ID: <code className="tabular-nums">{reg.id}</code></div>
                      </div>

                      <button
                        onClick={() => {
                          db.updateCheckInStatus(reg.id, !isCheckedIn);
                          refreshData();
                        }}
                        className={`flex items-center space-x-1 h-7 px-2.5 text-xs font-semibold rounded cursor-pointer transition-colors ${
                          isCheckedIn
                            ? 'bg-[#F0F9F3] text-[#2F7D4F] border border-[#2F7D4F]/30 hover:bg-[#FDF2F2] hover:text-[#B0413E] hover:border-[#B0413E]/30'
                            : 'bg-[#14595A] text-white hover:bg-[#0E4243]'
                        }`}
                      >
                        {isCheckedIn ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Checked In</span>
                          </>
                        ) : (
                          <>
                            <UserX className="h-3.5 w-3.5" />
                            <span>Check In</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-[#6B6B66]">
                  No matching registered delegates found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
