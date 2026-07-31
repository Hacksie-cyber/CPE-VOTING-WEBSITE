import React, { useState } from 'react';
import { X, ShieldCheck, UserCheck, Key, Zap, CheckCircle2, Cpu } from 'lucide-react';
import { Voter, YearLevel } from '../types';

interface VoterAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (voter: Voter) => void;
}

export const VoterAuthModal: React.FC<VoterAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [studentNumber, setStudentNumber] = useState('');
  const [pin, setPin] = useState('1234');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNumber.trim()) {
      setError('Please enter a valid CPE Student ID (e.g., 2023-10294).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/voter/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentNumber, pin }),
      });
      const data = await res.json();

      if (data.success && data.voter) {
        onLoginSuccess(data.voter);
        onClose();
      } else {
        setError(data.message || 'Authentication failed. Please check your credentials.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoPreset = async (yearLevel: YearLevel) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/voter/demo-select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearLevel }),
      });
      const data = await res.json();

      if (data.success && data.voter) {
        onLoginSuccess(data.voter);
        onClose();
      } else {
        setError(data.message || 'Failed to select demo voter.');
      }
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 leading-snug">Voter Portal Authorization</h2>
            <p className="text-xs text-slate-400">CPE Department Officer Elections 2026</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Student ID / ID Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                placeholder="e.g. 2023-10294"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all uppercase tracking-wide"
              />
              <UserCheck className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Format: YYYY-XXXXX (e.g. 2023-10001)</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Voter Security PIN
            </label>
            <div className="relative">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                maxLength={6}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all tracking-widest font-mono"
              />
              <Key className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 text-sm disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
            ) : (
              <>
                <Cpu className="w-4 h-4" />
                <span>Authorize & Access Ballot</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-3 text-slate-400 font-semibold tracking-wider">
              Or Instant Demo Presets
            </span>
          </div>
        </div>

        {/* Demo Student Presets */}
        <div>
          <p className="text-xs text-slate-400 mb-2.5">
            Select a student year level to test ballot voting instantly:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(['1st Year', '2nd Year', '3rd Year', '4th Year'] as YearLevel[]).map((yl) => (
              <button
                key={yl}
                onClick={() => handleDemoPreset(yl)}
                disabled={loading}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800/80 hover:border-cyan-500/50 text-left transition-all text-xs font-medium text-slate-200 group"
              >
                <div className="flex items-center space-x-2">
                  <Zap className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span>{yl} CPE Student</span>
                </div>
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 text-center">
          🔒 End-to-end voter anonymity guaranteed. Ballots are cryptographically hashed and unlinked from personal IDs.
        </div>
      </div>
    </div>
  );
};
