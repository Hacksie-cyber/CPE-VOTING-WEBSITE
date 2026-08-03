import React, { useState } from 'react';
import { ShieldCheck, FileText, Lock, Eye, X, CheckCircle, Scale, Building, Mail } from 'lucide-react';

interface TermsPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'terms' | 'privacy';
}

export const TermsPrivacyModal: React.FC<TermsPrivacyModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'terms',
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative text-slate-100 my-8 max-h-[90vh] flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-2 rounded-xl hover:bg-slate-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4 flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 leading-snug">
              Legal & Privacy Compliance
            </h2>
            <p className="text-xs text-slate-400">
              Computer Engineering Department Commission on Elections (CPE ELECTIONS 2026)
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 mb-6 flex-shrink-0">
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center space-x-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'terms'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms of Service</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center space-x-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'privacy'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Privacy Policy & Data Security</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto pr-2 space-y-6 text-sm text-slate-300 leading-relaxed flex-1 custom-scrollbar">
          {activeTab === 'terms' ? (
            <div className="space-y-6">
              {/* Trust banner */}
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-start space-x-3">
                <Scale className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <span className="font-bold text-cyan-300 block mb-0.5">Official Election Policy</span>
                  By accessing or casting a vote on the CPE ELECTIONS 2026 voting portal, you agree to abide by the rules of the Computer Engineering Department Student Council and the Commission on Elections.
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <span className="text-cyan-400">1.</span>
                  <span>Voter Eligibility & Registration</span>
                </h3>
                <p className="text-slate-400 text-xs">
                  Only currently enrolled students of the Computer Engineering Department are authorized to log in and participate in CPE Elections 2026. Credentials provided during login must accurately represent the student’s identity.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <span className="text-cyan-400">2.</span>
                  <span>Strict One Ballot Per Student Policy</span>
                </h3>
                <p className="text-slate-400 text-xs">
                  Each voter is strictly permitted to cast exactly <strong className="text-slate-200">one (1) ballot</strong> during the active voting window. Attempting to cast multiple ballots, submit duplicate votes under secondary email accounts, or manipulate voter identity records is strictly prohibited and monitored by automated cryptographic verification systems.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <span className="text-cyan-400">3.</span>
                  <span>Integrity of Election Ledger</span>
                </h3>
                <p className="text-slate-400 text-xs">
                  Once a ballot is submitted and verified, it is permanently recorded onto the immutable election ledger. Ballots cannot be altered, overwritten, or withdrawn after confirmation. Voters receive a unique cryptographic receipt hash for receipt verification.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <span className="text-cyan-400">4.</span>
                  <span>Prohibited Activities</span>
                </h3>
                <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                  <li>Impersonating another student or using unauthorized email accounts.</li>
                  <li>Attempting unauthorized administrative access to election systems.</li>
                  <li>Automated bot requests, credential harvesting, or denial-of-service attempts.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <span className="text-cyan-400">5.</span>
                  <span>Governing Body Contact</span>
                </h3>
                <p className="text-slate-400 text-xs">
                  For inquiries, election disputes, or registration assistance, contact the official CPE Commission on Elections at <a href="mailto:bamuyahacksie@gmail.com" className="text-cyan-400 underline hover:text-cyan-300">bamuyahacksie@gmail.com</a>.
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Privacy badge */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start space-x-3">
                <Eye className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <span className="font-bold text-emerald-300 block mb-0.5">Ballot Secret & Data Privacy Commitment</span>
                  We uphold the highest standard of student data protection. Your individual vote choice is decoupled from your personal identity to maintain total ballot secret privacy.
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <span className="text-cyan-400">1.</span>
                  <span>Information We Collect</span>
                </h3>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>When authenticating to vote, we collect and store the following essential information:</p>
                  <ul className="list-disc list-inside pl-2 space-y-0.5">
                    <li><strong className="text-slate-200">Full Name:</strong> For voter roll verification and anti-duplicate check.</li>
                    <li><strong className="text-slate-200">Student ID Number:</strong> To ensure single ballot entitlement per student.</li>
                    <li><strong className="text-slate-200">Department Email Address:</strong> Used strictly for secure authentication.</li>
                    <li><strong className="text-slate-200">Year Level:</strong> Used for statistical department analytics.</li>
                    <li><strong className="text-slate-200">Timestamp & Receipt Hash:</strong> Generated upon voting to enable receipt audit.</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <span className="text-cyan-400">2.</span>
                  <span>How Your Data is Used</span>
                </h3>
                <p className="text-slate-400 text-xs">
                  Your data is exclusively used to verify eligibility, maintain one-vote-per-student integrity, and calculate public election tallies. Your information is never sold, shared, monetized, or transferred to third parties or advertisers.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <span className="text-cyan-400">3.</span>
                  <span>Ballot Secrecy & Encryption</span>
                </h3>
                <p className="text-slate-400 text-xs">
                  Your candidate choices are recorded alongside a unique cryptographic SHA-256 style receipt hash. Public tallies display aggregated counts and receipt verification hashes without exposing which specific candidate choices belong to an individual student identity.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <span className="text-cyan-400">4.</span>
                  <span>Data Protection & Retention</span>
                </h3>
                <p className="text-slate-400 text-xs">
                  All connection traffic is encrypted in transit using SSL/TLS protocols. Election data is stored securely in Firebase Cloud Firestore. Data is retained for the duration of the official election audit period.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <span className="text-cyan-400">5.</span>
                  <span>Contact Information</span>
                </h3>
                <div className="text-xs text-slate-400 space-y-1">
                  <p className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-cyan-400" />
                    <span>Computer Engineering Department Council & Commission on Elections</span>
                  </p>
                  <p className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-cyan-400" />
                    <span>Official Officer: <a href="mailto:bamuyahacksie@gmail.com" className="text-cyan-400 underline">bamuyahacksie@gmail.com</a></span>
                  </p>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer & Badges */}
        <div className="pt-4 mt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 flex-shrink-0">
          <div className="flex items-center space-x-3 text-[11px] text-emerald-400 font-medium">
            <span className="flex items-center space-x-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>SSL Encrypted</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Data Privacy Compliant</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Official Institutional System</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold px-5 py-2 rounded-xl transition-all"
          >
            I Understand & Close
          </button>
        </div>
      </div>
    </div>
  );
};
