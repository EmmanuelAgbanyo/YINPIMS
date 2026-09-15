import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Phone, 
  ShieldCheck, 
  LogOut, 
  CheckCircle, 
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  Shield
} from 'lucide-react';
import { 
  auth, 
  signUpWithEmail, 
  signInWithEmail, 
  signInWithGoogle, 
  createRecaptchaVerifier, 
  sendPhoneVerificationCode, 
  logoutUser, 
  onAuthUserChange,
  resetUserPassword
} from '../../services/firebase';
import type { User as FirebaseUser, ConfirmationResult } from 'firebase/auth';
import type { UserRole } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'email_signin' | 'email_signup' | 'phone' | 'forgot_password';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [mode, setMode] = useState<AuthMode>('email_signin');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('EVENT_COORDINATOR');
  
  // Phone auth fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthUserChange((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      setSuccessMsg('Welcome back! Successfully logged in.');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password. Please double check your details or reset password.');
      } else {
        setError(err.message || 'Failed to sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await signUpWithEmail(email, password, displayName);
      setSuccessMsg('Account created and logged in successfully!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email address already exists.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!email) {
      setError('Please enter your email address to receive password reset instructions.');
      return;
    }
    setLoading(true);
    try {
      await resetUserPassword(email);
      setSuccessMsg(`Password reset link sent to ${email}. Check your inbox!`);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      setSuccessMsg('Successfully authenticated with Google!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!phoneNumber) {
      setError('Please enter a valid phone number with country code (e.g. +1 555 123 4567)');
      return;
    }
    setLoading(true);
    try {
      const verifier = createRecaptchaVerifier('recaptcha-container');
      const result = await sendPhoneVerificationCode(phoneNumber, verifier);
      setConfirmationResult(result);
      setSuccessMsg('SMS verification code sent! Check your mobile phone.');
    } catch (err: any) {
      setError(err.message || 'Failed to send SMS code. Please check phone number format.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!confirmationResult || !verificationCode) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    try {
      await confirmationResult.confirm(verificationCode);
      setSuccessMsg('Phone authentication successful!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setSuccessMsg('Signed out successfully.');
      setConfirmationResult(null);
    } catch (err: any) {
      setError(err.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[#E4E4E1] overflow-hidden transition-all">
        {/* Header Branding */}
        <div className="flex items-center justify-between border-b border-[#E4E4E1] px-6 py-4 bg-[#FAFAF9]">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#14595A] text-white shadow-2xs font-heading font-bold text-lg">
              P
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-[#1C1C1A]">
                PIMS Authentication
              </h3>
              <p className="text-[11px] font-medium text-[#6B6B66]">Firebase Backend Integration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#6B6B66] hover:bg-[#E4E4E1] hover:text-[#1C1C1A] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-start space-x-2.5 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200 shadow-2xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-center space-x-2.5 rounded-xl bg-emerald-50 p-3.5 text-xs text-emerald-800 border border-emerald-200 shadow-2xs">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {/* If already authenticated */}
          {currentUser ? (
            <div className="space-y-5 text-center py-2">
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#14595A]/10 text-[#14595A] border-2 border-[#14595A]/20">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="User Avatar" className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <UserIcon className="h-10 w-10 text-[#14595A]" />
                )}
                <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center" title="Online & Authenticated">
                  <CheckCircle className="h-3 w-3 text-white" />
                </div>
              </div>

              <div>
                <h4 className="font-heading font-bold text-lg text-[#1C1C1A]">
                  {currentUser.displayName || 'PIMS Authorized User'}
                </h4>
                <p className="text-xs font-medium text-[#6B6B66] mt-0.5">
                  {currentUser.email || currentUser.phoneNumber}
                </p>
                <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>UID: {currentUser.uid.slice(0, 14)}...</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E4E4E1]">
                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out of PIMS</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Method Switcher Tabs */}
              {mode !== 'forgot_password' && (
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#FAFAF9] p-1 border border-[#E4E4E1] text-xs font-semibold">
                  <button
                    onClick={() => { setMode('email_signin'); setError(null); }}
                    className={`py-2 rounded-lg transition-colors cursor-pointer ${
                      mode === 'email_signin' ? 'bg-white text-[#14595A] shadow-2xs font-bold' : 'text-[#6B6B66] hover:text-[#1C1C1A]'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => { setMode('email_signup'); setError(null); }}
                    className={`py-2 rounded-lg transition-colors cursor-pointer ${
                      mode === 'email_signup' ? 'bg-white text-[#14595A] shadow-2xs font-bold' : 'text-[#6B6B66] hover:text-[#1C1C1A]'
                    }`}
                  >
                    Register
                  </button>
                  <button
                    onClick={() => { setMode('phone'); setError(null); }}
                    className={`py-2 rounded-lg transition-colors cursor-pointer ${
                      mode === 'phone' ? 'bg-white text-[#14595A] shadow-2xs font-bold' : 'text-[#6B6B66] hover:text-[#1C1C1A]'
                    }`}
                  >
                    Phone Auth
                  </button>
                </div>
              )}

              {/* Google Auth Quick Button */}
              {mode !== 'forgot_password' && (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2.5 rounded-xl border border-[#E4E4E1] bg-white px-4 py-2.5 text-xs font-semibold text-[#1C1C1A] hover:bg-[#FAFAF9] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              )}

              {mode !== 'forgot_password' && (
                <div className="relative flex items-center my-2">
                  <div className="flex-grow border-t border-[#E4E4E1]" />
                  <span className="shrink-0 px-3 text-[10px] font-bold text-[#6B6B66] uppercase tracking-wider">Or</span>
                  <div className="flex-grow border-t border-[#E4E4E1]" />
                </div>
              )}

              {/* Email Sign In Form */}
              {mode === 'email_signin' && (
                <form onSubmit={handleEmailSignIn} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6B66]" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@gili-institute.org"
                        className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-9 pr-3 py-2 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-[#1C1C1A]">Password</label>
                      <button
                        type="button"
                        onClick={() => { setMode('forgot_password'); setError(null); }}
                        className="text-[11px] font-semibold text-[#14595A] hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6B66]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-9 pr-9 py-2 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-[#6B6B66] hover:text-[#1C1C1A] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-[#14595A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0E4243] transition-colors shadow-2xs cursor-pointer disabled:opacity-50 mt-1"
                  >
                    {loading ? 'Signing in...' : 'Sign In to Account'}
                  </button>
                </form>
              )}

              {/* Email Sign Up Form */}
              {mode === 'email_signup' && (
                <form onSubmit={handleEmailSignUp} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Full Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6B66]" />
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Sarah Jenkins"
                        className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-9 pr-3 py-2 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6B66]" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="sarah.jenkins@gili-institute.org"
                        className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-9 pr-3 py-2 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6B66]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-9 pr-9 py-2 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-[#6B6B66] hover:text-[#1C1C1A] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">PIMS Role Permission</label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6B66]" />
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-9 pr-3 py-2 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none cursor-pointer"
                      >
                        <option value="ADMIN">System Administrator</option>
                        <option value="EVENT_COORDINATOR">Event Coordinator</option>
                        <option value="CHECKIN_STAFF">Check-in Staff</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-[#14595A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0E4243] transition-colors shadow-2xs cursor-pointer disabled:opacity-50 mt-1"
                  >
                    {loading ? 'Creating Account...' : 'Create PIMS Account'}
                  </button>
                </form>
              )}

              {/* Forgot Password View */}
              {mode === 'forgot_password' && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => { setMode('email_signin'); setError(null); setSuccessMsg(null); }}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#14595A] hover:underline cursor-pointer mb-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Sign In</span>
                  </button>

                  <div>
                    <h4 className="font-bold text-sm text-[#1C1C1A]">Reset Your Password</h4>
                    <p className="text-xs text-[#6B6B66] mt-0.5">
                      Enter your account email address below and we will send you a password reset link.
                    </p>
                  </div>

                  <form onSubmit={handleForgotPassword} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6B66]" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-9 pr-3 py-2 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-[#14595A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0E4243] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      {loading ? 'Sending link...' : 'Send Reset Link'}
                    </button>
                  </form>
                </div>
              )}

              {/* Phone Authentication Form */}
              {mode === 'phone' && (
                <div className="space-y-3.5">
                  {!confirmationResult ? (
                    <form onSubmit={handleSendPhoneCode} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Mobile Phone Number (with Country Code)</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6B66]" />
                          <input
                            type="tel"
                            required
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+1 555 123 4567"
                            className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-9 pr-3 py-2 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Recaptcha Container required by Firebase Phone Auth */}
                      <div id="recaptcha-container" className="flex justify-center my-2"></div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-[#14595A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0E4243] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        {loading ? 'Sending SMS Code...' : 'Send SMS Verification Code'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyPhoneCode} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Enter 6-Digit SMS Code</label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6B66]" />
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            placeholder="123456"
                            className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-9 pr-3 py-2 text-xs font-mono text-[#1C1C1A] focus:border-[#14595A] focus:outline-none tracking-widest text-center"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-[#14595A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0E4243] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        {loading ? 'Verifying Code...' : 'Verify Code & Sign In'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmationResult(null)}
                        className="w-full text-center text-xs text-[#6B6B66] hover:underline cursor-pointer"
                      >
                        Change Phone Number
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
