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
];

export const INITIAL_CANDIDATES: Candidate[] = [];

export const INITIAL_ELECTION_SETTINGS: ElectionSettings = {
  status: 'VOTING_OPEN',
  title: 'CPE Department Officer Elections 2026',
  subtitle: 'Official Commission on Elections • Computer Engineering Department',
  academicYear: 'AY 2026-2027',
  allowAbstain: true,
  votingDeadline: '2026-08-05T17:00:00.000Z',
  totalRegisteredVoters: 520,
};

export const SAMPLE_VOTERS: Voter[] = [
  { id: '2023-10001', name: 'Alex Johnson', email: 'a.johnson@cpe.edu.ph', yearLevel: '3rd Year', hasVoted: false },
  { id: '2023-10002', name: 'Maria Santos', email: 'm.santos@cpe.edu.ph', yearLevel: '3rd Year', hasVoted: false },
  { id: '2022-10045', name: 'Carlos Mendoza', email: 'c.mendoza@cpe.edu.ph', yearLevel: '4th Year', hasVoted: false },
  { id: '2024-10112', name: 'Sofia Garcia', email: 's.garcia@cpe.edu.ph', yearLevel: '2nd Year', hasVoted: false },
  { id: '2025-10889', name: 'Ethan Perez', email: 'e.perez@cpe.edu.ph', yearLevel: '1st Year', hasVoted: false },
  { id: '2023-10555', name: 'Jessica Reyes', email: 'j.reyes@cpe.edu.ph', yearLevel: '3rd Year', hasVoted: false },
  { id: '2022-10999', name: 'Daniel Cruz', email: 'd.cruz@cpe.edu.ph', yearLevel: '4th Year', hasVoted: false },
];

export const INITIAL_VOTES: VoteRecord[] = [];

export const SAMPLE_NOMINATIONS: CandidateNomination[] = [];
