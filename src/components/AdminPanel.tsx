import React, { useState } from 'react';
import { Position, Candidate, ElectionSettings } from '../types';
import { Settings, ShieldAlert, Key, RefreshCw, Plus, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

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
  const [adminPin, setAdminPin] = useState('2026CPE');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Status Change State
  const [selectedStatus, setSelectedStatus] = useState<ElectionSettings['status']>(settings.status);

  // New Candidate Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCand, setNewCand] = useState<{
    name: string;
    nickname: string;
    positionId: string;
    party: 'ByteCraft Alliance' | 'Synapse Union' | 'Independent Circuit';
    yearLevel: '1st Year' | '2nd Year' | '3rd Year' | '4th Year';
    platformHeading: string;
    platformPoint1: string;
    platformPoint2: string;
    manifesto: string;
  }>({
    name: '',
    nickname: '',
    positionId: positions[0]?.id || 'pres',
    party: 'ByteCraft Alliance',
    yearLevel: '3rd Year',
    platformHeading: '',
    platformPoint1: '',
    platformPoint2: '',
    manifesto: '',
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
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
    if (!newCand.name || !newCand.platformHeading) {
      setError('Candidate Name and Platform Heading are required.');
      return;
    }

    try {
      const res = await fetch('/api/admin/candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPin,
          candidate: {
            name: newCand.name,
            nickname: newCand.nickname,
            positionId: newCand.positionId,
            party: newCand.party,
            yearLevel: newCand.yearLevel,
            platformHeading: newCand.platformHeading,
            platformPoints: [newCand.platformPoint1, newCand.platformPoint2].filter(Boolean),
            manifesto: newCand.manifesto || 'Dedicated to serving the CPE student body.',
            bio: `${newCand.yearLevel} Computer Engineering student and candidate for ${newCand.party}.`,
            achievements: ['Active CPE Department Member'],
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Candidate ${newCand.name} registered successfully!`);
        setShowAddModal(false);
        onRefreshData();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(data.message);
      }
    } catch {
      setError('Failed to register candidate.');
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
        body: JSON.stringify({ adminPin }),
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
            <p className="text-xs text-slate-400">Restricted Election Control Panel</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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

        <button
          onClick={() => setIsAuthenticated(false)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
        >
          Lock Console
        </button>
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

            <h3 className="text-lg font-bold text-slate-100 mb-4">Register Candidate</h3>

            <form onSubmit={handleAddCandidate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Candidate Full Name</label>
                <input
                  type="text"
                  value={newCand.name}
                  onChange={(e) => setNewCand({ ...newCand, name: e.target.value })}
                  placeholder="e.g. Maria Clara Santos"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Position</label>
                <select
                  value={newCand.positionId}
                  onChange={(e) => setNewCand({ ...newCand, positionId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                >
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Party</label>
                  <select
                    value={newCand.party}
                    onChange={(e) => setNewCand({ ...newCand, party: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                  >
                    <option value="ByteCraft Alliance">ByteCraft Alliance</option>
                    <option value="Synapse Union">Synapse Union</option>
                    <option value="Independent Circuit">Independent Circuit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Year Level</label>
                  <select
                    value={newCand.yearLevel}
                    onChange={(e) => setNewCand({ ...newCand, yearLevel: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Core Platform Heading</label>
                <input
                  type="text"
                  value={newCand.platformHeading}
                  onChange={(e) => setNewCand({ ...newCand, platformHeading: e.target.value })}
                  placeholder="e.g. Free Microcontroller Hardware Kits for All Students"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Platform Point 1</label>
                <input
                  type="text"
                  value={newCand.platformPoint1}
                  onChange={(e) => setNewCand({ ...newCand, platformPoint1: e.target.value })}
                  placeholder="Key initiative..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Manifesto Statement</label>
                <textarea
                  rows={3}
                  value={newCand.manifesto}
                  onChange={(e) => setNewCand({ ...newCand, manifesto: e.target.value })}
                  placeholder="Candidate vision statement..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
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
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold"
                >
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
