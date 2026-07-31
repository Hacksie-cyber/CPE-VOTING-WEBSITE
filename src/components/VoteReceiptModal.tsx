import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, Copy, BarChart3, ShieldCheck, QrCode } from 'lucide-react';

interface VoteReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptHash: string;
  timestamp: string;
  onViewResults: () => void;
}

export const VoteReceiptModal: React.FC<VoteReceiptModalProps> = ({
  isOpen,
  onClose,
  receiptHash,
  timestamp,
  onViewResults,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 text-center animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center mb-4">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h2 className="text-2xl font-black text-slate-100 tracking-tight">Ballot Successfully Cast!</h2>
        <p className="text-xs text-slate-400 mt-1">
          Thank you for participating in the CPE Department Officer Elections 2026.
        </p>

        {/* Cryptographic Receipt Card */}
        <div className="my-6 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Digital Audit Receipt</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {new Date(timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div className="font-mono text-sm font-bold text-cyan-400 tracking-wider">
              {receiptHash}
            </div>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center space-x-1 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-3 text-slate-400 text-[11px] pt-1">
            <QrCode className="w-8 h-8 text-slate-600 flex-shrink-0" />
            <p className="leading-snug">
              Save this receipt hash to independently verify that your vote was safely recorded in the audit trail.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={() => {
              onClose();
              onViewResults();
            }}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 text-sm"
          >
            <BarChart3 className="w-4 h-4" />
            <span>View Live Election Results</span>
          </button>

          <button
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs"
          >
            Close Receipt Window
          </button>
        </div>
      </div>
    </div>
  );
};
