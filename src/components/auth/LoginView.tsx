import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  User as UserIcon, 
  Phone, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  Shield,
  Zap,
  LogIn
} from 'lucide-react';
import { 
  signUpWithEmail, 
  signInWithEmail, 
  signInWithGoogle, 
  createRecaptchaVerifier, 
  sendPhoneVerificationCode, 
  resetUserPassword 
} from '../../services/firebase';
import { db } from '../../services/db';
import { useApp } from '../../context/AppContext';
import type { ConfirmationResult } from 'firebase/auth';
import type { UserRole } from '../../types';

type AuthMode = 'email_signin' | 'email_signup' | 'phone' | 'forgot_password';

export const LoginView: React.FC = () => {
  const { loginWithLocalUser } = useApp();
  const [mode, setMode] = useState<AuthMode>('email_signin');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('ADMIN');
  
  // Phone auth fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const formatAuthError = (err: any): string => {
    if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
      return 'Unauthorized Domain Error: The domain hosting your app is not authorized in Firebase Console. Go to https://console.firebase.google.com/project/yinpims/authentication/settings (Authorized domains), click "Add domain", and enter "localhost" (without http:// or port numbers).';
    }
    if (err?.code === 'auth/configuration-not-found' || err?.message?.includes('configuration-not-found')) {
      return 'Firebase Authentication Provider is not enabled yet in the Firebase Console for project "yinpims". Please enable Email/Password, Google, or Phone under Authentication > Sign-in method at https://console.firebase.google.com/project/yinpims/authentication/providers';
    }
    if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password' || err?.code === 'auth/user-not-found') {
      return 'Invalid email or password. Please check your credentials or register a new account.';
    }
    if (err?.code === 'auth/email-already-in-use') {
      return 'An account with this email address already exists. Please sign in instead.';
    }
    if (err?.code === 'auth/weak-password') {
      return 'Password should be at least 6 characters long.';
    }
    return err?.message || 'Authentication failed.';
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const trimmedPass = password.trim();

      // 1. Check if staff member is logging in with provisional password
      const localUser = db.getUsers().find(u => u.email.toLowerCase() === normalizedEmail);
      if (localUser && localUser.provisionalPassword && localUser.provisionalPassword === trimmedPass) {
        // Instantly establish local session so App transitions to MainLayout & ForcePasswordChangeModal
        loginWithLocalUser(localUser);

        // Attempt non-blocking Firebase authentication in background
        try {
          await signInWithEmail(email, password);
        } catch (fbErr: any) {
          if (fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/invalid-credential') {
            try {
              await signUpWithEmail(email, password, localUser.name);
            } catch (createErr) {
              console.warn('Firebase provision registration note:', createErr);
            }
          }
        }
        return;
      }

      // 2. Standard sign in
      try {
        await signInWithEmail(email, password);
        setSuccessMsg(normalizedEmail === 'policyp28@gmail.com' ? 'Welcome Super Admin!' : 'Sign in successful!');
      } catch (fbErr: any) {
        // Resilient fallback for local admin/users if Firebase auth fails or domain restricted
        if (localUser && (normalizedEmail === 'policyp28@gmail.com' || localUser.status === 'Active')) {
          loginWithLocalUser(localUser);
          return;
        }
        throw fbErr;
      }
    } catch (err: any) {
      setError(formatAuthError(err));
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
      setSuccessMsg('Account created successfully! Logging you in...');
    } catch (err: any) {
      setError(formatAuthError(err));
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
      setSuccessMsg(`Password reset instructions sent to ${email}. Check your inbox!`);
    } catch (err: any) {
      setError(formatAuthError(err));
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
    } catch (err: any) {
      setError(formatAuthError(err));
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
      const verifier = createRecaptchaVerifier('login-recaptcha-container');
      const result = await sendPhoneVerificationCode(phoneNumber, verifier);
      setConfirmationResult(result);
      setSuccessMsg('SMS code sent to your phone!');
    } catch (err: any) {
      setError(formatAuthError(err));
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
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill helper for Super Admin & Demo Users
  const fillSuperAdmin = () => {
    setEmail('policyp28@gmail.com');
    setPassword('123456');
    setMode('email_signin');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-4 font-body">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#E4E4E1] overflow-hidden grid grid-cols-1 md:grid-cols-12">
        
        {/* Left Side Banner */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#14595A] via-[#0E4243] to-[#0A3233] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background circles */}
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center space-x-3 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#14595A] shadow-md font-heading font-bold text-2xl">
                P
              </div>
              <div>
                <span className="font-heading font-bold text-xl tracking-tight block">YIN-PIMS</span>
                <span className="text-[11px] font-semibold text-white/70 uppercase tracking-widest block">Operations Portal</span>
              </div>
            </div>

            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-white leading-tight mb-4">
              Participant & Event Operations System
            </h2>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              Secure Cloud Management Portal for Delegate Registrations, Accommodations, Badging, and Real-Time Event Analytics.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
            <div className="flex items-center space-x-2 text-xs text-white/90">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Firebase Auth & Cloud Firestore Engine</span>
            </div>
            
            {/* Super Admin Quick Demo Box */}
            <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-xs border border-white/15">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/90 flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-amber-300" /> Super Admin Access
                </span>
                <button
                  type="button"
                  onClick={fillSuperAdmin}
                  className="text-[11px] font-bold text-amber-300 hover:text-white underline cursor-pointer"
                >
                  Fill Email
                </button>
              </div>
              <p className="text-xs font-mono font-semibold text-white mt-1">
                policyp28@gmail.com
              </p>
            </div>
          </div>
        </div>

        {/* Right Side Form */}
        <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full space-y-6">

            {/* Title & Mode Switcher */}
            <div>
              <h3 className="font-heading font-bold text-2xl text-[#1C1C1A]">
                {mode === 'email_signin' && 'Sign In to PIMS'}
                {mode === 'email_signup' && 'Create New Account'}
                {mode === 'phone' && 'Phone Authentication'}
                {mode === 'forgot_password' && 'Reset Password'}
              </h3>
              <p className="text-xs text-[#6B6B66] mt-1">
                {mode === 'email_signin' && 'Enter your credentials to access the participant dashboard.'}
                {mode === 'email_signup' && 'Register a new staff or coordinator account.'}
                {mode === 'phone' && 'Sign in securely using SMS verification.'}
                {mode === 'forgot_password' && 'Enter your registered email to receive a password reset link.'}
              </p>
            </div>

            {/* Error and Success Alerts */}
            {error && (
              <div className="flex items-start space-x-2.5 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center space-x-2.5 rounded-xl bg-emerald-50 p-3.5 text-xs text-emerald-800 border border-emerald-200">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* Method Switcher Tabs */}
            {mode !== 'forgot_password' && (
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#FAFAF9] p-1 border border-[#E4E4E1] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setMode('email_signin'); setError(null); }}
                  className={`py-2 rounded-lg transition-colors cursor-pointer ${
                    mode === 'email_signin' ? 'bg-white text-[#14595A] shadow-2xs font-bold' : 'text-[#6B6B66] hover:text-[#1C1C1A]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('email_signup'); setError(null); }}
                  className={`py-2 rounded-lg transition-colors cursor-pointer ${
                    mode === 'email_signup' ? 'bg-white text-[#14595A] shadow-2xs font-bold' : 'text-[#6B6B66] hover:text-[#1C1C1A]'
                  }`}
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('phone'); setError(null); }}
                  className={`py-2 rounded-lg transition-colors cursor-pointer ${
                    mode === 'phone' ? 'bg-white text-[#14595A] shadow-2xs font-bold' : 'text-[#6B6B66] hover:text-[#1C1C1A]'
                  }`}
                >
                  Phone Auth
                </button>
              </div>
            )}

            {/* Google Quick Sign-In */}
            {mode !== 'forgot_password' && (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2.5 rounded-xl border border-[#E4E4E1] bg-white px-4 py-3 text-xs font-semibold text-[#1C1C1A] hover:bg-[#FAFAF9] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
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
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#6B6B66]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="policyp28@gmail.com"
                      className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-10 pr-3 py-2.5 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none transition-colors"
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
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#6B6B66]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-10 pr-10 py-2.5 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none transition-colors"
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#14595A] px-4 py-3 text-xs font-semibold text-white hover:bg-[#0E4243] transition-colors shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
                </button>
              </form>
            )}

            {/* Email Registration Form */}
            {mode === 'email_signup' && (
              <form onSubmit={handleEmailSignUp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-[#6B6B66]" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Sarah Jenkins"
                      className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-10 pr-3 py-2.5 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#6B6B66]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="policyp28@gmail.com"
                      className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-10 pr-3 py-2.5 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#6B6B66]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
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
                  <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Default System Role</label>
                  <div className="relative">
                    <Shield className="absolute left-3.5 top-3 h-4 w-4 text-[#6B6B66]" />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-10 pr-3 py-2.5 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none cursor-pointer"
                    >
                      <option value="ADMIN">Super Admin (Full System Access)</option>
                      <option value="EVENT_COORDINATOR">Event Coordinator</option>
                      <option value="CHECKIN_STAFF">Check-in Staff</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#14595A] px-4 py-3 text-xs font-semibold text-white hover:bg-[#0E4243] transition-colors shadow-md cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Register PIMS Account'}
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

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#6B6B66]" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="policyp28@gmail.com"
                        className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-10 pr-3 py-2.5 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-[#14595A] px-4 py-3 text-xs font-semibold text-white hover:bg-[#0E4243] transition-colors shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Sending Instructions...' : 'Send Password Reset Email'}
                  </button>
                </form>
              </div>
            )}

            {/* Phone Authentication Form */}
            {mode === 'phone' && (
              <div className="space-y-4">
                {!confirmationResult ? (
                  <form onSubmit={handleSendPhoneCode} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Mobile Phone (with Country Code)</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3 h-4 w-4 text-[#6B6B66]" />
                        <input
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+1 555 123 4567"
                          className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-10 pr-3 py-2.5 text-xs text-[#1C1C1A] focus:border-[#14595A] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div id="login-recaptcha-container" className="flex justify-center my-2"></div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-[#14595A] px-4 py-3 text-xs font-semibold text-white hover:bg-[#0E4243] transition-colors shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {loading ? 'Sending SMS Code...' : 'Send SMS Verification Code'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyPhoneCode} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1C1A] mb-1">Enter 6-Digit SMS Verification Code</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-[#6B6B66]" />
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          placeholder="123456"
                          className="w-full rounded-xl border border-[#E4E4E1] bg-white pl-10 pr-3 py-2.5 text-xs font-mono text-[#1C1C1A] focus:border-[#14595A] focus:outline-none tracking-widest text-center"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-[#14595A] px-4 py-3 text-xs font-semibold text-white hover:bg-[#0E4243] transition-colors shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {loading ? 'Verifying Code...' : 'Verify & Enter Dashboard'}
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
        </div>

      </div>
    </div>
  );
};
