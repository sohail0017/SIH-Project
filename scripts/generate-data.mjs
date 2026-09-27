// ============================================================================
// SkillTrack demonstration-data generator (Maharashtra only)
// ----------------------------------------------------------------------------
// Generates the seven JSON "tables" served from public/data:
//   trainees.json, employees.json, trainingPrograms.json, providers.json,
//   employers.json, skills.json, followups.json
//
// All records are FICTIONAL demonstration data — no real persons.
// Deterministic: seeded PRNG, fixed "today" (2026-09-13).
//
// Usage: node scripts/generate-data.mjs
// ============================================================================

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'data');

// ------------------------------------------------------------- seeded RNG ---
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260913);
const ri = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
const round100 = (n) => Math.max(8000, Math.round(n / 100) * 100);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
function norm(mean, sd) {
  const u = 1 - rand();
  const v = rand();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ------------------------------------------------------------------ dates ---
const TODAY = new Date('2026-09-13');
const TOTAL_TRAINEES = 2000;
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const addDaysISO = (isoStr, n) => iso(addDays(new Date(isoStr), n));
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
function monthsBetween(a, b) {
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return Math.max(0, m);
}

// ------------------------------------------------------- outcome reasons ---
const LEAVE_REASONS = ['Better opportunity', 'Low salary', 'Relocation', 'Working conditions', 'Personal reasons', 'Skill mismatch', 'Employer-related', 'Other'];
const NONPLACEMENT_REASONS = ['Skill gap', 'Lack of experience', 'Low wages offered', 'Location mismatch', 'Personal reasons', 'Low employer demand', 'Interview performance', 'Communication skills', 'Other'];
const EMPLOYER_FEEDBACK = [
  'Performing well; ready for higher responsibilities',
  'Strong practical skills; needs soft-skills coaching',
  'Reliable and quick to learn on the job',
  'Requires occasional supervision on complex tasks',
];
const SE_BUSINESS_TYPES = {
  'IT & Software': 'IT services freelancer',
  'Manufacturing': 'Machine shop / job-work unit',
  'Automotive': 'Two-wheeler service garage',
  'Healthcare': 'Home nursing care service',
  'Banking & Financial Services': 'Insurance advisory services',
  'Logistics': 'Transport & courier services',
  'Retail': 'Neighbourhood retail store',
  'Agriculture & Food Processing': 'Food processing unit',
  'Electronics': 'Electronics repair & assembly shop',
  'Renewable Energy': 'Solar installation services',
  'Construction': 'Construction contracting services',
  'Tourism & Hospitality': 'Homestay / catering services',
};
const SE_CHALLENGES = ['Access to credit', 'Market linkages', 'Working capital', 'Regulatory clearances', 'Skilled labour'];
const EMPLOYER_VA_ACTIONS = ['GST and CIN records verified', 'Site visit completed', 'EPFO establishment cross-verified', 'Trade licence verified'];

function revenueRangeFor(w) {
  if (w < 15000) return 'Below ₹15,000/month';
  if (w < 25000) return '₹15,000–₹25,000/month';
  if (w < 50000) return '₹25,000–₹50,000/month';
  return '₹50,000+/month';
}

function wageSnapshotAt(startingWage, currentWage, tenureMonths, m) {
  if (tenureMonths < m) return null;
  const t = Math.min(m / Math.max(tenureMonths, 1), 1);
  return round100(startingWage + (currentWage - startingWage) * t);
}

// ------------------------------------------------------------- geography ---
// [district, division, weight, tier]
const DISTRICTS = [
  ['Pune', 'Pune', 3.4, 'metro'],
  ['Mumbai Suburban', 'Konkan', 2.6, 'metro'],
  ['Thane', 'Konkan', 2.3, 'metro'],
  ['Nagpur', 'Nagpur', 2.0, 'metro'],
  ['Nashik', 'Nashik', 1.8, 'metro'],
  ['Mumbai City', 'Konkan', 1.6, 'metro'],
  ['Chhatrapati Sambhajinagar', 'Chhatrapati Sambhajinagar', 1.25, 'mid'],
  ['Solapur', 'Pune', 1.1, 'mid'],
  ['Kolhapur', 'Pune', 1.2, 'high'],
  ['Ahilyanagar', 'Pune', 1.0, 'mid'],
  ['Satara', 'Pune', 1.0, 'high'],
  ['Sangli', 'Pune', 0.95, 'high'],
  ['Raigad', 'Konkan', 0.9, 'high'],
  ['Ratnagiri', 'Konkan', 0.7, 'high'],
  ['Sindhudurg', 'Konkan', 0.55, 'high'],
  ['Jalgaon', 'Nashik', 0.95, 'mid'],
  ['Amravati', 'Amravati', 0.95, 'mid'],
  ['Nanded', 'Chhatrapati Sambhajinagar', 0.8, 'mid'],
  ['Latur', 'Chhatrapati Sambhajinagar', 0.7, 'mid'],
  ['Wardha', 'Nagpur', 0.55, 'high'],
  ['Chandrapur', 'Nagpur', 0.65, 'mid'],
  ['Jalna', 'Chhatrapati Sambhajinagar', 0.5, 'mid'],
  ['Akola', 'Amravati', 0.5, 'mid'],
  ['Bhandara', 'Nagpur', 0.35, 'mid'],
  ['Yavatmal', 'Amravati', 0.7, 'low'],
  ['Buldhana', 'Amravati', 0.7, 'low'],
  ['Parbhani', 'Chhatrapati Sambhajinagar', 0.65, 'low'],
  ['Beed', 'Chhatrapati Sambhajinagar', 0.7, 'low'],
  ['Dharashiv', 'Chhatrapati Sambhajinagar', 0.6, 'low'],
  ['Dhule', 'Nashik', 0.6, 'low'],
  ['Palghar', 'Konkan', 0.65, 'low'],
  ['Gondia', 'Nagpur', 0.5, 'low'],
  ['Washim', 'Amravati', 0.45, 'low'],
  ['Gadchiroli', 'Nagpur', 0.45, 'low'],
  ['Nandurbar', 'Nashik', 0.45, 'low'],
  ['Hingoli', 'Chhatrapati Sambhajinagar', 0.45, 'low'],
];

const TIER = {
  metro: { outcomeShift: +0.075, wageMult: 1.18, completion: 0.94 },
  high: { outcomeShift: +0.03, wageMult: 1.06, completion: 0.915 },
  mid: { outcomeShift: -0.01, wageMult: 0.96, completion: 0.885 },
  low: { outcomeShift: -0.085, wageMult: 0.85, completion: 0.82 },
};

// ------------------------------------------------------------- programmes ---
const PROGRAMS = [
  { id: 'PROG-01', courseName: 'Full Stack Web Development', sector: 'IT & Software', nsqfLevel: 5, durationHours: 600, baseWage: 24200, weight: 1.15,
    skills: ['React & TypeScript', 'Node.js REST APIs', 'SQL & Data Modelling', 'Git & Agile Workflow'],
    roles: ['Associate Software Engineer', 'Junior Web Developer', 'Application Support Engineer'] },
  { id: 'PROG-02', courseName: 'CNC Machine Operator & Programmer', sector: 'Manufacturing', nsqfLevel: 4, durationHours: 500, baseWage: 17600, weight: 1.25,
    skills: ['G-Code Programming', 'Tool Wear Compensation', 'Blueprint Reading & GD&T', 'Quality Metrology'],
    roles: ['CNC Machine Operator', 'CNC Milling Junior Engineer', 'Tool Room Technician'] },
  { id: 'PROG-03', courseName: 'Electric Vehicle Service Technician', sector: 'Automotive', nsqfLevel: 4, durationHours: 400, baseWage: 18900, weight: 0.8,
    skills: ['HV Battery Safety', 'EV Diagnostics', 'CAN Bus Troubleshooting', 'Motor Controller Basics'],
    roles: ['EV Service Technician', 'Battery Assembly Specialist', 'EV Diagnostics Technician'] },
  { id: 'PROG-04', courseName: 'General Duty Assistant (Healthcare)', sector: 'Healthcare', nsqfLevel: 4, durationHours: 450, baseWage: 15800, weight: 1.3,
    skills: ['Vital Signs & Triage', 'Aseptic Technique & PPE', 'Patient Mobility & Ergonomics', 'Emergency BLS Response'],
    roles: ['Patient Care Associate', 'General Duty Assistant', 'Ward Attendant — ICU'] },
  { id: 'PROG-05', courseName: 'Banking & Financial Services Executive', sector: 'Banking & Financial Services', nsqfLevel: 4, durationHours: 320, baseWage: 16400, weight: 0.85,
    skills: ['Core Banking Systems', 'KYC & AML Compliance', 'Customer Relationship Management', 'Digital Payments'],
    roles: ['Banking Operations Executive', 'Deputy Manager — Operations', 'Customer Service Officer'] },
  { id: 'PROG-06', courseName: 'Warehouse Operations & Logistics', sector: 'Logistics', nsqfLevel: 3, durationHours: 300, baseWage: 15200, weight: 0.95,
    skills: ['WMS Software Basics', 'Forklift Operations', 'Inventory Control', 'Dispatch Planning'],
    roles: ['Warehouse Associate', 'Logistics Coordinator', 'Fulfilment Executive'] },
  { id: 'PROG-07', courseName: 'Retail Sales & Operations', sector: 'Retail', nsqfLevel: 3, durationHours: 280, baseWage: 14600, weight: 0.9,
    skills: ['POS Systems', 'Visual Merchandising', 'Customer Service', 'Inventory Replenishment'],
    roles: ['Retail Sales Associate', 'Department Floor Supervisor', 'Store Operations Executive'] },
  { id: 'PROG-08', courseName: 'Food Processing Technician', sector: 'Agriculture & Food Processing', nsqfLevel: 3, durationHours: 350, baseWage: 14200, weight: 0.6,
    skills: ['FSSAI Compliance', 'Cold Chain Handling', 'Processing Machine Operation', 'Quality Assurance'],
    roles: ['Food Processing Technician', 'Production Line Supervisor', 'Quality Check Executive'] },
  { id: 'PROG-09', courseName: 'Electronics Assembly & Repair (SMT)', sector: 'Electronics', nsqfLevel: 3, durationHours: 380, baseWage: 16800, weight: 0.8,
    skills: ['SMT Line Operations', 'PCB Inspection & Rework', 'ESD Safety Protocols', 'AOI Machine Operation'],
    roles: ['SMT Line Operator', 'Electronics Assembly Technician', 'PCB Rework Specialist'] },
  { id: 'PROG-10', courseName: 'Solar PV Installation Technician', sector: 'Renewable Energy', nsqfLevel: 4, durationHours: 350, baseWage: 16400, weight: 0.7,
    skills: ['Solar PV String Design', 'Inverter Synchronisation', 'Net-Metering Liaison', 'Rooftop Site Safety'],
    roles: ['Solar Installation Technician', 'Rooftop PV Installer', 'Solar Service Technician'] },
  { id: 'PROG-11', courseName: 'Construction Site Supervisor', sector: 'Construction', nsqfLevel: 4, durationHours: 400, baseWage: 16200, weight: 0.7,
    skills: ['Site Supervision', 'BIM Basics', 'Concrete Mix Design & QA', 'Site Safety Compliance'],
    roles: ['Site Supervisor', 'Junior Site Engineer', 'QA/QC Supervisor'] },
  { id: 'PROG-12', courseName: 'Tourism & Hospitality Operations', sector: 'Tourism & Hospitality', nsqfLevel: 3, durationHours: 300, baseWage: 14800, weight: 0.65,
    skills: ['Guest Services', 'F&B Operations', 'Reservation & Booking Systems', 'Heritage Interpretation'],
    roles: ['Guest Services Associate', 'F&B Service Executive', 'Front Office Associate'] },
];

// ------------------------------------------------------------- providers ---
const PROVIDERS = [
  { id: 'PROV-01', code: 'ITI-PUN-0112', name: 'Government ITI Pune', type: 'Government ITI', centres: 6,
    districtsCovered: ['Pune', 'Ahilyanagar', 'Satara', 'Solapur'] },
  { id: 'PROV-02', code: 'ITI-NGP-0087', name: 'Government ITI Nagpur', type: 'Government ITI', centres: 4,
    districtsCovered: ['Nagpur', 'Wardha', 'Chandrapur', 'Bhandara', 'Gondia', 'Gadchiroli'] },
  { id: 'PROV-03', code: 'ITI-CSN-0064', name: 'Government ITI Chhatrapati Sambhajinagar', type: 'Government ITI', centres: 3,
    districtsCovered: ['Chhatrapati Sambhajinagar', 'Jalna', 'Beed', 'Latur', 'Nanded', 'Parbhani', 'Hingoli', 'Dharashiv'] },
  { id: 'PROV-04', code: 'VTP-MUM-0321', name: 'Mumbai Technical Training Institute', type: 'Private VTP', centres: 9,
    districtsCovered: ['Mumbai City', 'Mumbai Suburban', 'Thane', 'Palghar', 'Raigad', 'Ratnagiri', 'Sindhudurg'] },
  { id: 'PROV-05', code: 'VTP-PUN-0198', name: 'Pune Skills Academy', type: 'Private VTP', centres: 4,
    districtsCovered: ['Pune', 'Kolhapur', 'Sangli', 'Satara'] },
  { id: 'PROV-06', code: 'POL-NSK-0045', name: 'Nashik Polytechnic Skill Centre', type: 'Polytechnic', centres: 3,
    districtsCovered: ['Nashik', 'Dhule', 'Jalgaon', 'Nandurbar'] },
  { id: 'PROV-07', code: 'IND-CHN-0012', name: 'Chakan Industries Skill Centre', type: 'Industry Partner', centres: 1,
    districtsCovered: ['Pune'] },
  { id: 'PROV-08', code: 'VTP-AMR-0276', name: 'Vidarbha Skills Academy', type: 'Private VTP', centres: 5,
    districtsCovered: ['Amravati', 'Akola', 'Yavatmal', 'Washim', 'Buldhana'] },
];

// ------------------------------------------------------------- employers ---
const EMPLOYER_SEEDS = [
  { id: 'EMR-01', name: 'Sahyadri Digital Labs', sector: 'IT & Software', district: 'Pune' },
  { id: 'EMR-02', name: 'Coastal Softworks LLP', sector: 'IT & Software', district: 'Mumbai Suburban' },
  { id: 'EMR-03', name: 'Deccan Fintech Services', sector: 'Banking & Financial Services', district: 'Mumbai City' },
  { id: 'EMR-04', name: 'Kesar Financial Solutions', sector: 'Banking & Financial Services', district: 'Nagpur' },
  { id: 'EMR-05', name: 'Sanskriti Care Hospitals', sector: 'Healthcare', district: 'Pune' },
  { id: 'EMR-06', name: 'Vidarbha Medicare Trust', sector: 'Healthcare', district: 'Nagpur' },
  { id: 'EMR-07', name: 'Sanjeevani CritiCare Hospital', sector: 'Healthcare', district: 'Mumbai Suburban' },
  { id: 'EMR-08', name: 'Godavari Auto Components', sector: 'Automotive', district: 'Nashik' },
  { id: 'EMR-09', name: 'Konkan Motors EV Works', sector: 'Automotive', district: 'Pune' },
  { id: 'EMR-10', name: 'Mula Valley Industries', sector: 'Manufacturing', district: 'Pune' },
  { id: 'EMR-11', name: 'Bhima Precision Engineering', sector: 'Manufacturing', district: 'Kolhapur' },
  { id: 'EMR-12', name: 'Krishna Electronics Assembly', sector: 'Electronics', district: 'Solapur' },
  { id: 'EMR-13', name: 'Bhiwandi Fulfilment Hub', sector: 'Logistics', district: 'Thane' },
  { id: 'EMR-14', name: 'Konkan Coast Logistics', sector: 'Logistics', district: 'Raigad' },
  { id: 'EMR-15', name: 'Suryashakti Energy Partners', sector: 'Renewable Energy', district: 'Kolhapur' },
  { id: 'EMR-16', name: 'Sadanand Retail Ventures', sector: 'Retail', district: 'Mumbai Suburban' },
  { id: 'EMR-17', name: 'Sahyadri Ridges Resorts', sector: 'Tourism & Hospitality', district: 'Satara' },
  { id: 'EMR-18', name: 'Maratha Constructions', sector: 'Construction', district: 'Mumbai City' },
  { id: 'EMR-19', name: 'Tapi Agro Foods', sector: 'Agriculture & Food Processing', district: 'Jalgaon' },
];

const EMPLOYERS = EMPLOYER_SEEDS.map((e, i) => {
  const roll = rand();
  const verificationStatus = roll < 0.78 ? 'verified' : roll < 0.94 ? 'pending' : 'flagged';
  const historyCount = verificationStatus === 'verified' ? ri(2, 3) : ri(0, 1);
  const verificationHistory = Array.from({ length: historyCount }, (_, k) => ({
    date: iso(addDays(TODAY, -(k * 90 + ri(10, 60)))),
    action: pick(EMPLOYER_VA_ACTIONS),
    note: 'Demonstration verification entry',
  }));
  return {
    ...e,
    verificationStatus,
    verifiedDate: verificationStatus === 'verified' ? iso(addDays(TODAY, -ri(10, 300))) : null,
    verificationHistory,
    gstin: `27${String(1000000 + i * 7331).slice(0, 7)}X1Z${ri(1, 9)}`,
  };
});

// ----------------------------------------------------------------- skills ---
const SKILLS = [
  { id: 'SG-01', skill: 'Cloud & DevOps Fundamentals', sector: 'IT & Software', employerDemand: 91, trainingSupply: 38, priority: 'Critical', note: 'Pune and Mumbai IT employers report the largest unfilled demand.' },
  { id: 'SG-02', skill: 'Multi-Axis CNC Machining', sector: 'Manufacturing', employerDemand: 84, trainingSupply: 41, priority: 'Critical', note: 'Chakan and MIDC belt units need Fanuc/Siemens controller skills.' },
  { id: 'SG-03', skill: 'EV Battery Management & Diagnostics', sector: 'Automotive', employerDemand: 88, trainingSupply: 44, priority: 'Critical', note: 'EV service network expansion is outpacing certified supply.' },
  { id: 'SG-04', skill: 'SMT Assembly & PCB Repair', sector: 'Electronics', employerDemand: 82, trainingSupply: 40, priority: 'Critical', note: 'Electronics units in Pune and Thane report acute shortage.' },
  { id: 'SG-05', skill: 'Digital Banking Operations', sector: 'Banking & Financial Services', employerDemand: 74, trainingSupply: 49, priority: 'High', note: 'Branch operations and fintech back-office roles expanding.' },
  { id: 'SG-06', skill: 'Warehouse Management Systems', sector: 'Logistics', employerDemand: 71, trainingSupply: 42, priority: 'High', note: 'Bhiwandi and Panvel fulfilment hubs need WMS-literate staff.' },
  { id: 'SG-07', skill: 'Solar PV Design & Net Metering', sector: 'Renewable Energy', employerDemand: 77, trainingSupply: 51, priority: 'High', note: 'Rooftop solar targets under PM Surya Ghat driving demand.' },
  { id: 'SG-08', skill: 'FSSAI-Compliant Food Processing', sector: 'Agriculture & Food Processing', employerDemand: 68, trainingSupply: 47, priority: 'High', note: 'FPOs and agro-export units require certified line technicians.' },
  { id: 'SG-09', skill: 'Patient Care & Clinical Assistance', sector: 'Healthcare', employerDemand: 79, trainingSupply: 58, priority: 'High', note: 'District hospitals and home-care agencies hiring continuously.' },
  { id: 'SG-10', skill: 'Modern Construction Techniques', sector: 'Construction', employerDemand: 66, trainingSupply: 45, priority: 'Medium', note: 'Infrastructure corridor projects need supervisory skills.' },
  { id: 'SG-11', skill: 'Retail Technology & POS Systems', sector: 'Retail', employerDemand: 62, trainingSupply: 55, priority: 'Medium', note: 'Supply broadly adequate; focus on service quality upskilling.' },
  { id: 'SG-12', skill: 'Multilingual Guest Services', sector: 'Tourism & Hospitality', employerDemand: 58, trainingSupply: 52, priority: 'Low', note: 'Adequate supply; seasonal demand spikes in hill and coastal belts.' },
];

// ------------------------------------------------------------------ names ---
const FEMALE_NAMES = ['Sanika', 'Rutuja', 'Ayesha', 'Zoya', 'Priyanka', 'Kalyani', 'Vaishnavi', 'Mrunmayee', 'Sneha', 'Shalini', 'Meghna', 'Aditi', 'Sakshi', 'Pooja', 'Roshni', 'Kaveri', 'Bhagyashri', 'Dhanashree', 'Aishwarya', 'Trupti', 'Sarita', 'Nikita', 'Rinku', 'Jyoti', 'Manisha', 'Prerna', 'Samruddhi', 'Ketaki', 'Anaya', 'Sanjana', 'Rukhsar', 'Farheen', 'Deepali', 'Harshada', 'Yogita', 'Lata', 'Vandana', 'Sushma', 'Chhaya', 'Madhuri'];
const MALE_NAMES = ['Rahul', 'Akash', 'Pratik', 'Omkar', 'Sahil', 'Faizan', 'Yash', 'Rohit', 'Dnyaneshwar', 'Sushant', 'Kiran', 'Vishal', 'Nilesh', 'Amit', 'Sunil', 'Tushar', 'Mayur', 'Ganesh', 'Sagar', 'Amol', 'Prasad', 'Kunal', 'Ritesh', 'Nikhil', 'Siddhesh', 'Abhishek', 'Imran', 'Arbaz', 'Tanmay', 'Chirag', 'Manish', 'Sandip', 'Vijay', 'Aniket', 'Hrushikesh', 'Sameer', 'Pandurang', 'Bhushan', 'Nitin', 'Rushikesh'];
const SURNAMES = ['Deshmukh', 'Patil', 'Kulkarni', 'Jadhav', 'Pawar', 'Shaikh', 'More', 'Gaikwad', 'Bhosale', 'Sawant', 'Chavan', 'Shinde', 'Thakare', 'Ingale', 'Kale', 'Mane', 'Wagh', 'Bodke', 'Deshpande', 'Joshi', 'Kadam', 'Sable', 'Nirmal', 'Waghmare', 'Meshram', 'Dhoke', 'Zade', 'Bansod', 'Kohade', 'Pardhi', 'Khatik', 'Suryawanshi', 'Jagtap', 'Shelke', 'Gholap'];
const AGENTS = ['District Skill Office — follow-up desk', 'SkillTrack automated follow-up', 'Maharashtra Skill Helpline', 'District outreach officer', 'Placement cell coordinator'];

// ------------------------------------------------------------- weighting ---
function weightedPick(items, weightFn) {
  const total = items.reduce((acc, it) => acc + weightFn(it), 0);
  let r = rand() * total;
  for (const it of items) {
    r -= weightFn(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

// ============================================================================
// Featured trainees (rich demonstration records shown in the profile modal)
// ============================================================================
const FEATURED = [
  { name: 'Sanika Deshmukh', gender: 'Female', age: 23, district: 'Pune', category: 'OBC', education: 'B.Sc. Computer Science',
    programId: 'PROG-01', providerId: 'PROV-05', trainingYear: '2023-24', batchId: 'B-2024-FSD-02',
    enrolmentDate: '2023-07-10', completionDate: '2024-01-20', certificationDate: '2024-02-05',
    attendanceRate: 96.5, assessmentScore: 91, nsqfLevel: 5,
    outcome: 'Employed', employerId: 'EMR-01', designation: 'Associate Software Engineer', startDate: '2024-02-26',
    startingWage: 26500, currentWage: 34500, monthsInJob: 18, verification: 'epfo_verified' },
  { name: 'Rahul Dattatray Patil', gender: 'Male', age: 22, district: 'Pune', category: 'General', education: 'Class 12 (Science)',
    programId: 'PROG-02', providerId: 'PROV-07', trainingYear: '2022-23', batchId: 'B-2023-CNC-09',
    enrolmentDate: '2023-02-15', completionDate: '2023-06-30', certificationDate: '2023-07-12',
    attendanceRate: 91.2, assessmentScore: 82, nsqfLevel: 4,
    outcome: 'Employed', employerId: 'EMR-10', designation: 'CNC Milling Junior Engineer', startDate: '2023-08-01',
    startingWage: 17500, currentWage: 24800, monthsInJob: 24, verification: 'epfo_verified' },
  { name: 'Ayesha Shaikh', gender: 'Female', age: 24, district: 'Mumbai Suburban', category: 'OBC', education: 'Class 12 (Arts)',
    programId: 'PROG-04', providerId: 'PROV-04', trainingYear: '2023-24', batchId: 'B-2024-GDA-05',
    enrolmentDate: '2023-09-01', completionDate: '2023-12-15', certificationDate: '2024-01-04',
    attendanceRate: 94.8, assessmentScore: 88, nsqfLevel: 4,
    outcome: 'Employed', employerId: 'EMR-07', designation: 'Patient Care Associate — ICU', startDate: '2024-01-22',
    startingWage: 16200, currentWage: 21000, monthsInJob: 20, verification: 'employer_verified' },
  { name: 'Pratik Waghmare', gender: 'Male', age: 21, district: 'Nashik', category: 'SC', education: 'ITI Fitter',
    programId: 'PROG-03', providerId: 'PROV-06', trainingYear: '2024-25', batchId: 'B-2025-EV-03',
    enrolmentDate: '2024-08-05', completionDate: '2024-12-10', certificationDate: '2024-12-28',
    attendanceRate: 92.5, assessmentScore: 84, nsqfLevel: 4,
    outcome: 'Apprenticeship', employerId: 'EMR-08', designation: 'NAPS Apprentice — EV Assembly', startDate: '2025-01-15',
    startingWage: 13500, currentWage: 15800, monthsInJob: 8, verification: 'employer_verified' },
  { name: 'Sneha Kulkarni', gender: 'Female', age: 25, district: 'Kolhapur', category: 'OBC', education: 'ITI Electrician',
    programId: 'PROG-10', providerId: 'PROV-01', trainingYear: '2022-23', batchId: 'B-2023-SOL-01',
    enrolmentDate: '2022-10-10', completionDate: '2023-02-20', certificationDate: '2023-03-08',
    attendanceRate: 93.0, assessmentScore: 86, nsqfLevel: 4,
    outcome: 'Self-employed', employerId: null, designation: 'Founder — solar installation enterprise', startDate: '2023-05-02',
    startingWage: 15000, currentWage: 32000, monthsInJob: 30, verification: 'document_verified' },
  { name: 'Akash Pawar', gender: 'Male', age: 22, district: 'Satara', category: 'EWS', education: 'Class 12 Pass',
    programId: 'PROG-06', providerId: 'PROV-04', trainingYear: '2023-24', batchId: 'B-2024-LOG-04',
    enrolmentDate: '2023-10-02', completionDate: '2024-01-25', certificationDate: '2024-02-10',
    attendanceRate: 88.5, assessmentScore: 74, nsqfLevel: 3,
    outcome: 'Seeking Employment', employerId: null, designation: 'Actively seeking placement', startDate: '2024-03-01',
    startingWage: 15000, currentWage: 0, monthsInJob: 4, verification: 'self_reported' },
  { name: 'Meghna Ingle', gender: 'Female', age: 23, district: 'Nagpur', category: 'General', education: 'B.Com',
    programId: 'PROG-05', providerId: 'PROV-02', trainingYear: '2023-24', batchId: 'B-2024-BFSI-02',
    enrolmentDate: '2023-08-14', completionDate: '2023-12-01', certificationDate: '2023-12-18',
    attendanceRate: 95.4, assessmentScore: 89, nsqfLevel: 4,
    outcome: 'Employed', employerId: 'EMR-04', designation: 'Deputy Manager — Operations', startDate: '2024-01-08',
    startingWage: 16800, currentWage: 22400, monthsInJob: 21, verification: 'epfo_verified' },
  { name: 'Dnyaneshwar Mane', gender: 'Male', age: 20, district: 'Solapur', category: 'VJNT', education: 'Class 10 Pass',
    programId: 'PROG-09', providerId: 'PROV-01', trainingYear: '2024-25', batchId: 'B-2025-SMT-01',
    enrolmentDate: '2025-01-06', completionDate: '2025-04-20', certificationDate: '2025-05-06',
    attendanceRate: 90.8, assessmentScore: 81, nsqfLevel: 3,
    outcome: 'Apprenticeship', employerId: 'EMR-12', designation: 'NAPS Apprentice — SMT Line', startDate: '2025-05-20',
    startingWage: 14000, currentWage: 16500, monthsInJob: 4, verification: 'document_verified' },
];

// ============================================================================
// Generation
// ============================================================================
const yearWeights = { '2021-22': 0.14, '2022-23': 0.2, '2023-24': 0.24, '2024-25': 0.24, '2025-26': 0.18 };
const YEAR_START = { '2021-22': [2021, 7], '2022-23': [2022, 7], '2023-24': [2023, 7], '2024-25': [2024, 7], '2025-26': [2025, 7] };

const trainees = [];
const employees = [];
let seq = 20341;

function makePhone() {
  return `+91 9${ri(0, 9)}${ri(0, 9)}${ri(0, 9)} ${ri(10000, 99999)}`;
}

function skillRatingsFor(program) {
  return program.skills.map((s) => ({ skill: s, score: ri(68, 96) }));
}

function outcomeDraw(tierShift, program) {
  let employed = 0.575 + tierShift;
  let selfEmployed = 0.108 + tierShift * 0.15;
  let apprentice = 0.078;
  let further = 0.041;
  let unemployed = 0.093 - tierShift * 0.75;
  let unknown = 0.075 - tierShift * 0.4;
  if (program.sector === 'IT & Software' || program.sector === 'Electronics') employed += 0.03;
  if (program.sector === 'Retail') employed -= 0.04;
  unemployed = Math.max(0.02, unemployed);
  unknown = Math.max(0.02, unknown);
  const total = employed + selfEmployed + apprentice + further + unemployed + unknown;
  let r = rand() * total;
  if ((r -= employed) < 0) return 'Employed';
  if ((r -= selfEmployed) < 0) return 'Self-employed';
  if ((r -= apprentice) < 0) return 'Apprenticeship';
  if ((r -= further) < 0) return 'Further Education';
  if ((r -= unemployed) < 0) return chance(0.7) ? 'Seeking Employment' : 'Unemployed';
  return 'Unknown';
}

function generateTrainee(index) {
  const [district, division, , tier] = weightedPick(DISTRICTS, (d) => d[2]);
  const program = weightedPick(PROGRAMS, (p) => p.weight);
  const eligible = PROVIDERS.filter((p) => p.districtsCovered.includes(district));
  const provider = weightedPick(eligible, (p) => (p.type === 'Government ITI' ? 1.5 : p.type === 'Industry Partner' ? 0.8 : 1));
  const trainingYear = weightedPick(Object.keys(yearWeights), (y) => yearWeights[y]);
  const tierCfg = TIER[tier];

  const gender = chance(0.42) ? 'Female' : 'Male';
  const first = gender === 'Female' ? pick(FEMALE_NAMES) : pick(MALE_NAMES);
  const fullName = `${first} ${pick(SURNAMES)}`;
  const id = `ST-${trainingYear.slice(0, 4)}-MH-${seq}`;
  seq += ri(3, 17);

  const [ey, em] = YEAR_START[trainingYear];
  const enrolmentDate = new Date(ey, em + ri(0, 7), ri(1, 27));
  const durationMonths = program.durationHours >= 500 ? ri(5, 6) : program.durationHours >= 380 ? ri(4, 5) : ri(3, 4);
  const completed = chance(tierCfg.completion);
  const completionDate = completed ? addMonths(enrolmentDate, durationMonths) : null;
  const certified = completed && chance(0.96);
  const certificationDate = certified ? addDays(completionDate, ri(10, 25)) : null;

  const category = weightedPick(
    ['General', 'OBC', 'SC', 'ST', 'EWS', 'SEBC', 'VJNT'],
    (c) => ({ General: 0.3, OBC: 0.32, SC: 0.14, ST: 0.08, EWS: 0.08, SEBC: 0.06, VJNT: 0.02 }[c])
  );
  const education =
    program.nsqfLevel >= 5
      ? pick(['B.Sc. Computer Science', 'B.Com', 'BCA', 'B.A.'])
      : pick(['Class 10 Pass', 'Class 12 Pass', 'Class 12 (Science)', 'ITI Fitter', 'ITI Electrician', 'Diploma — Mechanical']);

  const trainee = {
    id,
    fullName,
    gender,
    age: ri(18, 29),
    phone: makePhone(),
    email: `${first.toLowerCase()}.${seq}@example.in`,
    district,
    division,
    category,
    education,
    trainingYear,
    programId: program.id,
    providerId: provider.id,
    batchId: `B-${trainingYear.slice(2, 4)}${trainingYear.slice(5, 7)}-${program.courseName.split(' ')[0].slice(0, 3).toUpperCase()}-${ri(1, 12)}`,
    enrolmentDate: iso(enrolmentDate),
    consentStatus: 'granted',
    consentDate: iso(addDays(enrolmentDate, -ri(0, 7))),
    completionDate: completionDate ? iso(completionDate) : null,
    certificationDate: certificationDate ? iso(certificationDate) : null,
    nsqfLevel: program.nsqfLevel,
    attendanceRate: Math.round(clamp(norm(89, 4), 70, 99.5) * 10) / 10,
    assessmentScore: Math.round(clamp(norm(80, 7), 55, 98)),
    skillRatings: skillRatingsFor(program),
  };
  trainees.push(trainee);

  if (!certified) return;

  // ----- outcome draw & core scalars ---------------------------------------
  let outcome = outcomeDraw(tierCfg.outcomeShift, program);
  const employersInSector = EMPLOYERS.filter((e) => e.sector === program.sector);
  const C = monthsBetween(certificationDate, TODAY);
  let employerId = null;
  let designation = '—';
  let startDate = null;
  let startingWage = 0;
  let currentWage = 0;
  let monthsInJob = 0;
  let verification = 'unverified';

  if (outcome === 'Employed') {
    const emp = pick(employersInSector);
    employerId = emp.id;
    designation = pick(program.roles);
    startDate = addDays(certificationDate, ri(3, 28));
    startingWage = round100(program.baseWage * tierCfg.wageMult * norm(1, 0.09));
    const S = monthsBetween(certificationDate, startDate);
    const stayMonths = Math.max(1, C - S);
    const stays = chance(0.7);
    monthsInJob = stays ? Math.min(stayMonths, 30) : ri(1, 5);
    const growthAnnual = clamp(norm(program.sector === 'IT & Software' ? 0.15 : 0.115, 0.05), 0.03, 0.38);
    currentWage = round100(startingWage * (1 + (growthAnnual * Math.min(monthsInJob, 18)) / 12));
    verification = chance(0.97) ? (chance(0.7) ? 'epfo_verified' : 'employer_verified') : 'self_reported';
  } else if (outcome === 'Self-employed') {
    designation = 'Founder — own micro-enterprise';
    startDate = addDays(certificationDate, ri(5, 28));
    startingWage = round100(program.baseWage * tierCfg.wageMult * 0.78);
    monthsInJob = Math.min(Math.max(1, C - monthsBetween(certificationDate, startDate)), 30);
    const growthAnnual = clamp(norm(0.1, 0.06), 0.04, 0.35);
    currentWage = round100(startingWage * (1 + (growthAnnual * Math.min(monthsInJob, 18)) / 12));
    verification = 'document_verified';
  } else if (outcome === 'Apprenticeship') {
    const emp = pick(employersInSector);
    employerId = emp.id;
    designation = `NAPS Apprentice — ${program.roles[0].split('—')[0].trim()}`;
    startDate = addDays(certificationDate, ri(3, 28));
    startingWage = round100(program.baseWage * tierCfg.wageMult * 0.78);
    monthsInJob = Math.min(Math.max(2, C - monthsBetween(certificationDate, startDate)), 30);
    currentWage = round100(startingWage * 1.14);
    verification = chance(0.95) ? 'employer_verified' : 'self_reported';
  } else if (outcome === 'Unemployed' || outcome === 'Seeking Employment') {
    if (chance(0.25)) {
      // had a short-lived job before the contract ended
      startDate = addDays(certificationDate, ri(3, 28));
      startingWage = round100(program.baseWage * tierCfg.wageMult * 0.95);
      designation = 'Contract ended — seeking placement';
      monthsInJob = ri(2, 5);
    } else {
      designation = outcome === 'Seeking Employment' ? 'Actively seeking placement' : 'Not currently seeking work';
    }
    verification = 'self_reported';
  } else if (outcome === 'Further Education') {
    designation = 'Pursuing further education';
    verification = 'document_verified';
  } else {
    designation = 'Unreachable';
    verification = 'unverified';
  }

  // ----- longitudinal detail blocks ----------------------------------------
  const jobs = [];
  const wageSnapshots = [];
  let selfEmployment = null;
  let apprenticeship = null;
  let nonPlacementReason = null;
  let skillsUsedAtWork = [];
  let skillRelevance = null;
  let employerFeedback = null;

  if (outcome === 'Employed') {
    skillsUsedAtWork = program.skills.filter(() => chance(0.8));
    if (skillsUsedAtWork.length === 0) skillsUsedAtWork = [program.skills[0]];
    skillRelevance = ri(3, 5);
    if (chance(0.5)) employerFeedback = pick(EMPLOYER_FEEDBACK);

    const switched = monthsInJob >= 8 && chance(0.15);
    if (switched) {
      // first job ended midway (attrition event with reason), then re-placed
      const firstMonths = Math.max(2, Math.round(monthsInJob * (0.3 + rand() * 0.3)));
      const firstEnd = addMonths(startDate, firstMonths);
      const others = employersInSector.filter((e) => e.id !== employerId);
      jobs.push({
        employerId: others.length ? pick(others).id : employerId,
        designation: pick(program.roles),
        startDate: iso(startDate),
        endDate: iso(firstEnd),
        startingWage: round100(startingWage * norm(1, 0.05)),
        endingWage: round100(startingWage * 1.08),
        reasonForLeaving: pick(LEAVE_REASONS),
      });
      const secondStart = addDays(firstEnd, ri(10, 60));
      jobs.push({
        employerId,
        designation,
        startDate: iso(secondStart),
        endDate: null,
        startingWage: round100(startingWage * 1.05),
        endingWage: currentWage,
        reasonForLeaving: null,
      });
    } else {
      jobs.push({ employerId, designation, startDate: iso(startDate), endDate: null, startingWage, endingWage: currentWage, reasonForLeaving: null });
    }
  } else if (outcome === 'Self-employed') {
    skillsUsedAtWork = program.skills.filter(() => chance(0.85));
    if (skillsUsedAtWork.length === 0) skillsUsedAtWork = [program.skills[0]];
    skillRelevance = ri(4, 5);
    selfEmployment = {
      businessType: SE_BUSINESS_TYPES[program.sector] || `${program.sector} services`,
      sector: program.sector,
      startDate: iso(startDate),
      location: `${district}, Maharashtra`,
      revenueRange: revenueRangeFor(currentWage),
      businessStatus: chance(0.85) ? 'Operating' : 'Struggling',
      employees: ri(0, 3),
      challenges: chance(0.55) ? [pick(SE_CHALLENGES)] : [],
    };
    jobs.push({ employerId: null, designation, startDate: iso(startDate), endDate: null, startingWage, endingWage: currentWage, reasonForLeaving: null });
  } else if (outcome === 'Apprenticeship') {
    const apprEnd = addMonths(startDate, 12);
    const completed = apprEnd < TODAY;
    const converted = completed && chance(0.35);
    apprenticeship = {
      employerId,
      startDate: iso(startDate),
      endDate: iso(apprEnd),
      stipend: startingWage,
      completed,
      convertedToPermanent: converted,
      conversionDate: converted ? iso(addDays(apprEnd, ri(5, 30))) : null,
    };
    skillsUsedAtWork = program.skills.filter(() => chance(0.75));
    if (skillsUsedAtWork.length === 0) skillsUsedAtWork = [program.skills[0]];
    skillRelevance = ri(3, 5);
    if (converted) {
      // converted apprentices are counted as employed, with apprenticeship history
      outcome = 'Employed';
      designation = program.roles[0];
      currentWage = round100(startingWage * (1 + 0.15 + rand() * 0.2));
      monthsInJob = Math.min(Math.max(2, C - monthsBetween(certificationDate, startDate)), 30);
      if (chance(0.5)) employerFeedback = pick(EMPLOYER_FEEDBACK);
    }
    jobs.push({ employerId, designation, startDate: iso(startDate), endDate: null, startingWage, endingWage: currentWage, reasonForLeaving: null });
  } else if (outcome === 'Unemployed' || outcome === 'Seeking Employment') {
    nonPlacementReason = pick(NONPLACEMENT_REASONS);
    if (startDate) {
      jobs.push({
        employerId: null,
        designation: 'Short-term contract (ended)',
        startDate: iso(startDate),
        endDate: iso(addMonths(startDate, monthsInJob)),
        startingWage,
        endingWage: startingWage,
        reasonForLeaving: pick(LEAVE_REASONS),
      });
    }
  }

  if (['Employed', 'Self-employed', 'Apprenticeship'].includes(outcome) && startingWage > 0) {
    for (const m of [0, 3, 6, 12]) {
      const w = wageSnapshotAt(startingWage, currentWage, monthsInJob, m);
      if (w !== null) wageSnapshots.push({ atMonths: m, wage: w });
    }
  }

  employees.push({
    id: `EMP-${id.split('-')[3]}`,
    traineeId: id,
    employerId,
    outcome,
    designation,
    startDate: startDate ? iso(startDate) : null,
    startingWage,
    currentWage,
    monthsInJob,
    verification,
    lastVerifiedDate: verification === 'unverified' ? null : iso(addDays(TODAY, -ri(3, 90))),
    jobs,
    wageSnapshots,
    selfEmployment,
    apprenticeship,
    nonPlacementReason,
    skillsUsedAtWork,
    skillRelevance,
    employerFeedback,
  });
}

// Featured records first
FEATURED.forEach((f) => {
  const program = PROGRAMS.find((p) => p.id === f.programId);
  const id = `ST-${f.trainingYear.slice(0, 4)}-MH-${seq}`;
  seq += 7;
  trainees.push({
    id,
    fullName: f.name,
    gender: f.gender,
    age: f.age,
    phone: makePhone(),
    email: `${f.name.split(' ')[0].toLowerCase()}.${seq}@example.in`,
    district: f.district,
    division: DISTRICTS.find((d) => d[0] === f.district)?.[1] || 'Pune',
    category: f.category,
    education: f.education,
    trainingYear: f.trainingYear,
    programId: f.programId,
    providerId: f.providerId,
    batchId: f.batchId,
    enrolmentDate: f.enrolmentDate,
    consentStatus: 'granted',
    consentDate: addDaysISO(f.enrolmentDate, -3),
    completionDate: f.completionDate,
    certificationDate: f.certificationDate,
    nsqfLevel: f.nsqfLevel,
    attendanceRate: f.attendanceRate,
    assessmentScore: f.assessmentScore,
    skillRatings: skillRatingsFor(program),
  });
  const fSkills = program.skills.filter(() => rand() < 0.85);
  const fSnapshots = [0, 3, 6, 12]
    .map((m) => (f.monthsInJob >= m ? { atMonths: m, wage: wageSnapshotAt(f.startingWage, f.currentWage, f.monthsInJob, m) } : null))
    .filter(Boolean);
  employees.push({
    id: `EMP-${id.split('-')[3]}`,
    traineeId: id,
    employerId: f.employerId,
    outcome: f.outcome,
    designation: f.designation,
    startDate: f.startDate,
    startingWage: f.startingWage,
    currentWage: f.currentWage,
    monthsInJob: f.monthsInJob,
    verification: f.verification,
    lastVerifiedDate: '2026-09-08',
    jobs: [
      {
        employerId: f.employerId,
        designation: f.designation,
        startDate: f.startDate,
        endDate: null,
        startingWage: f.startingWage,
        endingWage: f.currentWage,
        reasonForLeaving: null,
      },
    ],
    wageSnapshots: fSnapshots,
    selfEmployment:
      f.outcome === 'Self-employed'
        ? {
            businessType: 'Solar installation services',
            sector: 'Renewable Energy',
            startDate: f.startDate,
            location: `${f.district}, Maharashtra`,
            revenueRange: revenueRangeFor(f.currentWage),
            businessStatus: 'Operating',
            employees: 2,
            challenges: ['Access to credit'],
          }
        : null,
    apprenticeship:
      f.outcome === 'Apprenticeship'
        ? {
            employerId: f.employerId,
            startDate: f.startDate,
            endDate: addDaysISO(f.startDate, 365),
            stipend: f.startingWage,
            completed: false,
            convertedToPermanent: false,
            conversionDate: null,
          }
        : null,
    nonPlacementReason: ['Unemployed', 'Seeking Employment'].includes(f.outcome) ? 'Location mismatch' : null,
    skillsUsedAtWork: ['Employed', 'Self-employed', 'Apprenticeship'].includes(f.outcome) ? fSkills : [],
    skillRelevance: ['Employed', 'Self-employed', 'Apprenticeship'].includes(f.outcome) ? 5 : null,
    employerFeedback: f.outcome === 'Employed' ? 'Performing well; ready for higher responsibilities' : null,
  });
});

for (let i = 0; i < TOTAL_TRAINEES - FEATURED.length; i++) generateTrainee(i);

// ============================================================================
// Follow-ups: open queue + completed history (used as trainee follow-up logs)
// ============================================================================
const certifiedEmployed = employees.filter((e) => ['Employed', 'Self-employed', 'Apprenticeship'].includes(e.outcome));
const followups = [];
let fseq = 1;

// Open queue — 12 items, some overdue
for (let i = 0; i < 12; i++) {
  const emp = pick(certifiedEmployed);
  const overdue = i < 6;
  const due = overdue ? ri(1, 6) : ri(1, 12);
  const dueDate = overdue ? addDays(TODAY, -due) : addDays(TODAY, due);
  const milestone = pick(['30-day', '90-day', '180-day', '365-day']);
  // contact attempts with channel outcomes (contacted / no response / unreachable / relocated)
  const attempts = chance(0.75)
    ? Array.from({ length: ri(1, 2) }, () => {
        const status = chance(0.55)
          ? 'Contacted'
          : pick(['No response', 'Unreachable', 'Relocated', 'Failed delivery']);
        return {
          date: iso(addDays(TODAY, -ri(2, 12))),
          channel: pick(['Phone call', 'SMS', 'WhatsApp', 'Email', 'Field visit']),
          status,
          note: status === 'Contacted' ? 'Trainee responded; outcome recorded.' : '',
        };
      })
    : [];
  followups.push({
    id: `FLW-${String(fseq++).padStart(3, '0')}`,
    traineeId: emp.traineeId,
    milestone,
    dueDate: iso(dueDate),
    status: 'Open',
    lastContact: attempts.length ? attempts[attempts.length - 1].date : iso(addDays(TODAY, -ri(2, 12))),
    contactMethod: attempts.length ? attempts[attempts.length - 1].channel : pick(['WhatsApp', 'Phone call', 'SMS', 'Field visit']),
    contactStatus: attempts.length ? attempts[attempts.length - 1].status : 'Pending',
    priority: overdue ? (chance(0.6) ? 'High' : 'Medium') : pick(['Medium', 'Low']),
    attempts,
  });
}

// Completed entries (serve as follow-up logs in trainee profiles)
const noteByOutcome = {
  Employed: 'Employment confirmed; wage verified against the latest follow-up.',
  'Self-employed': 'Enterprise operating; monthly revenue band re-confirmed.',
  Apprenticeship: 'Apprenticeship on track; mentor feedback recorded.',
  Unemployed: 'Counselling provided; referred to the district placement drive.',
  'Seeking Employment': 'Counselling provided; referred to the district placement drive.',
  'Further Education': 'Enrolled in further studies; outcome recorded.',
  Unknown: 'Contact attempted; awaiting response.',
};
for (let i = 0; i < 38; i++) {
  const emp = pick(employees);
  followups.push({
    id: `FLW-${String(fseq++).padStart(3, '0')}`,
    traineeId: emp.traineeId,
    milestone: pick(['30-day', '90-day', '180-day', '365-day']),
    dueDate: iso(addDays(TODAY, -ri(20, 300))),
    status: 'Completed',
    lastContact: iso(addDays(TODAY, -ri(15, 280))),
    contactMethod: pick(['WhatsApp', 'Phone call', 'Field visit', 'SMS']),
    contactStatus: 'Contacted',
    priority: 'Low',
    attempts: [
      {
        date: iso(addDays(TODAY, -ri(15, 280))),
        channel: pick(['Phone call', 'WhatsApp', 'Field visit']),
        status: 'Contacted',
        note: 'Attempt successful.',
      },
    ],
    agent: pick(AGENTS),
    employmentConfirmed: ['Employed', 'Self-employed', 'Apprenticeship'].includes(emp.outcome),
    reportedWage: emp.currentWage,
    jobSatisfaction: ri(3, 5),
    skillRelevanceRating: ri(3, 5),
    notes: noteByOutcome[emp.outcome],
  });
}
// Rich logs for featured trainees
followups.push(
  { id: `FLW-${String(fseq++).padStart(3, '0')}`, traineeId: trainees[0].id, milestone: '365-day', dueDate: '2026-09-08', status: 'Completed', lastContact: '2026-09-08', contactMethod: 'WhatsApp', contactStatus: 'Contacted', priority: 'Low', attempts: [{ date: '2026-09-08', channel: 'WhatsApp', status: 'Contacted', note: 'Attempt successful.' }], agent: 'SkillTrack automated follow-up', employmentConfirmed: true, reportedWage: 34500, jobSatisfaction: 5, skillRelevanceRating: 5, notes: 'Working on enterprise React applications. Suggested advanced cloud modules.' },
  { id: `FLW-${String(fseq++).padStart(3, '0')}`, traineeId: trainees[1].id, milestone: '180-day', dueDate: '2026-08-20', status: 'Completed', lastContact: '2026-08-20', contactMethod: 'Phone call', contactStatus: 'Contacted', priority: 'Low', attempts: [{ date: '2026-08-20', channel: 'Phone call', status: 'Contacted', note: 'Attempt successful.' }], agent: 'Employer HR verification', employmentConfirmed: true, reportedWage: 24800, jobSatisfaction: 4, skillRelevanceRating: 4, notes: 'Strong with Fanuc controls; recommended refresher on GD&T tolerances.' },
  { id: `FLW-${String(fseq++).padStart(3, '0')}`, traineeId: trainees[4].id, milestone: '365-day', dueDate: '2026-09-02', status: 'Completed', lastContact: '2026-09-02', contactMethod: 'Field visit', contactStatus: 'Contacted', priority: 'Low', attempts: [{ date: '2026-09-02', channel: 'Field visit', status: 'Contacted', note: 'Attempt successful.' }], agent: 'Kolhapur district outreach team', employmentConfirmed: true, reportedWage: 32000, jobSatisfaction: 5, skillRelevanceRating: 5, notes: 'Own solar enterprise sustained; employs two helpers from the next batch.' },
  { id: `FLW-${String(fseq++).padStart(3, '0')}`, traineeId: trainees[5].id, milestone: '90-day', dueDate: '2026-08-30', status: 'Completed', lastContact: '2026-08-30', contactMethod: 'WhatsApp', contactStatus: 'Contacted', priority: 'Low', attempts: [{ date: '2026-08-30', channel: 'WhatsApp', status: 'Contacted', note: 'Attempt successful.' }], agent: 'Satara district officer', employmentConfirmed: false, reportedWage: 0, jobSatisfaction: 2, skillRelevanceRating: 3, notes: 'Returned to home district; prefers local placement over metro migration.' }
);

// ============================================================================
// Write files + summary
// ============================================================================
const programsOut = PROGRAMS.map(({ id, courseName, sector, nsqfLevel, durationHours, skills }) => ({
  id, courseName, sector, nsqfLevel, durationHours, assessedSkills: skills,
}));
const providersOut = PROVIDERS;
const skillsOut = SKILLS.map((s) => ({ ...s }));

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, 'trainees.json'), JSON.stringify(trainees, null, 2));
  await writeFile(path.join(OUT_DIR, 'employees.json'), JSON.stringify(employees, null, 2));
  await writeFile(path.join(OUT_DIR, 'trainingPrograms.json'), JSON.stringify(programsOut, null, 2));
  await writeFile(path.join(OUT_DIR, 'providers.json'), JSON.stringify(providersOut, null, 2));
  await writeFile(path.join(OUT_DIR, 'employers.json'), JSON.stringify(EMPLOYERS, null, 2));
  await writeFile(path.join(OUT_DIR, 'skills.json'), JSON.stringify(skillsOut, null, 2));
  await writeFile(path.join(OUT_DIR, 'followups.json'), JSON.stringify(followups, null, 2));

  // Summary for calibration (retention uses a 6-month observation window)
  const completed = trainees.filter((t) => t.completionDate).length;
  const certified = trainees.filter((t) => t.certificationDate).length;
  const placed = employees.filter((e) => ['Employed', 'Self-employed', 'Apprenticeship'].includes(e.outcome));
  const empSelf = employees.filter((e) => ['Employed', 'Self-employed'].includes(e.outcome));
  const withWindow = placed.filter((e) => {
    const t = trainees.find((tr) => tr.id === e.traineeId);
    const c = t ? monthsBetween(new Date(t.certificationDate), TODAY) : 0;
    const s = e.startDate && t ? monthsBetween(new Date(t.certificationDate), new Date(e.startDate)) : 0;
    return c - s >= 6;
  });
  const retained6 = withWindow.filter((e) => e.monthsInJob >= 6);
  const wages = empSelf.filter((e) => e.currentWage > 0).map((e) => e.currentWage);
  const avg = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
  const endedJobs = employees.flatMap((e) => e.jobs || []).filter((j) => j.endDate);
  const allJobs = employees.flatMap((e) => e.jobs || []);
  console.log('--- SkillTrack demonstration data generated ---');
  console.log(`trainees: ${trainees.length}  (in public/data)`);
  console.log(`completion: ${((completed / trainees.length) * 100).toFixed(1)}%   certified: ${((certified / trainees.length) * 100).toFixed(1)}%`);
  console.log(`employment (of certified): ${((empSelf.length / certified) * 100).toFixed(1)}%`);
  console.log(`retention 6M (of placed, 6m window): ${((retained6.length / withWindow.length) * 100).toFixed(1)}%`);
  console.log(`avg current wage: ${avg(wages)}`);
  console.log(`attrition events: ${endedJobs.length} of ${allJobs.length} jobs`);
  console.log(`self-employment records: ${employees.filter((e) => e.selfEmployment).length}`);
  console.log(`apprenticeship records: ${employees.filter((e) => e.apprenticeship).length}`);
  console.log(`non-placement reasons recorded: ${employees.filter((e) => e.nonPlacementReason).length}`);
  console.log(`outcome mix: ${Object.entries(employees.reduce((acc, e) => ({ ...acc, [e.outcome]: (acc[e.outcome] || 0) + 1 }), {})).map(([k, v]) => `${k} ${((v / employees.length) * 100).toFixed(1)}%`).join(' | ')}`);
}
main();
