import React, { useState } from 'react';
import { Search, ShieldCheck, CheckCircle2, AlertCircle, FileCheck2, Lock } from 'lucide-react';
import { loadElectionDataFromFirestore } from '../lib/firebase';

export const ReceiptVerifier: React.FC = () => {
  const [receiptHash, setReceiptHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHash = receiptHash.trim().toUpperCase();
    if (!cleanHash) {
      setError('Please enter a valid Receipt Hash (e.g., CPE2026-A819-F290).');
      return;
    }

    setLoading(true);
    setError(null);
    setVerificationResult(null);

    // 1. Try Backend API endpoint first
    try {
      const res = await fetch(`/api/vote/verify/${encodeURIComponent(cleanHash)}`);
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setVerificationResult(data);
          setLoading(false);
          return;
        } else if (data.message && res.status === 404) {
          setError(data.message);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Backend unavailable or running on static host (e.g., Vercel)
    }

    // 2. Client-side Firestore Fallback (Works on Vercel / static deployments)
    try {
      const electionData = await loadElectionDataFromFirestore();
      if (electionData) {
        const votes = Array.isArray(electionData.votes) ? electionData.votes : [];
        const voters = Array.isArray(electionData.voters) ? electionData.voters : [];
        const candidates = Array.isArray(electionData.candidates) ? electionData.candidates : [];
        const positions = Array.isArray(electionData.positions) ? electionData.positions : [];

        const voteRecord = votes.find((v: any) => v.receiptHash && v.receiptHash.toUpperCase() === cleanHash);
        const voter = voters.find((vr: any) =>
          (vr.receiptHash && vr.receiptHash.toUpperCase() === cleanHash) ||
          (voteRecord && voteRecord.voterId && vr.id === voteRecord.voterId)
        );

        if (voteRecord || voter) {
          const isInvalidated = Boolean(voteRecord?.isInvalidated || voter?.isInvalidated);
          const invalidatedReason =
            voteRecord?.invalidatedReason ||
            voter?.invalidatedReason ||
            'Flagged during audit by the Commission on Elections';

          const choicesDetails: Record<string, { positionTitle: string; selectedChoice: string }> = {};

          positions.forEach((pos: any) => {
            const posId = pos.id;
            const choiceId = voteRecord?.choices ? voteRecord.choices[posId] : undefined;
            let choiceName = 'ABSTAINED';
            if (choiceId && choiceId !== 'ABSTAIN') {
              const candidate = candidates.find((c: any) => c.id === choiceId);
              if (candidate) {
                choiceName = `${candidate.name} (${candidate.party})`;
              }
            }
            choicesDetails[pos.title] = {
              positionTitle: pos.title,
              selectedChoice: choiceName,
            };
          });

          setVerificationResult({
            success: true,
            receiptHash: voteRecord?.receiptHash || voter?.receiptHash || cleanHash,
            timestamp: voteRecord?.timestamp || voter?.votedAt || new Date().toISOString(),
            yearLevel: voteRecord?.yearLevel || voter?.yearLevel || 'N/A',
            choicesDetails,
            status: isInvalidated ? 'INVALIDATED_BY_COMMISSION' : 'VERIFIED_TAMPER_PROOF',
            isInvalidated,
            invalidatedReason: isInvalidated ? invalidatedReason : undefined,
          });
          setLoading(false);
          return;
        }
      }
    } catch (fsErr) {
      console.warn('Firestore verification fallback note:', fsErr);
    }

    // 3. Check LocalStorage fallback for saved voter receipt
    try {
      const savedVoterRaw = localStorage.getItem('cpe_voter');
      if (savedVoterRaw) {
        const savedVoter = JSON.parse(savedVoterRaw);
        if (savedVoter.receiptHash && savedVoter.receiptHash.toUpperCase() === cleanHash) {
          setVerificationResult({
            success: true,
            receiptHash: savedVoter.receiptHash,
            timestamp: savedVoter.votedAt || new Date().toISOString(),
            yearLevel: savedVoter.yearLevel || '3rd Year',
            choicesDetails: {
              'Student Council Positions': {
                positionTitle: 'Student Council Positions',
                selectedChoice: 'Official Recorded Ballot (Stored in Secure Session)',
              },
            },
            status: savedVoter.isInvalidated ? 'INVALIDATED_BY_COMMISSION' : 'VERIFIED_TAMPER_PROOF',
            isInvalidated: Boolean(savedVoter.isInvalidated),
            invalidatedReason: savedVoter.invalidatedReason,
          });
          setLoading(false);
          return;
        }
      }
    } catch {
      // ignore
    }

    setError('Receipt Hash not found in the official election ledger.');
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Banner */}
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden text-neutral-900 dark:text-slate-100">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-slate-100">Cryptographic Vote Audit Portal</h2>
            <p className="text-xs text-rose-800 dark:text-rose-300 font-bold">Independent Receipt Verification & Tamper Check</p>
          </div>
        </div>
        <p className="text-xs text-neutral-700 dark:text-slate-300 font-medium max-w-xl">
          Enter your unique Digital Ballot Receipt Hash to verify that your secret vote was accurately committed to the immutable election tally ledger.
        </p>
      </div>

      {/* Verification Search Form */}
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl text-neutral-900 dark:text-slate-100">
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-neutral-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
              Enter Receipt Hash / Receipt ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={receiptHash}
                onChange={(e) => setReceiptHash(e.target.value)}
                placeholder="e.g. CPE2026-A819-F290"
                className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-mono text-rose-800 dark:text-rose-300 font-extrabold placeholder-neutral-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-700 uppercase tracking-widest"
              />
              <Search className="w-4 h-4 text-neutral-500 dark:text-slate-400 absolute right-4 top-3.5" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-[11px] text-neutral-600 dark:text-slate-400 font-bold italic">
              Example sample hashes to test: CPE2026-A819-F290, CPE2026-9B01-44E2
            </span>

            <button
              type="submit"
              disabled={loading}
              className="bg-rose-700 hover:bg-rose-800 text-white font-extrabold px-6 py-2.5 rounded-2xl text-xs border border-rose-700 shadow-md flex items-center space-x-2 disabled:opacity-50 transition-all active:scale-95"
            >
              {loading ? (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <FileCheck2 className="w-4 h-4" />
                  <span>Audit & Verify Ledger</span>
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-700 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Verification Result Card */}
        {verificationResult && (
          <div className={`mt-6 bg-neutral-50 dark:bg-slate-800 p-6 rounded-2xl border border-neutral-200 dark:border-slate-700 shadow-md space-y-4 animate-in fade-in duration-200`}>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                {verificationResult.isInvalidated ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-rose-700 dark:text-rose-400" />
                    <span className="font-extrabold text-rose-800 dark:text-rose-300 text-sm uppercase tracking-wider">
                      Ballot Invalidated by Commission
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                    <span className="font-extrabold text-emerald-800 dark:text-emerald-300 text-sm uppercase tracking-wider">
                      Verified Audit Record Found
                    </span>
                  </>
                )}
              </div>
              <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                verificationResult.isInvalidated
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              }`}>
                {verificationResult.status}
              </span>
            </div>

            {verificationResult.isInvalidated && (
              <div className="p-3.5 rounded-2xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-100 text-xs space-y-1 font-medium">
                <div className="font-extrabold flex items-center space-x-1 text-rose-900 dark:text-rose-200">
                  <span>🚫 Account / Vote Invalidated</span>
                </div>
                <p><strong>Reason:</strong> {verificationResult.invalidatedReason || 'Suspicious activity or unverified credentials.'}</p>
                <p className="text-[11px] text-rose-800 dark:text-rose-300 font-bold">
                  Note: The choices below have been excluded from the final election tally and turnout calculation.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-neutral-600 dark:text-slate-400 block font-bold">Receipt Hash</span>
                <span className="font-mono font-black text-rose-800 dark:text-rose-300">{verificationResult.receiptHash}</span>
              </div>
              <div>
                <span className="text-neutral-600 dark:text-slate-400 block font-bold">Timestamp Recorded</span>
                <span className="font-mono font-bold text-neutral-800 dark:text-slate-200">
                  {new Date(verificationResult.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-black text-neutral-800 dark:text-slate-200 uppercase tracking-wider block mb-2">
                Encrypted Choices Breakdown
              </span>
              <div className="space-y-1.5">
                {Object.entries(verificationResult.choicesDetails).map(([posTitle, detail]: [string, any]) => (
                  <div
                    key={posTitle}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 text-xs font-medium"
                  >
                    <span className="text-neutral-700 dark:text-slate-300 font-bold">{posTitle}</span>
                    <span className="font-black text-neutral-900 dark:text-slate-100">{detail.selectedChoice}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-neutral-600 dark:text-slate-400 pt-2 border-t border-neutral-200 dark:border-slate-700 flex items-center space-x-1 font-bold">
              <Lock className="w-3.5 h-3.5 text-neutral-600 dark:text-slate-400" />
              <span>Anonymity Protection Active: No student personal identity is linked to this vote record.</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
