// ============================================================================
// SkillTrack — raw data model (mirrors the JSON tables in /public/data)
// ----------------------------------------------------------------------------
// These types describe the persisted records exactly as stored. The UI never
// imports JSON directly; it consumes composed view models built by the
// SkillTrackService (see skilltrack.ts), which joins these tables by ID:
//
//   trainee.programId  → trainingPrograms.id
//   trainee.providerId → providers.id
//   employee.traineeId → trainees.id
//   employee.employerId → employers.id
//   followup.traineeId → trainees.id
// ============================================================================

export type TableName =
  | 'trainees'
  | 'employees'
  | 'trainingPrograms'
  | 'providers'
  | 'employers'
  | 'skills'
  | 'followups';

export interface TraineeRecord {
  /** Public registration number, e.g. ST-2024-MH-20341 — primary key. */
  id: string;
  fullName: string;
  gender: 'Female' | 'Male';
  age: number;
  phone: string;
  email: string;
  eshramUan?: string;
  district: string;
  division: string;
  category: string;
  education: string;
  trainingYear: string;
  /** → trainingPrograms.id */
  programId: string;
  /** → providers.id */
  providerId: string;
  batchId: string;
  enrolmentDate: string;
  /** DPDP-style consent captured at enrolment (records are consent-based). */
  consentStatus: 'granted' | 'withdrawn';
  consentDate: string;
  consentGiven?: boolean;
  consentVersion?: string;
  completionDate: string | null;
  certificationDate: string | null;
  nsqfLevel: number;
  attendanceRate: number;
  assessmentScore: number;
  skillRatings: { skill: string; score: number }[];
}

export type Outcome =
  | 'Employed'
  | 'Self-employed'
  | 'Apprenticeship'
  | 'Further Education'
  | 'Seeking Employment'
  | 'Unemployed'
  | 'Unknown';

/** One position held by a trainee (employment history). */
export interface JobRecord {
  /** → employers.id (null for self-employment / informal contracts) */
  employerId: string | null;
  designation: string;
  startDate: string;
  /** null while the job is ongoing */
  endDate: string | null;
  startingWage: number;
  endingWage: number;
  /** Attrition reason — present only on ended jobs */
  reasonForLeaving?: string | null;
}

export interface SelfEmploymentRecord {
  businessType: string;
  sector: string;
  startDate: string;
  location: string;
  revenueRange: string;
  businessStatus: 'Operating' | 'Struggling' | 'Closed';
  employees: number;
  challenges: string[];
  gstin?: string;
  udyamNumber?: string;
}

export interface ApprenticeshipRecord {
  /** → employers.id */
  employerId: string;
  startDate: string;
  endDate: string;
  stipend: number;
  completed: boolean;
  convertedToPermanent: boolean;
  conversionDate: string | null;
}

export type ContactAttemptStatus =
  | 'Contacted'
  | 'No response'
  | 'Unreachable'
  | 'Relocated'
  | 'Failed delivery'
  | 'Pending';

export interface ContactAttempt {
  date: string;
  channel: 'Phone call' | 'SMS' | 'WhatsApp' | 'Email' | 'Field visit';
  status: ContactAttemptStatus;
  note?: string;
}

export type VerificationLevel =
  | 'epfo_verified'
  | 'employer_verified'
  | 'document_verified'
  | 'self_reported'
  | 'unverified';

/** One post-training outcome record per certified trainee (employees.json). */
export interface EmploymentRecord {
  id: string;
  /** → trainees.id */
  traineeId: string;
  /** → employers.id (null for self-employed / unemployed / unknown) */
  employerId: string | null;
  outcome: Outcome;
  designation: string;
  startDate: string | null;
  startingWage: number;
  currentWage: number;
  monthsInJob: number;
  verification: VerificationLevel;
  lastVerifiedDate: string | null;
  /** Employment history — every position held since placement. */
  jobs?: JobRecord[];
  /** Explicitly recorded wages at 0/3/6/12 months after placement. */
  wageSnapshots?: { atMonths: number; wage: number }[];
  /** Present when outcome is Self-employed. */
  selfEmployment?: SelfEmploymentRecord | null;
  /** Present when the trainee entered (or converted from) an apprenticeship. */
  apprenticeship?: ApprenticeshipRecord | null;
  /** Present when outcome is Unemployed / Seeking Employment. */
  nonPlacementReason?: string | null;
  /** Skills from the curriculum actually used at work. */
  skillsUsedAtWork?: string[];
  /** Trainee-rated training-to-job relevance (1–5). */
  skillRelevance?: number | null;
  /** Employer feedback on the trainee's performance. */
  employerFeedback?: string | null;
}

export interface ProgramRecord {
  id: string;
  courseName: string;
  sector: string;
  nsqfLevel: number;
  durationHours: number;
  assessedSkills: string[];
}

export interface ProviderRecord {
  id: string;
  code: string;
  name: string;
  type: 'Government ITI' | 'Private VTP' | 'Polytechnic' | 'Industry Partner';
  centres: number;
  districtsCovered: string[];
  gstin?: string;
  udyamNumber?: string;
}

export interface EmployerRecord {
  id: string;
  name: string;
  sector: string;
  district: string;
  /** Employer validation status maintained by the empanelment desk. */
  verificationStatus: 'verified' | 'pending' | 'flagged';
  verifiedDate: string | null;
  verificationHistory: { date: string; action: string; note: string }[];
  gstin?: string;
  udyamNumber?: string;
}

export interface SkillGapRecord {
  id: string;
  skill: string;
  sector: string;
  employerDemand: number; // 0-100 demand index
  trainingSupply: number; // 0-100 supply index
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  note: string;
}

/**
 * Follow-up records (followups.json). Entries with status "Open" form the
 * operations queue; "Completed" entries double as the trainee follow-up log
 * shown in the profile modal.
 */
export interface FollowupRecord {
  id: string;
  /** → trainees.id */
  traineeId: string;
  milestone: string;
  dueDate: string;
  status: 'Open' | 'Completed';
  lastContact: string;
  contactMethod: string;
  /** Outcome of the most recent contact attempt. */
  contactStatus?: ContactAttemptStatus;
  priority: 'High' | 'Medium' | 'Low';
  /** Full contact-attempt history (phone/SMS/WhatsApp/email outcomes). */
  attempts?: ContactAttempt[];
  agent?: string;
  employmentConfirmed?: boolean;
  reportedWage?: number;
  jobSatisfaction?: 1 | 2 | 3 | 4 | 5;
  skillRelevanceRating?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

export interface Tables {
  trainees: TraineeRecord[];
  employees: EmploymentRecord[];
  programs: ProgramRecord[];
  providers: ProviderRecord[];
  employers: EmployerRecord[];
  skills: SkillGapRecord[];
  followups: FollowupRecord[];
}
