import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  KeyRound, 
  Mail, 
  ShieldCheck, 
  Calendar, 
  Send, 
  CheckCircle2 
} from 'lucide-react';
import type { User, Event } from '../../types';

interface StaffInviteCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  events: Event[];
  provisionalPassword?: string;
}

export const StaffInviteCardModal: React.FC<StaffInviteCardModalProps> = ({
  isOpen,
  onClose,
  user,
  events,
  provisionalPassword,
}) => {
  const [copied, setCopied] = useState(false);
  const [simulatedSent, setSimulatedSent] = useState(false);

  if (!isOpen) return null;

  const passwordToDisplay = provisionalPassword || user.provisionalPassword || '(Default / Pre-existing)';

  // Resolve assigned event names
  const assignedEventNames = user.assignedEvents?.includes('*') || !user.assignedEvents
    ? 'All Events (Global Scope)'
    : user.assignedEvents.length === 0
      ? 'No Events Assigned'
      : user.assignedEvents
          .map(id => events.find(e => e.id === id)?.name || id)
          .join(', ');

  const credentialsSummaryText = `=== YIN-PIMS STAFF CREDENTIALS ===
Name: ${user.name}
Email: ${user.email}
Role: ${user.role}
Provisional Password: ${passwordToDisplay}
Assigned Events: ${assignedEventNames}
Portal URL: ${window.location.origin}

Instructions: Log in using your email and provisional password. You will be prompted to recreate your secure password upon first sign-in.
==================================`;

  const handleCopy = () => {
    navigator.clipboard.writeText(credentialsSummaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSimulateEmail = () => {
    setSimulatedSent(true);
    setTimeout(() => setSimulatedSent(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto font-body">
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-[#E4E4E1] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#14595A] via-[#0E4243] to-[#0A3233] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 text-amber-300">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base">Staff Access Credentials Card</h3>
              <p className="text-xs text-white/80 mt-0.5">Provisional login details for staff onboarding</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Card */}
        <div className="p-6 space-y-5">
          {/* Notification banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start space-x-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Staff Account Ready:</span> Send these credentials to the staff member. They will be required to recreate their permanent password upon logging in.
            </div>
          </div>

          {/* Credentials Box */}
          <div className="bg-[#FAFAF9] border border-[#E4E4E1] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#E4E4E1] pb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B66]">Staff Member</span>
              <span className="text-xs font-bold text-[#1C1C1A]">{user.name}</span>
            </div>

            <div className="flex items-center justify-between border-b border-[#E4E4E1] pb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B66] flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-[#14595A]" /> Email Login
              </span>
              <span className="text-xs font-mono font-bold text-[#1C1C1A]">{user.email}</span>
            </div>

            <div className="flex items-center justify-between border-b border-[#E4E4E1] pb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B66] flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-[#14595A]" /> System Role
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#14595A]/10 text-[#14595A] border border-[#14595A]/20">
                {user.role}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-[#E4E4E1] pb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B66] flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-[#14595A]" /> Assigned Events
              </span>
              <span className="text-xs font-semibold text-[#1C1C1A] max-w-xs text-right truncate">
                {assignedEventNames}
              </span>
            </div>

            <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">Provisional Password</span>
                <span className="font-mono text-sm font-bold text-[#1C1C1A] tracking-wider">{passwordToDisplay}</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200/60 text-amber-900 border border-amber-300">
                Must Recreate on Login
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleCopy}
              className={`flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                copied 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-[#14595A] text-white hover:bg-[#0E4243]'
              }`}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Credentials Copied!' : 'Copy Credentials'}</span>
            </button>

            <button
              onClick={handleSimulateEmail}
              className={`flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all shadow-2xs cursor-pointer ${
                simulatedSent
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-[#E4E4E1] text-[#1C1C1A] hover:bg-[#FAFAF9]'
              }`}
            >
              {simulatedSent ? <Check className="h-4 w-4 text-emerald-600" /> : <Send className="h-4 w-4 text-[#14595A]" />}
              <span>{simulatedSent ? 'Email Dispatched!' : 'Simulate Send Email'}</span>
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-[#6B6B66] hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
