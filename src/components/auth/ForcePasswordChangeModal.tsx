import React, { useState } from 'react';
import { ShieldAlert, KeyRound, Eye, EyeOff, Check, AlertCircle, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ForcePasswordChangeModal: React.FC = () => {
  const { currentUser, impersonatedUser, completePasswordReset, logout } = useApp();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user does not require password change or Superadmin is impersonating, don't display modal
  if (!currentUser || !currentUser.mustChangePassword || !!impersonatedUser) {
    return null;
  }

  // Password strength validator
  const hasMinLength = newPassword.length >= 6;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!hasMinLength) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    try {
      completePasswordReset(newPassword);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto font-body">
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl border border-[#E4E4E1] overflow-hidden">
        
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-[#14595A] to-[#0E4243] px-6 py-5 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 text-amber-300">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg leading-tight">First-Time Security Setup</h3>
              <p className="text-xs text-white/80 mt-0.5">
                Recreate your account password to continue
              </p>
            </div>
          </div>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <p className="font-bold mb-1 flex items-center gap-1.5">
              <KeyRound className="h-4 w-4 text-amber-700" />
              <span>Provisional Password Detected</span>
            </p>
            You are logged in with a temporary provisional password issued by your administrator (<strong>{currentUser.email}</strong>). Please set your permanent security password below.
          </div>

          {errorMsg && (
            <div className="flex items-start space-x-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">New Permanent Password *</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#6B6B66]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new strong password"
                className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-10 pr-10 py-2.5 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-[#6B6B66] hover:text-[#1C1C1A] cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Confirm New Password *</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#6B6B66]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-10 pr-3 py-2.5 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none"
              />
            </div>
          </div>

          {/* Password Requirements Checklist */}
          <div className="p-3 bg-[#FAFAF9] border border-[#E4E4E1] rounded-xl space-y-1.5 text-[11px]">
            <div className="font-bold text-[#6B6B66] uppercase tracking-wider text-[10px] mb-1">Password Requirements:</div>
            <div className={`flex items-center space-x-1.5 font-medium ${hasMinLength ? 'text-emerald-700' : 'text-[#6B6B66]'}`}>
              <Check className={`h-3.5 w-3.5 ${hasMinLength ? 'text-emerald-600 font-bold' : 'text-gray-300'}`} />
              <span>At least 6 characters long</span>
            </div>
            <div className={`flex items-center space-x-1.5 font-medium ${hasUppercase ? 'text-emerald-700' : 'text-[#6B6B66]'}`}>
              <Check className={`h-3.5 w-3.5 ${hasUppercase ? 'text-emerald-600 font-bold' : 'text-gray-300'}`} />
              <span>Contains at least one uppercase letter (A-Z)</span>
            </div>
            <div className={`flex items-center space-x-1.5 font-medium ${hasNumber ? 'text-emerald-700' : 'text-[#6B6B66]'}`}>
              <Check className={`h-3.5 w-3.5 ${hasNumber ? 'text-emerald-600 font-bold' : 'text-gray-300'}`} />
              <span>Contains at least one number (0-9)</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#14595A] py-3 text-xs font-semibold text-white hover:bg-[#0E4243] transition-colors shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <Check className="h-4 w-4" />
            <span>{isSubmitting ? 'Saving New Password...' : 'Save Password & Enter System'}</span>
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full text-center text-xs text-[#6B6B66] hover:text-red-600 hover:underline pt-1 cursor-pointer"
          >
            Sign out and return to login
          </button>
        </form>
      </div>
    </div>
  );
};
