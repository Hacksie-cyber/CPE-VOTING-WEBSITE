import React from 'react';
import { Vote, Users, BarChart3, ShieldCheck, Settings, LogIn, LogOut, CheckCircle2, Cpu, FileText, Sun, Moon } from 'lucide-react';
import { Voter, ElectionSettings } from '../types';

interface NavbarProps {
  activeTab: 'ballot' | 'results' | 'verify' | 'admin';
  setActiveTab: (tab: 'ballot' | 'results' | 'verify' | 'admin') => void;
  voter: Voter | null;
  settings: ElectionSettings;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenTermsPrivacy?: (tab?: 'terms' | 'privacy') => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  voter,
  settings,
  onOpenAuth,
  onLogout,
  onOpenTermsPrivacy,
  theme = 'light',
  onToggleTheme,
}) => {
  const isAdmin = voter?.email?.toLowerCase() === 'bamuyahacksie@gmail.com';

  return (
    <header className="sticky top-0 z-40 bg-rose-700 dark:bg-slate-900 border-b border-rose-800/40 dark:border-slate-800 text-white shadow-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand & Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab(voter ? (isAdmin ? 'admin' : 'ballot') : 'results')}>
            <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 p-0.5 border border-rose-200/40 dark:border-slate-700 shadow-sm flex items-center justify-center">
              <div className="w-full h-full bg-rose-800 dark:bg-rose-900 rounded-[8px] flex items-center justify-center">
                <Cpu className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-extrabold text-xl text-white tracking-tight leading-none">
                  CPE <span className="bg-white/10 dark:bg-slate-800 text-white dark:text-rose-400 px-1.5 py-0.5 rounded border border-white/20 dark:border-rose-700 font-black text-sm">ELECTIONS 2026</span>
                </h1>
              </div>
              <p className="text-xs text-rose-100 dark:text-rose-300 font-medium">Computer Engineering Department Council</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1.5 bg-rose-800/80 dark:bg-slate-800/90 p-1.5 rounded-xl border border-rose-600/40 dark:border-slate-700 shadow-inner">
            <button
              onClick={() => setActiveTab('ballot')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'ballot'
                  ? 'bg-white dark:bg-slate-900 text-rose-900 dark:text-slate-100 shadow-sm'
                  : 'text-rose-100 dark:text-rose-200 hover:text-white hover:bg-rose-900/60 dark:hover:bg-slate-700'
              }`}
            >
              <Vote className="w-4 h-4" />
              <span>Official Ballot</span>
            </button>

            <button
              onClick={() => setActiveTab('verify')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'verify'
                  ? 'bg-white dark:bg-slate-900 text-rose-900 dark:text-slate-100 shadow-sm'
                  : 'text-rose-100 dark:text-rose-200 hover:text-white hover:bg-rose-900/60 dark:hover:bg-slate-700'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Audit Receipt</span>
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('results')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTab === 'results'
                      ? 'bg-white dark:bg-slate-900 text-rose-900 dark:text-slate-100 shadow-sm'
                      : 'text-rose-100 dark:text-rose-200 hover:text-white hover:bg-rose-900/60 dark:hover:bg-slate-700'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Live Results</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTab === 'admin'
                      ? 'bg-rose-950 dark:bg-rose-900 text-white shadow-sm'
                      : 'text-rose-200 hover:text-white hover:bg-rose-900/40 dark:hover:bg-slate-700'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Admin</span>
                </button>
              </>
            )}
          </nav>

          {/* Controls: Theme Toggle & User Auth Section */}
          <div className="flex items-center space-x-3">
            {/* Dark/Light Theme Switch Button */}
            <button
              onClick={onToggleTheme}
              className="flex items-center space-x-1.5 bg-rose-800/90 dark:bg-slate-800 hover:bg-rose-900 dark:hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-black border border-rose-600/40 dark:border-slate-700 shadow-sm transition-all"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-300" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-200" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            {voter ? (
              <div className="flex items-center space-x-3 bg-white dark:bg-slate-800 text-neutral-900 dark:text-slate-100 px-3.5 py-2 rounded-xl border border-rose-100 dark:border-slate-700 shadow-sm">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center justify-end space-x-1.5">
                    <span className="text-sm font-bold text-neutral-900 dark:text-slate-100">{voter.name}</span>
                    {isAdmin && (
                      <span className="text-[10px] bg-rose-700 text-white px-1.5 py-0.5 rounded font-black">ADMIN</span>
                    )}
                    {voter.hasVoted && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" title="Voted Successfully" />
                    )}
                  </div>
                  {!isAdmin && (
                    <p className="text-xs text-neutral-600 dark:text-slate-400 font-mono font-medium">
                      {voter.id} • <span className="text-rose-700 dark:text-rose-400 font-bold">{voter.yearLevel}</span>
                    </p>
                  )}
                </div>

                <button
                  onClick={onLogout}
                  className="p-2 rounded-lg text-neutral-700 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-slate-700 border border-transparent hover:border-neutral-200 dark:hover:border-slate-600 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-2 bg-neutral-900 dark:bg-slate-800 hover:bg-black dark:hover:bg-slate-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-sm transition-all border border-neutral-800 dark:border-slate-700 shadow-md active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>Voter Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around py-2.5 border-t border-rose-800 text-xs">
          <button
            onClick={() => setActiveTab('ballot')}
            className={`flex flex-col items-center space-y-1 font-bold ${
              activeTab === 'ballot' ? 'text-white underline underline-offset-4 decoration-2' : 'text-rose-200'
            }`}
          >
            <Vote className="w-4 h-4" />
            <span>Official Ballot</span>
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            className={`flex flex-col items-center space-y-1 font-bold ${
              activeTab === 'verify' ? 'text-white underline underline-offset-4 decoration-2' : 'text-rose-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Audit</span>
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('results')}
                className={`flex flex-col items-center space-y-1 font-bold ${
                  activeTab === 'results' ? 'text-white underline underline-offset-4 decoration-2' : 'text-rose-200'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Results</span>
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex flex-col items-center space-y-1 font-bold ${
                  activeTab === 'admin' ? 'text-white underline underline-offset-4 decoration-2' : 'text-rose-200'
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
