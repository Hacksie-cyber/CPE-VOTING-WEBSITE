import React, { useState } from 'react';
import { Position, Candidate, Voter, VoteChoices } from '../types';
import { ShieldCheck, CheckCircle2, X, Lock, AlertCircle } from 'lucide-react';
import { saveVoteToFirestoreDirect } from '../lib/firebase';

interface BallotConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  positions: Position[];
  candidates: Candidate[];
  voter: Voter;
  choices: VoteChoices;
  onCastSuccess: (receiptHash: string, timestamp: string, updatedVoter?: Voter) => void;
}

export const BallotConfirmationModal: React.FC<BallotConfirmationModalProps> = ({
  isOpen,
  onClose,
  positions,
  candidates,
  voter,
  choices,
  onCastSuccess,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);

    let castReceiptHash = '';
    let castTimestamp = new Date().toISOString();
    let returnedVoter: Voter | undefined = undefined;
    let apiSuccess = false;

    try {
      const res = await fetch('/api/vote/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterId: voter.id,
          voterName: voter.name,
          voterEmail: voter.email,
          voterYearLevel: voter.yearLevel,
          choices,
        }),
      });

      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && data.receiptHash) {
          castReceiptHash = data.receiptHash;
          castTimestamp = data.timestamp || castTimestamp;
          returnedVoter = data.voter;
          apiSuccess = true;
        } else if (data.message) {
          setError(data.message);
          setSubmitting(false);
          return;
        }
      } else {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (data.message) {
            setError(data.message);
            setSubmitting(false);
            return;
          }
        } catch {
          // fallback to client-side Firestore save if API endpoint fails
        }
      }
    } catch {
      // API call failed, proceed with client-side Firestore direct save
    }

    if (!castReceiptHash) {
      // Fallback hash generation
      const chars = 'ABCDEF0123456789';
      let hash = 'CPE-';
      for (let i = 0; i < 4; i++) hash += chars.charAt(Math.floor(Math.random() * chars.length));
      hash += '-';
      for (let i = 0; i < 4; i++) hash += chars.charAt(Math.floor(Math.random() * chars.length));
      castReceiptHash = hash;
    }

    // Always ensure vote data is saved directly to Firestore
    await saveVoteToFirestoreDirect(voter, choices, castReceiptHash, castTimestamp);

    onCastSuccess(castReceiptHash, castTimestamp, returnedVoter);
    onClose();
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative text-neutral-900 dark:text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-800 dark:text-rose-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-neutral-900 dark:text-slate-100">Review Official CPE Ballot</h3>
              <p className="text-xs text-neutral-600 dark:text-slate-300 font-bold">
                Voter: <span className="font-extrabold text-neutral-900 dark:text-slate-100">{voter.name}</span> ({voter.id})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-700 dark:text-slate-300 hover:text-black dark:hover:text-white p-1.5 rounded-xl border border-neutral-200 dark:border-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="my-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-700 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Selected Candidates Summary List */}
        <div className="my-4 overflow-y-auto space-y-2.5 pr-1 flex-1">
          {positions.map((pos) => {
            const choiceId = choices[pos.id];
            const candidate = candidates.find((c) => c.id === choiceId);
            const isAbstain = choiceId === 'ABSTAIN';

            return (
              <div
                key={pos.id}
                className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-xs shadow-sm"
              >
                <div>
                  <span className="text-[11px] text-neutral-600 dark:text-slate-300 font-bold block">{pos.title}</span>
                  {candidate ? (
                    <span className="font-extrabold text-neutral-900 dark:text-slate-100 text-sm">{candidate.name}</span>
                  ) : isAbstain ? (
                    <span className="font-extrabold text-amber-700 dark:text-amber-400 italic">ABSTAINED</span>
                  ) : (
                    <span className="font-extrabold text-rose-700 dark:text-rose-400 italic">No Selection Made</span>
                  )}
                </div>

                <div>
                  {candidate ? (
                    <span
                      className={`px-2.5 py-1 rounded-lg font-black text-[11px] border ${
                        candidate.party === 'ByteCraft Alliance'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                          : candidate.party === 'Synapse Union'
                          ? 'bg-neutral-200 dark:bg-slate-700 text-neutral-900 dark:text-slate-200 border-neutral-300 dark:border-slate-600'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {candidate.party}
                    </span>
                  ) : isAbstain ? (
                    <span className="px-2.5 py-1 rounded-lg font-black text-[11px] bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                      Abstain
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legal Affirmation Checkbox */}
        <div className="pt-4 border-t border-neutral-200 dark:border-slate-800 space-y-4">
          <label className="flex items-start space-x-3 cursor-pointer group bg-neutral-50 dark:bg-slate-800 p-3 rounded-xl border border-neutral-200 dark:border-slate-700">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 rounded border-neutral-300 dark:border-slate-600 text-rose-700 focus:ring-rose-700 w-4 h-4"
            />
            <span className="text-xs text-neutral-800 dark:text-slate-200 font-bold leading-snug">
              I certify that I am a registered student of the Computer Engineering Department, and that this secret ballot represents my official choices. I understand that my vote cannot be modified once locked.
            </span>
          </label>

          {/* Submit Actions */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 text-neutral-800 dark:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 text-xs font-extrabold transition-colors"
            >
              Modify Selections
            </button>

            <button
              onClick={handleSubmit}
              disabled={!confirmed || submitting}
              className="bg-rose-700 hover:bg-rose-800 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition-all border border-rose-700 shadow-sm flex items-center space-x-2 disabled:opacity-40"
            >
              {submitting ? (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Encrypted Lock & Submit Ballot</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
