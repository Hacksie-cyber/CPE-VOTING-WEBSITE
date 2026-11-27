import React, { useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Cpu,
  Search,
  Trophy,
  Users,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Info,
  X,
  Lock,
  Award,
  ArrowUpDown,
  Vote,
} from 'lucide-react';
import {
  ExhibitProject,
  ExhibitVote,
  ExhibitSettings,
  Voter,
  ElectionSettings,
} from '../types';
import { saveExhibitVoteToFirestoreDirect } from '../lib/firebase';

interface ProjectExhibitSectionProps {
  projects: ExhibitProject[];
  exhibitVotes: ExhibitVote[];
  exhibitSettings: ExhibitSettings;
  electionSettings: ElectionSettings;
  voter: Voter | null;
  onOpenAuth: () => void;
  onVoteSuccess: (newVote: ExhibitVote, updatedVotes?: ExhibitVote[]) => void;
}

function normalizeName(name: string): string {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

export const ProjectExhibitSection: React.FC<ProjectExhibitSectionProps> = ({
  projects,
  exhibitVotes,
  exhibitSettings,
  electionSettings,
  voter,
  onOpenAuth,
  onVoteSuccess,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'votes'>('title');

  const [detailProject, setDetailProject] = useState<ExhibitProject | null>(null);
  const [confirmProject, setConfirmProject] = useState<ExhibitProject | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const stNorm = (electionSettings?.status || '').toString().trim().toUpperCase();
  const isElectionPaused = stNorm === 'PAUSED';
  const isExhibitClosed = !exhibitSettings.isOpen || isElectionPaused;

  // Active valid exhibit votes
  const validExhibitVotes = useMemo(
    () => exhibitVotes.filter((v) => !v.isInvalidated),
    [exhibitVotes]
  );

  // Detect if current student already voted for an exhibit
  const userExhibitVote = useMemo(() => {
    if (!voter) return null;
    const vId = voter.id?.toUpperCase().trim();
    const vEmail = voter.email?.toLowerCase().trim();
    const vNorm = normalizeName(voter.name);

    return (
      validExhibitVotes.find(
        (ev) =>
          (vId && ev.voterId?.toUpperCase().trim() === vId) ||
          (vEmail && ev.voterEmail && ev.voterEmail.toLowerCase().trim() === vEmail) ||
          (vNorm.length > 2 && normalizeName(ev.voterName) === vNorm)
      ) || null
    );
  }, [voter, validExhibitVotes]);

  const userVotedProject = useMemo(
    () => (userExhibitVote ? projects.find((p) => p.id === userExhibitVote.projectId) || null : null),
    [userExhibitVote, projects]
  );

  // Compute vote counts per project
  const projectStats = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => (counts[p.id] = 0));
    validExhibitVotes.forEach((v) => {
      if (counts[v.projectId] !== undefined) {
        counts[v.projectId]++;
      }
    });

    const totalVotes = validExhibitVotes.length;
    const maxVotes = Math.max(0, ...Object.values(counts));

    return { counts, totalVotes, maxVotes };
  }, [projects, validExhibitVotes]);

  // Ranked leaderboard (top 3)
  const topProjects = useMemo(() => {
    return [...projects]
      .map((p) => {
        const votes = projectStats.counts[p.id] || 0;
        const pct =
          projectStats.totalVotes > 0
            ? parseFloat(((votes / projectStats.totalVotes) * 100).toFixed(1))
            : 0;
        return { ...p, votes, percentage: pct };
      })
      .sort((a, b) => b.votes - a.votes || a.title.localeCompare(b.title))
      .slice(0, 3);
  }, [projects, projectStats]);

  // Filtered and sorted projects
  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const filtered = projects.filter((proj) => {
      if (!q) return true;
      return (
        proj.title.toLowerCase().includes(q) ||
        proj.teamName.toLowerCase().includes(q) ||
        proj.description.toLowerCase().includes(q)
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'votes') {
        const diff = (projectStats.counts[b.id] || 0) - (projectStats.counts[a.id] || 0);
        if (diff !== 0) return diff;
      }
      return a.title.localeCompare(b.title);
    });
  }, [projects, searchQuery, sortBy, projectStats.counts]);

  const initiateVote = (project: ExhibitProject) => {
    setFeedbackError(null);
    if (!voter) {
      onOpenAuth();
      return;
    }
    if (voter.isInvalidated) {
      setFeedbackError('Your voter account has been flagged by the Election Commission and cannot vote.');
      return;
    }
    if (isExhibitClosed) {
      setFeedbackError(
        isElectionPaused
          ? 'Voting is currently paused by the election committee.'
          : 'Project Exhibit voting is currently closed.'
      );
      return;
    }
    if (userExhibitVote) {
      setFeedbackError(
        `You have already voted for "${userVotedProject?.title || 'a project exhibit'}" (Receipt: ${userExhibitVote.receiptHash}).`
      );
      return;
    }
    setConfirmProject(project);
  };

  const handleConfirmVote = async () => {
    if (!voter || !confirmProject) return;
    setSubmitting(true);
    setFeedbackError(null);

    const chars = 'ABCDEF0123456789';
    const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const fallbackHash = `EXH2026-${part1}-${part2}`;
    const timestamp = new Date().toISOString();

    let recordedVote: ExhibitVote | null = null;
    let updatedVotesList: ExhibitVote[] | undefined;

    // 1. Try Express API first
    try {
      const res = await fetch('/api/exhibit/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterId: voter.id,
          voterName: voter.name,
          voterEmail: voter.email,
          voterYearLevel: voter.yearLevel,
          projectId: confirmProject.id,
        }),
      });
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.success && data.vote) {
          recordedVote = data.vote;
          updatedVotesList = data.exhibitVotes;
        } else if (!res.ok && data.message) {
          setFeedbackError(data.message);
          setSubmitting(false);
          setConfirmProject(null);
          return;
        }
      }
    } catch {
      // Fallback to direct Firestore save below
    }

    // 2. Ensure Firestore direct save (for static/Vercel environments or sync)
    if (!recordedVote) {
      const fsResult = await saveExhibitVoteToFirestoreDirect(
        {
          id: voter.id,
          name: voter.name,
          email: voter.email,
          yearLevel: voter.yearLevel,
        },
        confirmProject.id,
        fallbackHash,
        timestamp
      );

      if (!fsResult.success || !fsResult.vote) {
        setFeedbackError(fsResult.message || 'Unable to submit your exhibit vote. Please try again.');
        setSubmitting(false);
        setConfirmProject(null);
        return;
      }
      recordedVote = fsResult.vote;
    }

    setConfirmProject(null);
    setDetailProject(null);
    setSubmitting(false);
    setFeedbackSuccess(
      `Your People's Choice vote for "${confirmProject.title}" has been recorded! Receipt: ${recordedVote.receiptHash}`
    );

    try {
      confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore confetti failures
    }

    onVoteSuccess(recordedVote, updatedVotesList);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Hero Banner */}
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute -right-14 -top-14 w-64 h-64 bg-rose-700/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                <Cpu className="w-3.5 h-3.5" />
                <span>People&apos;s Choice Award</span>
              </span>
              <span
                className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${
                  isExhibitClosed
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isExhibitClosed ? 'bg-amber-600' : 'bg-emerald-500 animate-pulse'
                  }`}
                />
                <span>{isExhibitClosed ? 'Exhibit Voting Closed' : 'Live Exhibit Voting Open'}</span>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-slate-100 tracking-tight">
              {exhibitSettings.title || 'CPE Innovation & Capstone Project Exhibit 2026'}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-slate-300 font-medium leading-relaxed">
              {exhibitSettings.subtitle ||
                "Explore student hardware, robotics, embedded systems, and software prototypes. Every verified CPE student receives one People's Choice vote."}
            </p>
          </div>

          {/* Exhibit Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
            <div className="bg-neutral-50 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700 rounded-2xl p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:text-slate-400 block">
                Exhibit Projects
              </span>
              <span className="text-2xl font-black text-neutral-900 dark:text-slate-100 font-mono mt-0.5 block">
                {projects.length}
              </span>
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">
                Active Teams
              </span>
            </div>
            <div className="bg-neutral-50 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700 rounded-2xl p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:text-slate-400 block">
                Exhibit Votes
              </span>
              <span className="text-2xl font-black text-rose-700 dark:text-rose-400 font-mono mt-0.5 block">
                {projectStats.totalVotes}
              </span>
              <span className="text-[11px] font-bold text-neutral-600 dark:text-slate-300">
                Ballots Cast
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Alerts */}
      {feedbackError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-700 dark:text-rose-400 flex-shrink-0" />
            <span>{feedbackError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackError(null)}
            className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900 font-black"
          >
            ✕
          </button>
        </div>
      )}

      {feedbackSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 flex-shrink-0" />
            <span>{feedbackSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackSuccess(null)}
            className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 font-black"
          >
            ✕
          </button>
        </div>
      )}

      {/* Voter Exhibit Status Card */}
      {!voter ? (
        <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-700 text-white flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-rose-950 dark:text-rose-100">
                Sign in to Vote for a Project Exhibit
              </h3>
              <p className="text-xs text-rose-800 dark:text-rose-300 font-medium">
                You can browse all projects now, then sign in with your student account to cast your 1 People&apos;s Choice vote.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-black shadow-sm transition-all active:scale-95 flex-shrink-0"
          >
            Login as CPE Student
          </button>
        </div>
      ) : userExhibitVote ? (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Exhibit Vote Recorded
                </span>
                <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                  {userExhibitVote.receiptHash}
                </span>
              </div>
              <p className="text-sm font-extrabold text-neutral-900 dark:text-slate-100 mt-0.5">
                You voted for:{' '}
                <span className="text-rose-700 dark:text-rose-400">
                  {userVotedProject?.title || 'Project Exhibit'}
                </span>
              </p>
              <p className="text-[11px] text-neutral-600 dark:text-slate-400 font-medium">
                {userVotedProject?.teamName ? `${userVotedProject.teamName} • ` : ''}
                Submitted {new Date(userExhibitVote.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
          {userVotedProject && (
            <button
              type="button"
              onClick={() => setDetailProject(userVotedProject)}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-neutral-50 dark:hover:bg-slate-800 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-xs font-black transition-colors flex-shrink-0"
            >
              View Selected Project
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <span className="font-black text-neutral-900 dark:text-slate-100 block">
                Ready to Vote, {voter.name}
              </span>
              <span className="text-neutral-600 dark:text-slate-400 font-medium">
                Select your favorite student project below to cast your 1 People&apos;s Choice Exhibit vote.
              </span>
            </div>
          </div>
          <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-[11px] font-black bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            1 Vote Remaining
          </span>
        </div>
      )}

      {/* Top 3 Leaderboard Preview */}
      {exhibitSettings.showLiveStandings && projects.length > 0 && projectStats.totalVotes > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-slate-100 flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Current People&apos;s Choice Leaders</span>
            </h3>
            <span className="text-[11px] font-bold text-neutral-500 dark:text-slate-400">
              Live Standings
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {topProjects.map((proj, idx) => (
              <div
                key={proj.id}
                onClick={() => setDetailProject(proj)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                  idx === 0 && proj.votes > 0
                    ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                    : 'bg-neutral-50 dark:bg-slate-800/70 border-neutral-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      idx === 0
                        ? 'bg-amber-500 text-white'
                        : idx === 1
                        ? 'bg-neutral-700 text-white'
                        : 'bg-rose-700 text-white'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-mono font-black text-rose-700 dark:text-rose-400">
                    {proj.votes} {proj.votes === 1 ? 'vote' : 'votes'} ({proj.percentage}%)
                  </span>
                </div>
                <h4 className="text-xs font-extrabold text-neutral-900 dark:text-slate-100 line-clamp-1">
                  {proj.title}
                </h4>
                <p className="text-[11px] text-neutral-600 dark:text-slate-400 font-medium truncate">
                  {proj.teamName}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Sort Controls */}
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 dark:text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects by title, team name, or description..."
              className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl pl-10 pr-9 py-2.5 text-xs font-bold text-neutral-900 dark:text-slate-100 placeholder-neutral-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-700"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 text-xs font-black p-0.5"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500 dark:text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'title' | 'votes')}
              className="w-full sm:w-auto bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-xs font-bold text-neutral-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-700"
            >
              <option value="title">Sort: Title A-Z</option>
              {exhibitSettings.showLiveStandings && <option value="votes">Sort: Most Voted</option>}
            </select>
          </div>
        </div>
      </div>

      {/* Project Exhibits Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-2 shadow-sm">
          <Cpu className="w-10 h-10 text-neutral-400 mx-auto" />
          <h3 className="text-base font-black text-neutral-900 dark:text-slate-100">
            No matching project exhibits found
          </h3>
          <p className="text-xs text-neutral-600 dark:text-slate-400 font-medium">
            Try clearing your search to view all registered projects.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((proj) => {
            const votes = projectStats.counts[proj.id] || 0;
            const pct =
              projectStats.totalVotes > 0
                ? parseFloat(((votes / projectStats.totalVotes) * 100).toFixed(1))
                : 0;
            const isVotedForThis = userExhibitVote?.projectId === proj.id;
            const isLeading =
              exhibitSettings.showLiveStandings &&
              projectStats.maxVotes > 0 &&
              votes === projectStats.maxVotes;

            return (
              <div
                key={proj.id}
                className={`rounded-2xl overflow-hidden border flex flex-col justify-between transition-all group ${
                  isVotedForThis
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/40 shadow-md'
                    : 'bg-white dark:bg-slate-900 border-neutral-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Top Strip */}
                <div className="bg-rose-700 dark:bg-rose-900 text-white px-4 py-2 text-xs font-black flex items-center justify-between gap-2 border-b border-rose-800/30 dark:border-slate-800">
                  <span className="flex items-center space-x-1.5 truncate">
                    <Users className="w-3.5 h-3.5 text-rose-200 flex-shrink-0" />
                    <span className="truncate">{proj.teamName}</span>
                  </span>
                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    {isLeading && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-sm flex items-center space-x-1">
                        <Trophy className="w-3 h-3" />
                        <span>Leading</span>
                      </span>
                    )}
                    {isVotedForThis && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-sm flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Your Vote</span>
                      </span>
                    )}
                    {exhibitSettings.showLiveStandings && (
                      <span className="text-[10px] font-mono font-black bg-white/15 px-2 py-0.5 rounded-full border border-white/20">
                        {votes} {votes === 1 ? 'vote' : 'votes'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <h3
                      onClick={() => setDetailProject(proj)}
                      className="font-extrabold text-base sm:text-lg text-neutral-900 dark:text-slate-100 leading-snug cursor-pointer hover:text-rose-700 dark:hover:text-rose-400 transition-colors"
                    >
                      {proj.title}
                    </h3>
                    <p className="text-xs text-neutral-600 dark:text-slate-300 font-medium leading-relaxed line-clamp-4">
                      {proj.description}
                    </p>
                  </div>

                  {/* Standings Progress + Action Footer */}
                  <div className="space-y-3 pt-3 border-t border-neutral-100 dark:border-slate-800">
                    {exhibitSettings.showLiveStandings && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-neutral-500 dark:text-slate-400">
                            People&apos;s Choice Share
                          </span>
                          <span className="font-mono font-black text-rose-700 dark:text-rose-400">
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full bg-neutral-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden border border-neutral-200 dark:border-slate-700">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isVotedForThis ? 'bg-emerald-600' : 'bg-rose-700'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setDetailProject(proj)}
                        className="px-3 py-2 rounded-xl text-xs font-extrabold bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-800 dark:text-slate-200 border border-neutral-200 dark:border-slate-700 transition-colors"
                      >
                        Read More
                      </button>

                      {isVotedForThis ? (
                        <button
                          type="button"
                          disabled
                          className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 text-white flex items-center space-x-1.5 shadow-sm cursor-default"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Voted</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => initiateVote(proj)}
                          disabled={Boolean(userExhibitVote) || isExhibitClosed}
                          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center space-x-1.5 transition-all shadow-sm ${
                            Boolean(userExhibitVote) || isExhibitClosed
                              ? 'bg-neutral-200 dark:bg-slate-800 text-neutral-400 dark:text-slate-500 cursor-not-allowed border border-neutral-300 dark:border-slate-700'
                              : 'bg-rose-700 hover:bg-rose-800 text-white active:scale-95'
                          }`}
                        >
                          <Vote className="w-3.5 h-3.5" />
                          <span>{userExhibitVote ? 'Vote Used' : 'Vote Exhibit'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Detail Modal */}
      {detailProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl relative text-neutral-900 dark:text-slate-100 max-h-[90vh] flex flex-col">
            <div className="bg-rose-700 dark:bg-rose-900 text-white p-6 relative">
              <button
                type="button"
                onClick={() => setDetailProject(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <span className="inline-flex items-center space-x-1.5 text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/15 border border-white/20 mb-2">
                <Users className="w-3.5 h-3.5" />
                <span>{detailProject.teamName}</span>
              </span>
              <h3 className="text-xl sm:text-2xl font-black leading-tight pr-8">
                {detailProject.title}
              </h3>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-slate-400 mb-2">
                  Project Description
                </h4>
                <p className="text-xs sm:text-sm text-neutral-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                  {detailProject.description}
                </p>
              </div>
            </div>

            <div className="p-4 sm:px-6 border-t border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-900 flex items-center justify-between gap-3">
              {exhibitSettings.showLiveStandings ? (
                <div className="text-xs font-bold text-neutral-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                  <span>
                    Current Tally:{' '}
                    <strong className="font-mono text-rose-700 dark:text-rose-400">
                      {projectStats.counts[detailProject.id] || 0} votes
                    </strong>
                  </span>
                </div>
              ) : (
                <span className="text-xs font-bold text-neutral-500">CPE Project Exhibit 2026</span>
              )}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setDetailProject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-neutral-800 dark:text-slate-200"
                >
                  Close
                </button>
                {userExhibitVote?.projectId === detailProject.id ? (
                  <span className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 text-white flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Your Voted Exhibit</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => initiateVote(detailProject)}
                    disabled={Boolean(userExhibitVote) || isExhibitClosed}
                    className="px-5 py-2 rounded-xl text-xs font-black bg-rose-700 hover:bg-rose-800 text-white flex items-center space-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{!voter ? 'Login to Vote' : userExhibitVote ? 'Already Voted' : 'Vote for This Exhibit'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vote Confirmation Modal */}
      {confirmProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-neutral-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black leading-tight">Confirm Exhibit Vote</h3>
                <p className="text-xs text-neutral-600 dark:text-slate-400 font-bold">
                  People&apos;s Choice Award • Final Selection
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                {confirmProject.teamName}
              </span>
              <h4 className="text-sm font-black text-neutral-900 dark:text-slate-100">
                {confirmProject.title}
              </h4>
              <p className="text-xs text-neutral-600 dark:text-slate-400 font-medium line-clamp-2">
                {confirmProject.description}
              </p>
            </div>

            <p className="text-xs text-neutral-700 dark:text-slate-300 font-medium leading-relaxed">
              Each student may cast <strong>one (1)</strong> People&apos;s Choice vote for the Project Exhibit. Once confirmed, your selection is locked and issued an audit receipt.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmProject(null)}
                className="px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-800 dark:text-slate-200 text-xs font-bold border border-neutral-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmVote}
                className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-black flex items-center space-x-2 shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm &amp; Cast Vote</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
