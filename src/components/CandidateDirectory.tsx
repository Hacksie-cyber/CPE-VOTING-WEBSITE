import React, { useState, useEffect } from 'react';
import { Position, Candidate, CandidateNomination, AIComparisonResponse, Gender } from '../types';
import { Search, Sparkles, Award, FileText, Bot, UserPlus, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';

interface CandidateDirectoryProps {
  positions: Position[];
  candidates: Candidate[];
  onRefreshData?: () => void;
}

export const CandidateDirectory: React.FC<CandidateDirectoryProps> = ({ positions, candidates, onRefreshData }) => {
  const [selectedPositionId, setSelectedPositionId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Nominations State
  const [nominations, setNominations] = useState<CandidateNomination[]>([]);
  const [showNominateModal, setShowNominateModal] = useState<boolean>(false);
  const [nominateSuccess, setNominateSuccess] = useState<string | null>(null);
  const [nominateError, setNominateError] = useState<string | null>(null);
  const [isSubmittingNomination, setIsSubmittingNomination] = useState<boolean>(false);

  // Nomination Form State
  const [nomForm, setNomForm] = useState<{
    nomineeName: string;
    positionId: string;
    yearLevel: '1st Year' | '2nd Year' | '3rd Year' | '4th Year';
    gender: Gender;
    description: string;
  }>({
    nomineeName: '',
    positionId: positions[0]?.id || 'gov',
    yearLevel: '3rd Year',
    gender: 'Female',
    description: '',
  });

  // AI Comparison Assistant State
  const [aiPositionId, setAiPositionId] = useState<string>('gov');
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<AIComparisonResponse | null>(null);

  // Selected candidate detail modal
  const [modalCandidate, setModalCandidate] = useState<Candidate | null>(null);

  const fetchNominations = async () => {
    try {
      const res = await fetch('/api/election/nominations');
      const data = await res.json();
      if (data.nominations) {
        setNominations(data.nominations);
      }
    } catch (err) {
      console.error('Error fetching nominations:', err);
    }
  };

  useEffect(() => {
    fetchNominations();
  }, []);

  const handleNominateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomForm.nomineeName.trim() || !nomForm.description.trim()) {
      setNominateError('Full Name and Brief Description are required.');
      return;
    }

    const targetPos = positions.find((p) => p.id === nomForm.positionId) || positions[0];
    const isMuse = targetPos ? (targetPos.id === 'muse' || targetPos.title.toLowerCase().includes('muse')) : (nomForm.positionId === 'muse');

    if (isMuse && nomForm.gender !== 'Female') {
      setNominateError('Eligibility Rule Violation: Only female candidates are allowed for the Muse position.');
      return;
    }

    setIsSubmittingNomination(true);
    setNominateError(null);

    try {
      const res = await fetch('/api/election/nominate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomineeName: nomForm.nomineeName,
          positionId: nomForm.positionId,
          yearLevel: nomForm.yearLevel,
          gender: nomForm.gender,
          description: nomForm.description,
          platformHeading: nomForm.description,
          manifesto: nomForm.description,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNominateSuccess(data.message);
        setShowNominateModal(false);
        setNomForm({
          nomineeName: '',
          positionId: positions[0]?.id || 'gov',
          yearLevel: '3rd Year',
          gender: 'Female',
          description: '',
        });

        fetchNominations();
        if (onRefreshData) onRefreshData();

        setTimeout(() => setNominateSuccess(null), 4000);
      } else {
        setNominateError(data.message || 'Failed to submit candidate registration.');
      }
    } catch {
      setNominateError('Connection error submitting candidate registration.');
    } finally {
      setIsSubmittingNomination(false);
    }
  };

  const filteredCandidates = candidates.filter((cand) => {
    const matchesPosition = selectedPositionId === 'all' || cand.positionId === selectedPositionId;
    const matchesQuery =
      searchQuery.trim() === '' ||
      cand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.platformHeading.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesPosition && matchesQuery;
  });

  const handleRunAiComparison = async () => {
    setAiLoading(true);
    setAiResult(null);

    try {
      const res = await fetch('/api/ai/compare-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: aiPositionId,
          question: aiQuestion,
        }),
      });

      const data = await res.json();
      setAiResult(data);
    } catch {
      setAiResult({
        summary: 'Failed to connect to AI comparison service.',
        keyDifferences: [],
        candidateHighlights: [],
      });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative z-10">
          <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 border border-black uppercase tracking-wider">
            Directory & Nominations
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight mt-2">
            Candidates & Student Nominations 2026
          </h2>
          <p className="text-xs sm:text-sm text-neutral-700 font-medium mt-1 max-w-2xl">
            Explore nominated candidates for Governor, Vice-Governor, Secretary, Treasurer, Auditor, P.I.O, and Muse.
          </p>
        </div>

        <button
          onClick={() => setShowNominateModal(true)}
          className="relative z-10 bg-rose-700 hover:bg-rose-800 text-white font-extrabold px-5 py-3 rounded-2xl text-xs flex items-center space-x-2 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nominate a Candidate</span>
        </button>
      </div>

      {nominateSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border-2 border-black text-emerald-900 text-xs font-extrabold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span>{nominateSuccess}</span>
        </div>
      )}

      {/* AI Candidate Platform Analyzer */}
      <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center space-x-2 text-rose-800 text-xs font-black uppercase tracking-wider mb-2">
          <Bot className="w-4 h-4" />
          <span>Gemini AI Platform Analyzer</span>
        </div>
        <h3 className="text-lg font-extrabold text-neutral-900 mb-1">
          Compare Nominated Candidates & Advocacies
        </h3>
        <p className="text-xs text-neutral-600 font-medium mb-4">
          Select an officer position (Governor, Vice-Governor, Secretary, Treasurer, Auditor, P.I.O, Muse) to compare candidate goals.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs font-bold text-neutral-800 mb-1">Select Position</label>
            <select
              value={aiPositionId}
              onChange={(e) => setAiPositionId(e.target.value)}
              className="w-full bg-neutral-50 border-2 border-black rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-rose-700"
            >
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-neutral-800 mb-1">Specific Question (Optional)</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="e.g. Compare hardware lab proposals or student wellness initiatives..."
                className="flex-1 bg-neutral-50 border-2 border-black rounded-xl px-3 py-2 text-xs font-medium text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-700"
              />
              <button
                onClick={handleRunAiComparison}
                disabled={aiLoading}
                className="bg-rose-700 hover:bg-rose-800 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-all"
              >
                {aiLoading ? (
                  <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Analyze</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* AI Result Display */}
        {aiResult && (
          <div className="mt-4 bg-neutral-50 p-4 rounded-2xl border-2 border-black text-xs space-y-3 animate-in fade-in duration-200">
            <div>
              <span className="font-extrabold text-rose-800 uppercase text-[11px] block mb-1">AI Analysis Summary</span>
              <p className="text-neutral-800 font-medium leading-relaxed">{aiResult.summary}</p>
            </div>

            {aiResult.keyDifferences.length > 0 && (
              <div>
                <span className="font-extrabold text-neutral-900 uppercase text-[11px] block mb-1">Key Differentiators</span>
                <ul className="space-y-1">
                  {aiResult.keyDifferences.map((diff, i) => (
                    <li key={i} className="flex items-start space-x-2 text-neutral-800 font-medium">
                      <span className="text-rose-700 font-bold">•</span>
                      <span>{diff}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiResult.candidateHighlights && aiResult.candidateHighlights.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t-2 border-black">
                {aiResult.candidateHighlights.map((hl, i) => (
                  <div key={i} className="bg-white p-2.5 rounded-xl border-2 border-black">
                    <span className="font-extrabold text-neutral-900 block">{hl.candidateName}</span>
                    <span className="text-[11px] font-bold text-rose-800">{hl.standoutPoint}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidates by name or platform..."
            className="w-full bg-neutral-50 dark:bg-slate-800 border-2 border-black dark:border-rose-800 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-neutral-900 dark:text-slate-100 placeholder-neutral-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Position Filter */}
          <select
            value={selectedPositionId}
            onChange={(e) => setSelectedPositionId(e.target.value)}
            className="bg-neutral-50 dark:bg-slate-800 border-2 border-black dark:border-rose-800 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-700"
          >
            <option value="all">All Candidates ({candidates.length})</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Candidate Cards Directory */}
      {filteredCandidates.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border-2 border-black dark:border-rose-700 rounded-3xl p-10 text-center space-y-4 shadow-[6px_6px_0px_0px_rgba(190,18,60,1)]">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950 border-2 border-black dark:border-rose-700 text-rose-800 dark:text-rose-300 rounded-2xl flex items-center justify-center mx-auto">
            <UserPlus className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-extrabold text-neutral-900 dark:text-slate-100">No Nominees Registered Yet</h3>
            <p className="text-xs text-neutral-600 dark:text-slate-400 font-medium">
              Be the first to register a candidate!
            </p>
          </div>
          <button
            onClick={() => setShowNominateModal(true)}
            className="bg-rose-700 hover:bg-rose-800 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs inline-flex items-center space-x-2 border-2 border-black dark:border-rose-600 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Candidate Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCandidates.map((cand) => {
            const pos = positions.find((p) => p.id === cand.positionId);
            return (
              <div
                key={cand.id}
                className="bg-white dark:bg-slate-900 border-2 border-rose-800 dark:border-rose-700 rounded-3xl overflow-hidden hover:border-black dark:hover:border-rose-500 transition-all shadow-[6px_6px_0px_0px_rgba(190,18,60,1)] group"
              >
                {/* Red Card Header Accent Bar */}
                <div className="bg-rose-700 dark:bg-rose-900 text-white px-5 py-2 font-black text-xs flex items-center justify-between border-b-2 border-black dark:border-rose-950">
                  <span className="flex items-center space-x-1.5 uppercase tracking-wider text-[11px]">
                    <Award className="w-3.5 h-3.5 text-amber-300" />
                    <span>{pos ? pos.title : 'Candidate'}</span>
                  </span>
                  <span className="bg-rose-900 dark:bg-rose-950 text-rose-100 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border border-rose-500">
                    {cand.yearLevel}
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                    {/* Left Column: Big Profile Picture with Red Framing */}
                    <div className="flex flex-col items-center flex-shrink-0 w-full sm:w-auto">
                      <div className="relative group-hover:scale-105 transition-transform duration-300">
                        <img
                          src={cand.avatarUrl}
                          alt={cand.name}
                          referrerPolicy="no-referrer"
                          className="w-44 h-52 sm:w-48 sm:h-56 rounded-2xl object-cover border-2 border-rose-800 dark:border-rose-700 shadow-[3px_3px_0px_0px_rgba(190,18,60,1)]"
                        />
                      </div>
                      {cand.nickname && (
                        <span className="mt-2.5 px-3 py-1 text-xs font-black text-white bg-rose-700 dark:bg-rose-900 border-2 border-black dark:border-rose-700 rounded-full text-center shadow">
                          &quot;{cand.nickname}&quot;
                        </span>
                      )}
                    </div>

                    {/* Right Column: Candidate Information */}
                    <div className="flex-1 flex flex-col justify-between min-w-0 w-full h-full">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-black text-rose-950 dark:text-rose-200 text-lg sm:text-xl group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors tracking-tight">
                              {cand.name}
                            </h3>
                            <p className="text-xs text-rose-800 dark:text-rose-300 font-extrabold mt-0.5">
                              {cand.yearLevel} • Computer Engineering
                            </p>
                          </div>
                          {pos && (
                            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-rose-700 dark:bg-rose-900 text-white border border-black dark:border-rose-700 flex-shrink-0 shadow-sm">
                              {pos.title}
                            </span>
                          )}
                        </div>

                        {/* Platform Summary / Advocacy */}
                        <div className="mt-3 bg-rose-50/90 dark:bg-rose-950/60 p-3 rounded-xl border-2 border-rose-700 dark:border-rose-600">
                          <span className="text-[10px] font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider block flex items-center space-x-1 mb-1">
                            <Sparkles className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
                            <span>Core Advocacy</span>
                          </span>
                          <p className="text-xs font-bold text-rose-950 dark:text-rose-100 leading-relaxed line-clamp-2">
                            {cand.platformHeading}
                          </p>
                        </div>

                        {/* Platform Points */}
                        <ul className="mt-2.5 space-y-1 text-xs text-neutral-800 dark:text-slate-200 font-semibold">
                          {cand.platformPoints.slice(0, 2).map((pt, i) => (
                            <li key={i} className="flex items-start space-x-1.5">
                              <span className="text-rose-700 dark:text-rose-400 font-black">•</span>
                              <span className="line-clamp-1">{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        onClick={() => setModalCandidate(cand)}
                        className="mt-4 w-full bg-rose-700 hover:bg-rose-800 dark:bg-rose-800 dark:hover:bg-rose-900 border-2 border-black dark:border-rose-600 text-white font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px]"
                      >
                        <FileText className="w-3.5 h-3.5 text-white" />
                        <span>Read Full Profile & Bio</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Nominations Showcase */}
      {nominations.length > 0 && (
        <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
          <div className="flex items-center justify-between border-b-2 border-black pb-3">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-rose-700" />
              <h3 className="text-lg font-extrabold text-neutral-900">Student-Submitted Candidate Nominations</h3>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-rose-100 text-rose-900 border border-black">
              {nominations.length} Submitted
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nominations.map((nom) => {
              const pos = positions.find((p) => p.id === nom.positionId);
              return (
                <div key={nom.id} className="bg-neutral-50 p-4 rounded-2xl border-2 border-black space-y-2 shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-rose-800">{pos?.title}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-black">
                      Approved on Ballot
                    </span>
                  </div>
                  <h4 className="font-black text-neutral-900 text-sm">{nom.nomineeName}</h4>
                  <p className="text-xs text-neutral-700 font-bold">{nom.platformHeading}</p>
                  <div className="text-[11px] text-neutral-600 pt-2 border-t border-black flex justify-between font-medium">
                    <span>Nominator: {nom.nominatorName}</span>
                    <span>{nom.yearLevel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Nominate Candidate Modal */}
      {showNominateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white border-2 border-black rounded-3xl max-w-md w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative text-neutral-900 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowNominateModal(false)}
              className="absolute top-4 right-4 text-neutral-700 hover:text-black p-1.5 rounded-lg border border-black hover:bg-neutral-100 font-bold"
            >
              ✕
            </button>

            <div className="flex items-center space-x-2 text-rose-800 mb-2">
              <UserPlus className="w-5 h-5" />
              <h3 className="text-lg font-extrabold text-neutral-900">Register Candidate</h3>
            </div>
            <p className="text-xs text-neutral-600 font-medium mb-4">
              Simple candidate registration form. Fill in full name, school year level, and a brief description.
            </p>

            {nominateError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border-2 border-black text-rose-900 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-700" />
                <span>{nominateError}</span>
              </div>
            )}

            <form onSubmit={handleNominateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-800 font-extrabold mb-1">Full Name *</label>
                <input
                  type="text"
                  value={nomForm.nomineeName}
                  onChange={(e) => setNomForm({ ...nomForm, nomineeName: e.target.value })}
                  placeholder="e.g. Maria Angela Reyes"
                  className="w-full bg-neutral-50 border-2 border-black rounded-xl px-3.5 py-2.5 text-neutral-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-700"
                />
              </div>

              <div>
                <label className="block text-neutral-800 font-extrabold mb-1">Target Position *</label>
                <select
                  value={nomForm.positionId}
                  onChange={(e) => setNomForm({ ...nomForm, positionId: e.target.value })}
                  className="w-full bg-neutral-50 border-2 border-black rounded-xl px-3.5 py-2.5 text-neutral-900 font-bold focus:outline-none focus:ring-2 focus:ring-rose-700"
                >
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.id === 'muse' || p.title.toLowerCase().includes('muse') ? '(Female candidates only)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-800 font-extrabold mb-1">Gender *</label>
                  <select
                    value={nomForm.gender}
                    onChange={(e) => setNomForm({ ...nomForm, gender: e.target.value as Gender })}
                    className="w-full bg-neutral-50 border-2 border-black rounded-xl px-3.5 py-2.5 text-neutral-900 font-bold focus:outline-none focus:ring-2 focus:ring-rose-700"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-800 font-extrabold mb-1">School Year *</label>
                  <select
                    value={nomForm.yearLevel}
                    onChange={(e) => setNomForm({ ...nomForm, yearLevel: e.target.value as any })}
                    className="w-full bg-neutral-50 border-2 border-black rounded-xl px-3.5 py-2.5 text-neutral-900 font-bold focus:outline-none focus:ring-2 focus:ring-rose-700"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              {(nomForm.positionId === 'muse' || positions.find(p => p.id === nomForm.positionId)?.title.toLowerCase().includes('muse')) && (
                <div className="p-2.5 rounded-xl bg-rose-50 border-2 border-black text-rose-900 text-[11px] font-bold">
                  📌 <strong>Muse Position Rule:</strong> Only female candidates are eligible for the Muse position.
                </div>
              )}

              <div>
                <label className="block text-neutral-800 font-extrabold mb-1">Brief Description *</label>
                <textarea
                  rows={4}
                  value={nomForm.description}
                  onChange={(e) => setNomForm({ ...nomForm, description: e.target.value })}
                  placeholder="Provide a brief description of the candidate, advocacy, or platform..."
                  className="w-full bg-neutral-50 border-2 border-black rounded-xl px-3.5 py-2.5 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-700"
                />
              </div>

              <div className="pt-3 border-t-2 border-black flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNominateModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-black text-neutral-900 font-extrabold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNomination}
                  className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-extrabold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmittingNomination ? (
                    <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  ) : (
                    <span>Register Candidate</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Profile Modal */}
      {modalCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white border-2 border-black rounded-3xl max-w-lg w-full p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative text-neutral-900 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalCandidate(null)}
              className="absolute top-8 right-8 z-20 text-neutral-900 p-2 rounded-full bg-white border-2 border-black hover:bg-neutral-100 transition-all shadow-md font-bold"
            >
              ✕
            </button>

            {/* Full size candidate photo header */}
            <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden mb-5 border-2 border-black bg-neutral-100 shadow-lg">
              <img
                src={modalCandidate.avatarUrl}
                alt={modalCandidate.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <div className="absolute bottom-4 left-4 right-4 z-10">
                <h3 className="text-2xl font-black text-white tracking-tight drop-shadow-md">
                  {modalCandidate.name}
                </h3>
                <p className="text-xs font-bold text-neutral-200 drop-shadow">
                  {modalCandidate.yearLevel} • Computer Engineering
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 p-4 rounded-2xl border-2 border-black space-y-4 text-xs text-neutral-800 font-medium">
              <h4 className="font-extrabold text-rose-800 uppercase text-xs tracking-wider border-b-2 border-black pb-2.5 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-rose-700" />
                <span>Information of Candidates</span>
              </h4>

              {(modalCandidate.platformHeading || modalCandidate.bio) && (
                <div>
                  <span className="font-bold text-neutral-700 text-[11px] block mb-1">Brief Description:</span>
                  <p className="text-neutral-900 text-xs sm:text-sm leading-relaxed bg-white p-3 rounded-xl border-2 border-black font-semibold">
                    {modalCandidate.platformHeading || modalCandidate.bio}
                  </p>
                </div>
              )}

              {modalCandidate.achievements && modalCandidate.achievements.length > 0 && (
                <div>
                  <span className="font-bold text-neutral-700 text-[11px] mb-1 flex items-center space-x-1">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>Achievements & Leadership:</span>
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-neutral-800 font-semibold pl-1">
                    {modalCandidate.achievements.map((ach, i) => (
                      <li key={i}>{ach}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t-2 border-black flex justify-end">
              <button
                onClick={() => setModalCandidate(null)}
                className="bg-neutral-900 hover:bg-black text-white font-extrabold px-5 py-2.5 rounded-xl border-2 border-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
