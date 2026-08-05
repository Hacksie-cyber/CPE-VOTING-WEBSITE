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
        <div className="sticky top-4 z-40 bg-amber-950/90 border border-amber-500/50 backdrop-blur-md text-amber-200 p-4 rounded-2xl text-xs font-semibold shadow-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span>{ruleViolationNotice}</span>
          </div>
          <button
            onClick={() => setRuleViolationNotice(null)}
            className="text-amber-400 hover:text-amber-100 p-1 rounded-lg hover:bg-amber-900/50"
          >
            ✕
          </button>
        </div>
      )}

      {/* Banner / Instructions */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Official CPE Commission on Elections 2026</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Official Department Council Ballot
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Select one candidate or choose &quot;Abstain&quot; for each position. Use the horizontal navigation bar below to step through each position.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 flex-shrink-0">
            <button
              onClick={() => setViewMode('horizontal')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'horizontal'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Step-by-Step View</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'grid'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Show All Positions</span>
            </button>
          </div>
        </div>

        {/* Multi-Position Voting Rule Alert */}
        <div className="mt-4 bg-cyan-950/40 border border-cyan-500/30 p-3 rounded-xl flex items-center space-x-2.5 text-xs text-cyan-200">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>
            <strong className="text-cyan-300">Single-Position Candidate Rule:</strong> Selecting a candidate for one position (e.g. Governor) automatically makes them unavailable for selection in all other positions.
          </span>
        </div>
      </div>

      {/* Horizontal Position Navigation Stepper Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Position Navigation ({activePosIndex + 1} of {totalPositions})</span>
          </span>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActivePosIndex((prev) => Math.max(0, prev - 1))}
              disabled={activePosIndex === 0}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1 border border-slate-700 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev Position</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePosIndex((prev) => Math.min(totalPositions - 1, prev + 1))}
              disabled={activePosIndex === totalPositions - 1}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1 border border-slate-700 transition-all"
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
                className={`flex-shrink-0 flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                  isActive
                    ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/10'
                    : isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive
                      ? 'bg-cyan-400 text-slate-950'
                      : isSelected
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
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
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative transition-all duration-300 animate-in fade-in slide-in-from-right-2"
            >
              {/* Position Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3 mb-6">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      Position {activePosIndex + 1} of {totalPositions} • {activePosition.category}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-100">{activePosition.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{activePosition.description}</p>
                </div>

                <div className="flex items-center space-x-2">
                  {choices[activePosition.id] ? (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Choice Selected</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activePosCandidates.length === 0 ? (
                      <div className="md:col-span-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-6 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                        <p className="font-semibold text-slate-300">No candidates nominated for {activePosition.title} yet.</p>
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
                            className={`relative rounded-3xl overflow-hidden border transition-all cursor-pointer flex flex-col justify-between group ${
                              isSelected
                                ? 'bg-slate-900 border-cyan-400 ring-2 ring-cyan-500/50 shadow-2xl shadow-cyan-500/20'
                                : isUnavailable
                                ? 'bg-slate-950/50 border-amber-500/30 opacity-60 hover:opacity-85'
                                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900/95 shadow-xl'
                            }`}
                          >
                            {/* Top Full-Width Profile Picture */}
                            <div className="relative w-full h-56 sm:h-64 bg-slate-950 overflow-hidden">
                              <img
                                src={cand.avatarUrl}
                                alt={cand.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                              {/* Selection Status Badge (Top Right) */}
                              <div className="absolute top-3 right-3 z-10">
                                {isUnavailable ? (
                                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/40 backdrop-blur-md shadow-lg flex items-center space-x-1">
                                    <AlertCircle className="w-3 h-3 text-amber-400" />
                                    <span>Selected for {otherPosition.title}</span>
                                  </span>
                                ) : isSelected ? (
                                  <span className="text-xs font-bold px-3.5 py-1 rounded-full bg-cyan-400 text-slate-950 border border-cyan-300 backdrop-blur-md shadow-lg flex items-center space-x-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                                    <span>Voted</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-slate-950/80 text-slate-300 border border-slate-700/80 backdrop-blur-md group-hover:border-cyan-500/50">
                                    Tap to Vote
                                  </span>
                                )}
                              </div>

                              {/* Badges (Top Left) */}
                              <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-950/80 text-cyan-300 border border-slate-700/80 backdrop-blur-md">
                                  {cand.yearLevel}
                                </span>
                                {cand.nickname && (
                                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 backdrop-blur-md">
                                    &quot;{cand.nickname}&quot;
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 flex-1 flex flex-col justify-between -mt-3 relative z-10">
                              <div>
                                <h4 className="font-extrabold text-slate-100 text-lg sm:text-xl tracking-tight group-hover:text-cyan-400 transition-colors">
                                  {cand.name}
                                </h4>

                                <p className="text-xs sm:text-sm text-slate-400 font-normal mt-1.5 line-clamp-2 leading-relaxed">
                                  {cand.platformHeading || 'Dedicated Computer Engineering Student Leader'}
                                </p>

                                {isUnavailable && (
                                  <div className="mt-3 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl text-[11px] text-amber-300 font-medium text-center">
                                    Unavailable: Selected for {otherPosition.title}
                                  </div>
                                )}
                              </div>

                              {/* Bottom Footer Action Bar */}
                              <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCandidateModal(cand);
                                  }}
                                  className="flex items-center space-x-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-slate-800/50"
                                >
                                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>View Bio</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isUnavailable}
                                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 ${
                                    isSelected
                                      ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-cyan-500/30 scale-105'
                                      : isUnavailable
                                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                      : 'bg-emerald-900/80 text-emerald-200 border border-emerald-500/40 hover:bg-cyan-400 hover:text-slate-950 hover:border-cyan-300'
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
                        className={`rounded-xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                          choices[activePosition.id] === 'ABSTAIN'
                            ? 'bg-slate-950 border-amber-500 ring-2 ring-amber-500/20 shadow-lg'
                            : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Neutral Option
                            </span>
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                choices[activePosition.id] === 'ABSTAIN'
                                  ? 'border-amber-400 bg-amber-500 text-slate-950'
                                  : 'border-slate-700 bg-slate-900'
                              }`}
                            >
                              {choices[activePosition.id] === 'ABSTAIN' && <Ban className="w-3.5 h-3.5 text-slate-950" />}
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 my-2">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                              <Ban className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-200 text-sm">Abstain for {activePosition.title}</h4>
                              <p className="text-xs text-slate-400">Choose not to vote for any candidate</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-4 italic">
                          Your vote will count towards overall turnout without endorsing a candidate.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Horizontal Position In-Card Footer Controls */}
              <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActivePosIndex((prev) => Math.max(0, prev - 1))}
                  disabled={activePosIndex === 0}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous Position</span>
                </button>

                <div className="text-xs font-mono text-slate-400">
                  {activePosIndex + 1} / {totalPositions}
                </div>

                {activePosIndex < totalPositions - 1 ? (
                  <button
                    type="button"
                    onClick={() => setActivePosIndex((prev) => Math.min(totalPositions - 1, prev + 1))}
                    className="flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md transition-all"
                  >
                    <span>Next Position</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenReview}
                    className="flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-md transition-all"
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
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg relative"
              >
                {/* Position Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2 mb-6">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                        {pIdx + 1}. {pos.category}
                      </span>
                      <h3 className="text-xl font-bold text-slate-100">{pos.title}</h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{pos.description}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {currentChoice ? (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Selected</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {posCandidates.length === 0 ? (
                        <div className="md:col-span-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-6 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                          <p className="font-semibold text-slate-300">No candidates nominated for {pos.title} yet.</p>
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
                              className={`relative rounded-3xl overflow-hidden border transition-all cursor-pointer flex flex-col justify-between group ${
                                isSelected
                                  ? 'bg-slate-900 border-cyan-400 ring-2 ring-cyan-500/50 shadow-2xl shadow-cyan-500/20'
                                  : isUnavailable
                                  ? 'bg-slate-950/50 border-amber-500/30 opacity-60 hover:opacity-85'
                                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900/95 shadow-xl'
                              }`}
                            >
                              {/* Top Full-Width Profile Picture */}
                              <div className="relative w-full h-56 sm:h-64 bg-slate-950 overflow-hidden">
                                <img
                                  src={cand.avatarUrl}
                                  alt={cand.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                                {/* Selection Status Badge (Top Right) */}
                                <div className="absolute top-3 right-3 z-10">
                                  {isUnavailable ? (
                                    <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/40 backdrop-blur-md shadow-lg flex items-center space-x-1">
                                      <AlertCircle className="w-3 h-3 text-amber-400" />
                                      <span>Selected for {otherPosition.title}</span>
                                    </span>
                                  ) : isSelected ? (
                                    <span className="text-xs font-bold px-3.5 py-1 rounded-full bg-cyan-400 text-slate-950 border border-cyan-300 backdrop-blur-md shadow-lg flex items-center space-x-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                                      <span>Voted</span>
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-slate-950/80 text-slate-300 border border-slate-700/80 backdrop-blur-md group-hover:border-cyan-500/50">
                                      Tap to Vote
                                    </span>
                                  )}
                                </div>

                                {/* Badges (Top Left) */}
                                <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
                                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-950/80 text-cyan-300 border border-slate-700/80 backdrop-blur-md">
                                    {cand.yearLevel}
                                  </span>
                                  {cand.nickname && (
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 backdrop-blur-md">
                                      &quot;{cand.nickname}&quot;
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Card Body */}
                              <div className="p-5 flex-1 flex flex-col justify-between -mt-3 relative z-10">
                                <div>
                                  <h4 className="font-extrabold text-slate-100 text-lg sm:text-xl tracking-tight group-hover:text-cyan-400 transition-colors">
                                    {cand.name}
                                  </h4>

                                  <p className="text-xs sm:text-sm text-slate-400 font-normal mt-1.5 line-clamp-2 leading-relaxed">
                                    {cand.platformHeading || 'Dedicated Computer Engineering Student Leader'}
                                  </p>

                                  {isUnavailable && (
                                    <div className="mt-3 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl text-[11px] text-amber-300 font-medium text-center">
                                      Unavailable: Selected for {otherPosition.title}
                                    </div>
                                  )}
                                </div>

                                {/* Bottom Footer Action Bar */}
                                <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCandidateModal(cand);
                                    }}
                                    className="flex items-center space-x-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-slate-800/50"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>View Bio</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isUnavailable}
                                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 ${
                                      isSelected
                                        ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-cyan-500/30 scale-105'
                                        : isUnavailable
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : 'bg-emerald-900/80 text-emerald-200 border border-emerald-500/40 hover:bg-cyan-400 hover:text-slate-950 hover:border-cyan-300'
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
                          className={`rounded-xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                            currentChoice === 'ABSTAIN'
                              ? 'bg-slate-950 border-amber-500 ring-2 ring-amber-500/20 shadow-lg'
                              : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Neutral Option
                              </span>
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                  currentChoice === 'ABSTAIN'
                                    ? 'border-amber-400 bg-amber-500 text-slate-950'
                                    : 'border-slate-700 bg-slate-900'
                                }`}
                              >
                                {currentChoice === 'ABSTAIN' && <Ban className="w-3.5 h-3.5 text-slate-950" />}
                              </div>
                            </div>

                            <div className="flex items-center space-x-3 my-2">
                              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                                <Ban className="w-6 h-6" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-200 text-sm">Abstain for {pos.title}</h4>
                                <p className="text-xs text-slate-400">Choose not to vote for any candidate</p>
                              </div>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-4 italic">
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
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 py-3.5 px-4 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-4 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none">
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Ballot Progress</span>
                <span className="text-cyan-400 font-mono">
                  {selectedCount} of {totalPositions} Positions
                </span>
              </div>
              <div className="w-full sm:w-64 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                  style={{ width: `${(selectedCount / totalPositions) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            {!voter ? (
              <button
                onClick={onOpenAuth}
                className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2"
              >
                <span>Login to Cast Ballot</span>
              </button>
            ) : voter.hasVoted ? (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/30 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ballot Submitted</span>
              </span>
            ) : (
              <button
                onClick={onOpenReview}
                className={`w-full sm:w-auto font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center space-x-2 ${
                  isComplete
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/25 animate-pulse'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedCandidateModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
            >
              ✕
            </button>

            <div className="flex items-center space-x-4 mb-4">
              <img
                src={selectedCandidateModal.avatarUrl}
                alt={selectedCandidateModal.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-xl object-cover border border-slate-700"
              />
              <div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {selectedCandidateModal.party}
                </span>
                <h3 className="text-lg font-bold text-slate-100 mt-1">{selectedCandidateModal.name}</h3>
                <p className="text-xs text-slate-400">{selectedCandidateModal.yearLevel} Computer Engineering</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <h4 className="font-bold text-cyan-400 uppercase text-[11px] tracking-wider mb-1">
                  Key Platform Focus
                </h4>
                <p className="font-semibold text-slate-200 text-sm">{selectedCandidateModal.platformHeading}</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-200 text-xs mb-2 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Platform Action Items:</span>
                </h4>
                <ul className="space-y-1.5">
                  {selectedCandidateModal.platformPoints.map((pt, i) => (
                    <li key={i} className="flex items-start space-x-2 bg-slate-950/50 p-2 rounded-lg">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-200 text-xs mb-1">Candidate Manifesto</h4>
                <p className="bg-slate-950/50 p-3 rounded-xl italic border border-slate-800/80 leading-relaxed">
                  &quot;{selectedCandidateModal.manifesto}&quot;
                </p>
              </div>

              {selectedCandidateModal.achievements && (
                <div>
                  <h4 className="font-bold text-slate-200 text-xs mb-1 flex items-center space-x-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Achievements & Leadership</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                    {selectedCandidateModal.achievements.map((ach, i) => (
                      <li key={i}>{ach}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
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
                      <span className="text-[11px] text-amber-400 font-semibold">
                        Selected for {otherPos.title}
                      </span>
                      <button
                        disabled
                        className="bg-slate-800 text-slate-500 font-bold px-4 py-2 rounded-xl text-xs cursor-not-allowed flex items-center space-x-1"
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
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5"
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
