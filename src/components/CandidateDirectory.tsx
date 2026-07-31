import React, { useState, useEffect } from 'react';
import { Position, Candidate, CandidateNomination, AIComparisonResponse } from '../types';
import { Search, Sparkles, Award, FileText, Bot, UserPlus, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';

interface CandidateDirectoryProps {
  positions: Position[];
  candidates: Candidate[];
  onRefreshData?: () => void;
}

export const CandidateDirectory: React.FC<CandidateDirectoryProps> = ({ positions, candidates, onRefreshData }) => {
  const [selectedPositionId, setSelectedPositionId] = useState<string>('all');
  const [selectedParty, setSelectedParty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Nominations State
  const [nominations, setNominations] = useState<CandidateNomination[]>([]);
  const [showNominateModal, setShowNominateModal] = useState<boolean>(false);
  const [nominateSuccess, setNominateSuccess] = useState<string | null>(null);
  const [nominateError, setNominateError] = useState<string | null>(null);
  const [isSubmittingNomination, setIsSubmittingNomination] = useState<boolean>(false);

  // Nomination Form State
  const [nomForm, setNomForm] = useState({
    nomineeName: '',
    yearLevel: '3rd Year' as const,
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

    setIsSubmittingNomination(true);
    setNominateError(null);

    try {
      const res = await fetch('/api/election/nominate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomineeName: nomForm.nomineeName,
          yearLevel: nomForm.yearLevel,
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
          yearLevel: '3rd Year',
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
    const matchesParty = selectedParty === 'all' || cand.party === selectedParty;
    const matchesQuery =
      searchQuery.trim() === '' ||
      cand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.platformHeading.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.party.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesPosition && matchesParty && matchesQuery;
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
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase tracking-wider">
            Directory & Nominations
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight mt-2">
            Candidates & Student Nominations 2026
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Explore nominated candidates for Governor, Vice-Governor, Secretary, Treasurer, Auditor, P.I.O, and Muse.
          </p>
        </div>

        <button
          onClick={() => setShowNominateModal(true)}
          className="relative z-10 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold px-5 py-3 rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-cyan-500/20 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nominate a Candidate</span>
        </button>
      </div>

      {nominateSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{nominateSuccess}</span>
        </div>
      )}

      {/* AI Candidate Platform Analyzer */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <Bot className="w-4 h-4" />
          <span>Gemini AI Platform Analyzer</span>
        </div>
        <h3 className="text-lg font-bold text-slate-100 mb-1">
          Compare Nominated Candidates & Advocacies
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Select an officer position (Governor, Vice-Governor, Secretary, Treasurer, Auditor, P.I.O, Muse) to compare candidate goals.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Position</label>
            <select
              value={aiPositionId}
              onChange={(e) => setAiPositionId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">Specific Question (Optional)</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="e.g. Compare hardware lab proposals or student wellness initiatives..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleRunAiComparison}
                disabled={aiLoading}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-50"
              >
                {aiLoading ? (
                  <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent" />
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
          <div className="mt-4 bg-slate-950 p-4 rounded-xl border border-cyan-500/30 text-xs space-y-3 animate-in fade-in duration-200">
            <div>
              <span className="font-bold text-cyan-400 uppercase text-[11px] block mb-1">AI Analysis Summary</span>
              <p className="text-slate-200 leading-relaxed">{aiResult.summary}</p>
            </div>

            {aiResult.keyDifferences.length > 0 && (
              <div>
                <span className="font-bold text-slate-300 uppercase text-[11px] block mb-1">Key Differentiators</span>
                <ul className="space-y-1">
                  {aiResult.keyDifferences.map((diff, i) => (
                    <li key={i} className="flex items-start space-x-2 text-slate-300">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>{diff}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiResult.candidateHighlights && aiResult.candidateHighlights.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                {aiResult.candidateHighlights.map((hl, i) => (
                  <div key={i} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="font-bold text-slate-100 block">{hl.candidateName}</span>
                    <span className="text-[11px] text-cyan-400">{hl.standoutPoint}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidates by name, party, or platform..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Position Filter */}
          <select
            value={selectedPositionId}
            onChange={(e) => setSelectedPositionId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Positions ({positions.length})</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          {/* Party Filter */}
          <select
            value={selectedParty}
            onChange={(e) => setSelectedParty(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Parties</option>
            <option value="ByteCraft Alliance">ByteCraft Alliance</option>
            <option value="Synapse Union">Synapse Union</option>
            <option value="Independent Circuit">Independent Circuit</option>
          </select>
        </div>
      </div>

      {/* Candidate Cards Directory */}
      {filteredCandidates.length === 0 ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-10 text-center space-y-4 shadow-lg">
          <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <UserPlus className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-slate-100">No Nominees Registered Yet</h3>
            <p className="text-xs text-slate-400">
              Demo candidates have been cleared. Be the first to nominate real candidates for Governor, Vice-Governor, Secretary, Treasurer, Auditor, P.I.O, or Muse!
            </p>
          </div>
          <button
            onClick={() => setShowNominateModal(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs inline-flex items-center space-x-2 shadow-lg shadow-cyan-500/20 transition-all transform hover:-translate-y-0.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nominate Real Candidate Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCandidates.map((cand) => {
          const position = positions.find((p) => p.id === cand.positionId);

          return (
            <div
              key={cand.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between group"
            >
              <div>
                {/* Position & Party header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-800 text-cyan-300 border border-slate-700">
                    {position?.title}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md ${
                      cand.party === 'ByteCraft Alliance'
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                        : cand.party === 'Synapse Union'
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {cand.party}
                  </span>
                </div>

                {/* Avatar & Name */}
                <div className="flex items-center space-x-3 mb-4">
                  <img
                    src={cand.avatarUrl}
                    alt={cand.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-700 shadow-md flex-shrink-0"
                  />
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm group-hover:text-cyan-400 transition-colors">
                      {cand.name}
                    </h3>
                    {cand.nickname && (
                      <p className="text-xs text-cyan-400/90 font-medium">&quot;{cand.nickname}&quot;</p>
                    )}
                    <p className="text-xs text-slate-400">{cand.yearLevel} CPE</p>
                  </div>
                </div>

                {/* Platform Summary */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 mb-3 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Core Advocacy
                  </span>
                  <p className="text-xs font-semibold text-slate-200 leading-snug">
                    {cand.platformHeading}
                  </p>
                </div>

                {/* Platform Points */}
                <ul className="space-y-1 text-xs text-slate-400 mb-4">
                  {cand.platformPoints.slice(0, 2).map((pt, i) => (
                    <li key={i} className="flex items-start space-x-1.5">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span className="line-clamp-1">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => setModalCandidate(cand)}
                className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-400 font-semibold py-2 rounded-xl text-xs flex items-center justify-center space-x-1 transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Read Full Manifesto & Bio</span>
              </button>
            </div>
          );
        })}
        </div>
      )}

      {/* Nominations Showcase */}
      {nominations.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-bold text-slate-100">Student-Submitted Candidate Nominations</h3>
            </div>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {nominations.length} Submitted
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nominations.map((nom) => {
              const pos = positions.find((p) => p.id === nom.positionId);
              return (
                <div key={nom.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-400">{pos?.title}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Approved on Ballot
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-100 text-sm">{nom.nomineeName}</h4>
                  <p className="text-xs text-slate-400 font-semibold">{nom.platformHeading}</p>
                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-900 flex justify-between">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowNominateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>

            <div className="flex items-center space-x-2 text-cyan-400 mb-2">
              <UserPlus className="w-5 h-5" />
              <h3 className="text-lg font-bold text-slate-100">Register Candidate</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Simple candidate registration form. Fill in full name, school year level, and a brief description.
            </p>

            {nominateError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{nominateError}</span>
              </div>
            )}

            <form onSubmit={handleNominateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  value={nomForm.nomineeName}
                  onChange={(e) => setNomForm({ ...nomForm, nomineeName: e.target.value })}
                  placeholder="e.g. Maria Angela Reyes"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">School Year *</label>
                <select
                  value={nomForm.yearLevel}
                  onChange={(e) => setNomForm({ ...nomForm, yearLevel: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-medium focus:outline-none focus:border-cyan-500"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Brief Description *</label>
                <textarea
                  rows={4}
                  value={nomForm.description}
                  onChange={(e) => setNomForm({ ...nomForm, description: e.target.value })}
                  placeholder="Provide a brief description of the candidate, advocacy, or platform..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNominateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNomination}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmittingNomination ? (
                    <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalCandidate(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
            >
              ✕
            </button>

            <div className="flex items-center space-x-4 mb-4">
              <img
                src={modalCandidate.avatarUrl}
                alt={modalCandidate.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover border border-slate-700"
              />
              <div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {modalCandidate.party}
                </span>
                <h3 className="text-lg font-bold text-slate-100 mt-1">{modalCandidate.name}</h3>
                <p className="text-xs text-slate-400">{modalCandidate.yearLevel} Computer Engineering</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <h4 className="font-bold text-cyan-400 uppercase text-[11px] tracking-wider mb-1">
                  Platform Vision
                </h4>
                <p className="font-semibold text-slate-200 text-sm">{modalCandidate.platformHeading}</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-200 text-xs mb-2">Platform Action Items:</h4>
                <ul className="space-y-1.5">
                  {modalCandidate.platformPoints.map((pt, i) => (
                    <li key={i} className="flex items-start space-x-2 bg-slate-950/50 p-2 rounded-lg">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-200 text-xs mb-1">Personal Statement & Bio</h4>
                <p className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                  {modalCandidate.bio}
                </p>
              </div>

              {modalCandidate.achievements && (
                <div>
                  <h4 className="font-bold text-slate-200 text-xs mb-1 flex items-center space-x-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Key Achievements & Track Record</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                    {modalCandidate.achievements.map((ach, i) => (
                      <li key={i}>{ach}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setModalCandidate(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2 rounded-xl text-xs"
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
