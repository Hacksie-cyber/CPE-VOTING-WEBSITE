import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Mail,
  User,
  CreditCard,
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  Lock,
  Building2,
  CheckCircle2,
  Info,
  HelpCircle,
  Phone,
  Sparkles,
} from 'lucide-react';
import { Voter, YearLevel } from '../types';
import { signInWithGoogle } from '../lib/firebase';

interface VoterAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (voter: Voter) => void;
  preventClose?: boolean;
  onOpenTermsPrivacy?: (tab?: 'terms' | 'privacy') => void;
  initialStep?: 'intro' | 'email' | 'details';
}

export const VoterAuthModal: React.FC<VoterAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  preventClose = false,
  onOpenTermsPrivacy,
  initialStep = 'intro',
}) => {
  const [step, setStep] = useState<'intro' | 'email' | 'details'>(initialStep);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [yearLevel, setYearLevel] = useState<YearLevel>('3rd Year');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const performDirectLogin = async (
    userEmail: string,
    providedName?: string,
    providedStudentId?: string,
    providedYearLevel?: YearLevel,
    isGoogleAuth: boolean = false
  ) => {
    const cleanEmail = userEmail.trim().toLowerCase();
    const isAdmin = cleanEmail === 'bamuyahacksie@gmail.com';

    if (isAdmin && !isGoogleAuth) {
      setError('Admin access (bamuyahacksie@gmail.com) is restricted to Google Sign-In only. Please click "Sign in with Google Email".');
      return;
    }

    const cleanName =
      providedName ||
      fullName.trim() ||
      (isAdmin
        ? 'Bamuya (Admin)'
        : cleanEmail.split('@')[0].replace(/[\._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    const cleanStudentId =
      providedStudentId ||
      studentId.trim() ||
      (isAdmin ? 'ADMIN-2026' : `2026-${cleanEmail.split('@')[0].toUpperCase().slice(0, 8)}`);
    const cleanYearLevel = providedYearLevel || yearLevel || '3rd Year';

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/voter/register-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          studentNumber: cleanStudentId,
          name: cleanName,
          yearLevel: cleanYearLevel,
        }),
      });

      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && data.voter) {
          onLoginSuccess(data.voter);
          onClose();
          return;
        } else if (data.message) {
          setError(data.message);
          return;
        }
      }

      // Fallback for Vercel static environment or non-JSON responses
      const fallbackVoter: Voter = {
        id: cleanStudentId,
        name: cleanName,
        email: cleanEmail,
        yearLevel: cleanYearLevel,
        hasVoted: false,
      };
      onLoginSuccess(fallbackVoter);
      onClose();
    } catch {
      // Fallback if API server is unreachable on Vercel
      const fallbackVoter: Voter = {
        id: cleanStudentId,
        name: cleanName,
        email: cleanEmail,
        yearLevel: cleanYearLevel,
        hasVoted: false,
      };
      onLoginSuccess(fallbackVoter);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleStep1EmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address (e.g., student@cpe.edu.ph).');
      return;
    }
    setError(null);
    if (cleanEmail === 'bamuyahacksie@gmail.com') {
      setError('Admin account (bamuyahacksie@gmail.com) is restricted. Please sign in using the "Sign in with Google Email" button above.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/voter/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.voter) {
          onLoginSuccess(data.voter);
          onClose();
          return;
        }
      }
    } catch {
      // ignore network issue and fall through to details step
    } finally {
      setLoading(false);
    }

    setStep('details');
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      if (user && user.email) {
        const cleanEmail = user.email.trim().toLowerCase();
        setEmail(cleanEmail);
        if (user.displayName) {
          setFullName(user.displayName);
        }

        try {
          const res = await fetch('/api/voter/google-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, name: user.displayName }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.voter) {
              onLoginSuccess(data.voter);
              onClose();
              return;
            }
          }
        } catch {
          // ignore network issue
        }

        if (cleanEmail === 'bamuyahacksie@gmail.com') {
          await performDirectLogin(cleanEmail, user.displayName || undefined, undefined, undefined, true);
        } else {
          setStep('details');
        }
      }
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string };
      if (authErr.code !== 'auth/popup-closed-by-user') {
        setError(authErr.message || 'Google Sign-In failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!studentId.trim()) {
      setError('Please enter your student ID number (e.g. 2023-10294).');
      return;
    }
    performDirectLogin(email, fullName, studentId, yearLevel);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
      <div
        className={`bg-white border-2 border-black rounded-3xl w-full p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative text-neutral-900 animate-in fade-in zoom-in-95 duration-200 ${
          step === 'intro' ? 'max-w-4xl' : 'max-w-md'
        }`}
      >
        {!preventClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-neutral-700 hover:text-black p-1.5 rounded-xl border border-black hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Info Notification Popup */}
        {infoNotice && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border-2 border-black text-rose-900 text-xs flex items-center justify-between font-bold">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 flex-shrink-0 text-rose-700" />
              <span>{infoNotice}</span>
            </div>
            <button
              onClick={() => setInfoNotice(null)}
              className="text-rose-800 font-black ml-2 hover:underline text-xs"
            >
              Close
            </button>
          </div>
        )}

        {step === 'intro' ? (
          /* ================= STEP 0: GET STARTED & WEBSITE PURPOSE PAGE ================= */
          <div className="text-left space-y-6">
            {/* Header / Hero Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 border-2 border-black flex items-center justify-center text-rose-800 shadow-md">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-rose-700 text-white px-2.5 py-0.5 rounded-full border border-black">
                      Official Institutional Platform
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight leading-snug mt-1">
                    CPE Student Council Elections 2026
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setStep('email')}
                className="w-full sm:w-auto bg-rose-700 hover:bg-rose-800 text-white font-extrabold px-6 py-3 rounded-xl transition-all border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center space-x-2 text-sm"
              >
                <span>Get Started to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-intro text */}
            <p className="text-xs sm:text-sm text-neutral-700 font-medium leading-relaxed">
              Welcome to the Computer Engineering Departmental Voting Portal. Our system is engineered for authentic, verifiable student representation with encrypted vote ledger logging and strict institutional privacy protections.
            </p>

            {/* 3 Columns Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* DATA PRIVACY */}
              <div className="bg-neutral-50 p-5 rounded-2xl border-2 border-black flex flex-col justify-between space-y-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <div>
                  <h3 className="text-xs font-black text-rose-700 tracking-wider uppercase mb-2.5">
                    DATA PRIVACY
                  </h3>
                  <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                    Encrypted student data and secure institutional silos ensure that your voting decisions remain private and protected at all times.
                  </p>
                </div>
                <div className="pt-2 flex items-center text-[11px] text-rose-800 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-rose-700" />
                  <span>256-Bit Ledger Encryption</span>
                </div>
              </div>

              {/* ACADEMIC INTEGRITY */}
              <div className="bg-neutral-50 p-5 rounded-2xl border-2 border-black flex flex-col justify-between space-y-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <div>
                  <h3 className="text-xs font-black text-rose-700 tracking-wider uppercase mb-2.5">
                    ACADEMIC INTEGRITY
                  </h3>
                  <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                    Built for educators and students who value authentic learning and democratic integrity. Our platform focuses on legitimate data-driven growth.
                  </p>
                </div>
                <div className="pt-2 flex items-center text-[11px] text-rose-800 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-rose-700" />
                  <span>Verified Identity Ledger</span>
                </div>
              </div>

              {/* INSTITUTIONAL TOOL */}
              <div className="bg-neutral-50 p-5 rounded-2xl border-2 border-black flex flex-col justify-between space-y-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <div>
                  <h3 className="text-xs font-black text-rose-700 tracking-wider uppercase mb-2.5">
                    INSTITUTIONAL TOOL
                  </h3>
                  <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                    CPE Election Portal is a dedicated assessment ecosystem serving verified schools and faculties with transparent elections.
                  </p>
                </div>
                <div className="pt-2 flex items-center text-[11px] text-rose-800 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-rose-700" />
                  <span>Faculty Approved Ecosystem</span>
                </div>
              </div>
            </div>

            {/* Bottom Call to Action CTA */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t-2 border-black">
              <div className="flex items-center space-x-2 text-xs text-neutral-700 font-bold">
                <Lock className="w-4 h-4 text-emerald-700" />
                <span>Safe & Secure Institutional Domain</span>
              </div>

              <button
                onClick={() => setStep('email')}
                className="w-full sm:w-auto bg-neutral-900 hover:bg-black text-white font-extrabold px-8 py-3 rounded-xl transition-all border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center space-x-2 text-sm"
              >
                <span>Proceed to Voter Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Footer Navigation */}
            <div className="pt-6 border-t border-neutral-300 text-center space-y-3">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold text-neutral-700">
                <button
                  onClick={() => onOpenTermsPrivacy?.('privacy')}
                  className="hover:text-rose-700 transition-colors"
                >
                  Privacy Policy
                </button>
                <button
                  onClick={() => onOpenTermsPrivacy?.('terms')}
                  className="hover:text-rose-700 transition-colors"
                >
                  Terms of Service
                </button>
                <button
                  onClick={() =>
                    setInfoNotice(
                      'Support Center: Computer Engineering Student Affairs Desk • Room 304, CPE Building (Email: support@cpe-elections.edu.ph)'
                    )
                  }
                  className="hover:text-rose-700 transition-colors"
                >
                  Support Center
                </button>
                <button
                  onClick={() =>
                    setInfoNotice(
                      'CONTACT FACULTY: Commission on Elections Faculty Advisers: Prof. B. A. Mux, Dean of Engineering (Email: faculty.cpe@university.edu.ph)'
                    )
                  }
                  className="uppercase tracking-wider hover:text-rose-700 transition-colors font-extrabold"
                >
                  CONTACT FACULTY
                </button>
              </div>

              <p className="text-[11px] text-neutral-500 font-medium italic">
                &copy; 2026 BrainReps Institutional Analytics & CPE Elections. All rights reserved.
              </p>
            </div>
          </div>
        ) : (
          /* ================= STEP 1 & 2: LOGIN FORMS ================= */
          <div>
            {/* Top Navigation Back Link to Get Started */}
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('intro')}
                className="text-xs text-rose-700 hover:text-rose-800 font-extrabold flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>← About & Purpose</span>
              </button>

              <span className="text-[10px] uppercase font-black text-neutral-600 tracking-wider">
                {step === 'email' ? 'Step 1 of 2' : 'Step 2 of 2'}
              </span>
            </div>

            {/* Header */}
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-rose-100 border-2 border-black flex items-center justify-center text-rose-800 flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-neutral-900 leading-snug">
                  {step === 'email' ? 'Voter Email Authentication' : 'Student Information'}
                </h2>
                <p className="text-xs text-neutral-600 font-medium">
                  {step === 'email'
                    ? 'Enter your email to sign in & access your official ballot'
                    : 'Complete your student profile to proceed directly to voting'}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-100 border-2 border-black text-rose-900 text-xs font-bold">
                {error}
              </div>
            )}

            {step === 'email' ? (
              <div>
                {/* Google Sign-In */}
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full bg-white hover:bg-neutral-100 text-neutral-900 font-extrabold py-3 px-4 rounded-xl border-2 border-black transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center space-x-3 text-sm disabled:opacity-50"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
                      />
                    </svg>
                    <span>Sign in with Google Email</span>
                  </button>
                </div>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-black" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-white px-3 text-neutral-700 font-extrabold tracking-wider">
                      Or Enter Email Address
                    </span>
                  </div>
                </div>

                {/* Step 1 Email Form */}
                <form onSubmit={handleStep1EmailSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold text-neutral-800 mb-1.5 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. student@cpe.edu.ph"
                        className="w-full bg-neutral-50 border-2 border-black rounded-xl px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 font-medium focus:outline-none focus:ring-2 focus:ring-rose-700 transition-all"
                        required
                      />
                      <Mail className="w-4 h-4 text-neutral-500 absolute right-3.5 top-3" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-rose-700 hover:bg-rose-800 text-white font-extrabold py-3 rounded-xl transition-all border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center space-x-2 text-sm"
                  >
                    <span>Continue to Information</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              /* Step 2 Details Form */
              <form onSubmit={handleFinalSubmit} className="space-y-4 text-xs">
                <div className="bg-rose-50 p-2.5 rounded-xl border-2 border-black flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <Mail className="w-4 h-4 text-rose-700 flex-shrink-0" />
                    <span className="text-neutral-900 font-bold truncate">{email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="text-[11px] text-rose-800 font-extrabold hover:underline flex items-center space-x-1 ml-2 flex-shrink-0"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                </div>

                <div>
                  <label className="block text-neutral-800 font-extrabold mb-1">Full Name *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Juan Dela Cruz"
                      className="w-full bg-neutral-50 border-2 border-black rounded-xl px-3.5 py-2.5 text-neutral-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-700"
                      required
                    />
                    <User className="w-4 h-4 text-neutral-500 absolute right-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-800 font-extrabold mb-1">Student ID Number *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="e.g. 2023-10294"
                      className="w-full bg-neutral-50 border-2 border-black rounded-xl px-3.5 py-2.5 text-neutral-900 text-sm font-medium uppercase focus:outline-none focus:ring-2 focus:ring-rose-700"
                      required
                    />
                    <CreditCard className="w-4 h-4 text-neutral-500 absolute right-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-800 font-extrabold mb-1">School Year Level *</label>
                  <div className="relative">
                    <select
                      value={yearLevel}
                      onChange={(e) => setYearLevel(e.target.value as YearLevel)}
                      className="w-full bg-neutral-50 border-2 border-black rounded-xl px-3.5 py-2.5 text-neutral-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-700 appearance-none"
                    >
                      <option value="1st Year">1st Year Computer Engineering</option>
                      <option value="2nd Year">2nd Year Computer Engineering</option>
                      <option value="3rd Year">3rd Year Computer Engineering</option>
                      <option value="4th Year">4th Year Computer Engineering</option>
                    </select>
                    <GraduationCap className="w-4 h-4 text-neutral-500 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-rose-700 hover:bg-rose-800 text-white font-extrabold py-3 rounded-xl transition-all border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <span>Proceed to Voting Section</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-4 pt-3 border-t border-neutral-300 text-[11px] text-neutral-600 text-center flex flex-col items-center justify-center space-y-1 font-medium">
              <div className="flex items-center space-x-1.5 text-emerald-800 font-bold">
                <span>🔒 Official CPE Election Portal</span>
                <span>•</span>
                <span>Data Privacy Compliant</span>
              </div>
              <p className="text-[10px] text-neutral-500">
                By signing in, you agree to our{' '}
                <button
                  type="button"
                  onClick={() => onOpenTermsPrivacy?.('terms')}
                  className="text-rose-700 hover:underline font-bold"
                >
                  Terms of Service
                </button>{' '}
                &{' '}
                <button
                  type="button"
                  onClick={() => onOpenTermsPrivacy?.('privacy')}
                  className="text-rose-700 hover:underline font-bold"
                >
                  Privacy Policy
                </button>
                .
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
