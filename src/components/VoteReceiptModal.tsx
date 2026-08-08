import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, Copy, BarChart3, ShieldCheck, QrCode } from 'lucide-react';

interface VoteReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptHash: string;
  timestamp: string;
  onViewResults: () => void;
  isVoterLoggedIn?: boolean;
}

export const VoteReceiptModal: React.FC<VoteReceiptModalProps> = ({
  isOpen,
  onClose,
  receiptHash,
  timestamp,
  onViewResults,
  isVoterLoggedIn = false,
}) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fire confetti burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#3b82f6', '#6366f1', '#10b981'],
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(receiptHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-white border-2 border-black rounded-3xl max-w-md w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative text-neutral-900 text-center animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-black text-emerald-800 mx-auto flex items-center justify-center mb-4">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Ballot Successfully Cast!</h2>
        <p className="text-xs text-neutral-700 font-medium mt-1">
          Thank you for participating in the CPE Department Officer Elections 2026.
        </p>

        {/* Cryptographic Receipt Card */}
        <div className="my-6 bg-neutral-50 p-4 rounded-2xl border-2 border-black text-left space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-neutral-800 tracking-wider flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-700" />
              <span>Digital Audit Receipt</span>
            </span>
            <span className="text-[10px] text-neutral-600 font-mono font-bold">
              {new Date(timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border-2 border-black flex items-center justify-between">
            <div className="font-mono text-sm font-black text-rose-800 tracking-wider">
              {receiptHash}
            </div>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 border border-black text-neutral-900 text-xs font-bold flex items-center space-x-1 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-3 text-neutral-700 text-[11px] pt-1 font-medium">
            <QrCode className="w-8 h-8 text-neutral-800 flex-shrink-0" />
            <p className="leading-snug">
              Save this receipt hash to independently verify that your vote was safely recorded in the audit trail.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {!isVoterLoggedIn ? (
            <button
              onClick={() => {
                onClose();
                onViewResults();
              }}
              className="w-full bg-rose-700 hover:bg-rose-800 text-white font-extrabold py-3 rounded-xl transition-all border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center space-x-2 text-sm"
            >
              <BarChart3 className="w-4 h-4" />
              <span>View Live Election Results</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full bg-rose-700 hover:bg-rose-800 text-white font-extrabold py-3 rounded-xl transition-all border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center space-x-2 text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Return to Ballot Station</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-extrabold py-2.5 rounded-xl border-2 border-black text-xs"
          >
            Close Receipt Window
          </button>
        </div>
      </div>
    </div>
  );
};
