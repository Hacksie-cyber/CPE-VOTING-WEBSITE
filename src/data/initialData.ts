import {
  Position,
  Candidate,
  Voter,
  ElectionSettings,
  VoteRecord,
  CandidateNomination,
  ExhibitProject,
  ExhibitSettings,
  ExhibitVote,
} from '../types';

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
  totalRegisteredVoters: 120,
  officialsVotingDisabled: false,
  yearLevelVoterCounts: {
    '1st Year': 30,
    '2nd Year': 30,
    '3rd Year': 30,
    '4th Year': 30,
  },
};

export const SAMPLE_VOTERS: Voter[] = [];

export const INITIAL_VOTES: VoteRecord[] = [];

export const SAMPLE_NOMINATIONS: CandidateNomination[] = [];

export const INITIAL_EXHIBIT_SETTINGS: ExhibitSettings = {
  isOpen: true,
  showLiveStandings: true,
  lockToExhibit: false,
  title: 'CPE Innovation & Capstone Project Exhibit 2026',
  subtitle: "Cast your People's Choice vote for the most impactful Computer Engineering student prototype and system.",
};

export const INITIAL_EXHIBIT_PROJECTS: ExhibitProject[] = [
  {
    id: 'exh-aquasense',
    title: 'AquaSense: Solar IoT Aquaculture Water Quality Node',
    teamName: 'Team CircuitPulse',
    description:
      'AquaSense is a solar-powered ESP32 sensor buoy engineered for local fishpond operators. It monitors dissolved oxygen, water temperature, pH, and turbidity every 60 seconds, transmits telemetry over LoRaWAN to a cloud dashboard, and automatically triggers relay-driven aerators when oxygen drops below safe thresholds.',
  },
  {
    id: 'exh-visionaid',
    title: 'SightGuide: Edge AI Smart Glasses for Visually Impaired Navigation',
    teamName: 'Team NeuralOptics',
    description:
      'SightGuide integrates a lightweight camera module and ultrasonic rangefinder onto an ergonomic frame powered by a Raspberry Pi Zero 2 W. Running quantized YOLO object detection and on-device OCR, it whispers directional hazard warnings and reads street signs or medicine labels aloud via bone-conduction audio.',
  },
  {
    id: 'exh-sortbot',
    title: 'EcoSort Rover: Autonomous Campus Waste-Segregating Robot',
    teamName: 'Team MechaCore',
    description:
      'Built on a ROS2 navigation stack with custom 3D-printed actuators, EcoSort Rover patrols campus corridors using 2D LiDAR SLAM. Its overhead vision classifier identifies recyclables and sorts them into separate onboard compartments with 93% accuracy.',
  },
  {
    id: 'exh-gridguard',
    title: 'GridGuard: Smart Campus Microgrid & Load-Shedding Controller',
    teamName: 'Team VoltMatrix',
    description:
      'GridGuard features a custom 4-layer PCB with SCT-013 current transformers and PZEM energy meters deployed across laboratory circuits. It detects abnormal harmonic loads, prevents breaker trips via automated priority load-shedding, and forecasts daily kWh consumption.',
  },
  {
    id: 'exh-signbridge',
    title: 'SignBridge: Wearable Haptic & EMG Sign-Language Translator',
    teamName: 'Team SynapTech',
    description:
      'SignBridge captures finger articulation and wrist orientation through 5 flex sensors and a 9-axis IMU per glove, streaming gesture vectors over BLE to a mobile companion app that synthesizes natural voice output in English and Filipino.',
  },
  {
    id: 'exh-packetsentinel',
    title: 'PacketSentinel: Zero-Trust Lab Network Intrusion Appliance',
    teamName: 'Team CyberByte',
    description:
      'Designed for computer engineering laboratory LANs, PacketSentinel runs eBPF packet filtering on an ARM single-board appliance. It detects ARP poisoning, anomalous port scans, and unauthorized MAC devices in milliseconds with instant quarantine alerts.',
  },
];

export const INITIAL_EXHIBIT_VOTES: ExhibitVote[] = [];

