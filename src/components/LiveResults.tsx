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
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-cyan-500 border-t-transparent" />
        <p className="text-sm font-semibold text-slate-400">Loading Real-Time Tally Ledger...</p>
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
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Live Server Tally Connected
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight mt-1">
              Official Live Election Results 2026
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-Time Department Officer Standings & Voter Turnout Metrics
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <button
              onClick={() => generateElectionPDF(positionResults, turnoutStats, settings, lastUpdated)}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-cyan-500/20 active:scale-95"
              title="Download Official Election Results Certificate PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF Report</span>
            </button>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                autoRefresh
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{autoRefresh ? 'Live Poll Active' : 'Polling Paused'}</span>
            </button>

            <button
              onClick={fetchResults}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
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
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Ballots Cast</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Vote className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-100 font-mono">
            {turnoutStats?.totalVoted || 0}
          </div>
          <p className="text-xs text-slate-400 mt-1">Out of {turnoutStats?.totalRegistered || 0} Registered Voters</p>
        </div>

        {/* Voter Turnout % */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department Turnout</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-100 font-mono">
            {turnoutStats?.turnoutPercentage || 0}%
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-800">
            <div
              className="bg-blue-500 h-full transition-all duration-500"
              style={{ width: `${turnoutStats?.turnoutPercentage || 0}%` }}
            />
          </div>
        </div>

        {/* Leading Party */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Leading Alliance</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-lg font-bold text-indigo-400 truncate">
            {topParty}
          </div>
          <p className="text-xs text-slate-400 mt-1">Leading in {maxWins > 0 ? maxWins : 0} positions</p>
        </div>

        {/* Poll Status */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Election Status</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
          <div className="text-lg font-bold text-emerald-400">
            {settings.status}
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Just now'}
          </p>
        </div>
      </div>

      {/* Turnout by Year Level Breakdown */}
      {turnoutStats && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <h3 className="text-sm font-bold text-slate-200 mb-4 uppercase tracking-wider flex items-center space-x-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Voter Participation Breakdown by Year Level</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {turnoutStats.byYearLevel.map((yl) => (
              <div key={yl.yearLevel} className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">{yl.yearLevel} CPE</span>
                  <span className="text-xs font-mono font-bold text-cyan-400">{yl.percentage}%</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-500"
                    style={{ width: `${yl.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
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
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl"
            >
              {/* Position Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2 mb-6">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300">
                      {pr.position.category}
                    </span>
                    <h3 className="text-xl font-bold text-slate-100">{pr.position.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Total Position Ballots: <span className="font-mono text-slate-200 font-bold">{pr.totalVotesCast}</span>
                  </p>
                </div>

                {leadingCandidate && (
                  <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-xl text-amber-300 text-xs">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold block leading-none">{leadingCandidate.name}</span>
                      <span className="text-[10px] text-amber-400/80">Leading ({leadingCandidate.votes} votes)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chart & Candidate Standings */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Visual Bar Chart */}
                <div className="lg:col-span-7 h-64 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <XAxis type="number" stroke="#64748b" fontSize={11} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={130} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          color: '#f8fafc',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="votes" radius={[0, 6, 6, 0]}>
                        {chartData.map((entry, index) => {
                          const color =
                            entry.name === 'Abstain'
                              ? '#f59e0b'
                              : entry.party === 'ByteCraft Alliance'
                              ? '#6366f1'
                              : entry.party === 'Synapse Union'
                              ? '#06b6d4'
                              : '#10b981';
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
                      className={`p-3.5 rounded-xl border transition-all ${
                        cand.isLeading
                          ? 'bg-slate-950 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                          : 'bg-slate-950/60 border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center space-x-2">
                          <img
                            src={cand.avatarUrl}
                            alt={cand.name}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                          />
                          <div>
                            <span className="font-bold text-slate-100 text-xs block leading-tight">
                              {cand.name}
                            </span>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <span className="font-bold text-sm text-cyan-400">{cand.votes}</span>
                          <span className="text-xs text-slate-500 block">{cand.percentage}%</span>
                        </div>
                      </div>

                      {/* Percentage Bar */}
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-cyan-500 h-full transition-all duration-500"
                          style={{ width: `${cand.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  {pr.abstainCount > 0 && (
                    <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-xs flex justify-between items-center text-slate-400 font-mono">
                      <span>Abstain Votes</span>
                      <span className="font-bold text-amber-400">{pr.abstainCount}</span>
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
