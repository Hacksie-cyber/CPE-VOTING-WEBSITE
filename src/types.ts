export type YearLevel = '1st Year' | '2nd Year' | '3rd Year' | '4th Year';

export type Gender = 'Female' | 'Male' | 'Non-binary' | 'Other';

export type PartyAffiliation = 'ByteCraft Alliance' | 'Synapse Union' | 'Independent Circuit' | 'Progressive CPE Alliance' | 'Tech Innovation Coalition' | (string & {});

export interface CandidateNomination {
  id: string;
  nominatorName: string;
  nominatorStudentId: string;
  positionId: string;
  nomineeName: string;
  nomineeNickname?: string;
  party: PartyAffiliation;
  yearLevel: YearLevel;
  gender?: Gender;
  platformHeading: string;
  manifesto: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  createdAt: string;
}

export interface Position {
  id: string;
  title: string;
  description: string;
  category: 'Executive Council' | 'Department Ambassadors';
  order: number;
}

export interface Candidate {
  id: string;
  positionId: string;
  name: string;
  nickname?: string;
  party: PartyAffiliation;
  yearLevel: YearLevel;
  gender?: Gender;
  avatarUrl: string;
  platformHeading: string;
  platformPoints: string[];
  manifesto: string;
  bio: string;
  achievements: string[];
}

export interface Voter {
  id: string; // e.g. '2023-10294'
  name: string;
  email: string;
  yearLevel: YearLevel;
  hasVoted: boolean;
  votedAt?: string;
  receiptHash?: string;
  isInvalidated?: boolean;
  invalidatedReason?: string;
  invalidatedAt?: string;
}

export interface VoteChoices {
  [positionId: string]: string; // candidateId or 'ABSTAIN'
}

export interface VoteRecord {
  id: string;
  receiptHash: string;
  timestamp: string;
  choices: VoteChoices;
  yearLevel: YearLevel;
  voterId?: string;
  isInvalidated?: boolean;
  invalidatedReason?: string;
  invalidatedAt?: string;
}

export interface CandidateResult extends Candidate {
  votes: number;
  percentage: number;
  isLeading: boolean;
}

export interface PositionResult {
  position: Position;
  totalVotesCast: number;
  abstainCount: number;
  candidates: CandidateResult[];
}

export interface VoterTurnoutStats {
  totalRegistered: number;
  totalVoted: number;
  turnoutPercentage: number;
  byYearLevel: {
    yearLevel: YearLevel;
    registered: number;
    voted: number;
    percentage: number;
  }[];
}

export interface ElectionSettings {
  status: 'PRE_ELECTION' | 'VOTING_OPEN' | 'PAUSED' | 'CONCLUDED';
  title: string;
  subtitle: string;
  academicYear: string;
  allowAbstain: boolean;
  votingDeadline: string;
  totalRegisteredVoters: number;
  yearLevelVoterCounts?: {
    '1st Year'?: number;
    '2nd Year'?: number;
    '3rd Year'?: number;
    '4th Year'?: number;
  };
}

export interface AIComparisonRequest {
  positionId: string;
  question?: string;
}

export interface AIComparisonResponse {
  summary: string;
  keyDifferences: string[];
  candidateHighlights: {
    candidateId: string;
    candidateName: string;
    standoutPoint: string;
  }[];
}
