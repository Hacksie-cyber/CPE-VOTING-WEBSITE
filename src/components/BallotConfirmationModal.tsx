import React, { useState } from 'react';
import { Position, Candidate, Voter, VoteChoices } from '../types';
import { ShieldCheck, CheckCircle2, X, Lock, AlertCircle } from 'lucide-react';

interface BallotConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  positions: Position[];
  candidates: Candidate[];
  voter: Voter;
  choices: VoteChoices;
  onCastSuccess: (receiptHash: string, timestamp: string) => void;
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

    try {
      const res = await fetch('/api/vote/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterId: voter.id,
          choices,
        }),
      });

      const data = await res.json();

      if (data.success && data.receiptHash) {
        onCastSuccess(data.receiptHash, data.timestamp);
        onClose();
      } else {
        setError(data.message || 'Failed to submit ballot. Please try again.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Review Official CPE Ballot</h3>
              <p className="text-xs text-slate-400">
                Voter: <span className="font-semibold text-slate-200">{voter.name}</span> ({voter.id})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="my-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs"
              >
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">{pos.title}</span>
                  {candidate ? (
                    <span className="font-bold text-slate-100 text-sm">{candidate.name}</span>
                  ) : isAbstain ? (
                    <span className="font-bold text-amber-400 italic">ABSTAINED</span>
                  ) : (
                    <span className="font-semibold text-rose-400 italic">No Selection Made</span>
                  )}
                </div>

                <div>
                  {candidate ? (
                    <span
                      className={`px-2.5 py-1 rounded-lg font-medium text-[11px] ${
                        candidate.party === 'ByteCraft Alliance'
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                          : candidate.party === 'Synapse Union'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {candidate.party}
                    </span>
                  ) : isAbstain ? (
                    <span className="px-2.5 py-1 rounded-lg font-medium text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Abstain
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legal Affirmation Checkbox */}
        <div className="pt-4 border-t border-slate-800 space-y-4">
          <label className="flex items-start space-x-3 cursor-pointer group bg-slate-950 p-3 rounded-xl border border-slate-800">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 w-4 h-4"
            />
            <span className="text-xs text-slate-300 leading-snug">
              I certify that I am a registered student of the Computer Engineering Department, and that this secret ballot represents my official choices. I understand that my vote cannot be modified once locked.
            </span>
          </label>

          {/* Submit Actions */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
            >
              Modify Selections
            </button>

            <button
              onClick={handleSubmit}
              disabled={!confirmed || submitting}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/25 flex items-center space-x-2 disabled:opacity-40"
            >
              {submitting ? (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
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
