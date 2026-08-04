import { Position, Candidate, Voter, ElectionSettings, VoteRecord, CandidateNomination } from '../types';

export const INITIAL_POSITIONS: Position[] = [
  {
    id: 'gov',
    title: 'Governor',
    description: 'Chief Executive Officer of the Computer Engineering Department Council. Leads student representation, faculty liaisons, and strategic department initiatives.',
    category: 'Executive Council',
    order: 1,
  },
  {
    id: 'vgov',
    title: 'Vice-Governor',
    description: 'Assists the Governor, oversees internal committees, student welfare, academic tutorials, and coordinates all department events.',
    category: 'Executive Council',
    order: 2,
  },
  {
    id: 'sec',
    title: 'Secretary',
    description: 'Manages official departmental documentation, student assembly minutes, communications, digital archives, and resolution tracking.',
    category: 'Executive Council',
    order: 3,
  },
  {
    id: 'treas',
    title: 'Treasurer',
    description: 'Handles department budget allocation, project financial planning, fund drives, and transparent expense reporting.',
    category: 'Executive Council',
    order: 4,
  },
  {
    id: 'auditor',
    title: 'Auditor',
    description: 'Ensures strict financial accountability, verifies liquidation reports, and audits department hardware inventory.',
    category: 'Executive Council',
    order: 5,
  },
  {
    id: 'pio',
    title: 'P.I.O.',
    description: 'Public Information Officer. Drives social media outreach, event promotions, official department press releases, and student newsletters.',
    category: 'Executive Council',
    order: 6,
  },
  {
    id: 'muse',
    title: 'Muse',
    description: 'Department Ambassador & Muse. Represents the Computer Engineering Department in university pageants, sports meets, and goodwill activities.',
    category: 'Department Ambassadors',
    order: 7,
  },
  {
    id: 'escort',
    title: 'Escort',
    description: 'Department Ambassador & Escort. Represents the Computer Engineering Department alongside the Muse in university pageants, sports meets, and official events.',
    category: 'Department Ambassadors',
    order: 8,
  },
];

export const INITIAL_CANDIDATES: Candidate[] = [];

export const INITIAL_ELECTION_SETTINGS: ElectionSettings = {
  status: 'VOTING_OPEN',
  title: 'CPE Department Officer Elections 2026',
  subtitle: 'Official Commission on Elections • Computer Engineering Department',
  academicYear: 'AY 2026-2027',
  allowAbstain: true,
  votingDeadline: '2026-08-05T17:00:00.000Z',
  totalRegisteredVoters: 0,
};

export const SAMPLE_VOTERS: Voter[] = [];

export const INITIAL_VOTES: VoteRecord[] = [];

export const SAMPLE_NOMINATIONS: CandidateNomination[] = [];
