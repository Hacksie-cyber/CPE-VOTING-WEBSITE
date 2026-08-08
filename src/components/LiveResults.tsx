import React, { useEffect, useState } from 'react';
import { PositionResult, VoterTurnoutStats, ElectionSettings } from '../types';
import { generateElectionPDF } from '../utils/pdfGenerator';
import { fetchOrCalculateResults } from '../utils/electionResultsHelper';
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
  BarChart3,
  RefreshCw,
  Trophy,
  Users,
  Vote,
  Activity,
  Award,
  Crown,
  CheckCircle2,
  Download,
  FileText,
} from 'lucide-react';

interface LiveResultsProps {
  settings: ElectionSettings;
}

export const LiveResults: React.FC<LiveResultsProps> = ({ settings }) => {
  const [positionResults, setPositionResults] = useState<PositionResult[]>([]);
  const [turnoutStats, setTurnoutStats] = useState<VoterTurnoutStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  const fetchResults = async () => {
    try {
      const data = await fetchOrCalculateResults(settings);
      setPositionResults(data.positionResults || []);
      setTurnoutStats(data.turnoutStats || null);
      setLastUpdated(data.lastUpdated || new Date().toISOString());
    } catch (err) {
      console.error('Error fetching live election results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchResults, 4000); // 4-second live poll
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-rose-700 border-t-transparent" />
        <p className="text-sm font-extrabold text-neutral-800">Loading Real-Time Tally Ledger...</p>
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

  return (
    <div className="space-y-8">
      {/* Top Banner with Real-Time Ticker */}
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden text-neutral-900 dark:text-slate-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                Live Server Tally Connected
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-slate-100 tracking-tight mt-1">
              Official Live Election Results 2026
            </h2>
            <p className="text-xs text-neutral-700 dark:text-slate-300 font-bold mt-0.5">
              Real-Time Department Officer Standings & Voter Turnout Metrics
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-neutral-50 dark:bg-slate-800 p-2.5 rounded-2xl border border-neutral-200 dark:border-slate-700 shadow-sm">
            <button
              onClick={() => generateElectionPDF(positionResults, turnoutStats, settings, lastUpdated)}
              className="px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-extrabold flex items-center space-x-1.5 transition-all border border-rose-700 shadow-sm active:scale-95"
              title="Download Official Election Results Certificate PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF Report</span>
            </button>

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
      </div>

      {/* Top Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Votes */}
        <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden transition-all hover:shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-neutral-700 dark:text-slate-300 uppercase tracking-wider">Total Ballots Count Today</span>
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-center font-bold">
              <Vote className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-800 dark:text-rose-400 font-mono tracking-tight">
            {turnoutStats?.totalVoted || 0}
          </div>
          <p className="text-xs text-neutral-600 dark:text-slate-400 font-bold mt-1">Out of {turnoutStats?.totalRegistered || 0} Registered Voters Today</p>
        </div>

        {/* Voter Turnout % */}
        <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-neutral-700 dark:text-slate-300 uppercase tracking-wider">Department Turnout</span>
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
            <span className="text-xs font-black text-neutral-700 dark:text-slate-300 uppercase tracking-wider">Leading Alliance</span>
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-center font-bold">
              <Crown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-lg font-black text-rose-800 dark:text-rose-400 truncate">
            {topParty}
          </div>
          <p className="text-xs text-neutral-700 dark:text-slate-400 font-bold mt-1">Leading in {maxWins > 0 ? maxWins : 0} positions</p>
        </div>

        {/* Poll Status */}
        <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-neutral-700 dark:text-slate-300 uppercase tracking-wider">Election Status</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
          <div className="text-lg font-black text-emerald-800 dark:text-emerald-400">
            {settings.status}
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
              <div key={yl.yearLevel} className="bg-neutral-50 dark:bg-slate-800 p-4 rounded-2xl border border-neutral-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-neutral-900 dark:text-slate-100">{yl.yearLevel} CPE</span>
                  <span className="text-xs font-mono font-black text-rose-800 dark:text-rose-400">{yl.percentage}%</span>
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
          // Prepare chart data
          const chartData = pr.candidates.map((cand) => ({
            name: cand.name,
            votes: cand.votes,
            percentage: cand.percentage,
            party: cand.party,
            isLeading: cand.isLeading,
          }));

          // Add Abstain if non-zero
          if (pr.abstainCount > 0) {
            chartData.push({
              name: 'Abstain',
              votes: pr.abstainCount,
              percentage: parseFloat(((pr.abstainCount / (pr.totalVotesCast || 1)) * 100).toFixed(1)),
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
                    <h3 className="text-xl font-black text-neutral-900 dark:text-slate-100">{pr.position.title}</h3>
                  </div>
                  <p className="text-xs text-neutral-700 dark:text-slate-300 font-bold mt-1">
                    Total Position Ballots: <span className="font-mono text-neutral-900 dark:text-slate-100 font-extrabold">{pr.totalVotesCast}</span>
                  </p>
                </div>

                {leadingCandidate && (
                  <div className="flex items-center space-x-2 bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 px-3.5 py-1.5 rounded-2xl text-rose-900 dark:text-rose-200 text-xs shadow-sm">
                    <Crown className="w-4 h-4 text-rose-800 dark:text-rose-300" />
                    <div>
                      <span className="font-extrabold block leading-none">{leadingCandidate.name}</span>
                      <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300">Leading ({leadingCandidate.votes} votes)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chart & Candidate Standings */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Visual Bar Chart */}
                <div className="lg:col-span-7 h-64 bg-neutral-50 dark:bg-slate-800 p-4 rounded-2xl border border-neutral-200 dark:border-slate-700">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <XAxis type="number" stroke="#94a3b8" fontSize={11} fontWeight={700} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} fontWeight={700} width={130} />
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

                {/* Detailed Standings Table */}
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
                          <span className="font-black text-sm text-rose-800 dark:text-rose-400">{cand.votes}</span>
                          <span className="text-xs text-neutral-600 dark:text-slate-300 font-bold block">{cand.percentage}%</span>
                        </div>
                      </div>

                      {/* Percentage Bar */}
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
                      <span className="font-black text-amber-700 dark:text-amber-400">{pr.abstainCount}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
