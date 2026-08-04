import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { BallotStation } from './components/BallotStation';
import { LiveResults } from './components/LiveResults';
import { ReceiptVerifier } from './components/ReceiptVerifier';
import { AdminPanel } from './components/AdminPanel';
import { VoterAuthModal } from './components/VoterAuthModal';
import { BallotConfirmationModal } from './components/BallotConfirmationModal';
import { VoteReceiptModal } from './components/VoteReceiptModal';
import { TermsPrivacyModal } from './components/TermsPrivacyModal';
import { Position, Candidate, Voter, VoteChoices, ElectionSettings } from './types';
import { INITIAL_ELECTION_SETTINGS, INITIAL_POSITIONS, INITIAL_CANDIDATES } from './data/initialData';
import { loadElectionDataFromFirestore, subscribeToElectionData } from './lib/firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'ballot' | 'results' | 'verify' | 'admin'>(() => {
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
  const [positions, setPositions] = useState<Position[]>(INITIAL_POSITIONS);
  const [candidates, setCandidates] = useState<Candidate[]>(INITIAL_CANDIDATES);
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

  // Terms & Privacy Modal State
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [termsModalTab, setTermsModalTab] = useState<'terms' | 'privacy'>('terms');

  const openTermsPrivacy = (tab: 'terms' | 'privacy' = 'terms') => {
    setTermsModalTab(tab);
    setIsTermsModalOpen(true);
  };

  // Fetch Candidates & Election Info
  const fetchData = async () => {
    try {
      const resCand = await fetch('/api/election/candidates');
      if (resCand.ok && resCand.headers.get('content-type')?.includes('application/json')) {
        const dataCand = await resCand.json();
        if (dataCand.positions && dataCand.positions.length > 0) setPositions(dataCand.positions);
        if (dataCand.candidates) setCandidates(dataCand.candidates);
      }

      const resInfo = await fetch('/api/election/info');
      if (resInfo.ok && resInfo.headers.get('content-type')?.includes('application/json')) {
        const dataInfo = await resInfo.json();
        if (dataInfo.settings) setSettings(dataInfo.settings);
      }
    } catch {
      // API fallback handled by Firestore direct subscription
    }

    const fsData = await loadElectionDataFromFirestore();
    if (fsData) {
      if (fsData.positions && fsData.positions.length > 0) setPositions(fsData.positions);
      if (fsData.candidates) setCandidates(fsData.candidates);
      if (fsData.settings) setSettings(fsData.settings);
    }
  };

  useEffect(() => {
    fetchData();

    // Direct Firestore real-time listener for candidate & election data across all environments
    const unsubscribe = subscribeToElectionData((data) => {
      if (data) {
        if (Array.isArray(data.positions) && data.positions.length > 0) setPositions(data.positions);
        if (Array.isArray(data.candidates)) setCandidates(data.candidates);
        if (data.settings) setSettings(data.settings);

        if (Array.isArray(data.voters)) {
          setVoter((prevVoter) => {
            if (!prevVoter) return prevVoter;
            const normName = prevVoter.name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
            const match = data.voters.find(
              (v: Voter) =>
                v.id.toUpperCase() === prevVoter.id.toUpperCase() ||
                (v.email && prevVoter.email && v.email.toLowerCase() === prevVoter.email.toLowerCase()) ||
                (normName.length > 2 && v.name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ') === normName)
            );
            if (match) {
              const hasVoted = Boolean(match.hasVoted);
              const isInvalidated = Boolean(match.isInvalidated);
              if (
                prevVoter.hasVoted !== hasVoted ||
                prevVoter.receiptHash !== match.receiptHash ||
                prevVoter.isInvalidated !== isInvalidated
              ) {
                const updated: Voter = {
                  ...prevVoter,
                  hasVoted,
                  votedAt: match.votedAt,
                  receiptHash: match.receiptHash,
                  isInvalidated,
                  invalidatedReason: match.invalidatedReason,
                  invalidatedAt: match.invalidatedAt,
                };
                localStorage.setItem('cpe_voter', JSON.stringify(updated));
                return updated;
              }
            }
            return prevVoter;
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const isAdminUser = voter?.email?.toLowerCase() === 'bamuyahacksie@gmail.com';
    if ((activeTab === 'admin' || activeTab === 'results') && !isAdminUser) {
      setActiveTab('ballot');
      if (!voter) {
        setIsAuthModalOpen(true);
      }
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
    setIsAuthModalOpen(false);
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

  const handleCastSuccess = (receiptHash: string, timestamp: string, serverVoter?: Voter) => {
    setLastReceiptHash(receiptHash);
    setLastReceiptTime(timestamp);

    // Update local voter state
    const targetVoter = serverVoter || voter;
    if (targetVoter) {
      const updatedVoter: Voter = {
        ...targetVoter,
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
        onOpenTermsPrivacy={openTermsPrivacy}
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

        {activeTab === 'results' && voter?.email?.toLowerCase() === 'bamuyahacksie@gmail.com' && <LiveResults settings={settings} />}

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
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center text-center">
          <div>
            <p className="font-semibold text-slate-300">
              Computer Engineering Department Commission on Elections &copy; 2026
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Official Institutional Voting System • Cryptographic Ledger Verification
            </p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <VoterAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        preventClose={!voter}
        onOpenTermsPrivacy={openTermsPrivacy}
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

      <TermsPrivacyModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        defaultTab={termsModalTab}
      />
    </div>
  );
}
