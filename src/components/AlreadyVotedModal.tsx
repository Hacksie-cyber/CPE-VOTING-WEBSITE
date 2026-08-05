import React from 'react';
import { ShieldAlert, CheckCircle2, BarChart3, Lock, AlertTriangle, FileCheck2, X } from 'lucide-react';
import { Voter } from '../types';

interface AlreadyVotedModalProps {
  isOpen: boolean;
  onClose: () => void;
  voter: Voter | null;
  onViewResults?: () => void;
}

export const AlreadyVotedModal: React.FC<AlreadyVotedModalProps> = ({
  isOpen,
  onClose,
  voter,
  onViewResults,
}) => {
  if (!isOpen || !voter) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative text-slate-100 animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-800/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badge Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center mb-5 shadow-lg shadow-amber-500/10">
          <ShieldAlert className="w-9 h-9" />
        </div>

        {/* Title */}
        <div className="text-center">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            Single Ballot Policy Notice
          </span>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight mt-3">
            Ballot Already Submitted
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto">
            Our election audit system indicates that an official ballot has already been cast for this voter profile.
          </p>
        </div>

        {/* Registered Profile Card */}
        <div className="my-6 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
            <span className="text-slate-400 font-semibold flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Voter Account Details</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Voted</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Full Name</span>
              <span className="font-semibold text-slate-200">{voter.name}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Email / Gmail</span>
              <span className="font-semibold text-slate-200 truncate block">{voter.email || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Student ID</span>
              <span className="font-semibold text-slate-200">{voter.id}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Year Level</span>
              <span className="font-semibold text-slate-200">{voter.yearLevel}</span>
            </div>
          </div>

          {/* Receipt Hash display */}
          {voter.receiptHash && (
            <div className="mt-3 pt-2.5 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1 flex items-center space-x-1">
                <FileCheck2 className="w-3 h-3 text-cyan-400" />
                <span>Recorded Digital Ballot Receipt Hash</span>
              </span>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs font-bold text-cyan-400 tracking-wider">
                {voter.receiptHash}
              </div>
            </div>
          )}
        </div>

        {/* Warning Policy Box */}
        <div className="p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-xs text-amber-200 flex items-start space-x-3 mb-6">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="leading-snug space-y-1">
            <p className="font-bold text-amber-300">Duplicate Voting Prohibited</p>
            <p className="text-[11px] text-amber-200/90">
              To guarantee election fairness, students cannot vote again or use secondary accounts registered under the same full name or Gmail address. Your recorded vote is permanently locked and counted in the election tally.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {onViewResults && (
            <button
              onClick={() => {
                onClose();
                onViewResults();
              }}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 text-sm"
            >
              <BarChart3 className="w-4 h-4" />
              <span>View Live Election Tally & Results</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition-all text-xs"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
