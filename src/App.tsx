import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { BallotStation } from './components/BallotStation';
import { CandidateDirectory } from './components/CandidateDirectory';
import { LiveResults } from './components/LiveResults';
import { ReceiptVerifier } from './components/ReceiptVerifier';
import { AdminPanel } from './components/AdminPanel';
import { VoterAuthModal } from './components/VoterAuthModal';
import { BallotConfirmationModal } from './components/BallotConfirmationModal';
import { VoteReceiptModal } from './components/VoteReceiptModal';
import { Position, Candidate, Voter, VoteChoices, ElectionSettings } from './types';
import { INITIAL_ELECTION_SETTINGS } from './data/initialData';

export default function App() {
  const [activeTab, setActiveTab] = useState<'ballot' | 'candidates' | 'results' | 'verify' | 'admin'>(() => {
    const saved = localStorage.getItem('cpe_voter');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.email?.toLowerCase() === 'bamuyahacksie@gmail.com') {
          return 'admin';
        }
      } catch {
        // fallback
      }
    }
    return 'ballot';
  });

  // Server Data
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [settings, setSettings] = useState<ElectionSettings>(INITIAL_ELECTION_SETTINGS);

  // User Auth State
  const [voter, setVoter] = useState<Voter | null>(() => {
    const saved = localStorage.getItem('cpe_voter');
    return saved ? JSON.parse(saved) : null;
  });

  // Ballot Choices State
  const [choices, setChoices] = useState<VoteChoices>({});

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => {
    const saved = localStorage.getItem('cpe_voter');
    return !saved;
  });
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastReceiptHash, setLastReceiptHash] = useState('');
  const [lastReceiptTime, setLastReceiptTime] = useState('');

  // Fetch Candidates & Election Info
  const fetchData = async () => {
    try {
      const resCand = await fetch('/api/election/candidates');
      const dataCand = await resCand.json();
      if (dataCand.positions) setPositions(dataCand.positions);
      if (dataCand.candidates) setCandidates(dataCand.candidates);

      const resInfo = await fetch('/api/election/info');
      const dataInfo = await resInfo.json();
      if (dataInfo.settings) setSettings(dataInfo.settings);
    } catch (err) {
      console.error('Error loading election data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const isAdminUser = voter?.email?.toLowerCase() === 'bamuyahacksie@gmail.com';
    if (voter && !isAdminUser && activeTab !== 'ballot') {
      setActiveTab('ballot');
    }
    if (!voter && activeTab !== 'admin') {
      setIsAuthModalOpen(true);
    }
  }, [voter, activeTab]);

  const handleSelectCandidate = (positionId: string, choiceId: string) => {
    setChoices((prev) => ({
      ...prev,
      [positionId]: choiceId,
    }));
  };

  const handleLoginSuccess = (authenticatedVoter: Voter) => {
    setVoter(authenticatedVoter);
    localStorage.setItem('cpe_voter', JSON.stringify(authenticatedVoter));
    if (authenticatedVoter.email?.toLowerCase() === 'bamuyahacksie@gmail.com') {
      setActiveTab('admin');
    } else {
      setActiveTab('ballot');
    }
  };

  const handleLogout = () => {
    setVoter(null);
    localStorage.removeItem('cpe_voter');
    setChoices({});
    setIsAuthModalOpen(true);
  };

  const handleCastSuccess = (receiptHash: string, timestamp: string) => {
    setLastReceiptHash(receiptHash);
    setLastReceiptTime(timestamp);

    // Update local voter state
    if (voter) {
      const updatedVoter: Voter = {
        ...voter,
        hasVoted: true,
        votedAt: timestamp,
        receiptHash,
      };
      setVoter(updatedVoter);
      localStorage.setItem('cpe_voter', JSON.stringify(updatedVoter));
    }

    setIsReceiptModalOpen(true);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        voter={voter}
        settings={settings}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'ballot' && (
          <BallotStation
            positions={positions}
            candidates={candidates}
            voter={voter}
            settings={settings}
            choices={choices}
            onSelectCandidate={handleSelectCandidate}
            onOpenReview={() => setIsReviewModalOpen(true)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'candidates' && (
          <CandidateDirectory
            positions={positions}
            candidates={candidates}
            onRefreshData={fetchData}
          />
        )}

        {activeTab === 'results' && <LiveResults settings={settings} />}

        {activeTab === 'verify' && <ReceiptVerifier />}

        {activeTab === 'admin' && (
          <AdminPanel
            settings={settings}
            positions={positions}
            candidates={candidates}
            onRefreshData={fetchData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-300">
              Computer Engineering Department Commission on Elections &copy; 2026
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Secure Digital Voting & Cryptographic Ledger Audit System
            </p>
          </div>

          {!voter ? (
            <div className="flex items-center space-x-4 text-slate-400 text-[11px]">
              <button onClick={() => setActiveTab('verify')} className="hover:text-cyan-400">
                Receipt Audit
              </button>
              <span>•</span>
              <button onClick={() => setActiveTab('candidates')} className="hover:text-cyan-400">
                Candidates
              </button>
              <span>•</span>
              <button onClick={() => setIsAuthModalOpen(true)} className="hover:text-cyan-400">
                Voter Portal
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-cyan-400 font-semibold tracking-wide">
              🔒 Student Voting Portal • Official Ballot Station
            </div>
          )}
        </div>
      </footer>

      {/* Modals */}
      <VoterAuthModal
        isOpen={isAuthModalOpen && activeTab !== 'admin'}
        onClose={() => {
          if (voter) {
            setIsAuthModalOpen(false);
          }
        }}
        onLoginSuccess={handleLoginSuccess}
        preventClose={!voter}
        onSwitchToAdmin={() => {
          setActiveTab('admin');
          setIsAuthModalOpen(false);
        }}
      />

      {voter && (
        <BallotConfirmationModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          positions={positions}
          candidates={candidates}
          voter={voter}
          choices={choices}
          onCastSuccess={handleCastSuccess}
        />
      )}

      <VoteReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receiptHash={lastReceiptHash}
        timestamp={lastReceiptTime}
        onViewResults={() => setActiveTab('results')}
        isVoterLoggedIn={!!voter}
      />
    </div>
  );
}
