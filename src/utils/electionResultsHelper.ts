import {
  PositionResult,
  VoterTurnoutStats,
  ElectionSettings,
  Position,
  Candidate,
  VoteRecord,
  Voter,
  YearLevel,
} from '../types';
import { loadElectionDataFromFirestore } from '../lib/firebase';
import {
  INITIAL_POSITIONS,
  INITIAL_CANDIDATES,
  INITIAL_ELECTION_SETTINGS,
  INITIAL_VOTES,
  SAMPLE_VOTERS,
} from '../data/initialData';

export async function fetchOrCalculateResults(customSettings?: ElectionSettings): Promise<{
  positionResults: PositionResult[];
  turnoutStats: VoterTurnoutStats;
  lastUpdated: string;
}> {
  // 1. Try Express API endpoint first
  try {
    const res = await fetch('/api/election/results');
    const contentType = res.headers.get('content-type');
    if (res.ok && contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (data && Array.isArray(data.positionResults)) {
        return {
          positionResults: data.positionResults,
          turnoutStats: data.turnoutStats || null,
          lastUpdated: data.lastUpdated || new Date().toISOString(),
        };
      }
    }
  } catch {
    // Server endpoint unreachable (e.g. deployed on Vercel or static host)
  }

  // 2. Client-side Firestore Calculation Fallback (Works seamlessly on Vercel & static deployments)
  let positions: Position[] = INITIAL_POSITIONS;
  let candidates: Candidate[] = INITIAL_CANDIDATES;
  let votes: VoteRecord[] = INITIAL_VOTES;
  let voters: Voter[] = SAMPLE_VOTERS;
  let settings: ElectionSettings = customSettings || INITIAL_ELECTION_SETTINGS;
  let updatedAt = new Date().toISOString();

  try {
    const fsData = await loadElectionDataFromFirestore();
    if (fsData) {
      if (Array.isArray(fsData.positions) && fsData.positions.length > 0) positions = fsData.positions;
      if (Array.isArray(fsData.candidates) && fsData.candidates.length > 0) candidates = fsData.candidates;
      if (Array.isArray(fsData.votes)) votes = fsData.votes;
      if (Array.isArray(fsData.voters)) voters = fsData.voters;
      if (fsData.settings) settings = fsData.settings;
      if (fsData.updatedAt) updatedAt = fsData.updatedAt;
    }
  } catch (fsErr) {
    console.warn('Firestore load fallback note:', fsErr);
  }

  // Calculate valid votes (exclude invalidated)
  const validVotes = votes.filter((v) => {
    if (v.isInvalidated) return false;
    const voter = voters.find(
      (vr) => (v.voterId && vr.id === v.voterId) || (v.receiptHash && vr.receiptHash === v.receiptHash)
    );
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
        percentage:
          totalValidAndAbstain > 0
            ? parseFloat(((voteCount / totalValidAndAbstain) * 100).toFixed(1))
            : 0,
        isLeading: false,
      };
    });

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

  const yearLevels: YearLevel[] = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const totalReg = settings.totalRegisteredVoters || 100;
  const byYearLevel = yearLevels.map((yl) => {
    const registeredForYL = Math.floor(totalReg / 4);
    const votedCountForYL = validVotes.filter((v) => v.yearLevel === yl).length;
    return {
      yearLevel: yl,
      registered: registeredForYL,
      voted: votedCountForYL,
      percentage:
        registeredForYL > 0
          ? parseFloat(((votedCountForYL / registeredForYL) * 100).toFixed(1))
          : 0,
    };
  });

  const turnoutPercentage =
    totalReg > 0 ? parseFloat(((totalVotesCast / totalReg) * 100).toFixed(1)) : 0;

  return {
    positionResults,
    turnoutStats: {
      totalRegistered: totalReg,
      totalVoted: totalVotesCast,
      turnoutPercentage,
      byYearLevel,
    },
    lastUpdated: updatedAt,
  };
}
