import React, { useState } from 'react';
import { Position, Candidate, ElectionSettings } from '../types';
import { Settings, ShieldAlert, Key, RefreshCw, Plus, CheckCircle2, AlertCircle, FileText, Camera, Link, Trash2, Image, Pencil, Download } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';
import { generateElectionPDF } from '../utils/pdfGenerator';

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
    yearLevel: '1st Year' | '2nd Year' | '3rd Year' | '4th Year';
    description: string;
    avatarUrl: string;
  }>({
    name: '',
    yearLevel: '3rd Year',
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
      const data = await res.json();
      if (data.success) {
        setSelectedStatus(newStatus);
        setSuccessMsg(`Election Status successfully updated to ${newStatus}`);
        onRefreshData();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(data.message);
      }
    } catch {
      setError('Error updating election status.');
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCand.name.trim() || !newCand.description.trim()) {
      setError('Full Name and Brief Description are required.');
      return;
    }

    try {
      const res = await fetch('/api/admin/candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          adminPin,
          candidate: {
            name: newCand.name.trim(),
            positionId: positions[0]?.id || 'gov',
            party: 'Independent Circuit',
            yearLevel: newCand.yearLevel,
            avatarUrl: newCand.avatarUrl.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
            platformHeading: newCand.description.trim(),
            platformPoints: [newCand.description.trim(), 'Dedicated to serving Computer Engineering students.'],
            manifesto: newCand.description.trim(),
            bio: `${newCand.yearLevel} Computer Engineering candidate. ${newCand.description.trim()}`,
            achievements: ['CPE Registered Candidate 2026'],
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Candidate ${newCand.name} registered successfully!`);
        setShowAddModal(false);
        setNewCand({
          name: '',
          yearLevel: '3rd Year',
          description: '',
          avatarUrl: '',
        });
        onRefreshData();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(data.message);
      }
    } catch {
      setError('Failed to register candidate.');
    }
  };

  const handleUpdatePhoto = async (candidate: Candidate) => {
    const updatedUrl = photoUrls[candidate.id];
    if (updatedUrl === undefined) return;

    setSavingPhotoId(candidate.id);
    try {
      const res = await fetch('/api/admin/candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          adminPin,
          candidate: {
            ...candidate,
            avatarUrl: updatedUrl.trim() || candidate.avatarUrl,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Profile photo updated for ${candidate.name}!`);
        onRefreshData();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(data.message || 'Failed to update photo.');
      }
    } catch {
      setError('Error updating candidate photo.');
    } finally {
      setSavingPhotoId(null);
    }
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
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Candidate ${candidateName} removed.`);
        onRefreshData();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(data.message || 'Failed to delete candidate.');
      }
    } catch {
      setError('Error deleting candidate.');
    }
  };

  const handleSaveEditCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCandidate) return;

    try {
      const res = await fetch('/api/admin/candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          adminPin,
          candidate: editingCandidate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Candidate ${editingCandidate.name} updated successfully!`);
        setEditingCandidate(null);
        onRefreshData();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(data.message || 'Failed to update candidate info.');
      }
    } catch {
      setError('Error updating candidate details.');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await fetch('/api/election/results');
      const data = await res.json();
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
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Election data successfully reset to clean default state.');
        onRefreshData();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch {
      setError('Failed to reset demo.');
    }
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
              onClick={handleResetDemo}
              className="w-full bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 font-bold p-3 rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset Election Data to Sample State</span>
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
                        {positions.find((p) => p.id === cand.positionId)?.title || 'Candidate'}
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
                <label className="block text-slate-300 font-semibold mb-1">School Year</label>
                <select
                  value={editingCandidate.bio.includes('1st Year') ? '1st Year' : editingCandidate.bio.includes('2nd Year') ? '2nd Year' : editingCandidate.bio.includes('4th Year') ? '4th Year' : '3rd Year'}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, bio: `${e.target.value} Computer Engineering candidate. ${editingCandidate.manifesto || ''}` })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-medium focus:outline-none focus:border-cyan-500"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>

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
    </div>
  );
};
