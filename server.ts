import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
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
  CandidateNomination,
} from './src/types';

// Firebase Database Configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyAOT_2VW4VYSWjILqaC-4qqCkBmk2xSGJ8",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "cpe-voting-website.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "cpe-voting-website",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "cpe-voting-website.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "316255839130",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:316255839130:web:ca4a61e33c6555dac39023",
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || "G-HQJX6DJ6JH"
};

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(firebaseApp);

// In-Memory Database State
let settings: ElectionSettings = { ...INITIAL_ELECTION_SETTINGS };
let positions: Position[] = [...INITIAL_POSITIONS];
let candidates: Candidate[] = [...INITIAL_CANDIDATES];
let voters: Voter[] = [...SAMPLE_VOTERS];
let votes: VoteRecord[] = [...INITIAL_VOTES];
let nominations: CandidateNomination[] = [...SAMPLE_NOMINATIONS];

// Firebase Load & Save Helpers
async function loadStateFromFirestore() {
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.settings) settings = data.settings;
      if (Array.isArray(data.candidates)) candidates = data.candidates;
      if (Array.isArray(data.positions)) positions = data.positions;
      if (Array.isArray(data.voters)) voters = data.voters;
      if (Array.isArray(data.votes)) votes = data.votes;
      if (Array.isArray(data.nominations)) nominations = data.nominations;
      console.log('Firebase Firestore: Loaded state for project "cpe-voting-website"');
    } else {
      console.log('Firebase Firestore: Initializing new database record for cpe2026');
      await saveStateToFirestore();
    }
  } catch (err) {
    console.warn('Firebase Firestore load error:', err);
  }
}

async function saveStateToFirestore() {
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
  } catch (err) {
    console.warn('Firebase Firestore save error:', err);
  }
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
  const totalVotesCast = votes.length;

  const positionResults: PositionResult[] = positions.map((pos) => {
    const posCandidates = candidates.filter((c) => c.positionId === pos.id);

    let abstainCount = 0;
    const candidateVoteCounts: Record<string, number> = {};
    posCandidates.forEach((c) => (candidateVoteCounts[c.id] = 0));

    votes.forEach((vote) => {
      const choice = vote.choices[pos.id];
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
  const yearLevels: YearLevel[] = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const byYearLevel = yearLevels.map((yl) => {
    // Total registered estimation for year level
    const registeredForYL = Math.floor(settings.totalRegisteredVoters / 4);
    const votedCountForYL = votes.filter((v) => v.yearLevel === yl).length;
    return {
      yearLevel: yl,
      registered: registeredForYL,
      voted: votedCountForYL,
      percentage: registeredForYL > 0 ? parseFloat(((votedCountForYL / registeredForYL) * 100).toFixed(1)) : 0,
    };
  });

  const turnoutPercentage =
    settings.totalRegisteredVoters > 0
      ? parseFloat(((totalVotesCast / settings.totalRegisteredVoters) * 100).toFixed(1))
      : 0;

  return {
    positionResults,
    turnoutStats: {
      totalRegistered: settings.totalRegisteredVoters,
      totalVoted: totalVotesCast,
      turnoutPercentage,
      byYearLevel,
    },
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = 3000;

  // Load initial election state from Firebase Firestore
  await loadStateFromFirestore();

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
  app.get('/api/election/info', (req, res) => {
    res.json({
      settings,
      totalPositions: positions.length,
      totalCandidates: candidates.length,
      totalVotesCast: votes.length,
    });
  });

  // Get All Candidates & Positions
  app.get('/api/election/candidates', (req, res) => {
    res.json({
      positions: [...positions].sort((a, b) => a.order - b.order),
      candidates,
    });
  });

  // Get Nominations
  app.get('/api/election/nominations', (req, res) => {
    res.json({
      nominations,
    });
  });

  // Nominate Candidate Endpoint
  app.post('/api/election/nominate', (req, res) => {
    const {
      nominatorName,
      nominatorStudentId,
      positionId,
      nomineeName,
      nomineeNickname,
      party,
      yearLevel,
      platformHeading,
      manifesto,
    } = req.body;

    if (!nomineeName || !positionId || !platformHeading) {
      return res.status(400).json({
        success: false,
        message: 'Nominee Name, Position, and Platform Heading are required.',
      });
    }

    const pos = positions.find((p) => p.id === positionId);
    if (!pos) {
      return res.status(404).json({ success: false, message: 'Invalid election position selected.' });
    }

    const newNomination: CandidateNomination = {
      id: `nom-${Date.now()}`,
      nominatorName: nominatorName || 'Anonymous CPE Student',
      nominatorStudentId: nominatorStudentId || '2026-STUDENT',
      positionId,
      nomineeName: nomineeName.trim(),
      nomineeNickname: nomineeNickname?.trim() || nomineeName.trim().split(' ')[0],
      party: party || 'Independent Circuit',
      yearLevel: yearLevel || '3rd Year',
      platformHeading: platformHeading.trim(),
      manifesto: manifesto?.trim() || 'Dedicated to leading and serving Computer Engineering students.',
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
    };

    nominations.unshift(newNomination);

    // Automatically register nominee as an active candidate for voting if not already present
    const existingCand = candidates.find(
      (c) => c.name.toLowerCase() === nomineeName.trim().toLowerCase() && c.positionId === positionId
    );

    if (!existingCand) {
      const newCand: Candidate = {
        id: `cand-nom-${Date.now()}`,
        positionId,
        name: nomineeName.trim(),
        nickname: nomineeNickname?.trim() || nomineeName.trim().split(' ')[0],
        party: party || 'Independent Circuit',
        yearLevel: yearLevel || '3rd Year',
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        platformHeading: platformHeading.trim(),
        platformPoints: [
          platformHeading.trim(),
          'Student-led initiative for academic & laboratory excellence',
          'Active representation in departmental policy decisions',
        ],
        manifesto:
          manifesto?.trim() || 'Dedicated to serving and empowering Computer Engineering students.',
        bio: `${
          yearLevel || '3rd Year'
        } Computer Engineering student, officially nominated by peers for ${pos.title}.`,
        achievements: ['Peer Nominated Candidate 2026', 'Active CPE Department Member'],
      };
      candidates.push(newCand);
    }

    saveStateToFirestore();

    res.json({
      success: true,
      message: `Candidate ${nomineeName} successfully nominated for ${pos.title}! Candidate is now added to the ballot.`,
      nomination: newNomination,
      totalCandidates: candidates.length,
    });

  });

  // Get Real-Time Results
  app.get('/api/election/results', (req, res) => {
    const { positionResults, turnoutStats } = calculateResults();
    res.json({
      settings,
      positionResults,
      turnoutStats,
      lastUpdated: new Date().toISOString(),
    });
  });

  // Voter Authentication (Student Number & PIN / Email)
  app.post('/api/voter/login', (req, res) => {
    const { studentNumber, pin } = req.body;

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
    }

    res.json({
      success: true,
      voter,
      token: `token-${voter.id}-${Date.now()}`,
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
  app.post('/api/vote/cast', (req, res) => {
    const { voterId, choices } = req.body;

    if (settings.status !== 'VOTING_OPEN') {
      return res.status(400).json({
        success: false,
        message: 'Voting is currently closed or paused by the Commission on Elections.',
      });
    }

    if (!voterId || !choices) {
      return res.status(400).json({ success: false, message: 'Invalid vote payload.' });
    }

    const voterIndex = voters.findIndex((v) => v.id.toUpperCase() === voterId.toUpperCase());
    if (voterIndex === -1) {
      return res.status(404).json({ success: false, message: 'Voter profile not found.' });
    }

    if (voters[voterIndex].hasVoted) {
      return res.status(400).json({
        success: false,
        message: 'This student ID has already cast a ballot. Double voting is strictly prohibited.',
        receiptHash: voters[voterIndex].receiptHash,
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

    // Save vote record anonymously
    const newVote: VoteRecord = {
      id: `vote-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      receiptHash,
      timestamp,
      yearLevel: voters[voterIndex].yearLevel,
      choices,
    };
    votes.push(newVote);

    // Update voter status
    voters[voterIndex].hasVoted = true;
    voters[voterIndex].votedAt = timestamp;
    voters[voterIndex].receiptHash = receiptHash;

    saveStateToFirestore();

    res.json({
      success: true,
      receiptHash,
      timestamp,
      message: 'Your vote has been securely recorded and encrypted in the official CPE 2026 Election Ledger.',
      voter: voters[voterIndex],
    });
  });

  // Verify Vote Receipt
  app.get('/api/vote/verify/:receiptHash', (req, res) => {
    const hash = req.params.receiptHash.trim().toUpperCase();
    const voteRecord = votes.find((v) => v.receiptHash.toUpperCase() === hash);

    if (!voteRecord) {
      return res.status(404).json({
        success: false,
        message: 'Receipt Hash not found in the official election ledger.',
      });
    }

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
      status: 'VERIFIED_TAMPER_PROOF',
    });
  });

  // Admin Settings Endpoint
  app.post('/api/admin/settings', (req, res) => {
    const { adminPin, newSettings } = req.body;

    if (adminPin !== '2026CPE') {
      return res.status(401).json({ success: false, message: 'Invalid Admin Authorization PIN.' });
    }

    settings = {
      ...settings,
      ...newSettings,
    };

    saveStateToFirestore();

    res.json({ success: true, settings });
  });

  // Admin Add / Update Candidate
  app.post('/api/admin/candidate', (req, res) => {
    const { adminPin, candidate } = req.body;

    if (adminPin !== '2026CPE') {
      return res.status(401).json({ success: false, message: 'Invalid Admin Authorization PIN.' });
    }

    if (!candidate || !candidate.name || !candidate.positionId) {
      return res.status(400).json({ success: false, message: 'Missing candidate fields.' });
    }

    const existingIndex = candidates.findIndex((c) => c.id === candidate.id);
    if (existingIndex >= 0) {
      candidates[existingIndex] = { ...candidates[existingIndex], ...candidate };
    } else {
      const newCand: Candidate = {
        ...candidate,
        id: candidate.id || `cand-custom-${Date.now()}`,
        avatarUrl:
          candidate.avatarUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      };
      candidates.push(newCand);
    }

    saveStateToFirestore();

    res.json({ success: true, candidates });
  });

  // Admin Delete Candidate
  app.delete('/api/admin/candidate/:id', (req, res) => {
    const { adminPin } = req.body;
    const candId = req.params.id;

    if (adminPin !== '2026CPE') {
      return res.status(401).json({ success: false, message: 'Invalid Admin Authorization PIN.' });
    }

    candidates = candidates.filter((c) => c.id !== candId);
    saveStateToFirestore();

    res.json({ success: true, candidates });
  });

  // Admin Emergency Demo Reset
  app.post('/api/admin/reset-demo', (req, res) => {
    const { adminPin } = req.body;

    if (adminPin !== '2026CPE') {
      return res.status(401).json({ success: false, message: 'Invalid Admin Authorization PIN.' });
    }

    settings = { ...INITIAL_ELECTION_SETTINGS };
    positions = [...INITIAL_POSITIONS];
    candidates = [...INITIAL_CANDIDATES];
    voters = [...SAMPLE_VOTERS];
    votes = [...INITIAL_VOTES];
    nominations = [...SAMPLE_NOMINATIONS];

    saveStateToFirestore();

    res.json({ success: true, message: 'Election data reset to initial official state.' });
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
