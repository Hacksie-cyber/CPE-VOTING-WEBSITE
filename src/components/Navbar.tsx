import React from 'react';
import { Vote, Users, BarChart3, ShieldCheck, Settings, LogIn, LogOut, CheckCircle2, Cpu } from 'lucide-react';
import { Voter, ElectionSettings } from '../types';

interface NavbarProps {
  activeTab: 'ballot' | 'candidates' | 'results' | 'verify' | 'admin';
  setActiveTab: (tab: 'ballot' | 'candidates' | 'results' | 'verify' | 'admin') => void;
  voter: Voter | null;
  settings: ElectionSettings;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  voter,
  settings,
  onOpenAuth,
  onLogout,
}) => {
  const isAdmin = voter?.email?.toLowerCase() === 'bamuyahacksie@gmail.com';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand & Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab(voter ? (isAdmin ? 'admin' : 'ballot') : 'results')}>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Cpu className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg text-slate-100 tracking-tight leading-none">
                  CPE <span className="text-cyan-400">ELECTIONS 2026</span>
                </h1>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  settings.status === 'VOTING_OPEN'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : settings.status === 'PAUSED'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    settings.status === 'VOTING_OPEN' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`} />
                  {settings.status === 'VOTING_OPEN' ? 'POLLS LIVE' : settings.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Computer Engineering Department Council</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('ballot')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'ballot'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Vote className="w-4 h-4" />
              <span>Official Ballot</span>
            </button>

            {(!voter || isAdmin) && (
              <>
                <button
                  onClick={() => setActiveTab('candidates')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'candidates'
                      ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Candidates</span>
                </button>

                <button
                  onClick={() => setActiveTab('results')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'results'
                      ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Live Results</span>
                </button>

                <button
                  onClick={() => setActiveTab('verify')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'verify'
                      ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Audit Receipt</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'admin'
                      ? 'bg-slate-800 text-cyan-400 font-semibold border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Admin</span>
                </button>
              </>
            )}
          </nav>

          {/* User Auth Section */}
          <div className="flex items-center space-x-3">
            {voter ? (
              <div className="flex items-center space-x-3 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center justify-end space-x-1.5">
                    <span className="text-sm font-semibold text-slate-200">{voter.name}</span>
                    {isAdmin && (
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-bold border border-cyan-500/30">ADMIN</span>
                    )}
                    {voter.hasVoted && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" title="Voted Successfully" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    {voter.id} • <span className="text-cyan-400">{voter.yearLevel}</span>
                  </p>
                </div>

                <button
                  onClick={onLogout}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/25 active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>Voter Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around py-2.5 border-t border-slate-800/80 text-xs">
          <button
            onClick={() => setActiveTab('ballot')}
            className={`flex flex-col items-center space-y-1 ${
              activeTab === 'ballot' ? 'text-cyan-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Vote className="w-4 h-4" />
            <span>Official Ballot</span>
          </button>
          {(!voter || isAdmin) && (
            <>
              <button
                onClick={() => setActiveTab('candidates')}
                className={`flex flex-col items-center space-y-1 ${
                  activeTab === 'candidates' ? 'text-cyan-400 font-bold' : 'text-slate-400'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Candidates</span>
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`flex flex-col items-center space-y-1 ${
                  activeTab === 'results' ? 'text-cyan-400 font-bold' : 'text-slate-400'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Results</span>
              </button>
              <button
                onClick={() => setActiveTab('verify')}
                className={`flex flex-col items-center space-y-1 ${
                  activeTab === 'verify' ? 'text-cyan-400 font-bold' : 'text-slate-400'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Audit</span>
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex flex-col items-center space-y-1 ${
                  activeTab === 'admin' ? 'text-cyan-400 font-bold' : 'text-slate-400'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Admin</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
