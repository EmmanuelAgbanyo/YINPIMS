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
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import type { User, Event } from '../../types';
import { 
  dispatchViaMailto, 
  dispatchFirebasePasswordSetup, 
  copyInviteToClipboard,
  generateStaffInviteText,
  resolveEventNames
} from '../../services/emailService';

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
  const [isSendingFirebaseEmail, setIsSendingFirebaseEmail] = useState(false);
  const [firebaseEmailResult, setFirebaseEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [mailtoSuccess, setMailtoSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  if (!isOpen) return null;

  const passwordToDisplay = provisionalPassword || user.provisionalPassword || '(Default / Pre-existing)';
  const assignedEventNames = resolveEventNames(user.assignedEvents, events);
  const { subject, body } = generateStaffInviteText(user, passwordToDisplay, events);

  const handleCopyFull = async () => {
    const res = await copyInviteToClipboard(user, passwordToDisplay, events);
    if (res.success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenEmailClient = () => {
    dispatchViaMailto(user, passwordToDisplay, events);
    setMailtoSuccess(true);
    setTimeout(() => setMailtoSuccess(false), 3000);
  };

  const handleDispatchFirebaseReset = async () => {
    setIsSendingFirebaseEmail(true);
    setFirebaseEmailResult(null);
    try {
      const res = await dispatchFirebasePasswordSetup(user.email);
      setFirebaseEmailResult(res);
    } catch (err: any) {
      setFirebaseEmailResult({
        success: false,
        message: err?.message || 'Failed to dispatch email',
      });
    } finally {
      setIsSendingFirebaseEmail(false);
    }
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

          {/* Email Dispatch Action Hub */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B66] block">
              Official Email Delivery Channels
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option A: Launch Default Mail Client */}
              <button
                onClick={handleOpenEmailClient}
                className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-2xs border cursor-pointer ${
                  mailtoSuccess
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-[#14595A] text-white border-transparent hover:bg-[#0E4243]'
                }`}
              >
                {mailtoSuccess ? <Check className="h-4 w-4 text-emerald-600" /> : <Mail className="h-4 w-4" />}
                <span>{mailtoSuccess ? 'Mail App Opened!' : 'Send via Email App'}</span>
              </button>

              {/* Option B: Dispatch Direct Firebase Password Link */}
              <button
                onClick={handleDispatchFirebaseReset}
                disabled={isSendingFirebaseEmail}
                className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold border border-[#E4E4E1] bg-white text-[#1C1C1A] hover:bg-[#FAFAF9] transition-all shadow-2xs cursor-pointer disabled:opacity-60"
              >
                {isSendingFirebaseEmail ? (
                  <RefreshCw className="h-4 w-4 text-[#14595A] animate-spin" />
                ) : (
                  <Send className="h-4 w-4 text-[#14595A]" />
                )}
                <span>{isSendingFirebaseEmail ? 'Sending...' : 'Send Firebase Setup Email'}</span>
              </button>
            </div>

            {/* Option C: Copy full formatted invitation */}
            <button
              onClick={handleCopyFull}
              className={`w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-[#E4E4E1] text-[#6B6B66] hover:text-[#1C1C1A] hover:bg-[#FAFAF9]'
              }`}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Full Email Text Copied!' : 'Copy Full Invite Email Text'}</span>
            </button>
          </div>

          {/* Feedback message for Firebase Email */}
          {firebaseEmailResult && (
            <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
              firebaseEmailResult.success 
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {firebaseEmailResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              )}
              <span>{firebaseEmailResult.message}</span>
            </div>
          )}

          {/* Expandable Email Preview Accordion */}
          <div className="border border-[#E4E4E1] rounded-2xl overflow-hidden text-xs">
            <button
              onClick={() => setShowPreview(prev => !prev)}
              className="w-full px-4 py-2.5 bg-gray-50 flex items-center justify-between text-[#6B6B66] font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#14595A]" />
                <span>Preview Formatted Onboarding Email</span>
              </span>
              {showPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {showPreview && (
              <div className="p-4 bg-[#FAFAF9] font-mono text-[11px] text-[#333] space-y-2 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto border-t border-[#E4E4E1]">
                <div className="text-[#14595A] font-bold border-b border-gray-200 pb-1">
                  Subject: {subject}
                </div>
                <div>{body}</div>
              </div>
            )}
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
