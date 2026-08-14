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
  deleteVoterInFirestore,
  clearAllVotersInFirestore,
  deleteBulkVotersInFirestore,
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
import { UserProfileModal } from './UserProfileModal';

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
  const [editingVoter, setEditingVoter] = useState<Voter | null>(null);
  const [invalidationReason, setInvalidationReason] = useState<string>('');
  const [selectedVoterIds, setSelectedVoterIds] = useState<string[]>([]);
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);

  // Reset Votes Modal State
  const [showResetVotesModal, setShowResetVotesModal] = useState<boolean>(false);
  const [resetConfirmInput, setResetConfirmInput] = useState<string>('');
  const [resetVotesError, setResetVotesError] = useState<string | null>(null);

  // Clear All Voter Accounts Modal State
  const [showClearAllModal, setShowClearAllModal] = useState<boolean>(false);
  const [clearAllConfirmInput, setClearAllConfirmInput] = useState<string>('');
  const [clearAllError, setClearAllError] = useState<string | null>(null);

  // Bulk Delete Modal State
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState<boolean>(false);

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
        const currentVotes = Array.isArray(fsData.votes) ? fsData.votes : [];
        const validReceipts = new Set(currentVotes.map((vt: any) => vt.receiptHash?.toUpperCase()).filter(Boolean));
        const validVoterIds = new Set(currentVotes.map((vt: any) => vt.voterId?.toUpperCase()).filter(Boolean));

        const sanitizedVoters = fsData.voters.map((v: Voter) => {
          if (currentVotes.length === 0) {
            return { ...v, hasVoted: false, receiptHash: undefined, votedAt: undefined };
          }
          const hasVote =
            (v.receiptHash && validReceipts.has(v.receiptHash.toUpperCase())) ||
            (v.id && validVoterIds.has(v.id.toUpperCase()));
          return hasVote ? v : { ...v, hasVoted: false, receiptHash: undefined, votedAt: undefined };
        });

        setVotersList(sanitizedVoters);
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

  // Delete Single Voter State & Handler (Account Duplication Cleanup)
  const [voterToDelete, setVoterToDelete] = useState<Voter | null>(null);

  const executeDeleteVoter = async () => {
    if (!voterToDelete) return;
    const targetVoter = voterToDelete;
    setIsSubmittingAction(true);
    setError(null);
    setSuccessMsg(null);

    // Optimistically update local state so table reflects deletion immediately
    setVotersList((prev) =>
      prev.filter(
        (v) =>
          v.id !== targetVoter.id &&
          (!targetVoter.email || v.email?.toLowerCase() !== targetVoter.email.toLowerCase())
      )
    );

    try {
      const res = await fetch('/api/admin/voter/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          adminPin,
          voterId: targetVoter.id,
        }),
      });

      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Voter account "${targetVoter.name}" deleted successfully.`);
          if (data.voters) setVotersList(data.voters);
          onRefreshData();
          setVoterToDelete(null);
          setTimeout(() => setSuccessMsg(null), 4000);
          setIsSubmittingAction(false);
          return;
        }
      }
    } catch {
      // Backend API call failed or on Vercel static host
    }

    // Fallback direct Firestore deletion
    try {
      const updatedVoters = await deleteVoterInFirestore(targetVoter.id, targetVoter.email);
      if (updatedVoters) {
        setVotersList(updatedVoters);
        setSuccessMsg(`Student voter account "${targetVoter.name}" permanently deleted.`);
        onRefreshData();
        setVoterToDelete(null);
        setTimeout(() => setSuccessMsg(null), 4000);
        setIsSubmittingAction(false);
        return;
      }
    } catch {
      setError('Failed to delete voter account from database.');
    }

    setVoterToDelete(null);
    setIsSubmittingAction(false);
  };

  // Clear All Voter Accounts Handler (Batch Wipe to Minimize Workload)
  const executeClearAllVoters = async () => {
    setIsSubmittingAction(true);
    setError(null);
    setSuccessMsg(null);
    setClearAllError(null);

    const totalToClear = votersList.length;

    // Optimistically clear local state
    setVotersList([]);
    setSelectedVoterIds([]);

    try {
      const res = await fetch('/api/admin/voters/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          adminPin,
        }),
      });

      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(data.message || `All student voter accounts (${totalToClear}) cleared successfully.`);
          onRefreshData();
          setShowClearAllModal(false);
          setClearAllConfirmInput('');
          setTimeout(() => setSuccessMsg(null), 4000);
          setIsSubmittingAction(false);
          return;
        }
      }
    } catch {
      // Backend API call failed or on static hosting
    }

    // Direct Firestore fallback
    try {
      await clearAllVotersInFirestore();
      setSuccessMsg(`All student voter accounts (${totalToClear}) permanently cleared.`);
      onRefreshData();
      setShowClearAllModal(false);
      setClearAllConfirmInput('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setError('Failed to clear voter accounts in database.');
    }

    setIsSubmittingAction(false);
  };

  // Bulk Delete Selected Voter Accounts Handler
  const executeBulkDeleteVoters = async () => {
    if (selectedVoterIds.length === 0) return;
    setIsSubmittingAction(true);
    setError(null);
    setSuccessMsg(null);

    const targets = [...selectedVoterIds];
    setVotersList((prev) => prev.filter((v) => !targets.includes(v.id)));
    setSelectedVoterIds([]);

    try {
      const res = await fetch('/api/admin/voters/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          adminPin,
          voterIds: targets,
        }),
      });

      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(data.message || `${targets.length} voter account(s) deleted successfully.`);
          if (data.voters) setVotersList(data.voters);
          onRefreshData();
          setShowBulkDeleteModal(false);
          setTimeout(() => setSuccessMsg(null), 4000);
          setIsSubmittingAction(false);
          return;
        }
      }
    } catch {
      // API call failed or on static host
    }

    // Fallback direct Firestore bulk delete
    try {
      const updatedVoters = await deleteBulkVotersInFirestore(targets);
      if (updatedVoters) {
        setVotersList(updatedVoters);
        setSuccessMsg(`${targets.length} voter account(s) deleted successfully.`);
        onRefreshData();
        setShowBulkDeleteModal(false);
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch {
      setError('Failed to delete selected voter accounts.');
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

  // Year Level Voter Numbers State
  const [yearLevelCounts, setYearLevelCounts] = useState<{
    '1st Year': number;
    '2nd Year': number;
    '3rd Year': number;
    '4th Year': number;
  }>({
    '1st Year': settings.yearLevelVoterCounts?.['1st Year'] ?? 30,
    '2nd Year': settings.yearLevelVoterCounts?.['2nd Year'] ?? 30,
    '3rd Year': settings.yearLevelVoterCounts?.['3rd Year'] ?? 30,
    '4th Year': settings.yearLevelVoterCounts?.['4th Year'] ?? 30,
  });
  const [savingYLCounts, setSavingYLCounts] = useState(false);

  useEffect(() => {
    setSelectedStatus(settings.status);
    if (settings.yearLevelVoterCounts) {
      setYearLevelCounts({
        '1st Year': settings.yearLevelVoterCounts['1st Year'] ?? 30,
        '2nd Year': settings.yearLevelVoterCounts['2nd Year'] ?? 30,
        '3rd Year': settings.yearLevelVoterCounts['3rd Year'] ?? 30,
        '4th Year': settings.yearLevelVoterCounts['4th Year'] ?? 30,
      });
    }
  }, [settings]);

  const handleSaveYearLevelCounts = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingYLCounts(true);
    setError(null);
    setSuccessMsg(null);

    const count1st = Math.max(0, Number(yearLevelCounts['1st Year']) || 0);
    const count2nd = Math.max(0, Number(yearLevelCounts['2nd Year']) || 0);
    const count3rd = Math.max(0, Number(yearLevelCounts['3rd Year']) || 0);
    const count4th = Math.max(0, Number(yearLevelCounts['4th Year']) || 0);
    const totalSum = count1st + count2nd + count3rd + count4th;

    const newSettingsPayload = {
      totalRegisteredVoters: totalSum,
      yearLevelVoterCounts: {
        '1st Year': count1st,
        '2nd Year': count2nd,
        '3rd Year': count3rd,
        '4th Year': count4th,
      },
    };

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          adminPin,
          newSettings: newSettingsPayload,
        }),
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Year Level voter numbers successfully updated! Total Registered set to ${totalSum}.`);
          onRefreshData();
          setTimeout(() => setSuccessMsg(null), 4000);
          setSavingYLCounts(false);
          return;
        }
      }
    } catch {
      // Backend API unreachable
    }

    try {
      const success = await updateSettingsInFirestore(newSettingsPayload);
      if (success) {
        setSuccessMsg(`Year Level voter numbers updated in database! Total Registered set to ${totalSum}.`);
        onRefreshData();
        setTimeout(() => setSuccessMsg(null), 4000);
        setSavingYLCounts(false);
        return;
      }
    } catch {
      // ignore
    }

    setError('Failed to update Year Level voter numbers.');
    setSavingYLCounts(false);
  };

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
          try {
            const saved = localStorage.getItem('cpe_voter');
            if (saved) {
              const parsed = JSON.parse(saved);
              parsed.hasVoted = false;
              parsed.votedAt = undefined;
              parsed.receiptHash = undefined;
              parsed.isInvalidated = false;
              delete parsed.invalidatedReason;
              delete parsed.invalidatedAt;
              localStorage.setItem('cpe_voter', JSON.stringify(parsed));
            }
          } catch {
            // ignore
          }

          if (data.voters) {
            setVotersList(data.voters);
          } else {
            setVotersList((prev) =>
              prev.map((v) => ({
                ...v,
                hasVoted: false,
                votedAt: undefined,
                receiptHash: undefined,
                isInvalidated: false,
                invalidatedReason: undefined,
                invalidatedAt: undefined,
              }))
            );
          }

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
            parsed.isInvalidated = false;
            delete parsed.invalidatedReason;
            delete parsed.invalidatedAt;
            localStorage.setItem('cpe_voter', JSON.stringify(parsed));
          }
        } catch {
          // ignore
        }

        setVotersList((prev) =>
          prev.map((v) => ({
            ...v,
            hasVoted: false,
            votedAt: undefined,
            receiptHash: undefined,
            isInvalidated: false,
            invalidatedReason: undefined,
            invalidatedAt: undefined,
          }))
        );

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
      <div className="max-w-md mx-auto my-12 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl text-neutral-900 dark:text-slate-100">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-center font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-neutral-900 dark:text-slate-100">Commission Admin Access</h2>
            <p className="text-xs text-neutral-700 dark:text-slate-300 font-bold">Authorized Personnel Only</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 font-bold text-xs">
            {error}
          </div>
        )}

        {/* Primary Google Admin Sign-In */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleGoogleAdminLogin}
            className="w-full bg-white dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-700 text-neutral-900 dark:text-slate-100 font-extrabold py-3 px-4 rounded-2xl border border-neutral-200 dark:border-slate-700 transition-all shadow-sm flex items-center justify-center space-x-3 text-sm"
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
          <p className="text-[11px] text-center text-neutral-600 dark:text-slate-400 font-bold mt-2">Sign in using <span className="font-mono text-rose-800 dark:text-rose-400">bamuyahacksie@gmail.com</span></p>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-white dark:bg-slate-900 px-3 text-neutral-700 dark:text-slate-400 font-black tracking-wider border-x border-neutral-200 dark:border-slate-800">
              Or Manual Authorization Code
            </span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-neutral-900 dark:text-slate-200 mb-1 uppercase tracking-wider">
              Authorized Admin Email
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="bamuyahacksie@gmail.com"
              className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-neutral-900 dark:text-slate-100 font-bold placeholder-neutral-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-700"
            />
            <p className="text-[11px] text-neutral-600 dark:text-slate-400 font-bold mt-1">Only <span className="font-mono text-rose-800 dark:text-rose-400">bamuyahacksie@gmail.com</span> is granted admin rights.</p>
          </div>

          <div>
            <label className="block text-xs font-black text-neutral-900 dark:text-slate-200 mb-1 uppercase tracking-wider">
              Commission Authorization PIN
            </label>
            <div className="relative">
              <input
                type="password"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="PIN: 2026CPE"
                className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-sm font-mono font-bold text-rose-800 dark:text-rose-400 placeholder-neutral-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-700"
              />
              <Key className="w-4 h-4 text-neutral-600 dark:text-slate-400 absolute right-3.5 top-3.5" />
            </div>
            <p className="text-[11px] text-neutral-600 dark:text-slate-400 font-bold mt-1">Default Admin PIN: <span className="font-mono text-rose-800 dark:text-rose-400">2026CPE</span></p>
          </div>

          <button
            type="submit"
            className="w-full bg-rose-700 hover:bg-rose-800 text-white font-extrabold py-3 rounded-2xl text-xs transition-all border border-rose-700 shadow-sm"
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
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex items-center justify-between">
        <div>
          <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800 uppercase tracking-wider">
            Commission on Elections Panel
          </span>
          <h2 className="text-2xl font-black text-neutral-900 dark:text-slate-100 mt-2">Department Election Control Console</h2>
          <p className="text-xs text-neutral-700 dark:text-slate-300 font-bold">Manage poll states, register candidates, and oversee audit ledgers.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadPDF}
            className="text-xs font-extrabold px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white flex items-center space-x-1.5 border border-rose-700 shadow-sm active:scale-95 transition-all"
            title="Download Official Election Results PDF Report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Results PDF</span>
          </button>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-xs font-extrabold px-3 py-2 rounded-xl bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 border border-neutral-200 dark:border-slate-700 text-neutral-900 dark:text-slate-100 transition-colors"
          >
            Lock Console
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-black flex items-center space-x-2 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-800 dark:text-emerald-300 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Admin Navigation Tab Bar */}
      <div className="flex items-center space-x-3 border-b border-neutral-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveAdminTab('OVERVIEW')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all border ${
            activeAdminTab === 'OVERVIEW'
              ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-neutral-900 dark:text-slate-100 border-neutral-200 dark:border-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-700'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Election Controls & Candidates</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('VOTERS')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all border relative ${
            activeAdminTab === 'VOTERS'
              ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-neutral-900 dark:text-slate-100 border-neutral-200 dark:border-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Voter Audit & Account Invalidation</span>
          {votersList.filter((v) => v.isInvalidated).length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 text-[10px] rounded-full bg-black text-white font-black animate-pulse border border-white">
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
            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-neutral-900 dark:text-slate-100">
              <h3 className="text-sm font-black text-neutral-900 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-2">
                <Settings className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                <span>Poll Operational Status</span>
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {(['VOTING_OPEN', 'PAUSED', 'CONCLUDED', 'PRE_ELECTION'] as ElectionSettings['status'][]).map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(st)}
                      className={`p-3 rounded-2xl border text-left font-extrabold transition-all ${
                        selectedStatus === st
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800 shadow-sm'
                          : 'bg-neutral-50 dark:bg-slate-800 text-neutral-900 dark:text-slate-100 border-neutral-200 dark:border-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="block">{st}</span>
                      <span className="text-[10px] font-bold text-neutral-600 dark:text-slate-400">
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
            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-neutral-900 dark:text-slate-100">
              <h3 className="text-sm font-black text-neutral-900 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                <span>Commission Maintenance</span>
              </h3>

              <div className="space-y-2.5">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full bg-rose-700 border border-rose-700 text-white hover:bg-rose-800 font-extrabold p-3 rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all shadow-sm active:scale-95"
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
                  className="w-full bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/80 font-extrabold p-3 rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                  <span>Reset All Votes (Keep Candidates)</span>
                </button>

                <button
                  onClick={handleResetDemo}
                  className="w-full bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-neutral-900 dark:text-slate-100 hover:bg-neutral-200 dark:hover:bg-slate-700 font-bold p-2.5 rounded-2xl text-xs flex items-center justify-center space-x-2 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Full Reset to Sample Data</span>
                </button>
              </div>
            </div>

            {/* Year Level Registered Voter Allocation Manager */}
            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-neutral-900 dark:text-slate-100 col-span-1 md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-black text-neutral-900 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-2">
                    <Users className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                    <span>Adjust Year Level Voter Numbers</span>
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-slate-400 font-bold mt-0.5">
                    Configure or adjust the official registered voter count per CPE year level. Turnout percentages in Live Results will automatically update based on these numbers.
                  </p>
                </div>
                <span className="self-start sm:self-center px-3 py-1 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 font-black text-rose-800 dark:text-rose-300">
                  Total Allocation: {(yearLevelCounts['1st Year'] || 0) + (yearLevelCounts['2nd Year'] || 0) + (yearLevelCounts['3rd Year'] || 0) + (yearLevelCounts['4th Year'] || 0)} Voters
                </span>
              </div>

              <form onSubmit={handleSaveYearLevelCounts} className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['1st Year', '2nd Year', '3rd Year', '4th Year'] as const).map((yl) => (
                    <div key={yl} className="bg-neutral-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-neutral-200 dark:border-slate-700 space-y-1.5">
                      <label className="block text-[11px] font-black text-neutral-800 dark:text-slate-200 uppercase tracking-wider">
                        {yl}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={yearLevelCounts[yl]}
                        onChange={(e) => setYearLevelCounts({ ...yearLevelCounts, [yl]: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        className="w-full bg-white dark:bg-slate-900 border border-neutral-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-neutral-900 dark:text-slate-100 font-black focus:outline-none focus:ring-2 focus:ring-rose-700"
                        placeholder="30"
                        required
                      />
                      <span className="text-[10px] text-neutral-500 dark:text-slate-400 font-bold block">
                        Registered count
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={savingYLCounts}
                    className="px-5 py-2.5 rounded-2xl bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-xs flex items-center space-x-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>{savingYLCounts ? 'Saving Changes...' : 'Save Year Level Voter Numbers'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Candidate Profile Photo & Registry Manager */}
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-neutral-900 dark:text-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-neutral-900 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-2">
                  <Camera className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                  <span>Candidate Profile Photo & Link Manager</span>
                </h3>
                <p className="text-xs text-neutral-700 dark:text-slate-300 font-bold mt-1">
                  Add or edit profile photos for candidates using external image URL links.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 hover:bg-rose-200 dark:hover:bg-rose-900 text-xs font-black flex items-center space-x-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Candidate</span>
              </button>
            </div>

            {candidates.length === 0 ? (
              <div className="text-center py-8 text-xs text-neutral-600 dark:text-slate-400 font-bold bg-neutral-50 dark:bg-slate-800 rounded-2xl border border-neutral-200 dark:border-slate-700">
                No candidates registered yet. Click "Register New Candidate" to add candidates with photo links.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidates.map((cand) => {
                  const currentUrlInput = photoUrls[cand.id] ?? cand.avatarUrl;
                  const isSaving = savingPhotoId === cand.id;

                  return (
                    <div key={cand.id} className="bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-sm">
                      <div className="flex items-start space-x-3">
                        <div className="relative flex-shrink-0">
                          <img
                            src={currentUrlInput || cand.avatarUrl}
                            alt={cand.name}
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 rounded-2xl object-cover border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 border border-neutral-300 dark:border-slate-700 rounded-full p-1 shadow-sm">
                            <Image className="w-3 h-3 text-rose-700 dark:text-rose-400" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-black text-neutral-900 dark:text-slate-100 truncate">{cand.name}</h4>
                          <p className="text-[11px] text-rose-800 dark:text-rose-400 font-extrabold">
                            {cand.yearLevel} CPE Candidate
                          </p>
                          <p className="text-[10px] text-neutral-700 dark:text-slate-300 font-bold truncate mt-0.5">{cand.manifesto || cand.platformHeading}</p>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setEditingCandidate(cand)}
                            className="text-neutral-700 dark:text-slate-300 hover:text-black dark:hover:text-white p-1.5 rounded-lg transition-colors border border-transparent hover:border-neutral-300 dark:hover:border-slate-600"
                            title="Edit Candidate Info"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCandidate(cand.id, cand.name)}
                            className="text-neutral-700 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 p-1.5 rounded-lg transition-colors border border-transparent hover:border-neutral-300 dark:hover:border-slate-600"
                            title="Remove Candidate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-neutral-200 dark:border-slate-700">
                        <label className="block text-[10px] font-black text-neutral-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1">
                          <Link className="w-3 h-3 text-rose-700 dark:text-rose-400" />
                          <span>Profile Photo URL Link</span>
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="url"
                            value={currentUrlInput}
                            onChange={(e) => setPhotoUrls({ ...photoUrls, [cand.id]: e.target.value })}
                            placeholder="https://images.unsplash.com/..."
                            className="flex-1 bg-white dark:bg-slate-900 border border-neutral-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-neutral-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-rose-700"
                          />
                          <button
                            onClick={() => handleUpdatePhoto(cand)}
                            disabled={isSaving}
                            className="px-3 py-1.5 rounded-xl bg-rose-700 border border-rose-700 text-white hover:bg-rose-800 text-xs font-black transition-all disabled:opacity-50 active:scale-95"
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
            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-4 shadow-lg text-neutral-900 dark:text-slate-100">
              <span className="text-[11px] font-black text-neutral-700 dark:text-slate-300 block uppercase tracking-wider">Total Registered</span>
              <span className="text-2xl font-black text-neutral-900 dark:text-slate-100 mt-1 block">{votersList.length}</span>
              <span className="text-[10px] text-neutral-600 dark:text-slate-400 font-bold">Student accounts</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-4 shadow-lg text-neutral-900 dark:text-slate-100">
              <span className="text-[11px] font-black text-neutral-700 dark:text-slate-300 block uppercase tracking-wider">Total Ballots Count Today</span>
              <span className="text-2xl font-black text-rose-800 dark:text-rose-400 mt-1 block">
                {votersList.filter((v) => v.hasVoted && !v.isInvalidated).length}
              </span>
              <span className="text-[10px] text-neutral-600 dark:text-slate-400 font-bold">Valid submitted ballots today</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-4 shadow-lg text-neutral-900 dark:text-slate-100">
              <span className="text-[11px] font-black text-neutral-700 dark:text-slate-300 block uppercase tracking-wider">Valid Counted</span>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1 block">
                {votersList.filter((v) => v.hasVoted && !v.isInvalidated).length}
              </span>
              <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold">In official tally</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-4 shadow-lg text-neutral-900 dark:text-slate-100">
              <span className="text-[11px] font-black text-neutral-700 dark:text-slate-300 block uppercase tracking-wider">Flagged / Invalid</span>
              <span className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1 block">
                {votersList.filter((v) => v.isInvalidated).length}
              </span>
              <span className="text-[10px] text-rose-800 dark:text-rose-400 font-bold">Excluded from tally</span>
            </div>
          </div>

          {/* Search, Filter & Bulk Actions Header */}
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 text-neutral-900 dark:text-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-600 dark:text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={voterSearch}
                  onChange={(e) => setVoterSearch(e.target.value)}
                  placeholder="Search student by name, ID (e.g. 2026-004), email, or receipt hash..."
                  className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-neutral-900 dark:text-slate-100 font-bold placeholder-neutral-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-700"
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchVoters}
                  className="px-3.5 py-2 rounded-2xl bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 border border-neutral-200 dark:border-slate-700 text-neutral-900 dark:text-slate-100 text-xs font-black flex items-center space-x-1.5 transition-colors"
                  title="Reload Voters List"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingVoters ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={() => {
                    setClearAllConfirmInput('');
                    setClearAllError(null);
                    setShowClearAllModal(true);
                  }}
                  disabled={votersList.length === 0 || isSubmittingAction}
                  className="px-3.5 py-2 rounded-2xl bg-rose-700 hover:bg-rose-800 text-white border border-rose-700 text-xs font-black flex items-center space-x-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                  title="Clear all registered accounts to reset voter registry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Accounts</span>
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-200 dark:border-slate-800">
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all flex items-center space-x-1.5 ${
                      voterFilter === tab.id
                        ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                        : 'bg-neutral-50 dark:bg-slate-800 text-neutral-900 dark:text-slate-100 border-neutral-200 dark:border-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black text-white font-black">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Bulk Selection Actions */}
              {selectedVoterIds.length > 0 && (
                <div className="flex items-center space-x-2 bg-rose-50 dark:bg-rose-950 p-1.5 px-3 rounded-2xl border border-rose-200 dark:border-rose-800">
                  <span className="text-[11px] font-black text-rose-900 dark:text-rose-200">
                    {selectedVoterIds.length} Selected
                  </span>
                  <button
                    onClick={() => handleBulkToggleInvalidation(true)}
                    disabled={isSubmittingAction}
                    className="px-2.5 py-1 rounded-xl bg-rose-700 border border-rose-700 text-white hover:bg-rose-800 text-xs font-black flex items-center space-x-1 transition-all"
                  >
                    <Ban className="w-3 h-3 text-white" />
                    <span>Invalidate</span>
                  </button>
                  <button
                    onClick={() => handleBulkToggleInvalidation(false)}
                    disabled={isSubmittingAction}
                    className="px-2.5 py-1 rounded-xl bg-emerald-600 border border-emerald-600 text-white hover:bg-emerald-700 text-xs font-black flex items-center space-x-1 transition-all"
                  >
                    <RotateCcw className="w-3 h-3 text-white" />
                    <span>Restore</span>
                  </button>
                  <button
                    onClick={() => setShowBulkDeleteModal(true)}
                    disabled={isSubmittingAction}
                    className="px-2.5 py-1 rounded-xl bg-rose-800 border border-rose-800 text-white hover:bg-rose-900 text-xs font-black flex items-center space-x-1 transition-all"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                    <span>Delete ({selectedVoterIds.length})</span>
                  </button>
                  <button
                    onClick={() => setSelectedVoterIds([])}
                    className="text-[10px] text-neutral-800 dark:text-slate-200 hover:text-black dark:hover:text-white font-extrabold underline pl-1"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Voter List Table Card */}
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden text-neutral-900 dark:text-slate-100">
            <div className="p-4 border-b border-neutral-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xs font-black text-neutral-900 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                <span>Student Voter Ledger & Integrity Audit</span>
              </h3>
              <div className="flex items-center space-x-2.5">
                <span className="text-[11px] text-neutral-700 dark:text-slate-300 font-bold hidden sm:inline">
                  {votersList.length} Account{votersList.length === 1 ? '' : 's'} Registered
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setClearAllConfirmInput('');
                    setClearAllError(null);
                    setShowClearAllModal(true);
                  }}
                  disabled={votersList.length === 0 || isSubmittingAction}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-black text-xs flex items-center space-x-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                  title="Permanently clear and delete all voter accounts from the ledger"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Accounts</span>
                </button>
              </div>
            </div>

            {loadingVoters ? (
              <div className="p-12 text-center text-xs text-neutral-700 dark:text-slate-300 font-bold flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-rose-700 dark:text-rose-400" />
                <span>Fetching registered voter records...</span>
              </div>
            ) : votersList.length === 0 ? (
              <div className="p-12 text-center text-xs text-neutral-600 dark:text-slate-400 space-y-2">
                <Users className="w-8 h-8 text-neutral-400 dark:text-slate-500 mx-auto" />
                <p className="font-extrabold text-neutral-900 dark:text-slate-100">No actual student accounts registered yet.</p>
                <p className="text-[11px] text-neutral-700 dark:text-slate-300 font-bold max-w-sm mx-auto">
                  Student voter accounts will automatically appear here once students authenticate via Google or cast their official ballots.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-100 dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-700 text-[11px] font-black text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
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
                          className="rounded border border-neutral-300 dark:border-slate-600 text-rose-700 focus:ring-0 bg-white dark:bg-slate-900"
                        />
                      </th>
                      <th className="py-3 px-4">Student Identity</th>
                      <th className="py-3 px-4">Email & Year</th>
                      <th className="py-3 px-4">Voting Record</th>
                      <th className="py-3 px-4">Security Audit Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-slate-800">
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
                            className={`hover:bg-neutral-50 dark:hover:bg-slate-800/60 transition-colors ${
                              voter.isInvalidated ? 'bg-rose-50/70 dark:bg-rose-950/40' : ''
                            } ${isSelected ? 'bg-neutral-100 dark:bg-slate-800' : ''}`}
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
                                className="rounded border border-neutral-300 dark:border-slate-600 text-rose-700 focus:ring-0 bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-extrabold text-neutral-900 dark:text-slate-100 flex items-center space-x-1.5">
                                <span>{voter.name}</span>
                                {voter.isInvalidated && (
                                  <span className="text-[10px] text-white font-black px-1.5 py-0.2 rounded bg-black">
                                    SUSPICIOUS
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono font-bold text-rose-800 dark:text-rose-400">{voter.id}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="text-neutral-900 dark:text-slate-100 font-mono font-bold text-[11px]">{voter.email}</div>
                              <div className="text-[10px] text-neutral-700 dark:text-slate-300 font-bold">{voter.yearLevel} CPE</div>
                            </td>
                            <td className="py-3.5 px-4">
                              {voter.hasVoted ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center space-x-1 text-[10px] font-black px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                                    <CheckCircle2 className="w-3 h-3 text-rose-800 dark:text-rose-300" />
                                    <span>Ballot Submitted</span>
                                  </span>
                                  {voter.receiptHash && (
                                    <div className="text-[10px] font-mono text-neutral-700 dark:text-slate-300 font-bold truncate max-w-[140px]" title={voter.receiptHash}>
                                      Hash: {voter.receiptHash.slice(0, 10)}...
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 border border-neutral-200 dark:border-slate-700">
                                  <span>Not Voted Yet</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {voter.isInvalidated ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-xl bg-rose-700 border border-rose-700 text-white font-black text-[10px]">
                                    <Ban className="w-3 h-3 text-white" />
                                    <span>INVALIDATED</span>
                                  </span>
                                  {voter.invalidatedReason && (
                                    <p className="text-[10px] text-rose-900 dark:text-rose-200 font-bold italic max-w-xs truncate" title={voter.invalidatedReason}>
                                      Reason: {voter.invalidatedReason}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-black text-[10px]">
                                  <UserCheck className="w-3 h-3 text-emerald-800 dark:text-emerald-300" />
                                  <span>VALID ACCOUNT</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                {voter.isInvalidated ? (
                                  <button
                                    onClick={() => handleToggleVoterInvalidation(voter, false)}
                                    disabled={isSubmittingAction}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 text-white text-xs font-black transition-all inline-flex items-center space-x-1 active:scale-95 shadow-sm"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-white" />
                                    <span>Restore Vote</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setInvalidatingVoter(voter);
                                      setInvalidationReason('Suspicious account activity / unverified credentials');
                                    }}
                                    disabled={isSubmittingAction}
                                    className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 border border-rose-700 text-white text-xs font-black transition-all inline-flex items-center space-x-1 active:scale-95 shadow-sm"
                                  >
                                    <Ban className="w-3.5 h-3.5 text-white" />
                                    <span>Invalidate</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => setEditingVoter(voter)}
                                  disabled={isSubmittingAction}
                                  className="p-1.5 px-2 rounded-xl bg-neutral-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-slate-700 border border-neutral-200 dark:border-slate-700 text-neutral-900 dark:text-slate-100 text-xs font-black transition-all inline-flex items-center space-x-1 shadow-sm"
                                  title="Edit Student Personal Information"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
                                  <span className="hidden xl:inline text-[11px]">Edit</span>
                                </button>
                                <button
                                  onClick={() => setVoterToDelete(voter)}
                                  disabled={isSubmittingAction}
                                  className="p-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-700 border border-neutral-200 dark:border-slate-700 text-neutral-900 dark:text-slate-100 text-xs font-black transition-all inline-flex items-center space-x-1 shadow-sm"
                                  title="Delete Account (Duplicate Account Cleanup)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span className="hidden xl:inline text-[11px]">Delete</span>
                                </button>
                              </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-neutral-900 dark:text-slate-100 space-y-4">
            <button
              onClick={() => setInvalidatingVoter(null)}
              className="absolute top-4 right-4 text-neutral-700 dark:text-slate-300 hover:text-black dark:hover:text-white font-extrabold text-sm"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 text-rose-800 dark:text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800">
                <AlertTriangle className="w-6 h-6 text-rose-800 dark:text-rose-300" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-slate-100">Invalidate Suspicious Account</h3>
                <p className="text-xs text-neutral-700 dark:text-slate-300 font-bold">Commission Election Integrity Audit</p>
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-slate-800 p-3.5 rounded-2xl border border-neutral-200 dark:border-slate-700 space-y-1 text-xs font-bold">
              <div><strong className="text-neutral-700 dark:text-slate-300">Student Name:</strong> <span className="text-neutral-900 dark:text-slate-100 font-black">{invalidatingVoter.name}</span></div>
              <div><strong className="text-neutral-700 dark:text-slate-300">Student ID:</strong> <span className="text-rose-800 dark:text-rose-400 font-mono font-black">{invalidatingVoter.id}</span></div>
              <div><strong className="text-neutral-700 dark:text-slate-300">Email:</strong> <span className="text-neutral-900 dark:text-slate-100 font-mono font-bold">{invalidatingVoter.email}</span></div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-neutral-900 dark:text-slate-200">
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
                    className={`p-2 rounded-xl border text-left transition-all ${
                      invalidationReason === preset
                        ? 'bg-rose-700 text-white font-extrabold border-rose-700 shadow-sm'
                        : 'bg-neutral-50 dark:bg-slate-800 text-neutral-900 dark:text-slate-100 font-bold border-neutral-200 dark:border-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-neutral-900 dark:text-slate-200 mb-1">
                Custom Audit Reason Statement *
              </label>
              <textarea
                rows={3}
                value={invalidationReason}
                onChange={(e) => setInvalidationReason(e.target.value)}
                placeholder="State specific reasons for invalidating this student account..."
                className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-neutral-900 dark:text-slate-100 font-bold placeholder-neutral-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-700"
              />
            </div>

            <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-900 dark:text-rose-200 font-bold">
              ⚠️ <strong>Immediate Tally Deduction:</strong> Invalidating this account will immediately remove any votes cast by this student from live candidate totals and adjust turnout percentages in real time.
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setInvalidatingVoter(null)}
                className="px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-neutral-900 dark:text-slate-100 text-xs font-extrabold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleVoterInvalidation(invalidatingVoter, true)}
                disabled={isSubmittingAction || !invalidationReason.trim()}
                className="px-4 py-2 rounded-2xl bg-rose-700 hover:bg-rose-800 border border-rose-700 text-white font-black text-xs shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isSubmittingAction ? 'Processing...' : 'Confirm Invalidation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-neutral-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-neutral-700 dark:text-slate-300 hover:text-black dark:hover:text-white font-extrabold text-sm"
            >
              ✕
            </button>

            <h3 className="text-lg font-black text-neutral-900 dark:text-slate-100 mb-1">Register Candidate</h3>
            <p className="text-xs text-neutral-700 dark:text-slate-300 font-bold mb-4">
              Requires candidate full name, school year level, optional photo URL link, and brief description.
            </p>

            <form onSubmit={handleAddCandidate} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-900 dark:text-slate-200 font-black mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newCand.name}
                  onChange={(e) => setNewCand({ ...newCand, name: e.target.value })}
                  placeholder="e.g. Maria Clara Santos"
                  className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-neutral-900 dark:text-slate-100 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-rose-700"
                />
              </div>

              <div>
                <label className="block text-neutral-900 dark:text-slate-200 font-black mb-1">Position *</label>
                <select
                  value={newCand.positionId}
                  onChange={(e) => setNewCand({ ...newCand, positionId: e.target.value })}
                  className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-neutral-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-rose-700"
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
                  <label className="block text-neutral-900 dark:text-slate-200 font-black mb-1">Gender *</label>
                  <select
                    value={newCand.gender}
                    onChange={(e) => setNewCand({ ...newCand, gender: e.target.value as Gender })}
                    className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-neutral-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-rose-700"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-900 dark:text-slate-200 font-black mb-1">School Year *</label>
                  <select
                    value={newCand.yearLevel}
                    onChange={(e) => setNewCand({ ...newCand, yearLevel: e.target.value as any })}
                    className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-neutral-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-rose-700"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              {(newCand.positionId === 'muse' || positions.find(p => p.id === newCand.positionId)?.title.toLowerCase().includes('muse')) && (
                <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-[11px] font-bold">
                  📌 <strong>Muse Position Rule:</strong> Only female candidates are eligible for the Muse position.
                </div>
              )}

              <div>
                <label className="block text-neutral-900 dark:text-slate-200 font-black mb-1 flex items-center justify-between">
                  <span>Profile Photo URL Link (Optional)</span>
                  <span className="text-[10px] text-rose-800 dark:text-rose-400 font-bold">Image link</span>
                </label>
                <input
                  type="url"
                  value={newCand.avatarUrl}
                  onChange={(e) => setNewCand({ ...newCand, avatarUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-neutral-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-rose-700"
                />
                {newCand.avatarUrl && (
                  <div className="mt-2 flex items-center space-x-3 bg-neutral-50 dark:bg-slate-800 p-2 rounded-2xl border border-neutral-200 dark:border-slate-700">
                    <img
                      src={newCand.avatarUrl}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-xl object-cover border border-neutral-300 dark:border-slate-600"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                      }}
                    />
                    <span className="text-[11px] text-neutral-700 dark:text-slate-300 font-bold">Live Photo Link Preview</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-neutral-900 dark:text-slate-200 font-black mb-1">Brief Description *</label>
                <textarea
                  rows={4}
                  value={newCand.description}
                  onChange={(e) => setNewCand({ ...newCand, description: e.target.value })}
                  placeholder="Provide a brief description or platform overview for the candidate..."
                  className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-neutral-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-rose-700"
                />
              </div>

              <div className="pt-3 border-t border-neutral-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-neutral-900 dark:text-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-2xl bg-rose-700 hover:bg-rose-800 border border-rose-700 text-white font-black shadow-sm active:scale-95"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-neutral-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingCandidate(null)}
              className="absolute top-4 right-4 text-neutral-700 dark:text-slate-300 hover:text-black dark:hover:text-white font-extrabold text-sm"
            >
              ✕
            </button>

            <h3 className="text-lg font-black text-neutral-900 dark:text-slate-100 mb-1">Edit Candidate Info</h3>
            <p className="text-xs text-neutral-700 dark:text-slate-300 font-bold mb-4">
              Update details, photo link, or platform statement for {editingCandidate.name}.
            </p>

            <form onSubmit={handleSaveEditCandidate} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-900 dark:text-slate-200 font-black mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editingCandidate.name}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, name: e.target.value })}
                  className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-neutral-900 dark:text-slate-100 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-rose-700"
                />
              </div>

              <div>
                <label className="block text-neutral-900 dark:text-slate-200 font-black mb-1">Position *</label>
                <select
                  value={editingCandidate.positionId}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, positionId: e.target.value })}
                  className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-neutral-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-rose-700"
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
                  <label className="block text-neutral-900 dark:text-slate-200 font-black mb-1">Gender *</label>
                  <select
                    value={editingCandidate.gender || 'Female'}
                    onChange={(e) => setEditingCandidate({ ...editingCandidate, gender: e.target.value as Gender })}
                    className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-neutral-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-rose-700"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-900 dark:text-slate-200 font-black mb-1">School Year</label>
                  <select
                    value={editingCandidate.yearLevel || (editingCandidate.bio.includes('1st Year') ? '1st Year' : editingCandidate.bio.includes('2nd Year') ? '2nd Year' : editingCandidate.bio.includes('4th Year') ? '4th Year' : '3rd Year')}
                    onChange={(e) => setEditingCandidate({
                      ...editingCandidate,
                      yearLevel: e.target.value as any,
                      bio: `${e.target.value} Computer Engineering candidate. ${editingCandidate.manifesto || ''}`
                    })}
                    className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-neutral-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-rose-700"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              {(editingCandidate.positionId === 'muse' || positions.find(p => p.id === editingCandidate.positionId)?.title.toLowerCase().includes('muse')) && (
                <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-[11px] font-bold">
                  📌 <strong>Muse Position Rule:</strong> Only female candidates are eligible for the Muse position.
                </div>
              )}

              <div>
                <label className="block text-neutral-900 dark:text-slate-200 font-black mb-1 flex items-center justify-between">
                  <span>Profile Photo URL Link</span>
                  <span className="text-[10px] text-rose-800 dark:text-rose-400 font-bold">Image URL</span>
                </label>
                <input
                  type="url"
                  value={editingCandidate.avatarUrl}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, avatarUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-neutral-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-rose-700"
                />
                {editingCandidate.avatarUrl && (
                  <div className="mt-2 flex items-center space-x-3 bg-neutral-50 dark:bg-slate-800 p-2 rounded-2xl border border-neutral-200 dark:border-slate-700">
                    <img
                      src={editingCandidate.avatarUrl}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-xl object-cover border border-neutral-300 dark:border-slate-600"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                      }}
                    />
                    <span className="text-[11px] text-neutral-700 dark:text-slate-300 font-bold">Live Photo Link Preview</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-neutral-900 dark:text-slate-200 font-black mb-1">Brief Description / Platform</label>
                <textarea
                  rows={4}
                  value={editingCandidate.manifesto || editingCandidate.platformHeading}
                  onChange={(e) => setEditingCandidate({
                    ...editingCandidate,
                    manifesto: e.target.value,
                    platformHeading: e.target.value,
                  })}
                  className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-neutral-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-rose-700"
                />
              </div>

              <div className="pt-3 border-t border-neutral-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingCandidate(null)}
                  className="px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-neutral-900 dark:text-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-2xl bg-rose-700 hover:bg-rose-800 border border-rose-700 text-white font-black shadow-sm active:scale-95"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-neutral-900 dark:text-slate-100">
            <button
              onClick={() => {
                setShowResetVotesModal(false);
                setResetConfirmInput('');
                setResetVotesError(null);
              }}
              className="absolute top-4 right-4 text-neutral-700 dark:text-slate-300 hover:text-black dark:hover:text-white font-extrabold text-sm"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-800 dark:text-rose-300" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-slate-100">Reset All Election Votes</h3>
                <p className="text-xs text-rose-800 dark:text-rose-400 font-extrabold">Danger Zone • Permanent Action</p>
              </div>
            </div>

            <p className="text-xs text-neutral-800 dark:text-slate-200 font-bold leading-relaxed mb-4">
              This action will permanently delete all recorded votes and set all voter statuses back to zero. <strong className="text-black dark:text-white">Candidates and positions will NOT be deleted.</strong>
            </p>

            {resetVotesError && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-black flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-800 dark:text-rose-300" />
                <span>{resetVotesError}</span>
              </div>
            )}

            <form onSubmit={handleResetVotes} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-neutral-900 dark:text-slate-200 mb-1.5">
                  To confirm vote reset, please type <span className="font-mono text-rose-800 dark:text-rose-300 font-extrabold bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">confirm</span> below:
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
                  className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-neutral-900 dark:text-slate-100 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-700"
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
                  className="px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-neutral-900 dark:text-slate-100 text-xs font-black transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetConfirmInput.trim() !== 'confirm' || isSubmittingAction}
                  className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center space-x-2 transition-all border ${
                    resetConfirmInput.trim() === 'confirm' && !isSubmittingAction
                      ? 'bg-rose-700 hover:bg-rose-800 border-rose-700 text-white shadow-sm active:scale-95 cursor-pointer'
                      : 'bg-neutral-200 dark:bg-slate-800 text-neutral-500 dark:text-slate-500 border-neutral-300 dark:border-slate-700 cursor-not-allowed opacity-60'
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

      {/* Delete Voter Account Confirmation Modal */}
      {voterToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-neutral-900 dark:text-slate-100">
            <button
              onClick={() => setVoterToDelete(null)}
              className="absolute top-4 right-4 text-neutral-700 dark:text-slate-300 hover:text-black dark:hover:text-white font-extrabold text-sm"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-rose-800 dark:text-rose-300" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-slate-100">Delete Student Voter Account</h3>
                <p className="text-xs text-rose-800 dark:text-rose-400 font-extrabold">Account Duplication Cleanup</p>
              </div>
            </div>

            <p className="text-xs text-neutral-800 dark:text-slate-200 font-bold leading-relaxed mb-4">
              Are you sure you want to permanently delete the voter record for <strong className="text-black dark:text-white">{voterToDelete.name}</strong> (<span className="text-rose-800 dark:text-rose-400 font-mono">{voterToDelete.email || voterToDelete.studentId || voterToDelete.id}</span>)?
              <br /><br />
              This will remove their registration record and any associated votes from the system. This action cannot be undone.
            </p>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setVoterToDelete(null)}
                className="px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-neutral-900 dark:text-slate-100 text-xs font-black transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteVoter}
                disabled={isSubmittingAction}
                className="px-4 py-2 rounded-2xl text-xs font-black flex items-center space-x-2 transition-all bg-rose-700 hover:bg-rose-800 border border-rose-700 text-white shadow-sm active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSubmittingAction ? 'Deleting...' : 'Delete Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Voter Accounts Confirmation Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-neutral-900 dark:text-slate-100">
            <button
              onClick={() => {
                setShowClearAllModal(false);
                setClearAllConfirmInput('');
                setClearAllError(null);
              }}
              className="absolute top-4 right-4 text-neutral-700 dark:text-slate-300 hover:text-black dark:hover:text-white font-extrabold text-sm"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-rose-800 dark:text-rose-300" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-slate-100">Clear All Voter Accounts</h3>
                <p className="text-xs text-rose-800 dark:text-rose-400 font-extrabold">Batch Ledger Cleanup • Permanent Action</p>
              </div>
            </div>

            <p className="text-xs text-neutral-800 dark:text-slate-200 font-bold leading-relaxed mb-4">
              This action will permanently delete and wipe all <strong className="text-rose-800 dark:text-rose-400">{votersList.length} registered student voter accounts</strong> from the audit ledger and reset associated voting data.
              <br /><br />
              <span className="text-neutral-600 dark:text-slate-400 font-medium">Candidate profiles, positions, and operational election settings will remain intact.</span>
            </p>

            {clearAllError && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-black flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-800 dark:text-rose-300" />
                <span>{clearAllError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-neutral-900 dark:text-slate-200 mb-1.5">
                  To confirm clearing all accounts, please type <span className="font-mono text-rose-800 dark:text-rose-300 font-extrabold bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">Confirm</span> below:
                </label>
                <input
                  type="text"
                  value={clearAllConfirmInput}
                  onChange={(e) => {
                    setClearAllConfirmInput(e.target.value);
                    if (clearAllError) setClearAllError(null);
                  }}
                  placeholder="Type Confirm to delete"
                  autoFocus
                  className="w-full bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-neutral-900 dark:text-slate-100 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowClearAllModal(false);
                    setClearAllConfirmInput('');
                    setClearAllError(null);
                  }}
                  className="px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-neutral-900 dark:text-slate-100 text-xs font-black transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeClearAllVoters}
                  disabled={
                    (clearAllConfirmInput.trim().toLowerCase() !== 'confirm' &&
                     clearAllConfirmInput.trim().toLowerCase() !== 'confirm to delete' &&
                     clearAllConfirmInput.trim().toLowerCase() !== 'clear') ||
                    isSubmittingAction
                  }
                  className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center space-x-2 transition-all border ${
                    (clearAllConfirmInput.trim().toLowerCase() === 'confirm' ||
                     clearAllConfirmInput.trim().toLowerCase() === 'confirm to delete' ||
                     clearAllConfirmInput.trim().toLowerCase() === 'clear') &&
                    !isSubmittingAction
                      ? 'bg-rose-700 hover:bg-rose-800 border-rose-700 text-white shadow-sm active:scale-95 cursor-pointer'
                      : 'bg-neutral-200 dark:bg-slate-800 text-neutral-500 dark:text-slate-500 border-neutral-300 dark:border-slate-700 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isSubmittingAction ? 'Clearing All Accounts...' : `Clear All (${votersList.length}) Accounts`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Selected Accounts Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-neutral-900 dark:text-slate-100">
            <button
              onClick={() => setShowBulkDeleteModal(false)}
              className="absolute top-4 right-4 text-neutral-700 dark:text-slate-300 hover:text-black dark:hover:text-white font-extrabold text-sm"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-rose-800 dark:text-rose-300" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-slate-100">Delete Selected Voter Accounts</h3>
                <p className="text-xs text-rose-800 dark:text-rose-400 font-extrabold">Bulk Account Deletion</p>
              </div>
            </div>

            <p className="text-xs text-neutral-800 dark:text-slate-200 font-bold leading-relaxed mb-4">
              Are you sure you want to permanently delete the <strong className="text-rose-800 dark:text-rose-400">{selectedVoterIds.length} selected student accounts</strong> and their associated election records?
              <br /><br />
              This action will remove them from the ledger and cannot be undone.
            </p>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-neutral-900 dark:text-slate-100 text-xs font-black transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeBulkDeleteVoters}
                disabled={isSubmittingAction}
                className="px-4 py-2 rounded-2xl text-xs font-black flex items-center space-x-2 transition-all bg-rose-700 hover:bg-rose-800 border border-rose-700 text-white shadow-sm active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSubmittingAction ? 'Deleting...' : `Delete ${selectedVoterIds.length} Accounts`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Voter Profile Edit Modal */}
      {editingVoter && (
        <UserProfileModal
          isOpen={!!editingVoter}
          onClose={() => setEditingVoter(null)}
          voter={editingVoter}
          onProfileUpdated={(updated) => {
            setEditingVoter(null);
            fetchVoters();
            onRefreshData();
            setSuccessMsg(`Personal information for ${updated.name} has been updated.`);
            setTimeout(() => setSuccessMsg(null), 4000);
          }}
        />
      )}
    </div>
  );
};
