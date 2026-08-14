import React from 'react';
import {
  Vote,
  Users,
  BarChart3,
  ShieldCheck,
  Settings,
  LogIn,
  LogOut,
  CheckCircle2,
  Cpu,
  FileText,
  Sun,
  Moon,
  UserCheck,
  Edit3,
} from 'lucide-react';
import { Voter, ElectionSettings } from '../types';

interface NavbarProps {
  activeTab: 'ballot' | 'results' | 'verify' | 'admin';
  setActiveTab: (tab: 'ballot' | 'results' | 'verify' | 'admin') => void;
  voter: Voter | null;
  settings: ElectionSettings;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenProfile?: () => void;
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
  onOpenProfile,
  onOpenTermsPrivacy,
  theme = 'light',
  onToggleTheme,
}) => {
  const isAdmin = voter?.email?.toLowerCase() === 'bamuyahacksie@gmail.com';

  return (
    <header className="sticky top-0 z-40 bg-rose-700 dark:bg-slate-900 border-b border-rose-800/40 dark:border-slate-800 text-white shadow-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Brand & Logo */}
          <div
            className="flex items-center space-x-3 cursor-pointer min-w-0 flex-shrink-0 group"
            onClick={() => setActiveTab(voter ? (isAdmin ? 'admin' : 'ballot') : 'results')}
            title="Computer Engineering Department Council Election"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white dark:bg-slate-800 p-0.5 border border-rose-200/40 dark:border-slate-700 shadow-sm flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-rose-800 dark:bg-rose-900 rounded-[9px] flex items-center justify-center shadow-inner">
                <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h1 className="font-black text-lg sm:text-xl text-white tracking-tight leading-none">
                  CPE <span className="bg-white/20 dark:bg-slate-800 text-white dark:text-rose-400 px-1.5 py-0.5 rounded-md border border-white/25 dark:border-rose-700/60 font-black text-xs sm:text-sm tracking-normal shadow-sm">2026</span>
                </h1>
                <span className="hidden xl:inline-block text-[11px] font-black uppercase tracking-wider bg-rose-900/60 dark:bg-rose-950/80 text-rose-100 border border-rose-600/50 dark:border-rose-800 px-2 py-0.5 rounded-full">
                  Official Election Portal
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-rose-100 dark:text-rose-300 font-medium tracking-tight mt-0.5">
                <span className="hidden sm:inline">Computer Engineering Department Council</span>
                <span className="sm:hidden">CpE Dept Council</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1.5 bg-rose-800/80 dark:bg-slate-800/90 p-1.5 rounded-2xl border border-rose-600/40 dark:border-slate-700 shadow-inner">
            <button
              onClick={() => setActiveTab('ballot')}
              className={`flex items-center space-x-2 px-3.5 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-black transition-all ${
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
              className={`flex items-center space-x-2 px-3.5 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-black transition-all ${
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
                  className={`flex items-center space-x-2 px-3.5 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-black transition-all ${
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
                  className={`flex items-center space-x-2 px-3.5 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-black transition-all ${
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
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            {/* Dark/Light Theme Switch Button */}
            <button
              onClick={onToggleTheme}
              className="flex items-center justify-center p-2 sm:px-3 sm:py-2 bg-rose-800/90 dark:bg-slate-800 hover:bg-rose-900 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-black border border-rose-600/40 dark:border-slate-700 shadow-sm transition-all active:scale-95"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-300" />
                  <span className="hidden sm:inline ml-1.5">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-200" />
                  <span className="hidden sm:inline ml-1.5">Dark</span>
                </>
              )}
            </button>

            {voter ? (
              <div className="flex items-center space-x-1.5 sm:space-x-2 bg-white dark:bg-slate-800 text-neutral-900 dark:text-slate-100 p-1 sm:p-1.5 sm:pl-3 rounded-2xl border border-rose-100 dark:border-slate-700 shadow-md">
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="text-left hidden sm:block hover:opacity-80 transition-opacity group cursor-pointer"
                  title="Click to view or edit your personal information"
                >
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs sm:text-sm font-black text-neutral-900 dark:text-slate-100 group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors flex items-center space-x-1">
                      <span className="truncate max-w-[120px] md:max-w-[160px] lg:max-w-[200px]">{voter.name}</span>
                      <Edit3 className="w-3 h-3 text-neutral-400 group-hover:text-rose-700 dark:group-hover:text-rose-400 flex-shrink-0" />
                    </span>
                    {isAdmin && (
                      <span className="text-[10px] bg-rose-700 text-white px-1.5 py-0.5 rounded font-black flex-shrink-0">ADMIN</span>
                    )}
                    {voter.hasVoted && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" title="Voted Successfully" />
                    )}
                  </div>
                  {!isAdmin && (
                    <p className="text-[10px] sm:text-[11px] text-neutral-600 dark:text-slate-400 font-mono font-bold truncate max-w-[160px] lg:max-w-[200px]">
                      {voter.id} • <span className="text-rose-700 dark:text-rose-400 font-bold">{voter.course || 'BS CpE'}</span>
                    </p>
                  )}
                </button>

                {/* Mobile avatar/profile trigger */}
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="sm:hidden p-1.5 rounded-xl bg-neutral-100 dark:bg-slate-700 text-neutral-800 dark:text-slate-200 flex items-center space-x-1"
                  title="Edit Profile"
                >
                  <span className="w-5 h-5 rounded-full bg-rose-700 text-white flex items-center justify-center text-[10px] font-black">
                    {voter.name.charAt(0).toUpperCase()}
                  </span>
                  {voter.hasVoted && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  )}
                </button>

                {onOpenProfile && (
                  <button
                    type="button"
                    onClick={onOpenProfile}
                    className="hidden sm:flex p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-neutral-100 dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-slate-600 text-neutral-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-300 border border-neutral-200 dark:border-slate-600 text-xs font-bold items-center space-x-1 transition-all"
                    title="Edit Personal Information"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
                    <span className="hidden lg:inline text-[11px] font-black">Edit</span>
                  </button>
                )}

                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-xl text-neutral-700 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-slate-700 border border-transparent hover:border-neutral-200 dark:hover:border-slate-600 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-1.5 sm:space-x-2 bg-neutral-900 dark:bg-slate-800 hover:bg-black dark:hover:bg-slate-700 text-white font-black px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm transition-all border border-neutral-800 dark:border-slate-700 shadow-md active:scale-95 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-rose-600/50 dark:border-slate-800 text-xs gap-1">
          <button
            onClick={() => setActiveTab('ballot')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'ballot'
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-rose-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Vote className="w-3.5 h-3.5" />
            <span className="text-[11px]">Ballot</span>
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'verify'
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-rose-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[11px]">Audit</span>
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('results')}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'results'
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-rose-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="text-[11px]">Results</span>
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'admin'
                    ? 'bg-rose-950 dark:bg-rose-900 text-white shadow-sm'
                    : 'text-rose-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="text-[11px]">Admin</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
