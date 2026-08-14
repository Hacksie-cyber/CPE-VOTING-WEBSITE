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
import { UserProfileModal } from './components/UserProfileModal';
import { Position, Candidate, Voter, VoteChoices, ElectionSettings } from './types';
import { INITIAL_ELECTION_SETTINGS, INITIAL_POSITIONS, INITIAL_CANDIDATES } from './data/initialData';
import { loadElectionDataFromFirestore, subscribeToElectionData } from './lib/firebase';

export default function App() {
  // Theme State (Light vs Dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('cpe_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('cpe_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

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

  // User Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const openTermsPrivacy = (tab: 'terms' | 'privacy' = 'terms') => {
    setTermsModalTab(tab);
    setIsTermsModalOpen(true);
  };

  const handleProfileUpdated = (updatedVoter: Voter) => {
    setVoter(updatedVoter);
    localStorage.setItem('cpe_voter', JSON.stringify(updatedVoter));
    fetchData();
  };

  // Helper to synchronize voter state and resolve any stale 'Ballot Submitted' flags
  const syncVoterStateFromElectionData = (data: any, currentVoter: Voter | null): Voter | null => {
    if (!currentVoter) return null;
    const currentVotes = Array.isArray(data?.votes) ? data.votes : [];
    const currentVoters = Array.isArray(data?.voters) ? data.voters : [];

    // If total votes in election is 0 (e.g. after election vote reset), clear voting status
    if (currentVotes.length === 0) {
      if (currentVoter.hasVoted || currentVoter.receiptHash || currentVoter.votedAt || currentVoter.isInvalidated) {
        const updated: Voter = {
          ...currentVoter,
          hasVoted: false,
          receiptHash: undefined,
          votedAt: undefined,
          isInvalidated: false,
          invalidatedReason: undefined,
          invalidatedAt: undefined,
        };
        localStorage.setItem('cpe_voter', JSON.stringify(updated));
        return updated;
      }
      return currentVoter;
    }

    // Match voter in database roster
    const normName = currentVoter.name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
    const match = currentVoters.find(
      (v: Voter) =>
        v.id.toUpperCase() === currentVoter.id.toUpperCase() ||
        (v.email && currentVoter.email && v.email.toLowerCase() === currentVoter.email.toLowerCase()) ||
        (normName.length > 2 && v.name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ') === normName)
    );

    // Verify if voter actually has a recorded ballot in active votes
    const hasActualVote = currentVotes.some(
      (vt: any) =>
        (currentVoter.receiptHash && vt.receiptHash?.toUpperCase() === currentVoter.receiptHash.toUpperCase()) ||
        (currentVoter.id && vt.voterId?.toUpperCase() === currentVoter.id.toUpperCase())
    );

    const actualHasVoted = hasActualVote || (match ? Boolean(match.hasVoted) : false);
    const isInvalidated = match ? Boolean(match.isInvalidated) : Boolean(currentVoter.isInvalidated);

    if (
      currentVoter.hasVoted !== actualHasVoted ||
      (match && currentVoter.receiptHash !== match.receiptHash) ||
      currentVoter.isInvalidated !== isInvalidated ||
      (match && currentVoter.name !== match.name && !match.name.startsWith('CPE Student'))
    ) {
      const updated: Voter = {
        ...currentVoter,
        name: match && !match.name.startsWith('CPE Student') ? match.name : currentVoter.name,
        studentNumber: match?.studentNumber || match?.id || currentVoter.studentNumber,
        course: match?.course || currentVoter.course,
        yearLevel: match?.yearLevel || currentVoter.yearLevel,
        hasVoted: actualHasVoted,
        votedAt: match?.votedAt || (actualHasVoted ? currentVoter.votedAt : undefined),
        receiptHash: match?.receiptHash || (actualHasVoted ? currentVoter.receiptHash : undefined),
        isInvalidated,
        invalidatedReason: match?.invalidatedReason || currentVoter.invalidatedReason,
        invalidatedAt: match?.invalidatedAt || currentVoter.invalidatedAt,
      };
      localStorage.setItem('cpe_voter', JSON.stringify(updated));
      return updated;
    }

    return currentVoter;
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
      setVoter((prevVoter) => syncVoterStateFromElectionData(fsData, prevVoter));
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

        setVoter((prevVoter) => syncVoterStateFromElectionData(data, prevVoter));
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
    <div className="min-h-screen bg-neutral-100 dark:bg-slate-950 text-neutral-900 dark:text-slate-100 flex flex-col font-sans selection:bg-rose-700 selection:text-white transition-colors">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        voter={voter}
        settings={settings}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenTermsPrivacy={openTermsPrivacy}
        theme={theme}
        onToggleTheme={toggleTheme}
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
            onOpenProfile={() => setIsProfileModalOpen(true)}
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
      <footer className="bg-neutral-900 border-t-2 border-black text-neutral-200 py-6 text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center text-center">
          <div>
            <p className="font-bold text-white tracking-wide">
              Computer Engineering Department Commission on Elections &copy; 2026
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
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
        settings={settings}
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

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        voter={voter}
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
}
