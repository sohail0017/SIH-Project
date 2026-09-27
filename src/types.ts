// ============================================================================
// SkillTrack — Maharashtra State Innovation Society (MSInS)
// Department of Skills, Employment, Entrepreneurship and Innovation
// Government of Maharashtra
// ----------------------------------------------------------------------------
// The platform is scoped to Maharashtra only. There is no state dimension;
// geography is Maharashtra -> District.
// ============================================================================

export const STATE_NAME = 'Maharashtra';

export type EmploymentStatus =
  | 'formal_employment'
  | 'self_employed'
  | 'apprenticeship'
  | 'higher_education'
  | 'seeking_employment'
  | 'unemployed'
  | 'inactive';

export type VerificationStatus =
  | 'epfo_verified'
  | 'employer_verified'
  | 'document_verified'
  | 'self_reported'
  | 'unverified';

export type OutcomeCategory =
  | 'Employed'
  | 'Self-employed'
  | 'Apprenticeship'
  | 'Further Education'
  | 'Seeking Employment'
  | 'Unemployed'
  | 'Unknown';

export interface EmploymentJob {
  employerId: string | null;
  employerName?: string;
  designation: string;
  startDate: string;
  endDate: string | null;
  startingWage: number;
  endingWage: number;
  reasonForLeaving?: string | null;
}

export interface SelfEmploymentDetails {
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

export interface ApprenticeshipDetails {
  employerName?: string;
  startDate: string;
  endDate: string;
  stipend: number;
  completed: boolean;
  convertedToPermanent: boolean;
  conversionDate: string | null;
}

export interface Trainee {
  id: string;
  traineeId: string;
  fullName: string;
  gender: 'Female' | 'Male' | 'Other';
  age: number;
  phone: string;
  email: string;
  eshramUan?: string;
  district: string;
  division: string;
  category: 'General' | 'OBC' | 'SC' | 'ST' | 'EWS' | 'SEBC' | 'VJNT';
  education: string;
  trainingYear: string;
  programId: string;
  programName: string;
  sector: string;
  providerId: string;
  providerName: string;
  batchId: string;
  enrolmentDate: string;
  /** DPDP-style consent captured at enrolment. */
  consentStatus: 'granted' | 'withdrawn';
  consentDate: string;
  consentGiven?: boolean;
  consentVersion?: string;
  completionDate: string;
  certificationDate: string;
  nsqfLevel: number;
  attendanceRate: number;
  assessmentScore: number;
  currentStatus: EmploymentStatus;
  verificationStatus: VerificationStatus;
  initialWage: number;
  currentWage: number;
  monthsInCurrentJob: number;
  employerName: string;
  designation: string;
  lastFollowupDate: string;
  nextFollowupDue: string;
  timelineEvents: TimelineEvent[];
  followupLogs: FollowupLog[];
  skillRatings: { skill: string; score: number }[];
  /** Employment history — every position since placement. */
  employmentHistory: EmploymentJob[];
  /** Recorded wages at 0/3/6/12 months after placement. */
  wageSnapshots: { atMonths: number; wage: number }[];
  /** Present for self-employed trainees. */
  selfEmployment?: SelfEmploymentDetails | null;
  /** Present when the trainee entered (or converted from) an apprenticeship. */
  apprenticeshipDetails?: ApprenticeshipDetails | null;
  /** Present for unemployed / seeking-employment trainees. */
  nonPlacementReason?: string | null;
  /** Curriculum skills actually used at work. */
  skillsUsedAtWork: string[];
  /** Trainee-rated training relevance (1–5). */
  skillRelevance?: number | null;
  /** Employer feedback on the trainee. */
  employerFeedback?: string | null;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  category: 'enrolled' | 'training' | 'certified' | 'placed' | 'employed' | 'retained' | 'wage';
  description: string;
  badge?: string;
  evidence?: string;
  verified: boolean;
}

export interface FollowupLog {
  id: string;
  date: string;
  channel: string;
  agent: string;
  employmentConfirmed: boolean;
  reportedWage: number;
  jobSatisfaction: 1 | 2 | 3 | 4 | 5;
  skillRelevanceRating: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

export interface TrainingProgram {
  id: string;
  courseName: string;
  sector: string;
  nsqfLevel: number;
  durationHours: number;
  providerCount: number;
  enrolled: number;
  completed: number;
  certified: number;
  placed: number;
  completionRate: number;
  employmentRate: number;
  averageStartingWage: number | null;
  averageWage12M: number | null;
  retentionRate6M: number;
  topEmployers: string[];
}

export interface TrainingProvider {
  id: string;
  code: string;
  name: string;
  type: 'Government ITI' | 'Private VTP' | 'Polytechnic' | 'Industry Partner';
  districtsCovered: string[];
  centres: number;
  totalTrainees: number;
  certified: number;
  completionRate: number;
  employmentRate: number;
  retentionRate6M: number;
  averageStartingWage: number | null;
  wageGrowth12M: number | null;
  outcomeVerificationScore: number;
  performanceTier: 'A+' | 'A' | 'B' | 'C';
}

export interface DashboardMetrics {
  totalTrainees: number;
  trainingCompleted: number;
  completionRate: number;
  employmentRate: number;
  /** null = no trainee has reached the 6-month observation window yet */
  retentionRate6M: number | null;
  /** null = no employed trainee with a recorded wage in the current dataset */
  averageMonthlyWage: number | null;
  verifiedOutcomesRate: number;
  /** null = no 12-month wage progression records */
  wageGrowth12M: number | null;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'alert' | 'update' | 'sync';
  linkToSection?: string;
}

// ---------------------------------------------------------------------------
// Outcome funnel & journey
// ---------------------------------------------------------------------------

export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number; // of total enrolled
  description: string;
}

export type JourneyStageId =
  | 'enrolled'
  | 'training'
  | 'certified'
  | 'placed'
  | 'employed'
  | 'retained'
  | 'wage';

export interface JourneyStep {
  id: JourneyStageId;
  label: string;
  status: 'complete' | 'current' | 'pending';
  meta?: string;
}

export interface OutcomeDistributionRow {
  category: OutcomeCategory;
  count: number;
  percentage: number;
  color: string;
}

// ---------------------------------------------------------------------------
// Skill gaps (Maharashtra sectors)
// ---------------------------------------------------------------------------

export interface SkillGap {
  id: string;
  skill: string;
  sector: string;
  employerDemand: number; // 0-100 index of employer demand
  trainingSupply: number; // 0-100 index of training supply
  gap: number; // demand - supply
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  note: string;
}

// ---------------------------------------------------------------------------
// Follow-up operations
// ---------------------------------------------------------------------------

export interface FollowUpItem {
  id: string;
  traineeName: string;
  traineeId: string;
  district: string;
  programme: string;
  dueDate: string;
  milestone: string;
  employmentStatus: 'Employed' | 'Self-employed' | 'Apprenticeship' | 'Further Education' | 'Seeking Employment' | 'Unemployed' | 'Unknown';
  lastContact: string;
  contactMethod: string;
  /** Outcome of the most recent attempt (Contacted / No response / …). */
  contactStatus?: string;
  priority: 'High' | 'Medium' | 'Low';
  status?: 'Open' | 'Completed';
  /** Full contact-attempt history. */
  attempts?: { date: string; channel: string; status: string; note?: string }[];
}

// ---------------------------------------------------------------------------
// District analytics
// ---------------------------------------------------------------------------

export interface DistrictStat {
  district: string;
  division: string;
  trainees: number;
  certified: number;
  completionRate: number;
  employmentRate: number;
  retention6M: number;
  averageWage: number | null;
  verificationRate: number;
  topSectors: string[];
  grade: 'A+' | 'A' | 'B' | 'C';
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface ReportDef {
  id: string;
  title: string;
  description: string;
  period: string;
  highlights: string[];
  icon: 'outcomes' | 'district' | 'programme' | 'skills' | 'impact';
}

// ---------------------------------------------------------------------------
// Flag for Follow-up & Reminder Logs
// ---------------------------------------------------------------------------

export interface ReminderLogItem {
  id: string;
  traineeId: string;
  traineeName: string;
  phone?: string;
  channel: 'WhatsApp' | 'SMS' | 'Email' | 'IVR';
  status: 'sent_simulated' | 'delivered_simulated' | 'failed';
  milestone?: string;
  sentAt: string;
  initiatedBy: string;
  notes?: string;
}

export interface CourseInput {
  id?: string;
  courseName: string;
  sector: string;
  nsqfLevel: number;
  durationHours: number;
  providerCount?: number;
  averageStartingWage?: number;
  isActive?: boolean;
}

export interface ProviderInput {
  id?: string;
  name: string;
  type: 'Government ITI' | 'Private VTP' | 'Polytechnic' | 'Industry Partner';
  districtsCovered: string[];
  centres: number;
  performanceTier: 'A+' | 'A' | 'B' | 'C';
  isActive?: boolean;
}

export interface BulkImportRow {
  fullName: string;
  gender: 'Female' | 'Male';
  age: number;
  phone?: string;
  email?: string;
  district: string;
  programId: string;
  providerId: string;
  trainingYear: string;
  outcome?: string;
  startingWage?: number;
  isValid?: boolean;
  validationError?: string;
  isDuplicate?: boolean;
}
