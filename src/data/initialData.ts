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

export const INITIAL_CANDIDATES: Candidate[] = [
  // Governor Candidates
  {
    id: 'cand_gov_1',
    positionId: 'gov',
    name: 'Samantha Cruz',
    nickname: 'Sam',
    party: 'Progressive CPE Alliance',
    yearLevel: '3rd Year',
    gender: 'Female',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    platformHeading: 'Empowering CPE Innovation through Modern Hardware Labs and Industry Linkages',
    platformPoints: [
      'Upgrade department IoT & Embedded Systems Lab kits.',
      'Establish annual hackathons with semiconductor sponsor partners.',
      'Provide peer-led tutoring in Data Structures and Systems Architecture.'
    ],
    manifesto: 'I envision a transparent, innovative, and inclusive Computer Engineering department where every student has access to top-tier hardware resources and mentorship.',
    bio: '3rd Year Computer Engineering student leader. Former Academic Committee Lead with a passion for robotics and embedded programming.',
    achievements: ['Dean’s Lister (3 Consecutive Semesters)', 'Best IoT Project Awardee 2025', 'CPESG Academic Committee Head']
  },
  {
    id: 'cand_gov_2',
    positionId: 'gov',
    name: 'Marcus Reyes',
    nickname: 'Marc',
    party: 'Tech Innovation Coalition',
    yearLevel: '4th Year',
    gender: 'Male',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    platformHeading: 'Building Career Pathways & Advanced Tech Research Workshops',
    platformPoints: [
      'Create direct internship pipelines with IT and semiconductor firms.',
      'Launch student research grants for thesis projects.',
      'Streamline department project budget liquidation.'
    ],
    manifesto: 'Leadership with action and results. My goal is to ensure CPE students graduate with industry-ready portfolios and real-world project experience.',
    bio: '4th Year Computer Engineering student specializing in VLSI and Software Engineering.',
    achievements: ['National Robotics Competition Finalist', 'CPESG Vice-Governor 2025', 'Tech Summit Lead Organizer']
  },

  // Vice-Governor Candidates
  {
    id: 'cand_vgov_1',
    positionId: 'vgov',
    name: 'Ethan Vance',
    nickname: 'Ethan',
    party: 'Progressive CPE Alliance',
    yearLevel: '3rd Year',
    gender: 'Male',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    platformHeading: 'Strengthening Student Welfare & Internal Committee Coordination',
    platformPoints: [
      'Establish a 24/7 online academic helpline for challenging CPE subjects.',
      'Organize the annual CPE Sportsfest and E-sports Tournament.',
      'Enhance mental health awareness and student wellness programs.'
    ],
    manifesto: 'A Vice-Governor dedicated to serving the student body with integrity, proactive communication, and continuous support.',
    bio: '3rd Year Computer Engineering student and active officer in student affairs.',
    achievements: ['CPESG Student Welfare Lead 2025', 'Academic Excellence Awardee']
  },
  {
    id: 'cand_vgov_2',
    positionId: 'vgov',
    name: 'Chloe Diaz',
    nickname: 'Chloe',
    party: 'Tech Innovation Coalition',
    yearLevel: '3rd Year',
    gender: 'Female',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    platformHeading: 'Fostering Collaborative Projects & Community Outreach',
    platformPoints: [
      'Launch inter-year level collaborative coding workshops.',
      'Partner with alumni for mentorship sessions.',
      'Implement digital feedback channels for student concerns.'
    ],
    manifesto: 'Together, we can build a supportive department environment where every student thrives academically and personally.',
    bio: '3rd Year CPE student with extensive background in community organizing and student representation.',
    achievements: ['Women in Tech Student Delegate', 'Class Representative']
  },

  // Secretary Candidates
  {
    id: 'cand_sec_1',
    positionId: 'sec',
    name: 'Hannah Lim',
    nickname: 'Hannah',
    party: 'Progressive CPE Alliance',
    yearLevel: '2nd Year',
    gender: 'Female',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop&q=80',
    platformHeading: 'Transparent Digital Document Archives & Rapid Information Dissemination',
    platformPoints: [
      'Maintain an open-access cloud database for assembly minutes.',
      'Publish weekly department news bulletins.',
      'Automate event attendance and certificate generation.'
    ],
    manifesto: 'Accuracy, transparency, and efficiency in every document and official record.',
    bio: '2nd Year CPE student with keen attention to detail and organizational management.',
    achievements: ['CPESG Documentations Officer 2025', 'Honor Student']
  },
  {
    id: 'cand_sec_2',
    positionId: 'sec',
    name: 'Joshua Santos',
    nickname: 'Josh',
    party: 'Independent Circuit',
    yearLevel: '3rd Year',
    gender: 'Male',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
    platformHeading: 'Modernizing Department Records & Open Communication Channels',
    platformPoints: [
      'Develop an automated portal for student requests and inquiries.',
      'Standardize departmental project documentation guidelines.'
    ],
    manifesto: 'Bringing modern digital tools to streamline all departmental communications and records.',
    bio: '3rd Year CPE student passionate about software development and administration.',
    achievements: ['Web Development Lead', 'Department Scholar']
  },

  // Treasurer Candidates
  {
    id: 'cand_treas_1',
    positionId: 'treas',
    name: 'David Tan',
    nickname: 'Dave',
    party: 'Progressive CPE Alliance',
    yearLevel: '3rd Year',
    gender: 'Male',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
    platformHeading: 'Transparent Financial Governance & Optimized Budget Allocation',
    platformPoints: [
      'Publish monthly itemized financial liquidation reports.',
      'Sponsor subsidized hardware kits for financially challenged students.',
      'Audit and optimize event expenditures.'
    ],
    manifesto: 'Every cent of student funds will be accounted for and reinvested directly into student development.',
    bio: '3rd Year CPE student with background in accounting and finance management.',
    achievements: ['CPESG Finance Committee Member', 'Dean’s Lister']
  },

  // Auditor Candidates
  {
    id: 'cand_auditor_1',
    positionId: 'auditor',
    name: 'Gabriel Navarro',
    nickname: 'Gabe',
    party: 'Independent Circuit',
    yearLevel: '3rd Year',
    gender: 'Male',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    platformHeading: 'Rigorous Financial Audits & Hardware Inventory Tracking',
    platformPoints: [
      'Implement a digital QR-based inventory tracker for department lab equipment.',
      'Conduct bi-monthly audit checks on all project expenses.'
    ],
    manifesto: 'Uncompromising integrity and accountability in protecting department assets and funds.',
    bio: '3rd Year CPE student committed to transparency and ethical governance.',
    achievements: ['Hardware Inventory Auditor 2025', 'Academic Scholar']
  },

  // P.I.O. Candidates
  {
    id: 'cand_pio_1',
    positionId: 'pio',
    name: 'Alyssa Mendoza',
    nickname: 'Aly',
    party: 'Progressive CPE Alliance',
    yearLevel: '2nd Year',
    gender: 'Female',
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
    platformHeading: 'Dynamic Media Campaigns & Engaging Social Outreach',
    platformPoints: [
      'Redesign official CPESG social media channels with modern visual branding.',
      'Feature student achievements and thesis projects weekly.',
      'Produce video coverage for major department events.'
    ],
    manifesto: 'Amplifying the voice and accomplishments of Computer Engineering students to the entire university community.',
    bio: '2nd Year CPE student with expertise in graphic design and media communications.',
    achievements: ['CPESG Creative Director 2025', 'Design Competition Winner']
  },

  // Muse Candidates
  {
    id: 'cand_muse_1',
    positionId: 'muse',
    name: 'Beatrice Gonzales',
    nickname: 'Bea',
    party: 'Independent Circuit',
    yearLevel: '3rd Year',
    gender: 'Female',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    platformHeading: 'Representing CPE Excellence with Grace, Intelligence, and Spirit',
    platformPoints: [
      'Lead student cheer squads for university sports meets.',
      'Organize goodwill and charitable outreach initiatives.',
      'Promote women in engineering empowerment campaigns.'
    ],
    manifesto: 'Proudly representing the beauty, intellect, and leadership of Computer Engineering students.',
    bio: '3rd Year CPE student and cultural ambassador.',
    achievements: ['College Pageant Ambassador', 'Student Council Volunteer']
  },

  // Escort Candidates
  {
    id: 'cand_escort_1',
    positionId: 'escort',
    name: 'Christian Vance',
    nickname: 'Ian',
    party: 'Progressive CPE Alliance',
    yearLevel: '3rd Year',
    gender: 'Male',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    platformHeading: 'Representing CPE Department Pride, Sportsmanship, and Goodwill',
    platformPoints: [
      'Partner with Muse in university pageant & departmental outreach events.',
      'Organize sports & e-sports tournaments for CPE students.',
      'Promote active lifestyle and student camaraderie.'
    ],
    manifesto: 'Serving as the official Escort to bring honor, sportsmanship, and pride to the Computer Engineering department.',
    bio: '3rd Year CPE student, athlete and student council ambassador.',
    achievements: ['Department Sports Captain 2025', 'PUP Mascot & Goodwill Team Member']
  },
  {
    id: 'cand_escort_2',
    positionId: 'escort',
    name: 'Kevin Ocampo',
    nickname: 'Kev',
    party: 'Tech Innovation Coalition',
    yearLevel: '2nd Year',
    gender: 'Male',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
    platformHeading: 'Fostering Department Spirit & Campus Unity',
    platformPoints: [
      'Promote inclusive participation in university cultural & athletic activities.',
      'Co-organize department sports meets and team building activities.'
    ],
    manifesto: 'Bringing enthusiasm, teamwork, and strong representation to the CPE student body.',
    bio: '2nd Year CPE student active in campus athletics and community service.',
    achievements: ['CPE Basketball Team Captain', 'Varsity Athlete']
  }
];

export const INITIAL_ELECTION_SETTINGS: ElectionSettings = {
  status: 'VOTING_OPEN',
  title: 'CPE Department Officer Elections 2026',
  subtitle: 'Official Commission on Elections • Computer Engineering Department',
  academicYear: 'AY 2026-2027',
  allowAbstain: true,
  votingDeadline: '2026-08-05T17:00:00.000Z',
  totalRegisteredVoters: 4,
};

export const SAMPLE_VOTERS: Voter[] = [
  { id: '2023-10001', name: 'Maria Santos', email: '2023-10001@cpe.edu.ph', yearLevel: '3rd Year', hasVoted: true, receiptHash: 'CPE2026-8A3F-99B2' },
  { id: '2023-10002', name: 'Juan Dela Cruz', email: '2023-10002@cpe.edu.ph', yearLevel: '3rd Year', hasVoted: true, receiptHash: 'CPE2026-11C4-77E9' },
  { id: '2022-10045', name: 'Carlos Garcia', email: '2022-10045@cpe.edu.ph', yearLevel: '4th Year', hasVoted: true, receiptHash: 'CPE2026-44D1-22A8' },
  { id: '2024-10112', name: 'Angela Reyes', email: '2024-10112@cpe.edu.ph', yearLevel: '2nd Year', hasVoted: true, receiptHash: 'CPE2026-99E8-33F1' },
];

export const INITIAL_VOTES: VoteRecord[] = [
  {
    id: 'vote-sample-1',
    receiptHash: 'CPE2026-8A3F-99B2',
    voterId: '2023-10001',
    timestamp: '2026-08-03T10:15:00.000Z',
    yearLevel: '3rd Year',
    choices: {
      gov: 'cand_gov_1',
      vgov: 'cand_vgov_1',
      sec: 'cand_sec_1',
      treas: 'cand_treas_1',
      auditor: 'cand_auditor_1',
      pio: 'cand_pio_1',
      muse: 'cand_muse_1',
      escort: 'cand_escort_1'
    }
  },
  {
    id: 'vote-sample-2',
    receiptHash: 'CPE2026-11C4-77E9',
    voterId: '2023-10002',
    timestamp: '2026-08-03T11:20:00.000Z',
    yearLevel: '3rd Year',
    choices: {
      gov: 'cand_gov_2',
      vgov: 'cand_vgov_2',
      sec: 'cand_sec_2',
      treas: 'cand_treas_1',
      auditor: 'cand_auditor_1',
      pio: 'cand_pio_1',
      muse: 'cand_muse_1',
      escort: 'cand_escort_2'
    }
  },
  {
    id: 'vote-sample-3',
    receiptHash: 'CPE2026-44D1-22A8',
    voterId: '2022-10045',
    timestamp: '2026-08-03T12:05:00.000Z',
    yearLevel: '4th Year',
    choices: {
      gov: 'cand_gov_1',
      vgov: 'cand_vgov_1',
      sec: 'cand_sec_1',
      treas: 'cand_treas_1',
      auditor: 'cand_auditor_1',
      pio: 'cand_pio_1',
      muse: 'cand_muse_1',
      escort: 'cand_escort_1'
    }
  },
  {
    id: 'vote-sample-4',
    receiptHash: 'CPE2026-99E8-33F1',
    voterId: '2024-10112',
    timestamp: '2026-08-03T13:40:00.000Z',
    yearLevel: '2nd Year',
    choices: {
      gov: 'cand_gov_2',
      vgov: 'cand_vgov_2',
      sec: 'cand_sec_1',
      treas: 'cand_treas_1',
      auditor: 'cand_auditor_1',
      pio: 'cand_pio_1',
      muse: 'cand_muse_1',
      escort: 'cand_escort_1'
    }
  }
];

export const SAMPLE_NOMINATIONS: CandidateNomination[] = [];
