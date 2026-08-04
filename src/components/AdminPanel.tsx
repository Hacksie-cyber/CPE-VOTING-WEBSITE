import React, { useState, useEffect } from 'react';
import { Position, Candidate, ElectionSettings, Gender, Voter } from '../types';
import { Settings, ShieldAlert, Key, RefreshCw, Plus, CheckCircle2, AlertCircle, FileText, Camera, Link, Trash2, Image, Pencil, Download, Users, UserX, UserCheck, Search, Filter, CheckSquare, Square, Ban, RotateCcw, AlertTriangle } from 'lucide-react';
import {
  signInWithGoogle,
  loadElectionDataFromFirestore,
  updateVoterInvalidationInFirestore,
  resetVotesInFirestore,
  resetDemoInFirestore,
  saveCandidateInFirestore,
  deleteCandidateInFirestore,
  updateSettingsInFirestore,
} from '../lib/firebase';
import {
  INITIAL_POSITIONS,
  INITIAL_CANDIDATES,
  INITIAL_VOTES,
  SAMPLE_VOTERS,
  INITIAL_ELECTION_SETTINGS,
} from '../data/initialData';
import { generateElectionPDF } from '../utils/pdfGenerator';
import { fetchOrCalculateResults } from '../utils/electionResultsHelper';

interface AdminPanelProps {
  settings: ElectionSettings;
  positions: Position[];
  candidates: Candidate[];
  onRefreshData: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  settings,
  positions,
  candidates,
  onRefreshData,
}) => {
  const [adminEmail, setAdminEmail] = useState('bamuyahacksie@gmail.com');
  const [adminPin, setAdminPin] = useState('2026CPE');
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Candidate photo editing state
  const [photoUrls, setPhotoUrls] = useState<{ [id: string]: string }>({});
  const [savingPhotoId, setSavingPhotoId] = useState<string | null>(null);

  // Admin Navigation Tab
  const [activeAdminTab, setActiveAdminTab] = useState<'OVERVIEW' | 'VOTERS'>('OVERVIEW');

  // Voter Audit & Invalidation State
  const [votersList, setVotersList] = useState<Voter[]>([]);
  const [loadingVoters, setLoadingVoters] = useState<boolean>(false);
  const [voterSearch, setVoterSearch] = useState<string>('');
  const [voterFilter, setVoterFilter] = useState<'ALL' | 'VOTED' | 'VALID' | 'INVALIDATED'>('ALL');
  const [invalidatingVoter, setInvalidatingVoter] = useState<Voter | null>(null);
  const [invalidationReason, setInvalidationReason] = useState<string>('');
  const [selectedVoterIds, setSelectedVoterIds] = useState<string[]>([]);
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);

  // Reset Votes Modal State
  const [showResetVotesModal, setShowResetVotesModal] = useState<boolean>(false);
  const [resetConfirmInput, setResetConfirmInput] = useState<string>('');
  const [resetVotesError, setResetVotesError] = useState<string | null>(null);

  // Fetch voters list from backend or Firestore
  const fetchVoters = async () => {
    setLoadingVoters(true);
    try {
      const res = await fetch(`/api/admin/voters?adminEmail=${encodeURIComponent(adminEmail)}&adminPin=${encodeURIComponent(adminPin)}`);
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && data.voters) {
          setVotersList(data.voters);
          setLoadingVoters(false);
          return;
        }
      }
    } catch {
      // Backend endpoint unavailable (e.g., hosted on Vercel)
    }

    // Fallback: Fetch from Firestore directly
    try {
      const fsData = await loadElectionDataFromFirestore();
      if (fsData && Array.isArray(fsData.voters)) {
        setVotersList(fsData.voters);
        setLoadingVoters(false);
        return;
      }
    } catch (fsErr) {
      console.warn('Failed to load voters list from Firestore:', fsErr);
    }

    // Check localStorage fallback for active session voter
    try {
      const savedVoterRaw = localStorage.getItem('cpe_voter');
      if (savedVoterRaw) {
        const savedVoter = JSON.parse(savedVoterRaw);
        setVotersList([savedVoter]);
      }
    } catch {
      // ignore
    }

    setLoadingVoters(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchVoters();
    }
  }, [isAuthenticated, activeAdminTab]);

  // Single Voter Invalidate / Restore Handler
  const handleToggleVoterInvalidation = async (targetVoter: Voter, invalidate: boolean, customReason?: string) => {
    setIsSubmittingAction(true);
    setError(null);
    setSuccessMsg(null);

    const reasonToUse = customReason || invalidationReason;

    try {
      const res = await fetch('/api/admin/voter/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          adminPin,
          voterId: targetVoter.id,
          invalidate,
          reason: reasonToUse,
        }),
      });

      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(data.message);
          if (data.voters) setVotersList(data.voters);
          onRefreshData();
          setInvalidatingVoter(null);
          setInvalidationReason('');
          setTimeout(() => setSuccessMsg(null), 4000);
          setIsSubmittingAction(false);
          return;
        }
      }
    } catch {
      // API call failed or on Vercel
    }

    // Fallback direct Firestore update
    try {
      const updatedVoters = await updateVoterInvalidationInFirestore([targetVoter.id], invalidate, reasonToUse);
      if (updatedVoters) {
        setVotersList(updatedVoters);
        setSuccessMsg(`Voter ${invalidate ? 'invalidated' : 'restored'} successfully.`);
        onRefreshData();
        setInvalidatingVoter(null);
        setInvalidationReason('');
        setTimeout(() => setSuccessMsg(null), 4000);
        setIsSubmittingAction(false);
        return;
      }
    } catch {
      setError('Failed to update voter status in database.');
    }

    setIsSubmittingAction(false);
  };

  // Bulk Voter Invalidate / Restore Handler
  const handleBulkToggleInvalidation = async (invalidate: boolean, customReason?: string) => {
    if (selectedVoterIds.length === 0) return;
    setIsSubmittingAction(true);
    setError(null);
    setSuccessMsg(null);

    const reasonToUse = customReason || 'Bulk Commission Audit Action for suspicious activity';

    try {
      const res = await fetch('/api/admin/voter/bulk-invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          adminPin,
          voterIds: selectedVoterIds,
          invalidate,
          reason: reasonToUse,
        }),
      });

      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(data.message);
          if (data.voters) setVotersList(data.voters);
          setSelectedVoterIds([]);
          onRefreshData();
          setTimeout(() => setSuccessMsg(null), 4000);
          setIsSubmittingAction(false);
          return;
        }
      }
    } catch {
      // API call failed or on Vercel
    }

    // Fallback direct Firestore update for bulk action
    try {
      const updatedVoters = await updateVoterInvalidationInFirestore(selectedVoterIds, invalidate, reasonToUse);
      if (updatedVoters) {
        setVotersList(updatedVoters);
        setSuccessMsg(`Bulk voter ${invalidate ? 'invalidation' : 'restoration'} applied.`);
        setSelectedVoterIds([]);
        onRefreshData();
        setTimeout(() => setSuccessMsg(null), 4000);
        setIsSubmittingAction(false);
        return;
      }
    } catch {
      setError('Failed to execute bulk voter update.');
    }

    setIsSubmittingAction(false);
  };

  const handleGoogleAdminLogin = async () => {
    setError(null);
    try {
      const user = await signInWithGoogle();
      if (user && user.email) {
        const userEmail = user.email.toLowerCase().trim();
        if (userEmail === 'bamuyahacksie@gmail.com') {
          setAdminEmail('bamuyahacksie@gmail.com');
          setIsAuthenticated(true);
        } else {
          setError(`Access Denied: Only bamuyahacksie@gmail.com is authorized as Admin. Signed in as ${user.email}`);
        }
      }
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string };
      if (authErr.code !== 'auth/popup-closed-by-user') {
        setError(authErr.message || 'Google Admin Sign-In failed.');
      }
    }
  };

  // Status Change State
  const [selectedStatus, setSelectedStatus] = useState<ElectionSettings['status']>(settings.status);

  // New Candidate Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [newCand, setNewCand] = useState<{
    name: string;
    positionId: string;
    yearLevel: '1st Year' | '2nd Year' | '3rd Year' | '4th Year';
    gender: Gender;
    description: string;
    avatarUrl: string;
  }>({
    name: '',
    positionId: positions[0]?.id || 'gov',
    yearLevel: '3rd Year',
    gender: 'Female',
    description: '',
    avatarUrl: '',
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail.trim().toLowerCase() !== 'bamuyahacksie@gmail.com') {
      setError('Access Denied: Only bamuyahacksie@gmail.com is authorized as Admin.');
      return;
    }
    if (adminPin === '2026CPE') {
      setIsAuthenticated(true);
      setError(null);
    } else {
      setError('Invalid Election Commission Admin PIN. Use "2026CPE".');
    }
  };

  const handleUpdateStatus = async (newStatus: ElectionSettings['status']) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          adminPin,
          newSettings: { status: newStatus },
        }),
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setSelectedStatus(newStatus);
          setSuccessMsg(`Election Status successfully updated to ${newStatus}`);
          onRefreshData();
          setTimeout(() => setSuccessMsg(null), 3000);
          return;
        }
      }
    } catch {
      // Backend API unreachable
    }

    try {
      const success = await updateSettingsInFirestore({ status: newStatus });
      if (success) {
        setSelectedStatus(newStatus);
        setSuccessMsg(`Election Status successfully updated to ${newStatus}`);
        onRefreshData();
        setTimeout(() => setSuccessMsg(null), 3000);
        return;
      }
    } catch {
      // ignore
    }

    setError('Error updating election status.');
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCand.name.trim() || !newCand.description.trim()) {
      setError('Full Name and Brief Description are required.');
      return;
    }

    const targetPos = positions.find((p) => p.id === newCand.positionId) || positions[0];
    const isMuse = targetPos ? (targetPos.id === 'muse' || targetPos.title.toLowerCase().includes('muse')) : (newCand.positionId === 'muse');

    if (isMuse && newCand.gender !== 'Female') {
      setError('Eligibility Rule Violation: Only female candidates are allowed for the Muse position.');
      return;
    }

    const candObj: Candidate = {
      id: `cand_${Date.now()}`,
      name: newCand.name.trim(),
      positionId: newCand.positionId || positions[0]?.id || 'gov',
      party: 'Independent Circuit',
      yearLevel: newCand.yearLevel,
      gender: newCand.gender,
      avatarUrl: newCand.avatarUrl.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      platformHeading: newCand.description.trim(),
      platformPoints: [newCand.description.trim(), 'Dedicated to serving Computer Engineering students.'],
      manifesto: newCand.description.trim(),
      bio: `${newCand.yearLevel} (${newCand.gender}) Computer Engineering candidate. ${newCand.description.trim()}`,
      achievements: ['CPE Registered Candidate 2026'],
    };

    try {
      const res = await fetch('/api/admin/candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          adminPin,
          candidate: candObj,
        }),
      });

      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Candidate ${newCand.name} registered successfully!`);
          setShowAddModal(false);
          setNewCand({
            name: '',
            positionId: positions[0]?.id || 'gov',
            yearLevel: '3rd Year',
            gender: 'Female',
            description: '',
            avatarUrl: '',
          });
          onRefreshData();
          setTimeout(() => setSuccessMsg(null), 3000);
          return;
        }
      }
    } catch {
      // API unreachable
    }

    try {
      const success = await saveCandidateInFirestore(candObj);
      if (success) {
        setSuccessMsg(`Candidate ${newCand.name} registered successfully!`);
        setShowAddModal(false);
        setNewCand({
          name: '',
          positionId: positions[0]?.id || 'gov',
          yearLevel: '3rd Year',
          gender: 'Female',
          description: '',
          avatarUrl: '',
        });
        onRefreshData();
        setTimeout(() => setSuccessMsg(null), 3000);
        return;
      }
    } catch {
      // ignore
    }

    setError('Failed to register candidate.');
  };

  const handleUpdatePhoto = async (candidate: Candidate) => {
    const updatedUrl = photoUrls[candidate.id];
    if (updatedUrl === undefined) return;

    setSavingPhotoId(candidate.id);
    const updatedCandidate = {
      ...candidate,
      avatarUrl: updatedUrl.trim() || candidate.avatarUrl,
    };

    try {
      const res = await fetch('/api/admin/candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          adminPin,
          candidate: updatedCandidate,
        }),
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Profile photo updated for ${candidate.name}!`);
          onRefreshData();
          setTimeout(() => setSuccessMsg(null), 3000);
          setSavingPhotoId(null);
          return;
        }
      }
    } catch {
      // API unreachable
    }

    try {
      const success = await saveCandidateInFirestore(updatedCandidate);
      if (success) {
        setSuccessMsg(`Profile photo updated for ${candidate.name}!`);
        onRefreshData();
        setTimeout(() => setSuccessMsg(null), 3000);
        setSavingPhotoId(null);
        return;
      }
    } catch {
      // ignore
    }

    setError('Error updating candidate photo.');
    setSavingPhotoId(null);
  };

  const handleDeleteCandidate = async (candidateId: string, candidateName: string) => {
    if (!confirm(`Are you sure you want to delete candidate ${candidateName}?`)) return;

    try {
      const res = await fetch(`/api/admin/candidate/${candidateId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail,
          'x-admin-pin': adminPin,
        },
        body: JSON.stringify({ adminEmail, adminPin }),
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Candidate ${candidateName} removed.`);
          onRefreshData();
          setTimeout(() => setSuccessMsg(null), 3000);
          return;
        }
      }
    } catch {
      // API unreachable
    }

    try {
      const success = await deleteCandidateInFirestore(candidateId);
      if (success) {
        setSuccessMsg(`Candidate ${candidateName} removed.`);
        onRefreshData();
        setTimeout(() => setSuccessMsg(null), 3000);
        return;
      }
    } catch {
      // ignore
    }

    setError('Error deleting candidate.');
  };

  const handleSaveEditCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCandidate) return;

    const targetPos = positions.find((p) => p.id === editingCandidate.positionId);
    const isMuse = targetPos ? (targetPos.id === 'muse' || targetPos.title.toLowerCase().includes('muse')) : (editingCandidate.positionId === 'muse');
    const candGender = editingCandidate.gender || 'Female';

    if (isMuse && candGender !== 'Female') {
      setError('Eligibility Rule Violation: Only female candidates are allowed for the Muse position.');
      return;
    }

    const updatedCand = {
      ...editingCandidate,
      gender: candGender,
    };

    try {
      const res = await fetch('/api/admin/candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          adminPin,
          candidate: updatedCand,
        }),
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Candidate ${editingCandidate.name} updated successfully!`);
          setEditingCandidate(null);
          onRefreshData();
          setTimeout(() => setSuccessMsg(null), 3000);
          return;
        }
      }
    } catch {
      // API unreachable
    }

    try {
      const success = await saveCandidateInFirestore(updatedCand);
      if (success) {
        setSuccessMsg(`Candidate ${editingCandidate.name} updated successfully!`);
        setEditingCandidate(null);
        onRefreshData();
        setTimeout(() => setSuccessMsg(null), 3000);
        return;
      }
    } catch {
      // ignore
    }

    setError('Error updating candidate details.');
  };

  const handleDownloadPDF = async () => {
    try {
      const data = await fetchOrCalculateResults(settings);
      generateElectionPDF(
        data.positionResults || [],
        data.turnoutStats || null,
        settings,
        data.lastUpdated || new Date().toISOString()
      );
    } catch {
      setError('Failed to fetch latest election results for PDF export.');
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Are you sure you want to reset all votes back to default sample state?')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/reset-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail, adminPin }),
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setSuccessMsg('Election data successfully reset to clean default state.');
          onRefreshData();
          setTimeout(() => setSuccessMsg(null), 3000);
          return;
        }
      }
    } catch {
      // Backend unreachable (e.g., on Vercel)
    }

    // Fallback: reset direct in Firestore
    try {
      const success = await resetDemoInFirestore(
        INITIAL_POSITIONS,
        INITIAL_CANDIDATES,
        INITIAL_VOTES,
        SAMPLE_VOTERS,
        INITIAL_ELECTION_SETTINGS
      );
      if (success) {
        setSuccessMsg('Election data successfully reset to clean default state.');
        onRefreshData();
        fetchVoters();
        setTimeout(() => setSuccessMsg(null), 3000);
        return;
      }
    } catch {
      // ignore
    }

    setError('Failed to reset demo.');
  };

  const handleResetVotes = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (resetConfirmInput.trim() !== 'confirm') {
      setResetVotesError('Please type "confirm" to confirm resetting all votes.');
      return;
    }
    setIsSubmittingAction(true);
    setResetVotesError(null);

    try {
      const res = await fetch('/api/admin/reset-votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          adminPin,
          password: resetConfirmInput.trim(),
        }),
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setSuccessMsg('All election votes have been reset to zero. Candidate profiles and positions remain untouched.');
          setShowResetVotesModal(false);
          setResetConfirmInput('');
          onRefreshData();
          fetchVoters();
          setTimeout(() => setSuccessMsg(null), 4000);
          setIsSubmittingAction(false);
          return;
        } else {
          setResetVotesError(data.message || 'Failed to reset votes.');
          setIsSubmittingAction(false);
          return;
        }
      }
    } catch {
      // Backend API unavailable (e.g., static hosting on Vercel)
    }

    // Fallback: reset votes directly in Firestore & clear local storage voting state
    try {
      const success = await resetVotesInFirestore();
      if (success) {
        // Clear local storage voter status if stored locally
        try {
          const saved = localStorage.getItem('cpe_voter');
          if (saved) {
            const parsed = JSON.parse(saved);
            parsed.hasVoted = false;
            parsed.votedAt = undefined;
            parsed.receiptHash = undefined;
            localStorage.setItem('cpe_voter', JSON.stringify(parsed));
          }
        } catch {
          // ignore
        }

        setSuccessMsg('All election votes have been reset to zero. Candidate profiles and positions remain untouched.');
        setShowResetVotesModal(false);
        setResetConfirmInput('');
        onRefreshData();
        fetchVoters();
        setTimeout(() => setSuccessMsg(null), 4000);
        setIsSubmittingAction(false);
        return;
      }
    } catch {
      // ignore
    }

    setResetVotesError('Failed to reset votes in database.');
    setIsSubmittingAction(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Commission Admin Access</h2>
            <p className="text-xs text-slate-400">Authorized Personnel Only</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Primary Google Admin Sign-In */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleGoogleAdminLogin}
            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center space-x-3 text-sm"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
              />
            </svg>
            <span>Sign in with Google Account</span>
          </button>
          <p className="text-[11px] text-center text-slate-500 mt-2">Sign in using <span className="font-mono text-cyan-400">bamuyahacksie@gmail.com</span></p>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-slate-900 px-3 text-slate-500 font-semibold tracking-wider">
              Or Manual Authorization Code
            </span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
              Authorized Admin Email
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="bamuyahacksie@gmail.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-cyan-400 placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">Only <span className="font-mono text-cyan-400">bamuyahacksie@gmail.com</span> is granted admin rights.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
              Commission Authorization PIN
            </label>
            <div className="relative">
              <input
                type="password"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="PIN: 2026CPE"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
              <Key className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Default Admin PIN: <span className="font-mono text-amber-400">2026CPE</span></p>
          </div>

          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20"
          >
            Authorize Admin Controls
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
            Commission on Elections Panel
          </span>
          <h2 className="text-2xl font-bold text-slate-100 mt-2">Department Election Control Console</h2>
          <p className="text-xs text-slate-400">Manage poll states, register candidates, and oversee audit ledgers.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadPDF}
            className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center space-x-1.5 shadow-md shadow-cyan-500/20 transition-all"
            title="Download Official Election Results PDF Report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Results PDF</span>
          </button>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Lock Console
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Admin Navigation Tab Bar */}
      <div className="flex items-center space-x-3 border-b border-slate-800/80 pb-3">
        <button
          onClick={() => setActiveAdminTab('OVERVIEW')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeAdminTab === 'OVERVIEW'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-md ring-1 ring-amber-500/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Election Controls & Candidates</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('VOTERS')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
            activeAdminTab === 'VOTERS'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-md ring-1 ring-amber-500/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Voter Audit & Account Invalidation</span>
          {votersList.filter((v) => v.isInvalidated).length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 text-[10px] rounded-full bg-rose-500/90 text-white font-extrabold animate-pulse">
              {votersList.filter((v) => v.isInvalidated).length} Invalidated
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ELECTION CONTROLS & CANDIDATE REGISTRY */}
      {activeAdminTab === 'OVERVIEW' && (
        <div className="space-y-8">
          {/* Control Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Voting Status Toggle */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                <span>Poll Operational Status</span>
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {(['VOTING_OPEN', 'PAUSED', 'CONCLUDED', 'PRE_ELECTION'] as ElectionSettings['status'][]).map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(st)}
                      className={`p-3 rounded-xl border text-left font-bold transition-all ${
                        selectedStatus === st
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 ring-2 ring-cyan-500/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="block">{st}</span>
                      <span className="text-[10px] font-normal text-slate-500">
                        {st === 'VOTING_OPEN'
                          ? 'Accepting live student ballots'
                          : st === 'PAUSED'
                          ? 'Temporarily halt voting'
                          : st === 'CONCLUDED'
                          ? 'Declare final official counts'
                          : 'Preparation mode'}
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Commission Maintenance</span>
              </h3>

              <div className="space-y-2.5">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 font-bold p-3 rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register New Candidate</span>
                </button>

                <button
                  onClick={() => {
                    setResetConfirmInput('');
                    setResetVotesError(null);
                    setShowResetVotesModal(true);
                  }}
                  className="w-full bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 font-bold p-3 rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors shadow-sm hover:shadow-rose-950/50"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset All Votes (Keep Candidates)</span>
                </button>

                <button
                  onClick={handleResetDemo}
                  className="w-full bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-slate-300 font-medium p-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Full Reset to Sample Data</span>
                </button>
              </div>
            </div>
          </div>

          {/* Candidate Profile Photo & Registry Manager */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>Candidate Profile Photo & Link Manager</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Add or edit profile photos for candidates using external image URL links.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-bold flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Candidate</span>
              </button>
            </div>

            {candidates.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 bg-slate-950/50 rounded-xl border border-slate-800/80">
                No candidates registered yet. Click "Register New Candidate" to add candidates with photo links.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidates.map((cand) => {
                  const currentUrlInput = photoUrls[cand.id] ?? cand.avatarUrl;
                  const isSaving = savingPhotoId === cand.id;

                  return (
                    <div key={cand.id} className="bg-slate-950 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="relative flex-shrink-0">
                          <img
                            src={currentUrlInput || cand.avatarUrl}
                            alt={cand.name}
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 rounded-full object-cover border-2 border-slate-700 bg-slate-900 shadow-md"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div className="absolute -bottom-1 -right-1 bg-slate-900 border border-slate-700 rounded-full p-1">
                            <Image className="w-3 h-3 text-cyan-400" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-slate-100 truncate">{cand.name}</h4>
                          <p className="text-[11px] text-cyan-400 font-medium">
                            {cand.yearLevel} CPE Candidate
                          </p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{cand.manifesto || cand.platformHeading}</p>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setEditingCandidate(cand)}
                            className="text-slate-500 hover:text-cyan-400 p-1.5 rounded-lg transition-colors"
                            title="Edit Candidate Info"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCandidate(cand.id, cand.name)}
                            className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors"
                            title="Remove Candidate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                          <Link className="w-3 h-3 text-amber-400" />
                          <span>Profile Photo URL Link</span>
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="url"
                            value={currentUrlInput}
                            onChange={(e) => setPhotoUrls({ ...photoUrls, [cand.id]: e.target.value })}
                            placeholder="https://images.unsplash.com/..."
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                          />
                          <button
                            onClick={() => handleUpdatePhoto(cand)}
                            disabled={isSaving}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 text-xs font-bold transition-all disabled:opacity-50"
                          >
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VOTER AUDIT & SUSPICIOUS ACCOUNT INVALIDATION */}
      {activeAdminTab === 'VOTERS' && (
        <div className="space-y-6">
          {/* Summary Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Total Registered</span>
              <span className="text-2xl font-black text-slate-100 mt-1 block">{votersList.length}</span>
              <span className="text-[10px] text-slate-500">Student accounts</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Votes Cast</span>
              <span className="text-2xl font-black text-cyan-400 mt-1 block">
                {votersList.filter((v) => v.hasVoted).length}
              </span>
              <span className="text-[10px] text-slate-500">Submitted ballots</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Valid Counted</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">
                {votersList.filter((v) => v.hasVoted && !v.isInvalidated).length}
              </span>
              <span className="text-[10px] text-emerald-500/80">In official tally</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Flagged / Invalid</span>
              <span className="text-2xl font-black text-rose-400 mt-1 block">
                {votersList.filter((v) => v.isInvalidated).length}
              </span>
              <span className="text-[10px] text-rose-400/80">Excluded from tally</span>
            </div>
          </div>

          {/* Search, Filter & Bulk Actions Header */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={voterSearch}
                  onChange={(e) => setVoterSearch(e.target.value)}
                  placeholder="Search student by name, ID (e.g. 2026-004), email, or receipt hash..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchVoters}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                  title="Reload Voters List"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingVoters ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center space-x-2 overflow-x-auto py-1">
                {(
                  [
                    { id: 'ALL', label: 'All Registered', count: votersList.length },
                    { id: 'VOTED', label: 'Voted', count: votersList.filter((v) => v.hasVoted).length },
                    { id: 'VALID', label: 'Valid Ballots', count: votersList.filter((v) => v.hasVoted && !v.isInvalidated).length },
                    { id: 'INVALIDATED', label: 'Invalidated / Flagged', count: votersList.filter((v) => v.isInvalidated).length },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setVoterFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      voterFilter === tab.id
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-slate-300">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Bulk Selection Actions */}
              {selectedVoterIds.length > 0 && (
                <div className="flex items-center space-x-2 bg-slate-950 p-1.5 px-3 rounded-xl border border-amber-500/30">
                  <span className="text-[11px] font-bold text-amber-400">
                    {selectedVoterIds.length} Selected
                  </span>
                  <button
                    onClick={() => handleBulkToggleInvalidation(true)}
                    disabled={isSubmittingAction}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 text-xs font-bold flex items-center space-x-1 transition-all"
                  >
                    <Ban className="w-3 h-3 text-rose-400" />
                    <span>Invalidate</span>
                  </button>
                  <button
                    onClick={() => handleBulkToggleInvalidation(false)}
                    disabled={isSubmittingAction}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold flex items-center space-x-1 transition-all"
                  >
                    <RotateCcw className="w-3 h-3 text-emerald-400" />
                    <span>Restore</span>
                  </button>
                  <button
                    onClick={() => setSelectedVoterIds([])}
                    className="text-[10px] text-slate-500 hover:text-slate-300 underline pl-1"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Voter List Table Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Student Voter Ledger & Integrity Audit</span>
              </h3>
              <span className="text-[11px] text-slate-500">
                Audit Table
              </span>
            </div>

            {loadingVoters ? (
              <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Fetching registered voter records...</span>
              </div>
            ) : votersList.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto opacity-50" />
                <p className="font-semibold text-slate-300">No actual student accounts registered yet.</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Student voter accounts will automatically appear here once students authenticate via Google or cast their official ballots.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/70 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedVoterIds.length > 0 && selectedVoterIds.length === votersList.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedVoterIds(votersList.map((v) => v.id));
                            } else {
                              setSelectedVoterIds([]);
                            }
                          }}
                          className="rounded border-slate-700 text-amber-500 focus:ring-0 bg-slate-900"
                        />
                      </th>
                      <th className="py-3 px-4">Student Identity</th>
                      <th className="py-3 px-4">Email & Year</th>
                      <th className="py-3 px-4">Voting Record</th>
                      <th className="py-3 px-4">Security Audit Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {votersList
                      .filter((voter) => {
                        const searchLower = voterSearch.toLowerCase().trim();
                        const matchSearch =
                          !searchLower ||
                          voter.name.toLowerCase().includes(searchLower) ||
                          voter.id.toLowerCase().includes(searchLower) ||
                          voter.email.toLowerCase().includes(searchLower) ||
                          (voter.receiptHash && voter.receiptHash.toLowerCase().includes(searchLower));

                        if (!matchSearch) return false;

                        if (voterFilter === 'VOTED') return voter.hasVoted;
                        if (voterFilter === 'VALID') return voter.hasVoted && !voter.isInvalidated;
                        if (voterFilter === 'INVALIDATED') return voter.isInvalidated;

                        return true;
                      })
                      .map((voter) => {
                        const isSelected = selectedVoterIds.includes(voter.id);
                        return (
                          <tr
                            key={voter.id}
                            className={`hover:bg-slate-800/40 transition-colors ${
                              voter.isInvalidated ? 'bg-rose-950/20' : ''
                            } ${isSelected ? 'bg-amber-500/5' : ''}`}
                          >
                            <td className="py-3.5 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedVoterIds([...selectedVoterIds, voter.id]);
                                  } else {
                                    setSelectedVoterIds(selectedVoterIds.filter((id) => id !== voter.id));
                                  }
                                }}
                                className="rounded border-slate-700 text-amber-500 focus:ring-0 bg-slate-900"
                              />
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-100 flex items-center space-x-1.5">
                                <span>{voter.name}</span>
                                {voter.isInvalidated && (
                                  <span className="text-[10px] text-rose-400 font-extrabold px-1.5 py-0.2 rounded bg-rose-500/20 border border-rose-500/30">
                                    SUSPICIOUS
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-cyan-400">{voter.id}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="text-slate-300 font-mono text-[11px]">{voter.email}</div>
                              <div className="text-[10px] text-slate-500">{voter.yearLevel} CPE</div>
                            </td>
                            <td className="py-3.5 px-4">
                              {voter.hasVoted ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                    <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                                    <span>Ballot Submitted</span>
                                  </span>
                                  {voter.receiptHash && (
                                    <div className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]" title={voter.receiptHash}>
                                      Hash: {voter.receiptHash.slice(0, 10)}...
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center space-x-1 text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                  <span>Not Voted Yet</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {voter.isInvalidated ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-[10px]">
                                    <Ban className="w-3 h-3 text-rose-400" />
                                    <span>INVALIDATED</span>
                                  </span>
                                  {voter.invalidatedReason && (
                                    <p className="text-[10px] text-rose-400/90 italic max-w-xs truncate" title={voter.invalidatedReason}>
                                      Reason: {voter.invalidatedReason}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[10px]">
                                  <UserCheck className="w-3 h-3 text-emerald-400" />
                                  <span>VALID ACCOUNT</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {voter.isInvalidated ? (
                                <button
                                  onClick={() => handleToggleVoterInvalidation(voter, false)}
                                  disabled={isSubmittingAction}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all inline-flex items-center space-x-1"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Restore Vote</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setInvalidatingVoter(voter);
                                    setInvalidationReason('Suspicious account activity / unverified credentials');
                                  }}
                                  disabled={isSubmittingAction}
                                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition-all inline-flex items-center space-x-1"
                                >
                                  <Ban className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Invalidate</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Voter Invalidation Reason Modal */}
      {invalidatingVoter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 space-y-4">
            <button
              onClick={() => setInvalidatingVoter(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-sm"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Invalidate Suspicious Account</h3>
                <p className="text-xs text-slate-400">Commission Election Integrity Audit</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1 text-xs">
              <div><strong className="text-slate-400">Student Name:</strong> <span className="text-slate-100 font-bold">{invalidatingVoter.name}</span></div>
              <div><strong className="text-slate-400">Student ID:</strong> <span className="text-cyan-400 font-mono">{invalidatingVoter.id}</span></div>
              <div><strong className="text-slate-400">Email:</strong> <span className="text-slate-300 font-mono">{invalidatingVoter.email}</span></div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Quick Violation Reason Presets:
              </label>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {[
                  'Duplicate student ID / Multi-account',
                  'Suspicious bot / Automated script',
                  'Unverified identity credentials',
                  'Violation of Election Commission rules',
                ].map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setInvalidationReason(preset)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      invalidationReason === preset
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Custom Audit Reason Statement *
              </label>
              <textarea
                rows={3}
                value={invalidationReason}
                onChange={(e) => setInvalidationReason(e.target.value)}
                placeholder="State specific reasons for invalidating this student account..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
              ⚠️ <strong>Immediate Tally Deduction:</strong> Invalidating this account will immediately remove any votes cast by this student from live candidate totals and adjust turnout percentages in real time.
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setInvalidatingVoter(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleVoterInvalidation(invalidatingVoter, true)}
                disabled={isSubmittingAction || !invalidationReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {isSubmittingAction ? 'Processing...' : 'Confirm Invalidation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-slate-100 mb-1">Register Candidate</h3>
            <p className="text-xs text-slate-400 mb-4">
              Requires candidate full name, school year level, optional photo URL link, and brief description.
            </p>

            <form onSubmit={handleAddCandidate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newCand.name}
                  onChange={(e) => setNewCand({ ...newCand, name: e.target.value })}
                  placeholder="e.g. Maria Clara Santos"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Position *</label>
                <select
                  value={newCand.positionId}
                  onChange={(e) => setNewCand({ ...newCand, positionId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-medium focus:outline-none focus:border-amber-500"
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
                  <label className="block text-slate-300 font-semibold mb-1">Gender *</label>
                  <select
                    value={newCand.gender}
                    onChange={(e) => setNewCand({ ...newCand, gender: e.target.value as Gender })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">School Year *</label>
                  <select
                    value={newCand.yearLevel}
                    onChange={(e) => setNewCand({ ...newCand, yearLevel: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              {(newCand.positionId === 'muse' || positions.find(p => p.id === newCand.positionId)?.title.toLowerCase().includes('muse')) && (
                <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-300 text-[11px]">
                  📌 <strong>Muse Position Rule:</strong> Only female candidates are eligible for the Muse position.
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                  <span>Profile Photo URL Link (Optional)</span>
                  <span className="text-[10px] text-amber-400 font-normal">Image link</span>
                </label>
                <input
                  type="url"
                  value={newCand.avatarUrl}
                  onChange={(e) => setNewCand({ ...newCand, avatarUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500"
                />
                {newCand.avatarUrl && (
                  <div className="mt-2 flex items-center space-x-3 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                    <img
                      src={newCand.avatarUrl}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-slate-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                      }}
                    />
                    <span className="text-[11px] text-slate-400">Live Photo Link Preview</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Brief Description *</label>
                <textarea
                  rows={4}
                  value={newCand.description}
                  onChange={(e) => setNewCand({ ...newCand, description: e.target.value })}
                  placeholder="Provide a brief description or platform overview for the candidate..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Candidate Modal */}
      {editingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingCandidate(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-slate-100 mb-1">Edit Candidate Info</h3>
            <p className="text-xs text-slate-400 mb-4">
              Update details, photo link, or platform statement for {editingCandidate.name}.
            </p>

            <form onSubmit={handleSaveEditCandidate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editingCandidate.name}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Position *</label>
                <select
                  value={editingCandidate.positionId}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, positionId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-medium focus:outline-none focus:border-cyan-500"
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
                  <label className="block text-slate-300 font-semibold mb-1">Gender *</label>
                  <select
                    value={editingCandidate.gender || 'Female'}
                    onChange={(e) => setEditingCandidate({ ...editingCandidate, gender: e.target.value as Gender })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-medium focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">School Year</label>
                  <select
                    value={editingCandidate.yearLevel || (editingCandidate.bio.includes('1st Year') ? '1st Year' : editingCandidate.bio.includes('2nd Year') ? '2nd Year' : editingCandidate.bio.includes('4th Year') ? '4th Year' : '3rd Year')}
                    onChange={(e) => setEditingCandidate({
                      ...editingCandidate,
                      yearLevel: e.target.value as any,
                      bio: `${e.target.value} Computer Engineering candidate. ${editingCandidate.manifesto || ''}`
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-medium focus:outline-none focus:border-cyan-500"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              {(editingCandidate.positionId === 'muse' || positions.find(p => p.id === editingCandidate.positionId)?.title.toLowerCase().includes('muse')) && (
                <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-300 text-[11px]">
                  📌 <strong>Muse Position Rule:</strong> Only female candidates are eligible for the Muse position.
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                  <span>Profile Photo URL Link</span>
                  <span className="text-[10px] text-cyan-400 font-normal">Image URL</span>
                </label>
                <input
                  type="url"
                  value={editingCandidate.avatarUrl}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, avatarUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
                {editingCandidate.avatarUrl && (
                  <div className="mt-2 flex items-center space-x-3 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                    <img
                      src={editingCandidate.avatarUrl}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-slate-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                      }}
                    />
                    <span className="text-[11px] text-slate-400">Live Photo Link Preview</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Brief Description / Platform</label>
                <textarea
                  rows={4}
                  value={editingCandidate.manifesto || editingCandidate.platformHeading}
                  onChange={(e) => setEditingCandidate({
                    ...editingCandidate,
                    manifesto: e.target.value,
                    platformHeading: e.target.value,
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingCandidate(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Votes Confirmation Modal */}
      {showResetVotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
            <button
              onClick={() => {
                setShowResetVotesModal(false);
                setResetConfirmInput('');
                setResetVotesError(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-sm font-bold"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Reset All Election Votes</h3>
                <p className="text-xs text-rose-400 font-semibold">Danger Zone • Permanent Action</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              This action will permanently delete all recorded votes and set all voter statuses back to zero. <strong className="text-white">Candidates and positions will NOT be deleted.</strong>
            </p>

            {resetVotesError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{resetVotesError}</span>
              </div>
            )}

            <form onSubmit={handleResetVotes} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  To confirm vote reset, please type <span className="font-mono text-rose-400 font-bold bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800">confirm</span> below:
                </label>
                <input
                  type="text"
                  value={resetConfirmInput}
                  onChange={(e) => {
                    setResetConfirmInput(e.target.value);
                    if (resetVotesError) setResetVotesError(null);
                  }}
                  placeholder="type confirm"
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetVotesModal(false);
                    setResetConfirmInput('');
                    setResetVotesError(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetConfirmInput.trim() !== 'confirm' || isSubmittingAction}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                    resetConfirmInput.trim() === 'confirm' && !isSubmittingAction
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isSubmittingAction ? 'Resetting Votes...' : 'Confirm Reset Votes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
