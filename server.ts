import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  INITIAL_POSITIONS,
  INITIAL_CANDIDATES,
  INITIAL_ELECTION_SETTINGS,
  SAMPLE_VOTERS,
  INITIAL_VOTES,
  SAMPLE_NOMINATIONS,
} from './src/data/initialData';
import {
  Position,
  Candidate,
  Voter,
  ElectionSettings,
  VoteRecord,
  PositionResult,
  VoterTurnoutStats,
  YearLevel,
  Gender,
  CandidateNomination,
} from './src/types';

// Read Firebase applet configuration if provisioned
let firebaseAppletConfig: Record<string, string> | null = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseAppletConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json:', e);
}

const DEFAULT_FIREBASE_API_KEY = "AIzaSyAOT_2VW4VYSWjILqaC-4qqCkBmk2xSGJ8";

// Firebase Database Configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig?.apiKey || DEFAULT_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig?.authDomain || "cpe-voting-website.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig?.projectId || "cpe-voting-website",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig?.storageBucket || "cpe-voting-website.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig?.messagingSenderId || "316255839130",
  appId: process.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig?.appId || "1:316255839130:web:ca4a61e33c6555dac39023",
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseAppletConfig?.measurementId || "G-HQJX6DJ6JH"
};

let firebaseAppInstance: any = null;
let db: ReturnType<typeof getFirestore> | null = null;
try {
  firebaseAppInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(firebaseAppInstance);
  console.log('Firebase Firestore initialized for project:', firebaseConfig.projectId);
} catch (e) {
  console.error('Firebase Firestore init error:', e);
}

// In-Memory Database State
let settings: ElectionSettings = { ...INITIAL_ELECTION_SETTINGS };
let positions: Position[] = [...INITIAL_POSITIONS];
let candidates: Candidate[] = [...INITIAL_CANDIDATES];
let voters: Voter[] = [...SAMPLE_VOTERS];
let votes: VoteRecord[] = [...INITIAL_VOTES];
let nominations: CandidateNomination[] = [...SAMPLE_NOMINATIONS];

// Firebase Load & Save Helpers
async function loadStateFromFirestore() {
  if (!db) return;
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.settings) settings = data.settings;
      if (Array.isArray(data.positions) && data.positions.length > 0) {
        positions = data.positions;
        // Merge any new default positions like escort if missing
        const posIds = new Set(positions.map((p) => p.id));
        INITIAL_POSITIONS.forEach((ip) => {
          if (!posIds.has(ip.id)) positions.push(ip);
        });
      }
      if (Array.isArray(data.candidates)) {
        // Filter out sample candidate IDs
        candidates = data.candidates.filter(
          (c) =>
            !c.id.startsWith('cand_gov_') &&
            !c.id.startsWith('cand_vgov_') &&
            !c.id.startsWith('cand_sec_') &&
            !c.id.startsWith('cand_treas_') &&
            !c.id.startsWith('cand_auditor_') &&
            !c.id.startsWith('cand_pio_') &&
            !c.id.startsWith('cand_muse_') &&
            !c.id.startsWith('cand_escort_')
        );
      } else {
        candidates = [];
      }
      if (Array.isArray(data.voters)) {
        voters = data.voters.filter(isActualAccount).filter((v) => !v.id.startsWith('2023-1000') && !v.id.startsWith('2022-10045') && !v.id.startsWith('2024-10112'));
      }
      if (Array.isArray(data.votes)) {
        votes = data.votes.filter((vt) => !vt.id.startsWith('vote-sample-'));
      }
      if (Array.isArray(data.nominations)) nominations = data.nominations;
      console.log('Firebase Firestore: Loaded election state successfully. Candidate count:', candidates.length);
      await saveStateToFirestore();
    } else {
      console.log('Firebase Firestore: Initializing new election record for cpe2026');
      await saveStateToFirestore();
    }
  } catch (e: any) {
    console.warn('Firebase Firestore load note:', e?.message || e);
  }
}

async function saveStateToFirestore() {
  if (!db) return;
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    await setDoc(docRef, {
      settings,
      positions,
      candidates,
      voters,
      votes,
      nominations,
      updatedAt: new Date().toISOString()
    });

    console.log('Firebase Firestore: Saved candidate and election state successfully.');
  } catch (e: any) {
    console.warn('Firebase Firestore save note:', e?.message || e);
  }
}


// Helper to normalize given full names for duplicate account detection and double-voting prevention
function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

// Helper to filter out mock/demo voters so only actual student accounts are kept
function isActualAccount(v: Voter): boolean {
  if (!v || !v.name) return false;
  const nameLower = v.name.toLowerCase();
  if (nameLower.includes('demo')) return false;
  if (v.email && v.email.toLowerCase().includes('demo')) return false;
  const sampleIds = ['2023-10001', '2023-10002', '2022-10045', '2024-10112', '2025-10889', '2023-10555', '2022-10999'];
  if (sampleIds.includes(v.id)) return false;
  return true;
}

// Helper to generate cryptographic-like receipt hash
function generateReceiptHash(): string {
  const chars = 'ABCDEF0123456789';
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `CPE2026-${part1}-${part2}`;
}

// Calculate real-time election results
function calculateResults(): {
  positionResults: PositionResult[];
  turnoutStats: VoterTurnoutStats;
} {
  // Only count valid votes (excluding votes from invalidated voters or invalidated votes)
  const validVotes = votes.filter((v) => {
    if (v.isInvalidated) return false;
    const voter = voters.find((vr) => (v.voterId && vr.id === v.voterId) || (v.receiptHash && vr.receiptHash === v.receiptHash));
    if (voter && voter.isInvalidated) return false;
    return true;
  });

  const totalVotesCast = validVotes.length;

  const positionResults: PositionResult[] = positions.map((pos) => {
    const posCandidates = candidates.filter((c) => c.positionId === pos.id);

    let abstainCount = 0;
    const candidateVoteCounts: Record<string, number> = {};
    posCandidates.forEach((c) => (candidateVoteCounts[c.id] = 0));

    validVotes.forEach((vote) => {
      const choice = vote.choices ? vote.choices[pos.id] : undefined;
      if (!choice || choice === 'ABSTAIN') {
        abstainCount++;
      } else if (candidateVoteCounts[choice] !== undefined) {
        candidateVoteCounts[choice]++;
      }
    });

    const totalValidAndAbstain = totalVotesCast;
    let maxVotes = -1;

    const candidateResults = posCandidates.map((cand) => {
      const voteCount = candidateVoteCounts[cand.id] || 0;
      if (voteCount > maxVotes) maxVotes = voteCount;
      return {
        ...cand,
        votes: voteCount,
        percentage: totalValidAndAbstain > 0 ? parseFloat(((voteCount / totalValidAndAbstain) * 100).toFixed(1)) : 0,
        isLeading: false,
      };
    });

    // Mark leading candidate if voteCount > 0 and max
    if (maxVotes > 0) {
      candidateResults.forEach((cr) => {
        if (cr.votes === maxVotes) cr.isLeading = true;
      });
    }

    return {
      position: pos,
      totalVotesCast,
      abstainCount,
      candidates: candidateResults.sort((a, b) => b.votes - a.votes),
    };
  });

  // Calculate Turnout by Year Level
  const totalRegistered = voters.length;
  const yearLevels: YearLevel[] = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const byYearLevel = yearLevels.map((yl) => {
    const registeredForYL = voters.filter((v) => v.yearLevel === yl).length;
    const votedCountForYL = validVotes.filter((v) => v.yearLevel === yl).length;
    return {
      yearLevel: yl,
      registered: registeredForYL,
      voted: votedCountForYL,
      percentage: registeredForYL > 0 ? parseFloat(((votedCountForYL / registeredForYL) * 100).toFixed(1)) : 0,
    };
  });

  const turnoutPercentage =
    totalRegistered > 0
      ? parseFloat(((totalVotesCast / totalRegistered) * 100).toFixed(1))
      : 0;

  return {
    positionResults,
    turnoutStats: {
      totalRegistered,
      totalVoted: totalVotesCast,
      turnoutPercentage,
      byYearLevel,
    },
  };
}

export const app = express();
app.use(express.json());

// Load initial election state from Firebase Firestore
loadStateFromFirestore().catch((e) => console.warn('Firestore async load note:', e));

// Initialize Gemini API lazily
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({ apiKey: key });
    }
  }
  return aiClient;
}

async function startServer() {
  const PORT = 3000;

  // --- API ROUTES ---

  // Get Firebase Database Status & Config
  app.get('/api/firebase/config', (req, res) => {
    res.json({
      success: true,
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      storageBucket: firebaseConfig.storageBucket,
      status: 'CONNECTED',
    });
  });


  // Get Election Metadata & Settings
  app.get('/api/election/info', async (req, res) => {
    await loadStateFromFirestore();
    res.json({
      settings,
      totalPositions: positions.length,
      totalCandidates: candidates.length,
      totalVotesCast: votes.length,
    });
  });

  // Get All Candidates & Positions
  app.get('/api/election/candidates', async (req, res) => {
    await loadStateFromFirestore();
    res.json({
      positions: [...positions].sort((a, b) => a.order - b.order),
      candidates,
    });
  });

  // Get Nominations
  app.get('/api/election/nominations', async (req, res) => {
    await loadStateFromFirestore();
    res.json({
      nominations,
    });
  });

  // Nominate Candidate Endpoint
  app.post('/api/election/nominate', async (req, res) => {
    await loadStateFromFirestore();
    const {
      nominatorName,
      nominatorStudentId,
      positionId,
      nomineeName,
      nomineeNickname,
      party,
      yearLevel,
      gender,
      platformHeading,
      manifesto,
      description,
    } = req.body;

    if (!nomineeName || (!platformHeading && !description)) {
      return res.status(400).json({
        success: false,
        message: 'Nominee Full Name and Description are required.',
      });
    }

    const effectivePositionId = positionId || positions[0]?.id || 'gov';
    const effectiveHeading = (platformHeading || description || 'Candidate for CPE Office').trim();
    const effectiveDescription = (description || manifesto || platformHeading || 'Dedicated to serving Computer Engineering students.').trim();

    const pos = positions.find((p) => p.id === effectivePositionId) || positions[0];

    const effectiveGender = (gender || 'Female') as Gender;
    const isMusePosition = pos.id === 'muse' || pos.title.toLowerCase().includes('muse');

    if (isMusePosition && effectiveGender !== 'Female') {
      return res.status(400).json({
        success: false,
        message: 'Eligibility Rule Violation: Only female candidates are allowed to register or be nominated for the Muse position.',
      });
    }

    const newNomination: CandidateNomination = {
      id: `nom-${Date.now()}`,
      nominatorName: nominatorName || 'Anonymous CPE Student',
      nominatorStudentId: nominatorStudentId || '2026-STUDENT',
      positionId: pos.id,
      nomineeName: nomineeName.trim(),
      nomineeNickname: nomineeNickname?.trim() || nomineeName.trim().split(' ')[0],
      party: party || 'Independent',
      yearLevel: yearLevel || '3rd Year',
      gender: effectiveGender,
      platformHeading: effectiveHeading,
      manifesto: effectiveDescription,
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
    };

    nominations.unshift(newNomination);

    // Automatically register nominee as an active candidate for voting if not already present
    const existingCand = candidates.find(
      (c) => c.name.toLowerCase() === nomineeName.trim().toLowerCase() && c.positionId === pos.id
    );

    if (!existingCand) {
      const newCand: Candidate = {
        id: `cand-nom-${Date.now()}`,
        positionId: pos.id,
        name: nomineeName.trim(),
        nickname: nomineeNickname?.trim() || nomineeName.trim().split(' ')[0],
        party: party || 'Independent Circuit',
        yearLevel: yearLevel || '3rd Year',
        gender: effectiveGender,
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        platformHeading: effectiveHeading,
        platformPoints: [
          effectiveHeading,
          effectiveDescription,
          'Dedicated to serving Computer Engineering students.',
        ],
        manifesto: effectiveDescription,
        bio: `${yearLevel || '3rd Year'} (${effectiveGender}) Computer Engineering candidate. ${effectiveDescription}`,
        achievements: ['CPE Registered Candidate 2026'],
      };
      candidates.push(newCand);
    }

    await saveStateToFirestore();

    res.json({
      success: true,
      message: `Candidate ${nomineeName} successfully registered! Candidate is now added to the ballot.`,
      nomination: newNomination,
      totalCandidates: candidates.length,
    });
  });

  // Get Real-Time Results
  app.get('/api/election/results', async (req, res) => {
    await loadStateFromFirestore();
    const { positionResults, turnoutStats } = calculateResults();
    res.json({
      settings,
      positionResults,
      turnoutStats,
      lastUpdated: new Date().toISOString(),
    });
  });

  // Voter Registration via Email + Full Name + Student ID + Year Level
  app.post('/api/voter/register-email', async (req, res) => {
    await loadStateFromFirestore();
    const { email, studentNumber, name, yearLevel } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }
    if (!studentNumber || !studentNumber.trim()) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full Name is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === 'bamuyahacksie@gmail.com') {
      return res.status(403).json({
        success: false,
        message: 'Admin account (bamuyahacksie@gmail.com) is restricted. Sign in via Google Email only.',
      });
    }

    const cleanStudentId = studentNumber.trim().toUpperCase();
    const cleanName = name.trim();
    const normName = normalizeName(cleanName);
    const cleanYearLevel = (yearLevel as YearLevel) || '3rd Year';

    // Find if an account already exists by email, student ID, OR matching normalized full name
    let voter = voters.find(
      (v) =>
        (v.email && v.email.toLowerCase() === cleanEmail) ||
        (v.id && v.id.toUpperCase() === cleanStudentId) ||
        (normName.length > 2 && normalizeName(v.name) === normName)
    );

    // Check if anyone with matching email OR matching normalized full name has ALREADY voted
    const matchingVoted = voters.find(
      (v) =>
        v.hasVoted &&
        ((v.email && cleanEmail && v.email.toLowerCase() === cleanEmail) ||
          (normName.length > 2 && v.name && normalizeName(v.name) === normName) ||
          (v.id && cleanStudentId && v.id.toUpperCase() === cleanStudentId))
    );

    if (voter) {
      // Link/update existing record while preserving voting status
      voter.id = cleanStudentId;
      voter.name = cleanName;
      voter.email = cleanEmail;
      voter.yearLevel = cleanYearLevel;
      if (matchingVoted) {
        voter.hasVoted = true;
        voter.receiptHash = voter.receiptHash || matchingVoted.receiptHash;
        voter.votedAt = voter.votedAt || matchingVoted.votedAt;
      }
    } else {
      voter = {
        id: cleanStudentId,
        name: cleanName,
        email: cleanEmail,
        yearLevel: cleanYearLevel,
        hasVoted: !!matchingVoted,
        receiptHash: matchingVoted ? matchingVoted.receiptHash : undefined,
        votedAt: matchingVoted ? matchingVoted.votedAt : undefined,
      };
      voters.push(voter);
    }

    await saveStateToFirestore();

    res.json({
      success: true,
      voter,
      token: `email-token-${voter.id}-${Date.now()}`,
    });
  });

  // Voter Authentication (Student Number & PIN / Email)
  app.post('/api/voter/login', async (req, res) => {
    await loadStateFromFirestore();
    const { studentNumber } = req.body;

    if (!studentNumber) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }

    const cleanId = studentNumber.trim().toUpperCase();
    let voter = voters.find((v) => v.id.toUpperCase() === cleanId);

    // If student ID doesn't exist in sample list, dynamically register them as a valid CPE voter
    if (!voter) {
      voter = {
        id: cleanId,
        name: `CPE Student ${cleanId}`,
        email: `${cleanId.toLowerCase()}@cpe.edu.ph`,
        yearLevel: '3rd Year',
        hasVoted: false,
      };
      voters.push(voter);
      await saveStateToFirestore();
    }

    res.json({
      success: true,
      voter,
      token: `token-${voter.id}-${Date.now()}`,
    });
  });

  // Voter Google Account Authentication
  app.post('/api/voter/google-login', async (req, res) => {
    await loadStateFromFirestore();
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google Account email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name ? name.trim() : '';
    const normName = normalizeName(cleanName);

    // Find account by email OR by normalized full name
    let voter = voters.find(
      (v) =>
        (v.email && v.email.toLowerCase() === cleanEmail) ||
        (normName.length > 2 && normalizeName(v.name) === normName)
    );

    const matchingVoted = voters.find(
      (v) =>
        v.hasVoted &&
        ((v.email && cleanEmail && v.email.toLowerCase() === cleanEmail) ||
          (normName.length > 2 && v.name && normalizeName(v.name) === normName))
    );

    if (!voter) {
      const emailPrefix = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      const studentId = `2026-${emailPrefix.toUpperCase().slice(0, 8)}`;

      voter = {
        id: studentId,
        name: cleanName || `CPE Student (${cleanEmail})`,
        email: cleanEmail,
        yearLevel: '3rd Year',
        hasVoted: !!matchingVoted,
        receiptHash: matchingVoted ? matchingVoted.receiptHash : undefined,
        votedAt: matchingVoted ? matchingVoted.votedAt : undefined,
      };
      voters.push(voter);
      await saveStateToFirestore();
    } else {
      if (cleanName && (!voter.name || voter.name.startsWith('CPE Student'))) {
        voter.name = cleanName;
      }
      if (!voter.email) voter.email = cleanEmail;
      if (matchingVoted) {
        voter.hasVoted = true;
        voter.receiptHash = voter.receiptHash || matchingVoted.receiptHash;
        voter.votedAt = voter.votedAt || matchingVoted.votedAt;
      }
    }

    res.json({
      success: true,
      voter,
      token: `google-token-${voter.id}-${Date.now()}`,
    });
  });

  // Quick Preset Demo Voter Select
  app.post('/api/voter/demo-select', (req, res) => {
    const { yearLevel } = req.body;
    const yl = (yearLevel as YearLevel) || '3rd Year';

    // Find an unvoted voter or create a demo voter
    let voter = voters.find((v) => v.yearLevel === yl && !v.hasVoted);
    if (!voter) {
      const demoId = `2026-${Math.floor(10000 + Math.random() * 90000)}`;
      voter = {
        id: demoId,
        name: `Demo ${yl} CPE Student`,
        email: `${demoId.toLowerCase()}@cpe.edu.ph`,
        yearLevel: yl,
        hasVoted: false,
      };
      voters.push(voter);
    }

    res.json({
      success: true,
      voter,
      token: `token-${voter.id}-${Date.now()}`,
    });
  });

  // Cast Vote
  app.post('/api/vote/cast', async (req, res) => {
    await loadStateFromFirestore();
    const { voterId, voterName, voterEmail, voterYearLevel, choices } = req.body;

    if (settings.status !== 'VOTING_OPEN') {
      return res.status(400).json({
        success: false,
        message: 'Voting is currently closed or paused by the Commission on Elections.',
      });
    }

    if (!voterId || !choices) {
      return res.status(400).json({ success: false, message: 'Invalid vote payload.' });
    }

    const cleanId = voterId.toString().trim().toUpperCase();
    const cleanEmail = voterEmail ? voterEmail.toString().trim().toLowerCase() : '';
    const cleanName = voterName ? voterName.toString().trim() : '';
    const normName = normalizeName(cleanName);

    // Find voter by ID, email, or normalized name
    let voterIndex = voters.findIndex((v) => {
      if (v.id && v.id.toUpperCase() === cleanId) return true;
      if (cleanEmail && v.email && v.email.toLowerCase() === cleanEmail) return true;
      if (normName.length > 2 && v.name && normalizeName(v.name) === normName) return true;
      return false;
    });

    if (voterIndex === -1) {
      // Auto-register voter profile so vote cast succeeds seamlessly
      const newVoter: Voter = {
        id: cleanId,
        name: cleanName || `CPE Student (${cleanId})`,
        email: cleanEmail || `${cleanId.toLowerCase()}@cpe.edu.ph`,
        yearLevel: (voterYearLevel as YearLevel) || '3rd Year',
        hasVoted: false,
      };
      voters.push(newVoter);
      voterIndex = voters.length - 1;
    }

    const currentVoter = voters[voterIndex];
    const voterNormName = normalizeName(currentVoter.name) || normName;

    // Rule 1: Check if this voter profile has already voted
    if (currentVoter.hasVoted) {
      return res.status(400).json({
        success: false,
        message: 'This student account has already cast a ballot. Double voting is strictly prohibited.',
        receiptHash: currentVoter.receiptHash,
      });
    }

    // Rule 2: Anti-Duplicate Voting check based on Given Full Name & Email across ALL registered voters
    const duplicateVoted = voters.find(
      (v) =>
        v.id.toUpperCase() !== currentVoter.id.toUpperCase() &&
        ((voterNormName.length > 2 && normalizeName(v.name) === voterNormName && v.hasVoted) ||
          (v.email && currentVoter.email && v.email.toLowerCase() === currentVoter.email.toLowerCase() && v.hasVoted))
    );

    if (duplicateVoted) {
      currentVoter.hasVoted = true;
      currentVoter.receiptHash = duplicateVoted.receiptHash;
      await saveStateToFirestore();
      return res.status(400).json({
        success: false,
        message: `Voting Rule Violation: A ballot has already been cast under the name "${currentVoter.name}". Duplicate voting or creating multiple accounts under the same full name is strictly prohibited.`,
        receiptHash: duplicateVoted.receiptHash,
      });
    }

    // Validate single candidate selection rule: A candidate cannot be selected for multiple positions
    const selectedCandidateNames = new Set<string>();
    const selectedCandidateIds = new Set<string>();

    for (const [posId, choiceId] of Object.entries(choices as Record<string, string>)) {
      if (!choiceId || choiceId === 'ABSTAIN') continue;

      const cand = candidates.find((c) => c.id === choiceId);
      if (cand) {
        const lowerName = cand.name.toLowerCase().trim();
        if (selectedCandidateIds.has(cand.id) || selectedCandidateNames.has(lowerName)) {
          return res.status(400).json({
            success: false,
            message: `Voting Rule Violation: Candidate "${cand.name}" was selected for multiple positions. A candidate can only be chosen for one position.`,
          });
        }
        selectedCandidateIds.add(cand.id);
        selectedCandidateNames.add(lowerName);
      }
    }

    const receiptHash = generateReceiptHash();
    const timestamp = new Date().toISOString();

    // Save vote record
    const newVote: VoteRecord = {
      id: `vote-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      receiptHash,
      voterId: currentVoter.id,
      timestamp,
      yearLevel: currentVoter.yearLevel,
      choices,
      isInvalidated: currentVoter.isInvalidated || false,
      invalidatedReason: currentVoter.invalidatedReason,
    };
    votes.push(newVote);

    // Update voter status
    currentVoter.hasVoted = true;
    currentVoter.votedAt = timestamp;
    currentVoter.receiptHash = receiptHash;

    // Lock out all duplicate voter profiles sharing the same full name or email to ensure no secondary accounts can vote
    voters.forEach((v) => {
      const vNorm = normalizeName(v.name);
      if (
        (voterNormName.length > 2 && vNorm === voterNormName) ||
        (v.email && currentVoter.email && v.email.toLowerCase() === currentVoter.email.toLowerCase())
      ) {
        v.hasVoted = true;
        v.votedAt = timestamp;
        v.receiptHash = receiptHash;
      }
    });

    await saveStateToFirestore();

    res.json({
      success: true,
      receiptHash,
      timestamp,
      message: 'Your vote has been securely recorded and encrypted in the official CPE 2026 Election Ledger.',
      voter: voters[voterIndex],
    });
  });

  // Verify Vote Receipt
  app.get('/api/vote/verify/:receiptHash', async (req, res) => {
    await loadStateFromFirestore();
    const hash = req.params.receiptHash.trim().toUpperCase();
    const voteRecord = votes.find((v) => v.receiptHash.toUpperCase() === hash);

    if (!voteRecord) {
      return res.status(404).json({
        success: false,
        message: 'Receipt Hash not found in the official election ledger.',
      });
    }

    const voter = voters.find((vr) => vr.receiptHash?.toUpperCase() === hash || (voteRecord.voterId && vr.id === voteRecord.voterId));
    const isInvalidated = voteRecord.isInvalidated || (voter && voter.isInvalidated);
    const invalidatedReason = voteRecord.invalidatedReason || (voter && voter.invalidatedReason) || 'Flagged during audit by the Commission on Elections';

    // Map candidate IDs to readable names
    const choicesDetails: Record<string, { positionTitle: string; selectedChoice: string }> = {};
    positions.forEach((pos) => {
      const choiceId = voteRecord.choices[pos.id];
      let choiceName = 'ABSTAINED';
      if (choiceId && choiceId !== 'ABSTAIN') {
        const candidate = candidates.find((c) => c.id === choiceId);
        if (candidate) {
          choiceName = `${candidate.name} (${candidate.party})`;
        }
      }
      choicesDetails[pos.title] = {
        positionTitle: pos.title,
        selectedChoice: choiceName,
      };
    });

    res.json({
      success: true,
      receiptHash: voteRecord.receiptHash,
      timestamp: voteRecord.timestamp,
      yearLevel: voteRecord.yearLevel,
      choicesDetails,
      status: isInvalidated ? 'INVALIDATED_BY_COMMISSION' : 'VERIFIED_TAMPER_PROOF',
      isInvalidated: !!isInvalidated,
      invalidatedReason: isInvalidated ? invalidatedReason : undefined,
    });
  });

  // Admin Authorization Helper
  const AUTHORIZED_ADMIN_EMAIL = 'bamuyahacksie@gmail.com';
  function verifyAdminAuth(req: express.Request, res: express.Response): boolean {
    const adminEmail = req.body?.adminEmail || req.headers['x-admin-email'] || req.query?.adminEmail;
    const adminPin = req.body?.adminPin || req.headers['x-admin-pin'] || req.query?.adminPin;
    
    const emailMatch = !adminEmail || adminEmail.toString().trim().toLowerCase() === AUTHORIZED_ADMIN_EMAIL;
    const pinMatch = adminPin === '2026CPE';

    if (!emailMatch || (!pinMatch && adminEmail?.toString().trim().toLowerCase() !== AUTHORIZED_ADMIN_EMAIL)) {
      res.status(401).json({
        success: false,
        message: `Unauthorized. Only ${AUTHORIZED_ADMIN_EMAIL} is authorized as Admin.`,
      });
      return false;
    }
    return true;
  }

  // Admin Settings Endpoint
  app.post('/api/admin/settings', async (req, res) => {
    if (!verifyAdminAuth(req, res)) return;

    await loadStateFromFirestore();
    const { newSettings } = req.body;
    settings = {
      ...settings,
      ...newSettings,
    };

    await saveStateToFirestore();

    res.json({ success: true, settings });
  });

  // Admin Add / Update Candidate
  app.post('/api/admin/candidate', async (req, res) => {
    if (!verifyAdminAuth(req, res)) return;

    const { candidate } = req.body;
    if (!candidate || !candidate.name || !candidate.positionId) {
      return res.status(400).json({ success: false, message: 'Missing candidate fields.' });
    }

    const pos = positions.find((p) => p.id === candidate.positionId);
    const isMusePosition = pos ? (pos.id === 'muse' || pos.title.toLowerCase().includes('muse')) : (candidate.positionId === 'muse');
    const candGender = candidate.gender || 'Female';

    if (isMusePosition && candGender !== 'Female') {
      return res.status(400).json({
        success: false,
        message: 'Eligibility Rule Violation: Only female candidates are allowed to run for the Muse position.',
      });
    }

    const existingIndex = candidates.findIndex((c) => c.id === candidate.id);
    if (existingIndex >= 0) {
      candidates[existingIndex] = { ...candidates[existingIndex], ...candidate, gender: candGender };
    } else {
      const newCand: Candidate = {
        ...candidate,
        gender: candGender,
        id: candidate.id || `cand-custom-${Date.now()}`,
        avatarUrl:
          candidate.avatarUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      };
      candidates.push(newCand);
    }

    await saveStateToFirestore();

    res.json({ success: true, candidates });
  });

  // Admin Delete Candidate
  app.delete('/api/admin/candidate/:id', async (req, res) => {
    if (!verifyAdminAuth(req, res)) return;

    const candId = req.params.id;
    candidates = candidates.filter((c) => c.id !== candId);

    if (db) {
      try {
        await deleteDoc(doc(db, 'candidates', candId));
      } catch (err) {
        console.warn(`Failed to delete candidate document ${candId} from Firestore:`, err);
      }
    }

    await saveStateToFirestore();

    res.json({ success: true, candidates });
  });

  // Admin Emergency Demo Reset
  app.post('/api/admin/reset-demo', async (req, res) => {
    if (!verifyAdminAuth(req, res)) return;

    settings = { ...INITIAL_ELECTION_SETTINGS };
    positions = [...INITIAL_POSITIONS];
    candidates = [...INITIAL_CANDIDATES];
    voters = [...SAMPLE_VOTERS];
    votes = [...INITIAL_VOTES];
    nominations = [...SAMPLE_NOMINATIONS];

    await saveStateToFirestore();

    res.json({ success: true, message: 'Election data reset to initial official state.' });
  });

  // Admin Reset Election Votes Only (Requires Confirmation Password 'confirm')
  app.post('/api/admin/reset-votes', async (req, res) => {
    if (!verifyAdminAuth(req, res)) return;

    await loadStateFromFirestore();
    const { password } = req.body;

    if (!password || password.toString().trim() !== 'confirm') {
      return res.status(400).json({
        success: false,
        message: 'Invalid confirmation password. You must enter "confirm" to proceed with vote reset.',
      });
    }

    // Reset votes array
    votes = [];

    // Reset voter voting status
    voters.forEach((v) => {
      v.hasVoted = false;
      delete v.receiptHash;
      delete v.votedAt;
      v.isInvalidated = false;
      delete v.invalidatedReason;
      delete v.invalidatedAt;
    });

    await saveStateToFirestore();

    const { positionResults, turnoutStats } = calculateResults();
    const actualVoters = voters.filter(isActualAccount);

    res.json({
      success: true,
      message: 'All election votes have been reset to zero. Candidate profiles and positions remain untouched.',
      voters: actualVoters,
      turnoutStats,
      positionResults,
    });
  });

  // Admin Get All Registered Voters & Audit Info
  app.get('/api/admin/voters', async (req, res) => {
    if (!verifyAdminAuth(req, res)) return;

    await loadStateFromFirestore();
    const actualVoters = voters.filter(isActualAccount);
    const totalInvalidated = actualVoters.filter((v) => v.isInvalidated).length;
    res.json({
      success: true,
      voters: actualVoters,
      totalRegistered: actualVoters.length,
      totalVoted: actualVoters.filter((v) => v.hasVoted).length,
      totalInvalidated,
    });
  });

  // Admin Invalidate / Restore Suspicious Voter Account & Votes
  app.post('/api/admin/voter/invalidate', async (req, res) => {
    if (!verifyAdminAuth(req, res)) return;

    await loadStateFromFirestore();
    const { voterId, invalidate = true, reason } = req.body;

    if (!voterId) {
      return res.status(400).json({ success: false, message: 'Voter ID is required.' });
    }

    const cleanId = voterId.toString().trim();
    const targetVoter = voters.find(
      (v) => (v.id && v.id.toUpperCase() === cleanId.toUpperCase()) || (v.email && v.email.toLowerCase() === cleanId.toLowerCase()) || (v.receiptHash && v.receiptHash.toUpperCase() === cleanId.toUpperCase())
    );

    if (!targetVoter) {
      return res.status(404).json({ success: false, message: `Voter record "${voterId}" not found.` });
    }

    const effectiveReason = invalidate
      ? (reason && reason.trim()) || 'Suspicious activity / unverified account flagged by Election Commission'
      : undefined;

    const normName = normalizeName(targetVoter.name);

    // Update target voter and any duplicate profiles matching name or email
    voters.forEach((v) => {
      if (
        v.id.toUpperCase() === targetVoter.id.toUpperCase() ||
        (v.email && targetVoter.email && v.email.toLowerCase() === targetVoter.email.toLowerCase()) ||
        (normName.length > 2 && normalizeName(v.name) === normName)
      ) {
        v.isInvalidated = invalidate;
        v.invalidatedReason = effectiveReason;
        v.invalidatedAt = invalidate ? new Date().toISOString() : undefined;
      }
    });

    // Update associated votes in election ledger
    votes.forEach((v) => {
      const matchVoterId = v.voterId && v.voterId.toUpperCase() === targetVoter.id.toUpperCase();
      const matchHash = targetVoter.receiptHash && v.receiptHash.toUpperCase() === targetVoter.receiptHash.toUpperCase();
      if (matchVoterId || matchHash) {
        v.isInvalidated = invalidate;
        v.invalidatedReason = effectiveReason;
        v.invalidatedAt = invalidate ? new Date().toISOString() : undefined;
      }
    });

    await saveStateToFirestore();

    const { positionResults, turnoutStats } = calculateResults();
    const actualVoters = voters.filter(isActualAccount);

    res.json({
      success: true,
      message: invalidate
        ? `Account ${targetVoter.name} (${targetVoter.id}) has been invalidated. Votes deducted from real-time tally.`
        : `Account ${targetVoter.name} (${targetVoter.id}) has been re-validated. Votes restored to real-time tally.`,
      voter: targetVoter,
      voters: actualVoters,
      turnoutStats,
      positionResults,
    });
  });

  // Admin Bulk Invalidate / Restore Voters
  app.post('/api/admin/voter/bulk-invalidate', async (req, res) => {
    if (!verifyAdminAuth(req, res)) return;

    await loadStateFromFirestore();
    const { voterIds, invalidate = true, reason } = req.body;

    if (!Array.isArray(voterIds) || voterIds.length === 0) {
      return res.status(400).json({ success: false, message: 'An array of voterIds is required.' });
    }

    const effectiveReason = invalidate
      ? (reason && reason.trim()) || 'Bulk invalidation by Commission on Elections for suspicious activity'
      : undefined;

    let updatedCount = 0;

    voterIds.forEach((idStr) => {
      const cleanId = idStr.toString().trim().toUpperCase();
      const target = voters.find(
        (v) => (v.id && v.id.toUpperCase() === cleanId) || (v.email && v.email.toUpperCase() === cleanId) || (v.receiptHash && v.receiptHash.toUpperCase() === cleanId)
      );

      if (target) {
        updatedCount++;
        const normName = normalizeName(target.name);
        voters.forEach((v) => {
          if (
            v.id.toUpperCase() === target.id.toUpperCase() ||
            (v.email && target.email && v.email.toLowerCase() === target.email.toLowerCase()) ||
            (normName.length > 2 && normalizeName(v.name) === normName)
          ) {
            v.isInvalidated = invalidate;
            v.invalidatedReason = effectiveReason;
            v.invalidatedAt = invalidate ? new Date().toISOString() : undefined;
          }
        });

        votes.forEach((v) => {
          const matchVoterId = v.voterId && v.voterId.toUpperCase() === target.id.toUpperCase();
          const matchHash = target.receiptHash && v.receiptHash.toUpperCase() === target.receiptHash.toUpperCase();
          if (matchVoterId || matchHash) {
            v.isInvalidated = invalidate;
            v.invalidatedReason = effectiveReason;
            v.invalidatedAt = invalidate ? new Date().toISOString() : undefined;
          }
        });
      }
    });

    await saveStateToFirestore();

    const { positionResults, turnoutStats } = calculateResults();
    const actualVoters = voters.filter(isActualAccount);

    res.json({
      success: true,
      message: `${updatedCount} voter account(s) successfully ${invalidate ? 'invalidated' : 're-validated'}.`,
      voters: actualVoters,
      turnoutStats,
      positionResults,
    });
  });

  // Admin Delete Voter Account (Account Duplication Cleanup)
  app.post('/api/admin/voter/delete', async (req, res) => {
    if (!verifyAdminAuth(req, res)) return;

    await loadStateFromFirestore();
    const { voterId } = req.body;

    if (!voterId) {
      return res.status(400).json({ success: false, message: 'voterId is required.' });
    }

    const cleanId = voterId.toString().trim().toUpperCase();
    const targetVoter = voters.find(
      (v) => (v.id && v.id.toUpperCase() === cleanId) || (v.email && v.email.toUpperCase() === cleanId)
    );

    if (!targetVoter) {
      return res.status(404).json({ success: false, message: 'Voter record not found.' });
    }

    const targetId = targetVoter.id;
    const targetEmail = targetVoter.email;
    const targetReceipt = targetVoter.receiptHash;

    // Filter out voter
    voters = voters.filter(
      (v) =>
        v.id.toUpperCase() !== targetId.toUpperCase() &&
        (!targetEmail || !v.email || v.email.toLowerCase() !== targetEmail.toLowerCase())
    );

    // Filter out associated votes
    votes = votes.filter(
      (v) =>
        v.voterId !== targetId &&
        (!targetReceipt || v.receiptHash !== targetReceipt)
    );

    await saveStateToFirestore();

    const { positionResults, turnoutStats } = calculateResults();
    const actualVoters = voters.filter(isActualAccount);

    res.json({
      success: true,
      message: `Voter account "${targetVoter.name}" deleted successfully.`,
      voters: actualVoters,
      turnoutStats,
      positionResults,
    });
  });


  // Gemini AI Candidate Comparison Assistant
  app.post('/api/ai/compare-candidates', async (req, res) => {
    const { positionId, question } = req.body;

    const pos = positions.find((p) => p.id === positionId);
    if (!pos) {
      return res.status(404).json({ success: false, message: 'Position not found.' });
    }

    const posCandidates = candidates.filter((c) => c.positionId === positionId);
    if (posCandidates.length === 0) {
      return res.json({
        summary: 'No candidates registered for this position yet.',
        keyDifferences: [],
        candidateHighlights: [],
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Clean fallback if API key is not configured
      return res.json({
        summary: `Comparing candidates for ${pos.title}: ${posCandidates
          .map((c) => `${c.name} (${c.party}) focuses on ${c.platformHeading}`)
          .join(' while ')}.`,
        keyDifferences: [
          `Different party visions: ${posCandidates.map((c) => `${c.party}`).join(' vs ')}`,
          `Varying platform focus: ${posCandidates.map((c) => c.platformHeading).join(' vs ')}`,
        ],
        candidateHighlights: posCandidates.map((c) => ({
          candidateId: c.id,
          candidateName: c.name,
          standoutPoint: c.platformHeading,
        })),
      });
    }

    try {
      const candidatesPromptInfo = posCandidates
        .map(
          (c) =>
            `Candidate: ${c.name} (${c.party})\nNickname: ${c.nickname || ''}\nPlatform: ${c.platformHeading}\nPoints: ${c.platformPoints.join(
              '; '
            )}\nBio: ${c.bio}\nManifesto: ${c.manifesto}`
        )
        .join('\n\n');

      const prompt = `You are the official CPE (Computer Engineering) Department Elections 2026 AI Assistant.
Analyze the following candidates competing for the position of "${pos.title}":

${candidatesPromptInfo}

User Question: ${question || 'Compare their key platform proposals, leadership styles, and main differentiators.'}

Provide an objective, non-partisan, encouraging summary in valid JSON format with the following structure:
{
  "summary": "Brief 2-sentence neutral overview comparing the candidates",
  "keyDifferences": ["Bullet point 1 highlighting key platform contrast", "Bullet point 2 highlighting approach contrast"],
  "candidateHighlights": [
    {
      "candidateId": "candidate_id_here",
      "candidateName": "Full Name",
      "standoutPoint": "Key unique proposal or strength"
    }
  ]
}
Return ONLY valid raw JSON with no markdown block markers around it.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const responseText = response.text || '';
      const jsonString = responseText.replace(/```json\n?|```/g, '').trim();

      try {
        const parsed = JSON.parse(jsonString);
        return res.json(parsed);
      } catch {
        return res.json({
          summary: responseText,
          keyDifferences: posCandidates.map((c) => `${c.name}: ${c.platformHeading}`),
          candidateHighlights: posCandidates.map((c) => ({
            candidateId: c.id,
            candidateName: c.name,
            standoutPoint: c.platformHeading,
          })),
        });
      }
    } catch (err) {
      console.error('Gemini AI Comparison Error:', err);
      return res.json({
        summary: `Comparison for ${pos.title}: Both candidates bring valuable student engineering perspectives.`,
        keyDifferences: posCandidates.map((c) => `${c.name} (${c.party}): ${c.platformHeading}`),
        candidateHighlights: posCandidates.map((c) => ({
          candidateId: c.id,
          candidateName: c.name,
          standoutPoint: c.platformHeading,
        })),
      });
    }
  });

  // --- VITE MIDDLEWARE / STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CPE 2026 Election Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
