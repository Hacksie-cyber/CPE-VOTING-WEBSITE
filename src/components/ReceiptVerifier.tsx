import React, { useState } from 'react';
import { Search, ShieldCheck, CheckCircle2, AlertCircle, FileCheck2, Lock } from 'lucide-react';

export const ReceiptVerifier: React.FC = () => {
  const [receiptHash, setReceiptHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptHash.trim()) {
      setError('Please enter a valid Receipt Hash (e.g., CPE2026-A819-F290).');
      return;
    }

    setLoading(true);
    setError(null);
    setVerificationResult(null);

    try {
      const res = await fetch(`/api/vote/verify/${encodeURIComponent(receiptHash.trim())}`);
      const data = await res.json();

      if (data.success) {
        setVerificationResult(data);
      } else {
        setError(data.message || 'Receipt Hash not found in the official election ledger.');
      }
    } catch {
      setError('Connection error while verifying receipt.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Cryptographic Vote Audit Portal</h2>
            <p className="text-xs text-slate-400">Independent Receipt Verification & Tamper Check</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 max-w-xl">
          Enter your unique Digital Ballot Receipt Hash to verify that your secret vote was accurately committed to the immutable election tally ledger.
        </p>
      </div>

      {/* Verification Search Form */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Enter Receipt Hash / Receipt ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={receiptHash}
                onChange={(e) => setReceiptHash(e.target.value)}
                placeholder="e.g. CPE2026-A819-F290"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-cyan-400 placeholder-slate-600 focus:outline-none focus:border-cyan-500 uppercase tracking-widest"
              />
              <Search className="w-4 h-4 text-slate-500 absolute right-4 top-3.5" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 italic">
              Example sample hashes to test: CPE2026-A819-F290, CPE2026-9B01-44E2
            </span>

            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/20 flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
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
          <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Verification Result Card */}
        {verificationResult && (
          <div className="mt-6 bg-slate-950 p-6 rounded-2xl border border-emerald-500/40 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-emerald-400 text-sm uppercase tracking-wider">
                  Verified Audit Record Found
                </span>
              </div>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {verificationResult.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Receipt Hash</span>
                <span className="font-mono font-bold text-cyan-400">{verificationResult.receiptHash}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Timestamp Recorded</span>
                <span className="font-mono text-slate-300">
                  {new Date(verificationResult.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                Encrypted Choices Breakdown
              </span>
              <div className="space-y-1.5">
                {Object.entries(verificationResult.choicesDetails).map(([posTitle, detail]: [string, any]) => (
                  <div
                    key={posTitle}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                  >
                    <span className="text-slate-400 font-medium">{posTitle}</span>
                    <span className="font-bold text-slate-100">{detail.selectedChoice}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-800 flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Anonymity Protection Active: No student personal identity is linked to this vote record.</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
