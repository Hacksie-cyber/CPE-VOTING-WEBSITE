import React, { useEffect, useMemo, useState } from 'react';
import {
  PositionResult,
  VoterTurnoutStats,
  ElectionSettings,
  ExhibitProject,
  ExhibitVote,
  ExhibitSettings,
} from '../types';
import { generateElectionPDF, generateExhibitPDF } from '../utils/pdfGenerator';
import { fetchOrCalculateResults, computeResultsFromData } from '../utils/electionResultsHelper';
import { subscribeToElectionData } from '../lib/firebase';
import {
  INITIAL_POSITIONS,
  INITIAL_CANDIDATES,
  INITIAL_ELECTION_SETTINGS,
  INITIAL_EXHIBIT_PROJECTS,
  INITIAL_EXHIBIT_SETTINGS,
} from '../data/initialData';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  RefreshCw,
  Trophy,
  Users,
  Vote,
  Activity,
  Crown,
  Download,
  ShieldCheck,
  Lightbulb,
  Cpu,
  Lock,
  Layers,
} from 'lucide-react';

interface LiveResultsProps {
  settings: ElectionSettings;
  exhibitProjects?: ExhibitProject[];
  exhibitVotes?: ExhibitVote[];
  exhibitSettings?: ExhibitSettings;
}

export const LiveResults: React.FC<LiveResultsProps> = ({
  settings,
  exhibitProjects: propExhibitProjects,
  exhibitVotes: propExhibitVotes,
  exhibitSettings: propExhibitSettings,
}) => {
  const [positionResults, setPositionResults] = useState<PositionResult[]>([]);
  const [turnoutStats, setTurnoutStats] = useState<VoterTurnoutStats | null>(null);
  const [exhibitProjects, setExhibitProjects] = useState<ExhibitProject[]>(
    propExhibitProjects || INITIAL_EXHIBIT_PROJECTS
  );
  const [exhibitVotes, setExhibitVotes] = useState<ExhibitVote[]>(propExhibitVotes || []);
  const [exhibitSettings, setExhibitSettings] = useState<ExhibitSettings>(
    propExhibitSettings || INITIAL_EXHIBIT_SETTINGS
  );
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  const isExhibitLockedMode = Boolean(
    settings?.officialsVotingDisabled || exhibitSettings?.lockToExhibit
  );

  const [resultsScope, setResultsScope] = useState<'all' | 'exhibit' | 'officials'>(() =>
    settings?.officialsVotingDisabled || propExhibitSettings?.lockToExhibit ? 'exhibit' : 'all'
  );

  // Sync incoming props from App.tsx
  useEffect(() => {
    if (Array.isArray(propExhibitProjects)) {
      setExhibitProjects(propExhibitProjects);
    }
  }, [propExhibitProjects]);

  useEffect(() => {
    if (Array.isArray(propExhibitVotes)) {
      setExhibitVotes(propExhibitVotes);
    }
  }, [propExhibitVotes]);

  useEffect(() => {
    if (propExhibitSettings) {
      setExhibitSettings(propExhibitSettings);
    }
  }, [propExhibitSettings]);

  // If lock-to-exhibit mode turns on while viewing, switch focus to Project Exhibit
  useEffect(() => {
    if (isExhibitLockedMode && resultsScope === 'all') {
      setResultsScope('exhibit');
    }
  }, [isExhibitLockedMode]);

  const fetchResults = async () => {
    try {
      const [electionData, exhibitRes] = await Promise.all([
        fetchOrCalculateResults(settings),
        fetch('/api/exhibit/data').catch(() => null),
      ]);

      setPositionResults(electionData.positionResults || []);
      setTurnoutStats(electionData.turnoutStats || null);
      setLastUpdated(electionData.lastUpdated || new Date().toISOString());

      if (
        exhibitRes &&
        exhibitRes.ok &&
        exhibitRes.headers.get('content-type')?.includes('application/json')
      ) {
        const exhData = await exhibitRes.json();
        const apiProjects = exhData.exhibitProjects || exhData.projects;
        if (Array.isArray(apiProjects)) setExhibitProjects(apiProjects);
        if (Array.isArray(exhData.exhibitVotes)) setExhibitVotes(exhData.exhibitVotes);
        if (exhData.exhibitSettings) setExhibitSettings(exhData.exhibitSettings);
      }
    } catch (err) {
      console.error('Error fetching live election results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Initial immediate fetch
    fetchResults();

    // 2. Real-time Firebase Firestore Push Listener (Instant 0-delay updates)
    const unsubscribe = subscribeToElectionData((fsData) => {
      if (fsData) {
        const positions =
          Array.isArray(fsData.positions) && fsData.positions.length > 0
            ? fsData.positions
            : INITIAL_POSITIONS;
        const candidates =
          Array.isArray(fsData.candidates) && fsData.candidates.length > 0
            ? fsData.candidates
            : INITIAL_CANDIDATES;
        const votes = Array.isArray(fsData.votes) ? fsData.votes : [];
        const voters = Array.isArray(fsData.voters) ? fsData.voters : [];
        const effSettings = fsData.settings || settings || INITIAL_ELECTION_SETTINGS;
        const effUpdatedAt = fsData.updatedAt || new Date().toISOString();

        const calculated = computeResultsFromData(
          positions,
          candidates,
          votes,
          voters,
          effSettings,
          effUpdatedAt
        );
        setPositionResults(calculated.positionResults || []);
        setTurnoutStats(calculated.turnoutStats || null);
        if (Array.isArray(fsData.exhibitProjects)) setExhibitProjects(fsData.exhibitProjects);
        if (Array.isArray(fsData.exhibitVotes)) setExhibitVotes(fsData.exhibitVotes);
        if (fsData.exhibitSettings) setExhibitSettings(fsData.exhibitSettings);
        setLastUpdated(calculated.lastUpdated || new Date().toISOString());
        setLoading(false);
      }
    });

    // 3. Fallback Interval Poller
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchResults, 3000);
    }

    return () => {
      if (unsubscribe) unsubscribe();
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, settings]);

  // Compute Project Exhibit Live Stats
  const exhibitSummary = useMemo(() => {
    const validExhVotes = exhibitVotes.filter((v) => !v.isInvalidated);
    const totalExhVotes = validExhVotes.length;
    const exhCounts: Record<string, number> = {};
    exhibitProjects.forEach((p) => (exhCounts[p.id] = 0));
    validExhVotes.forEach((v) => {
      if (exhCounts[v.projectId] !== undefined) {
        exhCounts[v.projectId]++;
      }
    });

    const rankedExhibits = [...exhibitProjects]
      .map((p) => {
        const votes = exhCounts[p.id] || 0;
        const percentage =
          totalExhVotes > 0 ? parseFloat(((votes / totalExhVotes) * 100).toFixed(1)) : 0;
        return { ...p, votes, percentage };
      })
      .sort((a, b) => b.votes - a.votes || a.title.localeCompare(b.title));

    const maxVotes = rankedExhibits.length > 0 ? rankedExhibits[0].votes : 0;
    const leadingExhibits =
      maxVotes > 0 ? rankedExhibits.filter((p) => p.votes === maxVotes) : [];

    const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'] as const;
    const byYearLevel = yearLevels.map((yl) => {
      const count = validExhVotes.filter((v) => v.yearLevel === yl).length;
      const pct = totalExhVotes > 0 ? parseFloat(((count / totalExhVotes) * 100).toFixed(1)) : 0;
      return { yearLevel: yl, count, pct };
    });

    const exhChartData = rankedExhibits.map((e) => ({
      name: e.teamName.length > 22 ? `${e.teamName.slice(0, 20)}…` : e.teamName,
      fullTitle: e.title,
      teamName: e.teamName,
      votes: e.votes,
      percentage: e.percentage,
      isLeading: maxVotes > 0 && e.votes === maxVotes,
    }));

    return {
      totalExhVotes,
      rankedExhibits,
      maxVotes,
      leadingExhibits,
      byYearLevel,
      exhChartData,
    };
  }, [exhibitProjects, exhibitVotes]);

  if (loading) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-rose-700 border-t-transparent" />
        <p className="text-sm font-extrabold text-neutral-800 dark:text-slate-200">
          Loading Real-Time Tally Ledger...
        </p>
      </div>
    );
  }

  // Find dominant party overall
  const partyWins: Record<string, number> = {};
  positionResults.forEach((pr) => {
    const leader = pr.candidates.find((c) => c.isLeading);
    if (leader) {
      partyWins[leader.party] = (partyWins[leader.party] || 0) + 1;
    }
  });

  let topParty = 'Independent';
  let maxWins = -1;
  Object.entries(partyWins).forEach(([party, wins]) => {
    if (wins > maxWins) {
      maxWins = wins;
      topParty = party;
    }
  });

  const showExhibitSection = resultsScope === 'all' || resultsScope === 'exhibit';
  const showOfficialsSection = resultsScope === 'all' || resultsScope === 'officials';

  return (
    <div className="space-y-8">
      {/* Top Banner with Real-Time Ticker & Scope Switcher */}
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden text-neutral-900 dark:text-slate-100 space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                  Live Server Tally Connected
                </span>
              </span>
              {isExhibitLockedMode && (
                <span className="inline-flex items-center space-x-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-neutral-900 dark:bg-slate-800 text-amber-300 border border-neutral-800 dark:border-slate-700">
                  <Lock className="w-3 h-3" />
                  <span>Exhibit-Only Lock Active</span>
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-slate-100 tracking-tight mt-1">
              {resultsScope === 'exhibit'
                ? 'Project Exhibit Live Results 2026'
                : 'Official Live Election Results 2026'}
            </h2>
            <p className="text-xs text-neutral-700 dark:text-slate-300 font-bold mt-0.5">
              {resultsScope === 'exhibit'
                ? "Real-Time People's Choice Standings, Vote Share & Year-Level Breakdown"
                : 'Real-Time Department Officer Standings, Project Exhibit Tally & Turnout Metrics'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 bg-neutral-50 dark:bg-slate-800 p-2.5 rounded-2xl border border-neutral-200 dark:border-slate-700 shadow-sm">
            {showExhibitSection && (
              <button
                onClick={() =>
                  generateExhibitPDF(exhibitProjects, exhibitVotes, exhibitSettings, lastUpdated)
                }
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold flex items-center space-x-1.5 transition-all border border-amber-600 shadow-sm active:scale-95"
                title="Download Project Exhibit Live Results PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exhibit PDF</span>
              </button>
            )}

            {showOfficialsSection && (
              <button
                onClick={() =>
                  generateElectionPDF(positionResults, turnoutStats, settings, lastUpdated)
                }
                className="px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-extrabold flex items-center space-x-1.5 transition-all border border-rose-700 shadow-sm active:scale-95"
                title="Download Official Election Results Certificate PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Officials PDF</span>
              </button>
            )}

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 border transition-colors ${
                autoRefresh
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                  : 'bg-neutral-200 dark:bg-slate-700 text-neutral-800 dark:text-slate-200 border-neutral-300 dark:border-slate-600'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{autoRefresh ? 'Live Poll Active' : 'Polling Paused'}</span>
            </button>

            <button
              onClick={fetchResults}
              className="p-2 rounded-xl bg-white dark:bg-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-600 border border-neutral-200 dark:border-slate-600 text-neutral-900 dark:text-slate-100 transition-colors shadow-sm"
              title="Manual Refresh Tally"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scope Switcher Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-neutral-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setResultsScope('exhibit')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center space-x-2 transition-all border ${
              resultsScope === 'exhibit'
                ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                : 'bg-neutral-100 dark:bg-slate-800 text-neutral-800 dark:text-slate-200 border-neutral-200 dark:border-slate-700 hover:bg-neutral-200 dark:hover:bg-slate-700'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Project Exhibit Results</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                resultsScope === 'exhibit'
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
              }`}
            >
              {exhibitSummary.totalExhVotes}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setResultsScope('officials')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center space-x-2 transition-all border ${
              resultsScope === 'officials'
                ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                : 'bg-neutral-100 dark:bg-slate-800 text-neutral-800 dark:text-slate-200 border-neutral-200 dark:border-slate-700 hover:bg-neutral-200 dark:hover:bg-slate-700'
            }`}
          >
            <Vote className="w-3.5 h-3.5" />
            <span>Department Officials</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                resultsScope === 'officials'
                  ? 'bg-white/20 text-white'
                  : 'bg-neutral-200 dark:bg-slate-700 text-neutral-800 dark:text-slate-200'
              }`}
            >
              {turnoutStats?.totalVoted || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setResultsScope('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center space-x-2 transition-all border ${
              resultsScope === 'all'
                ? 'bg-neutral-900 dark:bg-slate-100 text-white dark:text-slate-900 border-neutral-900 dark:border-slate-100 shadow-sm'
                : 'bg-neutral-100 dark:bg-slate-800 text-neutral-800 dark:text-slate-200 border-neutral-200 dark:border-slate-700 hover:bg-neutral-200 dark:hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Standings</span>
          </button>
        </div>
      </div>

      {/* ======================================================= */}
      {/* PROJECT EXHIBIT PEOPLE'S CHOICE LIVE RESULTS DASHBOARD   */}
      {/* ======================================================= */}
      {showExhibitSection && (
        <div className="space-y-6">
          {/* Exhibit KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Exhibit Votes */}
            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-neutral-700 dark:text-slate-300 uppercase tracking-wider">
                  Total Exhibit Votes
                </span>
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-rose-800 dark:text-rose-400 font-mono">
                  {exhibitSummary.totalExhVotes}
                </span>
                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Valid Only
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-slate-400 font-bold mt-1">
                People&apos;s Choice ballots cast
              </p>
            </div>

            {/* Active Projects */}
            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-neutral-700 dark:text-slate-300 uppercase tracking-wider">
                  Participating Exhibits
                </span>
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-neutral-900 dark:text-slate-100 font-mono">
                {exhibitProjects.length}
              </div>
              <p className="text-xs text-neutral-600 dark:text-slate-400 font-bold mt-1">
                Registered project teams
              </p>
            </div>

            {/* Leading Project */}
            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-neutral-700 dark:text-slate-300 uppercase tracking-wider">
                  Current Leader
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
              </div>
              {exhibitSummary.leadingExhibits.length > 0 ? (
                <>
                  <div className="text-base font-black text-rose-800 dark:text-rose-400 truncate">
                    {exhibitSummary.leadingExhibits.length > 1
                      ? `${exhibitSummary.leadingExhibits.length}-Way Tie`
                      : exhibitSummary.leadingExhibits[0].title}
                  </div>
                  <p className="text-xs text-neutral-700 dark:text-slate-300 font-bold mt-1 truncate">
                    {exhibitSummary.leadingExhibits[0].votes} votes (
                    {exhibitSummary.leadingExhibits[0].percentage}%) •{' '}
                    {exhibitSummary.leadingExhibits[0].teamName}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-base font-black text-neutral-500 dark:text-slate-400">
                    No Votes Yet
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-slate-500 font-bold mt-1">
                    Waiting for first exhibit vote
                  </p>
                </>
              )}
            </div>

            {/* Exhibit Voting Status */}
            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-neutral-700 dark:text-slate-300 uppercase tracking-wider">
                  Exhibit Poll Status
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <div
                className={`text-lg font-black ${
                  exhibitSettings.isOpen
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {exhibitSettings.isOpen ? 'EXHIBIT OPEN' : 'EXHIBIT CLOSED'}
              </div>
              <p className="text-xs text-neutral-600 dark:text-slate-400 font-bold mt-1 font-mono">
                Updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Just now'}
              </p>
            </div>
          </div>

          {/* Exhibit Participation by Year Level */}
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl text-neutral-900 dark:text-slate-100">
            <h3 className="text-sm font-extrabold text-neutral-900 dark:text-slate-100 mb-4 uppercase tracking-wider flex items-center space-x-2">
              <Users className="w-4 h-4 text-rose-700 dark:text-rose-400" />
              <span>Project Exhibit Votes by Student Year Level</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {exhibitSummary.byYearLevel.map((yl) => (
                <div
                  key={yl.yearLevel}
                  className="bg-neutral-50 dark:bg-slate-800 p-4 rounded-2xl border border-neutral-200 dark:border-slate-700 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-neutral-900 dark:text-slate-100">
                      {yl.yearLevel} CPE
                    </span>
                    <span className="text-xs font-mono font-black text-rose-800 dark:text-rose-400">
                      {yl.pct}%
                    </span>
                  </div>
                  <div className="w-full bg-white dark:bg-slate-900 h-2.5 rounded-full overflow-hidden border border-neutral-200 dark:border-slate-700">
                    <div
                      className="bg-rose-700 h-full transition-all duration-500"
                      style={{ width: `${yl.pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-700 dark:text-slate-300 font-bold font-mono">
                    <span>Exhibit Votes: {yl.count}</span>
                    <span>of {exhibitSummary.totalExhVotes}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Project Exhibit Chart & Ranked Leaderboard */}
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-200 dark:border-slate-800 gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center space-x-1">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Project Exhibit Showcase</span>
                  </span>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-slate-100">
                    People&apos;s Choice Exhibit Standings
                  </h3>
                </div>
                <p className="text-xs text-neutral-700 dark:text-slate-300 font-bold mt-1">
                  Valid Exhibit Ballots Cast:{' '}
                  <span className="font-mono text-neutral-900 dark:text-slate-100 font-extrabold">
                    {exhibitSummary.totalExhVotes}
                  </span>
                </p>
              </div>

              {exhibitSummary.leadingExhibits.length > 0 && (
                <div className="flex items-center space-x-2 bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 px-3.5 py-1.5 rounded-2xl text-amber-950 dark:text-amber-200 text-xs shadow-sm">
                  <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <div>
                    <span className="font-extrabold block leading-none">
                      {exhibitSummary.leadingExhibits.length > 1
                        ? `Tie: ${exhibitSummary.leadingExhibits.map((l) => l.teamName).join(' & ')}`
                        : exhibitSummary.leadingExhibits[0].title}
                    </span>
                    <span className="text-[10px] font-bold">
                      Leading ({exhibitSummary.leadingExhibits[0].votes} votes •{' '}
                      {exhibitSummary.leadingExhibits[0].percentage}%)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {exhibitProjects.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Cpu className="w-10 h-10 text-neutral-400 mx-auto" />
                <p className="text-sm font-black text-neutral-700 dark:text-slate-300">
                  No Project Exhibits Registered Yet
                </p>
                <p className="text-xs text-neutral-500 dark:text-slate-400">
                  Add student project exhibits in the Admin Panel to start live tallying.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Bar Chart */}
                <div
                  className="lg:col-span-6 bg-neutral-50 dark:bg-slate-800 p-4 rounded-2xl border border-neutral-200 dark:border-slate-700"
                  style={{ height: Math.max(260, exhibitProjects.length * 52) }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={exhibitSummary.exhChartData}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                    >
                      <XAxis
                        type="number"
                        stroke="#94a3b8"
                        fontSize={11}
                        fontWeight={700}
                        allowDecimals={false}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="#94a3b8"
                        fontSize={11}
                        fontWeight={700}
                        width={145}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderWidth: '1px',
                          borderRadius: '0.75rem',
                          color: '#f8fafc',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                        formatter={(value: number, _name: string, props: any) => [
                          `${value} votes (${props?.payload?.percentage || 0}%)`,
                          props?.payload?.fullTitle || 'Exhibit',
                        ]}
                      />
                      <Bar dataKey="votes" radius={[0, 6, 6, 0]}>
                        {exhibitSummary.exhChartData.map((entry, index) => (
                          <Cell
                            key={`exh-cell-${index}`}
                            fill={entry.isLeading ? '#be123c' : '#64748b'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Ranked Project List */}
                <div className="lg:col-span-6 space-y-2.5">
                  {exhibitSummary.rankedExhibits.map((proj, idx) => {
                    const isLeader = exhibitSummary.maxVotes > 0 && proj.votes === exhibitSummary.maxVotes;
                    return (
                      <div
                        key={proj.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isLeader
                            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 shadow-sm'
                            : 'bg-neutral-50 dark:bg-slate-800 border-neutral-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  idx === 0 && proj.votes > 0
                                    ? 'bg-amber-500 text-white'
                                    : idx === 1 && proj.votes > 0
                                    ? 'bg-neutral-700 text-white'
                                    : 'bg-rose-700/15 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300'
                                }`}
                              >
                                #{idx + 1}
                              </span>
                              <span className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-400 truncate">
                                {proj.teamName}
                              </span>
                              {isLeader && (
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                                  LEADING
                                </span>
                              )}
                            </div>
                            <span className="font-extrabold text-neutral-900 dark:text-slate-100 text-xs block truncate mt-1">
                              {proj.title}
                            </span>
                          </div>
                          <div className="text-right font-mono flex-shrink-0">
                            <span className="font-black text-sm text-rose-800 dark:text-rose-400">
                              {proj.votes}
                            </span>
                            <span className="text-xs text-neutral-600 dark:text-slate-300 font-bold block">
                              {proj.percentage}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-white dark:bg-slate-900 h-2 rounded-full overflow-hidden border border-neutral-200 dark:border-slate-700">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isLeader ? 'bg-rose-700' : 'bg-neutral-500 dark:bg-slate-500'
                            }`}
                            style={{ width: `${proj.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* DEPARTMENT OFFICIALS LIVE ELECTION RESULTS              */}
      {/* ======================================================= */}
      {showOfficialsSection && (
        <div className="space-y-8">
          {/* Top Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Ballots Count Today */}
            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden transition-all hover:shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-neutral-700 dark:text-slate-300 uppercase tracking-wider">
                  Total Ballots Count Today
                </span>
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-center font-bold">
                  <Vote className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <div className="text-3xl font-black text-rose-800 dark:text-rose-400 font-mono tracking-tight">
                  {turnoutStats?.totalVoted || 0}
                </div>
                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Valid Only
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-slate-400 font-bold mt-1">
                Out of {turnoutStats?.totalRegistered || 0} Registered Voters Today
              </p>
              <div className="mt-2 text-[10px] font-bold text-neutral-700 dark:text-slate-300 flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>Excludes invalid & deleted votes</span>
              </div>
            </div>

            {/* Voter Turnout % */}
            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-neutral-700 dark:text-slate-300 uppercase tracking-wider">
                  Department Turnout
                </span>
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-neutral-900 dark:text-slate-100 font-mono">
                {turnoutStats?.turnoutPercentage || 0}%
              </div>
              <div className="w-full bg-neutral-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden border border-neutral-200 dark:border-slate-700">
                <div
                  className="bg-rose-700 h-full transition-all duration-500"
                  style={{ width: `${turnoutStats?.turnoutPercentage || 0}%` }}
                />
              </div>
            </div>

            {/* Leading Party */}
            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-neutral-700 dark:text-slate-300 uppercase tracking-wider">
                  Leading Alliance
                </span>
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-center font-bold">
                  <Crown className="w-5 h-5" />
                </div>
              </div>
              <div className="text-lg font-black text-rose-800 dark:text-rose-400 truncate">
                {topParty}
              </div>
              <p className="text-xs text-neutral-700 dark:text-slate-400 font-bold mt-1">
                Leading in {maxWins > 0 ? maxWins : 0} positions
              </p>
            </div>

            {/* Poll Status */}
            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-neutral-700 dark:text-slate-300 uppercase tracking-wider">
                  Officials Poll Status
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
                  <Trophy className="w-5 h-5" />
                </div>
              </div>
              <div className="text-lg font-black text-emerald-800 dark:text-emerald-400">
                {settings.officialsVotingDisabled ? 'DISABLED' : settings.status}
              </div>
              <p className="text-xs text-neutral-700 dark:text-slate-400 font-bold mt-1 font-mono">
                Updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Just now'}
              </p>
            </div>
          </div>

          {/* Turnout by Year Level Breakdown */}
          {turnoutStats && (
            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl text-neutral-900 dark:text-slate-100">
              <h3 className="text-sm font-extrabold text-neutral-900 dark:text-slate-100 mb-4 uppercase tracking-wider flex items-center space-x-2">
                <Users className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                <span>Voter Participation Breakdown by Year Level</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {turnoutStats.byYearLevel.map((yl) => (
                  <div
                    key={yl.yearLevel}
                    className="bg-neutral-50 dark:bg-slate-800 p-4 rounded-2xl border border-neutral-200 dark:border-slate-700 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-neutral-900 dark:text-slate-100">
                        {yl.yearLevel} CPE
                      </span>
                      <span className="text-xs font-mono font-black text-rose-800 dark:text-rose-400">
                        {yl.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-white dark:bg-slate-900 h-2.5 rounded-full overflow-hidden border border-neutral-200 dark:border-slate-700">
                      <div
                        className="bg-rose-700 h-full transition-all duration-500"
                        style={{ width: `${yl.percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-neutral-700 dark:text-slate-300 font-bold font-mono">
                      <span>Voted: {yl.voted}</span>
                      <span>Est Reg: {yl.registered}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Position Results Cards Loop */}
          <div className="space-y-8">
            {positionResults.map((pr) => {
              const chartData = pr.candidates.map((cand) => ({
                name: cand.name,
                votes: cand.votes,
                percentage: cand.percentage,
                party: cand.party,
                isLeading: cand.isLeading,
              }));

              if (pr.abstainCount > 0) {
                chartData.push({
                  name: 'Abstain',
                  votes: pr.abstainCount,
                  percentage: parseFloat(
                    ((pr.abstainCount / (pr.totalVotesCast || 1)) * 100).toFixed(1)
                  ),
                  party: 'Neutral',
                  isLeading: false,
                });
              }

              const leadingCandidate = pr.candidates.find((c) => c.isLeading);

              return (
                <div
                  key={pr.position.id}
                  className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl"
                >
                  {/* Position Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-200 dark:border-slate-800 gap-2 mb-6">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-neutral-900 dark:text-slate-100">
                          {pr.position.category}
                        </span>
                        <h3 className="text-xl font-black text-neutral-900 dark:text-slate-100">
                          {pr.position.title}
                        </h3>
                      </div>
                      <p className="text-xs text-neutral-700 dark:text-slate-300 font-bold mt-1">
                        Total Position Ballots:{' '}
                        <span className="font-mono text-neutral-900 dark:text-slate-100 font-extrabold">
                          {pr.totalVotesCast}
                        </span>
                      </p>
                    </div>

                    {leadingCandidate && (
                      <div className="flex items-center space-x-2 bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 px-3.5 py-1.5 rounded-2xl text-rose-900 dark:text-rose-200 text-xs shadow-sm">
                        <Crown className="w-4 h-4 text-rose-800 dark:text-rose-300" />
                        <div>
                          <span className="font-extrabold block leading-none">
                            {leadingCandidate.name}
                          </span>
                          <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300">
                            Leading ({leadingCandidate.votes} votes)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chart & Candidate Standings */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    <div className="lg:col-span-7 h-64 bg-neutral-50 dark:bg-slate-800 p-4 rounded-2xl border border-neutral-200 dark:border-slate-700">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          layout="vertical"
                          margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                        >
                          <XAxis type="number" stroke="#94a3b8" fontSize={11} fontWeight={700} />
                          <YAxis
                            dataKey="name"
                            type="category"
                            stroke="#94a3b8"
                            fontSize={11}
                            fontWeight={700}
                            width={130}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderColor: '#334155',
                              borderWidth: '1px',
                              borderRadius: '0.75rem',
                              color: '#f8fafc',
                              fontSize: '12px',
                              fontWeight: 'bold',
                            }}
                          />
                          <Bar dataKey="votes" radius={[0, 6, 6, 0]}>
                            {chartData.map((entry, index) => {
                              const color =
                                entry.name === 'Abstain'
                                  ? '#d97706'
                                  : entry.party === 'ByteCraft Alliance'
                                  ? '#be123c'
                                  : entry.party === 'Synapse Union'
                                  ? '#64748b'
                                  : '#047857';
                              return <Cell key={`cell-${index}`} fill={color} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="lg:col-span-5 space-y-2.5">
                      {pr.candidates.map((cand) => (
                        <div
                          key={cand.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            cand.isLeading
                              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 shadow-sm'
                              : 'bg-neutral-50 dark:bg-slate-800 border-neutral-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center space-x-2">
                              <img
                                src={cand.avatarUrl}
                                alt={cand.name}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-lg object-cover border border-neutral-300 dark:border-slate-600"
                              />
                              <div>
                                <span className="font-extrabold text-neutral-900 dark:text-slate-100 text-xs block leading-tight">
                                  {cand.name}
                                </span>
                              </div>
                            </div>

                            <div className="text-right font-mono">
                              <span className="font-black text-sm text-rose-800 dark:text-rose-400">
                                {cand.votes}
                              </span>
                              <span className="text-xs text-neutral-600 dark:text-slate-300 font-bold block">
                                {cand.percentage}%
                              </span>
                            </div>
                          </div>

                          <div className="w-full bg-white dark:bg-slate-900 h-2 rounded-full overflow-hidden border border-neutral-200 dark:border-slate-700">
                            <div
                              className="bg-rose-700 h-full transition-all duration-500"
                              style={{ width: `${cand.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}

                      {pr.abstainCount > 0 && (
                        <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-xs flex justify-between items-center text-neutral-800 dark:text-slate-200 font-bold font-mono">
                          <span>Abstain Votes</span>
                          <span className="font-black text-amber-700 dark:text-amber-400">
                            {pr.abstainCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
