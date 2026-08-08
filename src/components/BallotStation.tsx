import React, { useState } from 'react';
import { Position, Candidate, Voter, VoteChoices, ElectionSettings } from '../types';
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Ban,
  Award,
  FileText,
  Sparkles,
  AlertCircle,
  Layers,
  ArrowRight,
  ArrowLeft,
  Grid
} from 'lucide-react';

interface BallotStationProps {
  positions: Position[];
  candidates: Candidate[];
  voter: Voter | null;
  settings: ElectionSettings;
  choices: VoteChoices;
  onSelectCandidate: (positionId: string, choiceId: string) => void;
  onOpenReview: () => void;
  onOpenAuth: () => void;
}

export const BallotStation: React.FC<BallotStationProps> = ({
  positions,
  candidates,
  voter,
  settings,
  choices,
  onSelectCandidate,
  onOpenReview,
  onOpenAuth,
}) => {
  const [activePosIndex, setActivePosIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'horizontal' | 'grid'>('horizontal');
  const [selectedCandidateModal, setSelectedCandidateModal] = useState<Candidate | null>(null);
  const [ruleViolationNotice, setRuleViolationNotice] = useState<string | null>(null);

  const totalPositions = positions.length;
  const selectedCount = Object.keys(choices).length;
  const isComplete = selectedCount === totalPositions;

  // Helper to check if a candidate (by ID or name) is selected for another position
  const getSelectedOtherPosition = (cand: Candidate, currentPosId: string): Position | null => {
    const candNameLower = cand.name.toLowerCase().trim();

    for (const [posId, choiceId] of Object.entries(choices)) {
      if (posId === currentPosId || choiceId === 'ABSTAIN' || !choiceId) continue;

      const selectedCand = candidates.find((c) => c.id === choiceId);
      if (
        selectedCand &&
        (selectedCand.id === cand.id || selectedCand.name.toLowerCase().trim() === candNameLower)
      ) {
        return positions.find((p) => p.id === posId) || null;
      }
    }
    return null;
  };

  const handleCandidateClick = (posId: string, cand: Candidate) => {
    if (voter?.hasVoted) return;

    const otherPos = getSelectedOtherPosition(cand, posId);
    if (otherPos) {
      setRuleViolationNotice(
        `"${cand.name}" is already selected for ${otherPos.title}. A candidate cannot be selected for multiple positions on the same ballot.`
      );
      setTimeout(() => setRuleViolationNotice(null), 6000);
      return;
    }

    onSelectCandidate(posId, cand.id);

    // Subtle horizontal auto-advance to next position in step-by-step mode
    if (viewMode === 'horizontal' && activePosIndex < totalPositions - 1) {
      setTimeout(() => {
        setActivePosIndex((prev) => Math.min(totalPositions - 1, prev + 1));
      }, 350);
    }
  };

  const activePosition = positions[activePosIndex] || positions[0];

  return (
    <div className="space-y-6 pb-32">
      {/* Rule Notice Banner */}
      {ruleViolationNotice && (
        <div className="sticky top-4 z-40 bg-rose-900 border-2 border-black text-white p-4 rounded-2xl text-xs font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-300 flex-shrink-0" />
            <span>{ruleViolationNotice}</span>
          </div>
          <button
            onClick={() => setRuleViolationNotice(null)}
            className="text-white hover:bg-black/30 p-1 rounded-lg border border-white/40"
          >
            ✕
          </button>
        </div>
      )}      {/* Banner / Instructions */}
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-rose-700/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400 text-xs font-extrabold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4 text-rose-700 dark:text-rose-400" />
              <span>Official CPE Commission on Elections 2026</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-slate-100 tracking-tight">
              Official Department Council Ballot
            </h2>
            <p className="text-sm text-neutral-600 dark:text-slate-300 font-medium mt-1 max-w-2xl">
              Select one candidate or choose &quot;Abstain&quot; for each position. Use the navigation bar below to step through each position.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-neutral-100 dark:bg-slate-800 p-1.5 rounded-xl border border-neutral-200 dark:border-slate-700 flex-shrink-0">
            <button
              onClick={() => setViewMode('horizontal')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                viewMode === 'horizontal'
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'text-neutral-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Step-by-Step</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                viewMode === 'grid'
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'text-neutral-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-slate-700'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Show All Positions</span>
            </button>
          </div>
        </div>

        {/* Multi-Position Voting Rule Alert */}
        <div className="mt-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 p-3 rounded-xl flex items-center space-x-2.5 text-xs text-rose-900 dark:text-rose-200 font-medium">
          <Info className="w-4 h-4 text-rose-700 dark:text-rose-400 flex-shrink-0" />
          <span>
            <strong className="text-rose-900 dark:text-rose-100 font-bold">Single-Position Candidate Rule:</strong> Selecting a candidate for one position (e.g. Governor) automatically makes them unavailable for selection in all other positions.
          </span>
        </div>
      </div>

      {/* Horizontal Position Navigation Stepper Bar */}
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-slate-100 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-rose-700 dark:text-rose-400" />
            <span>Position Navigation ({activePosIndex + 1} of {totalPositions})</span>
          </span>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActivePosIndex((prev) => Math.max(0, prev - 1))}
              disabled={activePosIndex === 0}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-slate-800 text-neutral-900 dark:text-slate-100 hover:bg-neutral-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1 border border-neutral-200 dark:border-slate-700 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev Position</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePosIndex((prev) => Math.min(totalPositions - 1, prev + 1))}
              disabled={activePosIndex === totalPositions - 1}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-slate-800 text-neutral-900 dark:text-slate-100 hover:bg-neutral-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1 border border-neutral-200 dark:border-slate-700 transition-all"
            >
              <span>Next Position</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Position Tabs */}
        <div className="flex items-center space-x-2.5 overflow-x-auto pb-2 pt-1 custom-scrollbar">
          {positions.map((pos, idx) => {
            const isSelected = !!choices[pos.id];
            const isActive = idx === activePosIndex;
            return (
              <button
                key={pos.id}
                type="button"
                onClick={() => setActivePosIndex(idx)}
                className={`flex-shrink-0 flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  isActive
                    ? 'bg-rose-700 dark:bg-rose-800 border-rose-700 dark:border-rose-600 text-white shadow-sm'
                    : isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-neutral-50 dark:bg-slate-800 border-neutral-200 dark:border-slate-700 text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-700'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    isActive
                      ? 'bg-white text-rose-800'
                      : isSelected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-200 dark:bg-slate-700 text-neutral-800 dark:text-slate-200'
                  }`}
                >
                  {isSelected ? '✓' : idx + 1}
                </span>
                <span className="whitespace-nowrap">{pos.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Ballot Cards Display */}
      {viewMode === 'horizontal' ? (
        /* Single Active Position (Horizontal Step View) */
        <div className="space-y-4">
          {activePosition && (
            <div
              key={activePosition.id}
              className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative transition-all duration-300 animate-in fade-in slide-in-from-right-2"
            >
              {/* Position Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-200 dark:border-slate-800 gap-3 mb-6">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                      Position {activePosIndex + 1} of {totalPositions} • {activePosition.category}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-slate-100">{activePosition.title}</h3>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-slate-300 font-medium mt-1">{activePosition.description}</p>
                </div>

                <div className="flex items-center space-x-2">
                  {choices[activePosition.id] ? (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-700 text-white border border-rose-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Choice Selected</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300 border border-neutral-200 dark:border-slate-700">
                      <span>Pending Selection</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Candidates Grid for Active Position */}
              {(() => {
                const activePosCandidates = candidates.filter(
                  (c) => c.positionId === activePosition.id || c.positionId?.toLowerCase() === activePosition.id?.toLowerCase()
                );
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {activePosCandidates.length === 0 ? (
                      <div className="md:col-span-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl p-6 text-center text-xs text-neutral-600 dark:text-slate-300 flex flex-col items-center justify-center">
                        <p className="font-bold text-neutral-800 dark:text-slate-100">No candidates nominated for {activePosition.title} yet.</p>
                      </div>
                    ) : (
                      activePosCandidates.map((cand) => {
                        const isSelected = choices[activePosition.id] === cand.id;
                        const otherPosition = getSelectedOtherPosition(cand, activePosition.id);
                        const isUnavailable = !!otherPosition && !isSelected;

                        return (
                          <div
                            key={cand.id}
                            onClick={() => handleCandidateClick(activePosition.id, cand)}
                            className={`relative rounded-2xl overflow-hidden border transition-all cursor-pointer flex flex-col justify-between group ${
                              isSelected
                                ? 'bg-rose-50/90 dark:bg-rose-950/80 border-rose-600 dark:border-rose-500 ring-2 ring-rose-500/50 shadow-md'
                                : isUnavailable
                                ? 'bg-neutral-100/70 dark:bg-slate-800/50 border-neutral-200 dark:border-slate-800 opacity-60'
                                : 'bg-white dark:bg-slate-900 hover:bg-rose-50/40 dark:hover:bg-slate-800/80 border-neutral-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800 shadow-sm hover:shadow-md'
                            }`}
                          >
                            {/* Red Top Accent Banner */}
                            <div className="bg-rose-700 dark:bg-rose-900 text-white px-3 py-1 text-[11px] font-black border-b border-rose-800/30 dark:border-slate-800 flex justify-between items-center">
                              <span className="uppercase tracking-wider flex items-center space-x-1">
                                <Award className="w-3 h-3 text-amber-300" />
                                <span>Candidate</span>
                              </span>
                              <span className="bg-rose-900 dark:bg-rose-950 px-2 py-0.5 rounded text-[10px] font-extrabold border border-rose-400/40">
                                {cand.yearLevel}
                              </span>
                            </div>

                            {/* Top Full-Width Profile Picture */}
                            <div className="relative w-full h-56 sm:h-64 bg-neutral-900 border-b border-neutral-200 dark:border-slate-800 overflow-hidden">
                              <img
                                src={cand.avatarUrl}
                                alt={cand.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                              {/* Selection Status Badge (Top Right) */}
                              <div className="absolute top-3 right-3 z-10">
                                {isUnavailable ? (
                                  <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 border border-amber-300 shadow-sm flex items-center space-x-1">
                                    <AlertCircle className="w-3 h-3 text-amber-800 dark:text-amber-400" />
                                    <span>Selected for {otherPosition.title}</span>
                                  </span>
                                ) : isSelected ? (
                                  <span className="text-xs font-black px-3.5 py-1 rounded-full bg-rose-700 dark:bg-rose-800 text-white border border-rose-500 shadow-md flex items-center space-x-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                                    <span>Voted</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-rose-700 dark:bg-rose-800 text-white border border-rose-600/50 shadow-sm">
                                    Tap to Vote
                                  </span>
                                )}
                              </div>

                              {/* Badges (Top Left) */}
                              <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
                                {cand.nickname && (
                                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-rose-800/90 dark:bg-rose-900 text-white border border-rose-600/40 shadow-sm">
                                    &quot;{cand.nickname}&quot;
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 flex-1 flex flex-col justify-between relative z-10 bg-white dark:bg-slate-900">
                              <div>
                                <h4 className="font-extrabold text-rose-950 dark:text-rose-100 text-lg sm:text-xl tracking-tight group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors">
                                  {cand.name}
                                </h4>

                                <div className="mt-2 bg-rose-50/80 dark:bg-rose-950/60 p-2.5 rounded-xl border border-rose-200/80 dark:border-rose-900/50">
                                  <p className="text-xs text-rose-950 dark:text-rose-100 font-bold leading-relaxed line-clamp-2">
                                    {cand.platformHeading || 'Dedicated Computer Engineering Student Leader'}
                                  </p>
                                </div>

                                {isUnavailable && (
                                  <div className="mt-3 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 p-2 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 font-bold text-center">
                                    Unavailable: Selected for {otherPosition.title}
                                  </div>
                                )}
                              </div>

                              {/* Bottom Footer Action Bar */}
                              <div className="mt-5 pt-3.5 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCandidateModal(cand);
                                  }}
                                  className="flex items-center space-x-1 text-xs text-rose-900 dark:text-rose-200 hover:text-rose-700 font-extrabold px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-slate-700 border border-rose-200/60 dark:border-slate-700 transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
                                  <span>View Bio</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isUnavailable}
                                  className={`px-5 py-2 rounded-full text-xs font-black transition-all border shadow-sm flex items-center space-x-1.5 ${
                                    isSelected
                                      ? 'bg-rose-800 text-white border-rose-700 scale-105'
                                      : isUnavailable
                                      ? 'bg-neutral-200 dark:bg-slate-800 text-neutral-400 dark:text-slate-500 cursor-not-allowed border-neutral-300 dark:border-slate-700'
                                      : 'bg-rose-700 text-white hover:bg-rose-800 border-rose-700'
                                  }`}
                                >
                                  {isSelected ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                                      <span>Voted</span>
                                    </>
                                  ) : (
                                    <span>Vote</span>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Abstain Option */}
                    {settings.allowAbstain && (
                      <div
                        onClick={() => {
                          if (!voter?.hasVoted) {
                            onSelectCandidate(activePosition.id, 'ABSTAIN');
                            if (activePosIndex < totalPositions - 1) {
                              setTimeout(() => setActivePosIndex((prev) => prev + 1), 350);
                            }
                          }
                        }}
                        className={`rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                          choices[activePosition.id] === 'ABSTAIN'
                            ? 'bg-amber-100/90 dark:bg-amber-950/80 border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/50 shadow-md'
                            : 'bg-neutral-50 dark:bg-slate-800/80 hover:bg-neutral-100 dark:hover:bg-slate-800 border-neutral-200 dark:border-slate-800 shadow-sm'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                              Neutral Option
                            </span>
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                choices[activePosition.id] === 'ABSTAIN'
                                  ? 'bg-amber-500 border-amber-600 text-black'
                                  : 'bg-neutral-200 dark:bg-slate-700 border-neutral-300 dark:border-slate-600'
                              }`}
                            >
                              {choices[activePosition.id] === 'ABSTAIN' && <Ban className="w-3.5 h-3.5 text-black" />}
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 my-2">
                            <div className="w-12 h-12 rounded-xl bg-amber-200 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-amber-950 dark:text-amber-200">
                              <Ban className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-neutral-900 dark:text-slate-100 text-sm">Abstain for {activePosition.title}</h4>
                              <p className="text-xs text-neutral-600 dark:text-slate-300 font-medium">Choose not to vote for any candidate</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] text-neutral-600 dark:text-slate-400 mt-4 italic font-medium">
                          Your vote will count towards overall turnout without endorsing a candidate.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Horizontal Position In-Card Footer Controls */}
              <div className="mt-8 pt-4 border-t border-neutral-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActivePosIndex((prev) => Math.max(0, prev - 1))}
                  disabled={activePosIndex === 0}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-900 dark:text-slate-100 border border-neutral-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous Position</span>
                </button>

                <div className="text-xs font-mono font-bold text-neutral-800 dark:text-slate-200">
                  {activePosIndex + 1} / {totalPositions}
                </div>

                {activePosIndex < totalPositions - 1 ? (
                  <button
                    type="button"
                    onClick={() => setActivePosIndex((prev) => Math.min(totalPositions - 1, prev + 1))}
                    className="flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white border border-rose-700 shadow-sm transition-all"
                  >
                    <span>Next Position</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenReview}
                    className="flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-sm transition-all"
                  >
                    <span>Review & Cast Ballot</span>
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* All Positions Stacked List View (Grid) */
        <div className="space-y-8">
          {positions.map((pos, pIdx) => {
            const currentChoice = choices[pos.id];

            return (
              <div
                key={pos.id}
                id={`pos-${pos.id}`}
                className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative"
              >
                {/* Position Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-200 dark:border-slate-800 gap-2 mb-6">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                        {pIdx + 1}. {pos.category}
                      </span>
                      <h3 className="text-xl font-extrabold text-neutral-900 dark:text-slate-100">{pos.title}</h3>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-slate-300 font-medium mt-1">{pos.description}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {currentChoice ? (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-700 text-white border border-rose-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Selected</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300 border border-neutral-200 dark:border-slate-700">
                        <span>Pending Selection</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Candidates Grid */}
                {(() => {
                  const posCandidates = candidates.filter(
                    (c) => c.positionId === pos.id || c.positionId?.toLowerCase() === pos.id?.toLowerCase()
                  );
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {posCandidates.length === 0 ? (
                        <div className="md:col-span-2 bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-xl p-6 text-center text-xs text-neutral-600 dark:text-slate-300 flex flex-col items-center justify-center">
                          <p className="font-bold text-neutral-800 dark:text-slate-100">No candidates nominated for {pos.title} yet.</p>
                        </div>
                      ) : (
                        posCandidates.map((cand) => {
                          const isSelected = currentChoice === cand.id;
                          const otherPosition = getSelectedOtherPosition(cand, pos.id);
                          const isUnavailable = !!otherPosition && !isSelected;

                          return (
                            <div
                              key={cand.id}
                              onClick={() => handleCandidateClick(pos.id, cand)}
                              className={`relative rounded-2xl overflow-hidden border transition-all cursor-pointer flex flex-col justify-between group ${
                               isSelected
                                 ? 'bg-rose-50/90 dark:bg-rose-950/80 border-rose-600 dark:border-rose-500 ring-2 ring-rose-500/50 shadow-md'
                                 : isUnavailable
                                 ? 'bg-neutral-100/70 dark:bg-slate-800/50 border-neutral-200 dark:border-slate-800 opacity-60'
                                 : 'bg-white dark:bg-slate-900 hover:bg-rose-50/40 dark:hover:bg-slate-800/80 border-neutral-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800 shadow-sm hover:shadow-md'
                              }`}
                            >
                              {/* Red Top Accent Banner */}
                              <div className="bg-rose-700 dark:bg-rose-900 text-white px-3 py-1 text-[11px] font-black border-b border-rose-800/30 dark:border-slate-800 flex justify-between items-center">
                                <span className="uppercase tracking-wider flex items-center space-x-1">
                                  <Award className="w-3 h-3 text-amber-300" />
                                  <span>Candidate</span>
                                </span>
                                <span className="bg-rose-900 dark:bg-rose-950 px-2 py-0.5 rounded text-[10px] font-extrabold border border-rose-400/40">
                                  {cand.yearLevel}
                                </span>
                              </div>

                              {/* Top Full-Width Profile Picture */}
                              <div className="relative w-full h-56 sm:h-64 bg-neutral-900 border-b border-neutral-200 dark:border-slate-800 overflow-hidden">
                                <img
                                  src={cand.avatarUrl}
                                  alt={cand.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                                {/* Selection Status Badge (Top Right) */}
                                <div className="absolute top-3 right-3 z-10">
                                  {isUnavailable ? (
                                    <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 border border-amber-300 shadow-sm flex items-center space-x-1">
                                      <AlertCircle className="w-3 h-3 text-amber-800 dark:text-amber-400" />
                                      <span>Selected for {otherPosition.title}</span>
                                    </span>
                                  ) : isSelected ? (
                                    <span className="text-xs font-black px-3.5 py-1 rounded-full bg-rose-700 dark:bg-rose-800 text-white border border-rose-500 shadow-md flex items-center space-x-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                                      <span>Voted</span>
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-rose-700 dark:bg-rose-800 text-white border border-rose-600/50 shadow-sm">
                                      Tap to Vote
                                    </span>
                                  )}
                                </div>

                                {/* Badges (Top Left) */}
                                <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
                                  {cand.nickname && (
                                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-rose-800/90 dark:bg-rose-900 text-white border border-rose-600/40 shadow-sm">
                                      &quot;{cand.nickname}&quot;
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Card Body */}
                              <div className="p-5 flex-1 flex flex-col justify-between relative z-10 bg-white dark:bg-slate-900">
                                <div>
                                  <h4 className="font-extrabold text-rose-950 dark:text-rose-100 text-lg sm:text-xl tracking-tight group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors">
                                    {cand.name}
                                  </h4>

                                  <div className="mt-2 bg-rose-50/80 dark:bg-rose-950/60 p-2.5 rounded-xl border border-rose-200/80 dark:border-rose-900/50">
                                    <p className="text-xs text-rose-950 dark:text-rose-100 font-bold leading-relaxed line-clamp-2">
                                      {cand.platformHeading || 'Dedicated Computer Engineering Student Leader'}
                                    </p>
                                  </div>

                                  {isUnavailable && (
                                    <div className="mt-3 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 p-2 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 font-bold text-center">
                                      Unavailable: Selected for {otherPosition.title}
                                    </div>
                                  )}
                                </div>

                                {/* Bottom Footer Action Bar */}
                                <div className="mt-5 pt-3.5 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCandidateModal(cand);
                                    }}
                                    className="flex items-center space-x-1 text-xs text-rose-900 dark:text-rose-200 hover:text-rose-700 font-extrabold px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-slate-700 border border-rose-200/60 dark:border-slate-700 transition-colors"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
                                    <span>View Bio</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isUnavailable}
                                    className={`px-5 py-2 rounded-full text-xs font-black transition-all border shadow-sm flex items-center space-x-1.5 ${
                                      isSelected
                                        ? 'bg-rose-800 text-white border-rose-700 scale-105'
                                        : isUnavailable
                                        ? 'bg-neutral-200 dark:bg-slate-800 text-neutral-400 dark:text-slate-500 cursor-not-allowed border-neutral-300 dark:border-slate-700'
                                        : 'bg-rose-700 text-white hover:bg-rose-800 border-rose-700'
                                    }`}
                                  >
                                    {isSelected ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                                        <span>Voted</span>
                                      </>
                                    ) : (
                                      <span>Vote</span>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Abstain Option */}
                      {settings.allowAbstain && (
                        <div
                          onClick={() => {
                            if (!voter?.hasVoted) {
                              onSelectCandidate(pos.id, 'ABSTAIN');
                            }
                          }}
                          className={`rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                            currentChoice === 'ABSTAIN'
                              ? 'bg-amber-100/90 dark:bg-amber-950/80 border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/50 shadow-md'
                              : 'bg-neutral-50 dark:bg-slate-800/80 hover:bg-neutral-100 dark:hover:bg-slate-800 border-neutral-200 dark:border-slate-800 shadow-sm'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                                Neutral Option
                              </span>
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                  currentChoice === 'ABSTAIN'
                                    ? 'bg-amber-500 border-amber-600 text-black'
                                    : 'bg-neutral-200 dark:bg-slate-700 border-neutral-300 dark:border-slate-600'
                                }`}
                              >
                                {currentChoice === 'ABSTAIN' && <Ban className="w-3.5 h-3.5 text-black" />}
                              </div>
                            </div>

                            <div className="flex items-center space-x-3 my-2">
                              <div className="w-12 h-12 rounded-xl bg-amber-200 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-amber-950 dark:text-amber-200">
                                <Ban className="w-6 h-6" />
                              </div>
                              <div>
                                <h4 className="font-extrabold text-neutral-900 dark:text-slate-100 text-sm">Abstain for {pos.title}</h4>
                                <p className="text-xs text-neutral-600 dark:text-slate-400 font-medium">Choose not to vote for any candidate</p>
                              </div>
                            </div>
                          </div>
                          <p className="text-[11px] text-neutral-600 dark:text-slate-400 mt-4 italic font-medium">
                            Your vote will count towards overall turnout without endorsing a candidate.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Bottom Progress & Review Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-neutral-200 dark:border-slate-800 py-3.5 px-4 shadow-[0px_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-4 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none">
              <div className="flex justify-between text-xs font-bold text-neutral-900 dark:text-slate-100 mb-1">
                <span>Ballot Progress</span>
                <span className="text-rose-700 dark:text-rose-400 font-mono">
                  {selectedCount} of {totalPositions} Positions
                </span>
              </div>
              <div className="w-full sm:w-64 bg-neutral-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden border border-neutral-200 dark:border-slate-700">
                <div
                  className="bg-rose-700 dark:bg-rose-600 h-full transition-all duration-300"
                  style={{ width: `${(selectedCount / totalPositions) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            {!voter ? (
              <button
                onClick={onOpenAuth}
                className="w-full sm:w-auto bg-rose-700 hover:bg-rose-800 text-white font-extrabold px-6 py-2.5 rounded-xl text-sm transition-all border border-rose-700 shadow-sm flex items-center justify-center space-x-2"
              >
                <span>Login to Cast Ballot</span>
              </button>
            ) : voter.hasVoted ? (
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/80 px-4 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>Ballot Submitted</span>
              </span>
            ) : (
              <button
                onClick={onOpenReview}
                className={`w-full sm:w-auto font-black px-6 py-2.5 rounded-xl text-sm transition-all border flex items-center justify-center space-x-2 ${
                  isComplete
                    ? 'bg-rose-700 hover:bg-rose-800 text-white border-rose-700 shadow-md animate-pulse'
                    : 'bg-neutral-100 dark:bg-slate-800 text-neutral-800 dark:text-slate-100 hover:bg-neutral-200 dark:hover:bg-slate-700 border-neutral-200 dark:border-slate-700 shadow-sm'
                }`}
              >
                <span>{isComplete ? 'Review & Lock Ballot' : 'Review Ballot Choices'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Candidate Manifesto Modal */}
      {selectedCandidateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-neutral-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedCandidateModal(null)}
              className="absolute top-8 right-8 z-20 text-neutral-700 dark:text-slate-200 hover:text-black dark:hover:text-white p-2 rounded-full bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 transition-all shadow-sm"
            >
              ✕
            </button>

            {/* Full size candidate photo header */}
            <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden mb-5 border border-neutral-200 dark:border-slate-800 bg-neutral-900 shadow-sm">
              <img
                src={selectedCandidateModal.avatarUrl}
                alt={selectedCandidateModal.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <div className="absolute bottom-4 left-4 right-4 z-10">
                <h3 className="text-2xl font-extrabold text-white tracking-tight drop-shadow">
                  {selectedCandidateModal.name}
                </h3>
                <p className="text-xs font-bold text-neutral-200 drop-shadow">
                  {selectedCandidateModal.yearLevel} • Computer Engineering
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-slate-800 p-4.5 rounded-2xl border border-neutral-200 dark:border-slate-700 space-y-4 text-xs text-neutral-800 dark:text-slate-200">
              <h4 className="font-extrabold text-rose-700 dark:text-rose-400 uppercase text-xs tracking-wider border-b border-neutral-200 dark:border-slate-700 pb-2.5 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                <span>Information of Candidates</span>
              </h4>

              {(selectedCandidateModal.platformHeading || selectedCandidateModal.bio) && (
                <div>
                  <span className="font-bold text-neutral-700 dark:text-slate-300 text-[11px] block mb-1">Brief Description:</span>
                  <p className="text-neutral-900 dark:text-slate-100 text-xs sm:text-sm leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-neutral-200 dark:border-slate-700 font-medium">
                    {selectedCandidateModal.platformHeading || selectedCandidateModal.bio}
                  </p>
                </div>
              )}

              {selectedCandidateModal.achievements && selectedCandidateModal.achievements.length > 0 && (
                <div>
                  <span className="font-bold text-neutral-700 dark:text-slate-300 text-[11px] mb-1 flex items-center space-x-1">
                    <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Achievements & Leadership:</span>
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-neutral-800 dark:text-slate-200 pl-1 font-medium">
                    {selectedCandidateModal.achievements.map((ach, i) => (
                      <li key={i}>{ach}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-slate-800 flex justify-end">
              {(() => {
                const otherPos = getSelectedOtherPosition(
                  selectedCandidateModal,
                  selectedCandidateModal.positionId
                );
                const isSelectedInThisPos =
                  choices[selectedCandidateModal.positionId] === selectedCandidateModal.id;

                if (otherPos && !isSelectedInThisPos) {
                  return (
                    <div className="flex flex-col items-end space-y-1">
                      <span className="text-[11px] text-amber-800 dark:text-amber-300 font-bold">
                        Selected for {otherPos.title}
                      </span>
                      <button
                        disabled
                        className="bg-neutral-200 dark:bg-slate-800 text-neutral-500 dark:text-slate-400 font-bold px-4 py-2 rounded-xl text-xs border border-neutral-300 dark:border-slate-700 cursor-not-allowed flex items-center space-x-1"
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span>Unavailable for this Position</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <button
                    onClick={() => {
                      handleCandidateClick(selectedCandidateModal.positionId, selectedCandidateModal);
                      setSelectedCandidateModal(null);
                    }}
                    className="bg-rose-700 hover:bg-rose-800 text-white font-extrabold px-4 py-2 rounded-xl text-xs border border-rose-700 shadow-sm flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Select This Candidate</span>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
