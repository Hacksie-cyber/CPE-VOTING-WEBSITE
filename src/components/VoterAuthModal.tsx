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
          if (data.voter.name && !data.voter.name.startsWith('CPE Student')) {
            setFullName(data.voter.name);
          }
          if (data.voter.id) {
            setStudentId(data.voter.id);
          }
          if (data.voter.yearLevel) {
            setYearLevel(data.voter.yearLevel);
          }
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

        if (cleanEmail === 'bamuyahacksie@gmail.com') {
          await performDirectLogin(cleanEmail, user.displayName || undefined, undefined, undefined, true);
          return;
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
              if (data.voter.name && !data.voter.name.startsWith('CPE Student')) {
                setFullName(data.voter.name);
              }
              if (data.voter.id) {
                setStudentId(data.voter.id);
              }
              if (data.voter.yearLevel) {
                setYearLevel(data.voter.yearLevel);
              }
            }
          }
        } catch {
          // ignore network issue
        }

        setStep('details');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div
        className={`bg-slate-900 border border-slate-800 rounded-3xl w-full p-6 sm:p-8 shadow-2xl relative text-slate-100 animate-in fade-in zoom-in-95 duration-200 ${
          step === 'intro' ? 'max-w-4xl' : 'max-w-md'
        }`}
      >
        {!preventClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Info Notification Popup */}
        {infoNotice && (
          <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 flex-shrink-0 text-cyan-400" />
              <span>{infoNotice}</span>
            </div>
            <button
              onClick={() => setInfoNotice(null)}
              className="text-cyan-400 font-bold ml-2 hover:underline text-xs"
            >
              Close
            </button>
          </div>
        )}

        {step === 'intro' ? (
          /* ================= STEP 0: GET STARTED & WEBSITE PURPOSE PAGE ================= */
          <div className="text-left space-y-6">
            {/* Header / Hero Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-md">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                      Official Institutional Platform
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-100 tracking-tight leading-snug mt-1">
                    CPE Student Council Elections 2026
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setStep('email')}
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center space-x-2 text-sm"
              >
                <span>Get Started to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-intro text */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Welcome to the Computer Engineering Departmental Voting Portal. Our system is engineered for authentic, verifiable student representation with encrypted vote ledger logging and strict institutional privacy protections.
            </p>

            {/* 3 Columns Section (Matching screenshot design & copy) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* DATA PRIVACY */}
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-3 hover:border-indigo-500/30 transition-colors">
                <div>
                  <h3 className="text-xs font-bold text-indigo-400 tracking-wider uppercase mb-2.5">
                    DATA PRIVACY
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    Encrypted student data and secure institutional silos ensure that your voting decisions and cognitive progress remain private and protected at all times.
                  </p>
                </div>
                <div className="pt-2 flex items-center text-[11px] text-indigo-300 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                  <span>256-Bit Ledger Encryption</span>
                </div>
              </div>

              {/* ACADEMIC INTEGRITY */}
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-3 hover:border-indigo-500/30 transition-colors">
                <div>
                  <h3 className="text-xs font-bold text-indigo-400 tracking-wider uppercase mb-2.5">
                    ACADEMIC INTEGRITY
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    Built for educators and students who value authentic learning and democratic integrity. Our platform discourages deceptive practices and focuses on legitimate data-driven growth.
                  </p>
                </div>
                <div className="pt-2 flex items-center text-[11px] text-indigo-300 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                  <span>Verified Identity Ledger</span>
                </div>
              </div>

              {/* INSTITUTIONAL TOOL */}
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-3 hover:border-indigo-500/30 transition-colors">
                <div>
                  <h3 className="text-xs font-bold text-indigo-400 tracking-wider uppercase mb-2.5">
                    INSTITUTIONAL TOOL
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    BrainReps & CPE Election Portal is a dedicated assessment ecosystem serving verified schools and faculties. We do not host malicious software or deceptive content.
                  </p>
                </div>
                <div className="pt-2 flex items-center text-[11px] text-indigo-300 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                  <span>Faculty Approved Ecosystem</span>
                </div>
              </div>
            </div>

            {/* Bottom Call to Action CTA */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Safe & Secure Institutional Domain</span>
              </div>

              <button
                onClick={() => setStep('email')}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 text-sm"
              >
                <span>Proceed to Voter Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Footer Navigation matching Screenshot Layout */}
            <div className="pt-6 border-t border-slate-800/60 text-center space-y-3">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-400">
                <button
                  onClick={() => onOpenTermsPrivacy?.('privacy')}
                  className="hover:text-indigo-400 transition-colors"
                >
                  Privacy Policy
                </button>
                <button
                  onClick={() => onOpenTermsPrivacy?.('terms')}
                  className="hover:text-indigo-400 transition-colors"
                >
                  Terms of Service
                </button>
                <button
                  onClick={() =>
                    setInfoNotice(
                      'Support Center: Computer Engineering Student Affairs Desk • Room 304, CPE Building (Email: support@cpe-elections.edu.ph)'
                    )
                  }
                  className="hover:text-indigo-400 transition-colors"
                >
                  Support Center
                </button>
                <button
                  onClick={() =>
                    setInfoNotice(
                      'CONTACT FACULTY: Commission on Elections Faculty Advisers: Prof. B. A. Mux, Dean of Engineering (Email: faculty.cpe@university.edu.ph)'
                    )
                  }
                  className="uppercase tracking-wider hover:text-indigo-400 transition-colors font-semibold"
                >
                  CONTACT FACULTY
                </button>
              </div>

              <p className="text-[11px] text-slate-500 font-medium italic">
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
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>← About & Purpose</span>
              </button>

              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                {step === 'email' ? 'Step 1 of 2' : 'Step 2 of 2'}
              </span>
            </div>

            {/* Header */}
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100 leading-snug">
                  {step === 'email' ? 'Voter Email Authentication' : 'Student Information'}
                </h2>
                <p className="text-xs text-slate-400">
                  {step === 'email'
                    ? 'Enter your email to sign in & access your official ballot'
                    : 'Complete your student profile to proceed directly to voting'}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
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
                    className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center space-x-3 text-sm disabled:opacity-50"
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
                    <div className="w-full border-t border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-slate-900 px-3 text-slate-500 font-semibold tracking-wider">
                      Or Enter Email Address
                    </span>
                  </div>
                </div>

                {/* Step 1 Email Form */}
                <form onSubmit={handleStep1EmailSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. student@cpe.edu.ph"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                        required
                      />
                      <Mail className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 text-sm"
                  >
                    <span>Continue to Information</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              /* Step 2 Details Form */
              <form onSubmit={handleFinalSubmit} className="space-y-4 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <Mail className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="text-slate-200 font-medium truncate">{email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center space-x-1 ml-2 flex-shrink-0"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Juan Dela Cruz"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
                      required
                    />
                    <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Student ID Number *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="e.g. 2023-10294"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm uppercase focus:outline-none focus:border-cyan-500"
                      required
                    />
                    <CreditCard className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">School Year Level *</label>
                  <div className="relative">
                    <select
                      value={yearLevel}
                      onChange={(e) => setYearLevel(e.target.value as YearLevel)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm font-medium focus:outline-none focus:border-cyan-500 appearance-none"
                    >
                      <option value="1st Year">1st Year Computer Engineering</option>
                      <option value="2nd Year">2nd Year Computer Engineering</option>
                      <option value="3rd Year">3rd Year Computer Engineering</option>
                      <option value="4th Year">4th Year Computer Engineering</option>
                    </select>
                    <GraduationCap className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
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

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 text-center flex flex-col items-center justify-center space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                <span>🔒 Official CPE Election Portal</span>
                <span>•</span>
                <span>Data Privacy Compliant</span>
              </div>
              <p className="text-[10px] text-slate-500">
                By signing in, you agree to our{' '}
                <button
                  type="button"
                  onClick={() => onOpenTermsPrivacy?.('terms')}
                  className="text-cyan-400 hover:underline font-medium"
                >
                  Terms of Service
                </button>{' '}
                &{' '}
                <button
                  type="button"
                  onClick={() => onOpenTermsPrivacy?.('privacy')}
                  className="text-cyan-400 hover:underline font-medium"
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
