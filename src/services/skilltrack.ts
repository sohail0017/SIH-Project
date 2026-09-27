// ============================================================================
// SkillTrack — domain service
// ----------------------------------------------------------------------------
// Single entry point for all platform data. Loads the JSON tables through the
// backend adapter, composes relational view models for the UI (trainee ↔
// employment ↔ programme ↔ provider ↔ employer ↔ follow-ups), derives every
// statistic via the derivation engine, and exposes mutations that keep all
// consumers in sync.
//
// Components never import JSON or compute statistics themselves — they use
// the DataProvider context backed by this service.
// ============================================================================

import { backend } from './api';
import {
  Tables,
  TraineeRecord,
  EmploymentRecord,
  FollowupRecord,
  Outcome,
  ContactAttempt,
} from './model';
import { FilterState, applyTableFilters } from './filters';
import {
  Fact,
  buildFacts,
  factContext,
  computeMetrics,
  computeFunnel,
  computeDistribution,
  computeEmploymentTrend,
  computeWageMilestones,
  computeWageBySector,
  computeCohortTrends,
  computeDistrictStats,
  computeDivisionSummary,
  computeProgramStats,
  computeProviderStats,
  computeSkillGaps,
  computeAttrition,
  computeNonPlacementReasons,
  computeDemographics,
  computeSkillUsage,
  computeTrainingRelevance,
  computeEmployerStats,
  computeWageSummary,
  computeImpact,
  computeInsights,
  computeResourceAllocation,
  computeFollowupOperations,
  OUTCOME_TO_STATUS,
} from './derive';
import {
  Trainee,
  TimelineEvent,
  FollowUpItem,
  ReportDef,
  SkillGap,
  TrainingProgram,
  TrainingProvider,
  DashboardMetrics,
  DistrictStat,
  FunnelStage,
  OutcomeDistributionRow,
  EmploymentStatus,
  VerificationStatus,
} from '../types';
import { REPORT_DEFS } from '../data/reference';
import { formatNumber } from '../lib/format';

// ---------------------------------------------------------------- view types ---

export interface SkillTrackData {
  /** Trainees composed with employment, programme, provider and follow-ups. */
  trainees: Trainee[];
  employers: ReturnType<typeof computeEmployerStats>;
  skillGaps: SkillGap[];
  /** Open follow-up queue (completed entries are excluded). */
  followups: FollowUpItem[];
  metrics: DashboardMetrics;
  funnel: FunnelStage[];
  outcomeDistribution: OutcomeDistributionRow[];
  employmentTrend: { month: string; inEmployment: number | null; retainedInFirstJob: number | null }[];
  wageMilestones: { milestone: string; averageWage: number | null; medianWage: number | null; p75: number | null }[];
  wageBySector: { sector: string; starting: number; month6: number | null; month12: number | null }[];
  cohortTrends: { year: string; employmentRate: number; retention6M: number | null; avgWage: number | null }[];
  districtStats: DistrictStat[];
  divisionSummary: { division: string; trainees: number; employmentRate: number; retention6M: number | null }[];
  programs: TrainingProgram[];
  providers: TrainingProvider[];
  providerBenchmarks: {
    completion: number;
    employment: number;
    retention6M: number;
    wageGrowth12M: number;
    verification: number;
  };
  reports: ReportDef[];
  totals: { certified: number; placed: number };
  // ----- longitudinal analytics -------------------------------------------
  attrition: ReturnType<typeof computeAttrition>;
  nonPlacementReasons: ReturnType<typeof computeNonPlacementReasons>;
  demographics: ReturnType<typeof computeDemographics>;
  skillUsage: ReturnType<typeof computeSkillUsage>;
  trainingRelevance: ReturnType<typeof computeTrainingRelevance>;
  wageSummary: ReturnType<typeof computeWageSummary>;
  impact: ReturnType<typeof computeImpact>;
  insights: ReturnType<typeof computeInsights>;
  resourceAllocation: ReturnType<typeof computeResourceAllocation>;
  followupOps: ReturnType<typeof computeFollowupOperations>;
}

export interface NewTraineeInput {
  fullName: string;
  gender: 'Female' | 'Male';
  age: number;
  eshramUan?: string;
  district: string;
  programId: string;
  providerId: string;
  trainingYear: string;
  outcome: Outcome;
  phone?: string;
  email?: string;
  gstin?: string;
  udyamNumber?: string;
  category?: string;
  education?: string;
  nsqfLevel?: number;
  startingWage?: number;
  designation?: string;
  consentGiven?: boolean;
  consentVersion?: string;
}

// ---------------------------------------------------------------- service ---

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

export class SkillTrackService {
  private tables: Tables | null = null;
  private loading: Promise<Tables> | null = null;
  private listeners = new Set<() => void>();

  /** Load (or reload) all tables from the backend. */
  async load(force = false): Promise<Tables> {
    if (this.tables && !force) return this.tables;
    if (this.loading && !force) return this.loading;

    this.loading = (async () => {
      const [trainees, employees, trainingPrograms, providers, employers, skills, followups] =
        await Promise.all([
          backend.list<TraineeRecord>('trainees'),
          backend.list<EmploymentRecord>('employees'),
          backend.list<Tables['programs'][number]>('trainingPrograms'),
          backend.list<Tables['providers'][number]>('providers'),
          backend.list<Tables['employers'][number]>('employers'),
          backend.list<Tables['skills'][number]>('skills'),
          backend.list<FollowupRecord>('followups'),
        ]);
      this.tables = { trainees, employees, programs: trainingPrograms, providers, employers, skills, followups };
      this.loading = null;
      this.emit();
      return this.tables;
    })();
    return this.loading;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  getTables(): Tables | null {
    return this.tables;
  }

  /** Compose every view model and derived statistic from the loaded tables. */
  getData(): SkillTrackData | null {
    const t = this.tables;
    if (!t) return null;
    return this.compose(t);
  }

  /**
   * Compose the full dataset for a filter selection. Trainees are filtered on
   * their own fields; employment and follow-up records follow via traineeId,
   * so every KPI, chart, table and insight is calculated from the SAME
   * filtered dataset. With empty filters this is identical to getData().
   */
  getFilteredData(filters: FilterState): SkillTrackData | null {
    const t = this.tables;
    if (!t) return null;
    return this.compose(applyTableFilters(t, filters));
  }

  /** Single composition pipeline used for both filtered and unfiltered data. */
  private compose(t: Tables): SkillTrackData {
    const today = new Date();
    const facts: Fact[] = buildFacts(t.trainees, t.employees, t.programs, today);
    const { providers: providerRows, benchmarks } = computeProviderStats(t.trainees, facts, t.providers);
    const metrics = computeMetrics(t.trainees, facts);
    const allDistricts = computeDistrictStats(t.trainees, facts);
    const allPrograms = computeProgramStats(t.trainees, facts, t.programs, t.employers);
    const skillGaps = computeSkillGaps(t.skills);
    const followupOps = computeFollowupOperations(t.followups, today);

    // Secondary dimensions keep only entities with certified trainees in the
    // (possibly filtered) dataset. Without this, filtering by e.g. one
    // district would list all 35 others with misleading 0% rows, and
    // benchmarks/insights would be dragged toward 0.
    const districtStats = allDistricts.filter((d) => d.certified > 0);
    const programs = allPrograms.filter((p) => p.certified > 0);
    const providers = providerRows.filter((p) => p.totalTrainees > 0);

    return {
      trainees: this.composeTrainees(t, facts),
      employers: computeEmployerStats(t.employers, t.employees),
      skillGaps,
      followups: this.composeFollowups(t),
      metrics,
      funnel: computeFunnel(t.trainees, facts),
      outcomeDistribution: computeDistribution(facts),
      employmentTrend: computeEmploymentTrend(facts),
      wageMilestones: computeWageMilestones(facts),
      wageBySector: computeWageBySector(facts),
      cohortTrends: computeCohortTrends(facts),
      districtStats,
      divisionSummary: computeDivisionSummary(t.trainees, facts).filter((d) => d.trainees > 0),
      programs,
      providers,
      providerBenchmarks: benchmarks,
      reports: this.buildReports(t, facts),
      totals: {
        certified: t.trainees.filter((x) => x.certificationDate).length,
        placed: facts.filter((f) => factContext(f).placed).length,
      },
      attrition: computeAttrition(t.trainees, t.employees, today),
      nonPlacementReasons: computeNonPlacementReasons(t.employees),
      demographics: computeDemographics(t.trainees, facts),
      skillUsage: computeSkillUsage(t.trainees, t.employees, t.programs),
      trainingRelevance: computeTrainingRelevance(t.trainees, t.employees, t.programs, t.providers),
      wageSummary: computeWageSummary(t.employees),
      impact: computeImpact(t.trainees, facts, t.employees),
      insights: computeInsights(
        programs,
        providers,
        districtStats,
        skillGaps,
        followupOps,
        metrics.employmentRate,
        metrics.retentionRate6M
      ),
      resourceAllocation: computeResourceAllocation(programs, districtStats, skillGaps, providers),
      followupOps,
    };
  }

  // ------------------------------------------------------------- composition ---

  private composeTrainees(t: Tables, facts: Fact[]): Trainee[] {
    const factByTrainee = new Map(facts.map((f) => [f.traineeId, f]));
    const empByTrainee = new Map(t.employees.map((e) => [e.traineeId, e]));
    const programById = new Map(t.programs.map((p) => [p.id, p]));
    const providerById = new Map(t.providers.map((p) => [p.id, p]));
    const employerById = new Map(t.employers.map((e) => [e.id, e]));
    const entriesByTrainee = new Map<string, FollowupRecord[]>();
    for (const fu of t.followups) {
      const list = entriesByTrainee.get(fu.traineeId) || [];
      list.push(fu);
      entriesByTrainee.set(fu.traineeId, list);
    }

    return t.trainees.map((rec) => {
      const f = factByTrainee.get(rec.id);
      const emp = empByTrainee.get(rec.id);
      const program = programById.get(rec.programId);
      const provider = providerById.get(rec.providerId);
      const employer = f?.employerId ? employerById.get(f.employerId) : undefined;
      const entries = (entriesByTrainee.get(rec.id) || []).sort((a, b) =>
        b.lastContact.localeCompare(a.lastContact)
      );
      const open = entries.find((e) => e.status === 'Open');

      return {
        id: rec.id,
        traineeId: rec.id,
        fullName: rec.fullName,
        eshramUan: rec.eshramUan,
        gender: rec.gender,
        age: rec.age,
        phone: rec.phone,
        email: rec.email,
        district: rec.district,
        division: rec.division,
        category: rec.category as Trainee['category'],
        education: rec.education,
        trainingYear: rec.trainingYear,
        programId: rec.programId,
        programName: program?.courseName || rec.programId,
        sector: program?.sector || 'Other',
        providerId: rec.providerId,
        providerName: provider?.name || rec.providerId,
        batchId: rec.batchId,
        enrolmentDate: rec.enrolmentDate,
        consentStatus: (rec.consentStatus || 'granted') as Trainee['consentStatus'],
        consentDate: rec.consentDate || rec.enrolmentDate,
        consentGiven: (rec as unknown as { consentGiven?: boolean }).consentGiven ?? true,
        consentVersion: (rec as unknown as { consentVersion?: string }).consentVersion || 'v1.0-DPDP',
        completionDate: rec.completionDate || '',
        certificationDate: rec.certificationDate || '',
        nsqfLevel: rec.nsqfLevel,
        attendanceRate: rec.attendanceRate,
        assessmentScore: rec.assessmentScore,
        currentStatus: (f ? OUTCOME_TO_STATUS[f.outcome] : 'inactive') as EmploymentStatus,
        verificationStatus: (f ? f.verification : 'unverified') as VerificationStatus,
        initialWage: f?.startingWage || 0,
        currentWage: f?.currentWage || 0,
        monthsInCurrentJob: f?.monthsInJob || 0,
        employerName:
          employer?.name ||
          (f?.outcome === 'Self-employed' ? 'Own micro-enterprise (Udyam)' : '—'),
        designation: f?.designation || '—',
        lastFollowupDate: entries[0]?.lastContact || f?.startDate || '',
        nextFollowupDue: open?.dueDate || '',
        timelineEvents: this.buildTimeline(rec, f, employer?.name),
        followupLogs: entries.map((e) => ({
          id: e.id,
          date: e.lastContact,
          channel: e.contactMethod,
          agent: e.agent || 'District follow-up desk',
          employmentConfirmed: e.employmentConfirmed ?? false,
          reportedWage: e.reportedWage ?? 0,
          jobSatisfaction: (e.jobSatisfaction || 3) as 1 | 2 | 3 | 4 | 5,
          skillRelevanceRating: (e.skillRelevanceRating || 3) as 1 | 2 | 3 | 4 | 5,
          notes: e.notes || 'Follow-up completed.',
        })),
        skillRatings: rec.skillRatings,
        employmentHistory: (emp?.jobs || []).map((j) => ({
          employerId: j.employerId,
          employerName: j.employerId
            ? employerById.get(j.employerId)?.name || j.employerId
            : j.employerId === null && j.designation.includes('enterprise')
              ? 'Own micro-enterprise'
              : '—',
          designation: j.designation,
          startDate: j.startDate,
          endDate: j.endDate,
          startingWage: j.startingWage,
          endingWage: j.endingWage,
          reasonForLeaving: j.reasonForLeaving,
        })),
        wageSnapshots: emp?.wageSnapshots || [],
        selfEmployment: emp?.selfEmployment
          ? { ...emp.selfEmployment }
          : null,
        apprenticeshipDetails: emp?.apprenticeship
          ? {
              ...emp.apprenticeship,
              employerName: employerById.get(emp.apprenticeship.employerId)?.name,
            }
          : null,
        nonPlacementReason: emp?.nonPlacementReason || null,
        skillsUsedAtWork: emp?.skillsUsedAtWork || [],
        skillRelevance: emp?.skillRelevance ?? null,
        employerFeedback: emp?.employerFeedback || null,
      };
    });
  }

  /** The canonical journey timeline, derived from the record's own fields. */
  private buildTimeline(rec: TraineeRecord, f: Fact | undefined, employerName?: string): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    const program = this.tables?.programs.find((p) => p.id === rec.programId);
    const placed = f ? ['Employed', 'Self-employed', 'Apprenticeship'].includes(f.outcome) : false;

    events.push({
      id: `${rec.id}-EV1`,
      date: rec.enrolmentDate,
      title: `Enrolled in ${program?.courseName || 'training programme'}`,
      category: 'enrolled',
      description: `Enrolled at ${this.tables?.providers.find((p) => p.id === rec.providerId)?.name || 'the training centre'} with digital consent for outcome tracking.`,
      verified: true,
    });
    if (rec.completionDate) {
      events.push({
        id: `${rec.id}-EV2`,
        date: rec.completionDate,
        title: `Training completed (${program?.durationHours || 300} hours)`,
        category: 'training',
        description: `Completed the full curriculum with ${rec.attendanceRate}% attendance.`,
        verified: true,
      });
    }
    if (rec.certificationDate) {
      events.push({
        id: `${rec.id}-EV3`,
        date: rec.certificationDate,
        title: `Certified — NSQF Level ${rec.nsqfLevel}`,
        category: 'certified',
        description: `Assessed with a score of ${rec.assessmentScore}%.`,
        badge: `Score ${rec.assessmentScore}%`,
        verified: true,
      });
    }
    if (placed && f?.startDate) {
      events.push({
        id: `${rec.id}-EV4`,
        date: f.startDate,
        title:
          f.outcome === 'Self-employed'
            ? 'Registered micro-enterprise (Udyam)'
            : f.outcome === 'Apprenticeship'
              ? `NAPS apprenticeship at ${employerName || 'employer'}`
              : `Placed at ${employerName || 'employer'}`,
        category: 'placed',
        description: `${f.designation}.`,
        badge: f.startingWage > 0 ? `₹${f.startingWage.toLocaleString('en-IN')}/mo` : undefined,
        verified: f.verification !== 'unverified',
      });
    }
    if (placed && f && f.monthsInJob >= 1) {
      events.push({
        id: `${rec.id}-EV5`,
        date: f.startDate || '',
        title: 'Employment verified',
        category: 'employed',
        description:
          f.verification === 'epfo_verified'
            ? 'EPFO contributions confirm active employment.'
            : 'Employment confirmed through follow-up verification.',
        verified: f.verification !== 'unverified' && f.verification !== 'self_reported',
      });
    }
    if (placed && f && f.monthsInJob >= 6) {
      events.push({
        id: `${rec.id}-EV6`,
        date: f.startDate || '',
        title: 'Retained at 6 months',
        category: 'retained',
        description: 'Continuous employment confirmed at the 180-day milestone.',
        verified: true,
      });
    }
    if (placed && f && f.currentWage > f.startingWage && f.startingWage > 0) {
      const growth = Math.round(((f.currentWage - f.startingWage) / f.startingWage) * 100);
      events.push({
        id: `${rec.id}-EV7`,
        date: f.startDate || '',
        title: 'Wage progression',
        category: 'wage',
        description: `Monthly wage has grown by ${growth}% since placement.`,
        badge: `₹${f.currentWage.toLocaleString('en-IN')}/mo (+${growth}%)`,
        verified: f.verification !== 'unverified',
      });
    }
    return events;
  }

  private composeFollowups(t: Tables): FollowUpItem[] {
    const traineeById = new Map(t.trainees.map((x) => [x.id, x]));
    const programById = new Map(t.programs.map((p) => [p.id, p]));
    const factByTrainee = new Map(
      buildFacts(t.trainees, t.employees, t.programs, new Date()).map((f) => [f.traineeId, f])
    );

    return t.followups
      .filter((fu) => fu.status === 'Open' && traineeById.has(fu.traineeId))
      .map((fu) => {
        const trainee = traineeById.get(fu.traineeId)!;
        const program = programById.get(trainee.programId);
        const f = factByTrainee.get(fu.traineeId);
        return {
          id: fu.id,
          traineeName: trainee.fullName,
          traineeId: fu.traineeId,
          district: trainee.district,
          programme: program?.courseName || trainee.programId,
          dueDate: fu.dueDate,
          milestone: fu.milestone,
          employmentStatus: (f?.outcome || 'Unknown') as FollowUpItem['employmentStatus'],
          lastContact: this.formatShort(fu.lastContact),
          contactMethod: fu.contactMethod,
          contactStatus: fu.contactStatus || 'Pending',
          priority: fu.priority,
          status: fu.status,
          attempts: (fu.attempts || []).map((a) => ({
            date: a.date,
            channel: a.channel,
            status: a.status,
            note: a.note,
          })),
        };
      });
  }

  private formatShort(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private buildReports(t: Tables, facts: Fact[]): ReportDef[] {
    const metrics = computeMetrics(t.trainees, facts);
    const districts = computeDistrictStats(t.trainees, facts).filter((d) => d.certified > 0);
    const gaps = computeSkillGaps(t.skills);
    const ranked = [...districts].sort((a, b) => b.employmentRate - a.employmentRate);
    const critical = gaps.filter((g) => g.priority === 'Critical');
    const biggest = [...gaps].sort((a, b) => b.gap - a.gap)[0];
    const selfEmployed = facts.filter((f) => f.outcome === 'Self-employed').length;
    const growthRows = facts.filter((f) => factContext(f).employedNow && f.startingWage > 0);
    const wageGrowth =
      growthRows.length > 0
        ? Math.round(
            (growthRows.reduce((acc, f) => acc + (f.currentWage - f.startingWage) / f.startingWage, 0) /
              growthRows.length) *
              100
          )
        : null;
    const window6 = facts.filter((f) => factContext(f).placed && factContext(f).monthsSincePlacement >= 6);

    const highlights: Record<string, string[]> = {
      'RPT-01': [
        `${metrics.employmentRate}% of certified trainees in employment`,
        metrics.retentionRate6M === null
          ? 'No trainees have reached the 6-month milestone yet'
          : `${formatNumber(Math.round((metrics.retentionRate6M / 100) * window6.length))} trainees retained at 6 months`,
        `${metrics.verifiedOutcomesRate}% of outcomes independently verified`,
      ],
      'RPT-02': [
        ranked.length > 0
          ? `${ranked[0].district} leads with ${ranked[0].employmentRate}% employment`
          : 'No districts with certified trainees in the current selection',
        ranked.length > 1
          ? `Widest gap: ${ranked[ranked.length - 1].district} trails the state average`
          : 'Single district in the current selection',
        `All ${districts.length} district${districts.length === 1 ? '' : 's'} covered`,
      ],
      'RPT-03': [
        `${t.programs.length} programmes across priority sectors`,
        metrics.averageMonthlyWage === null
          ? 'No employed trainees with recorded wages in the current selection'
          : `Average starting wage ₹${formatNumber(metrics.averageMonthlyWage)}`,
        `${t.providers.length} empanelled providers`,
      ],
      'RPT-04': [
        `${critical.length} critical gaps flagged${biggest ? `, led by ${biggest.skill}` : ''}`,
        `Largest shortfall: ${biggest ? `${biggest.gap} points` : '—'}`,
        `${gaps.length} skills assessed across priority sectors`,
      ],
      'RPT-05': [
        `${formatNumber(this.totalsPlaced(facts))} livelihood outcomes from ${formatNumber(
          t.trainees.filter((x) => x.certificationDate).length
        )} certified trainees`,
        wageGrowth === null
          ? 'No wage progression records in the current selection'
          : `+${wageGrowth}% average wage growth after placement`,
        `${formatNumber(selfEmployed)} self-employment ventures supported`,
      ],
    };

    return REPORT_DEFS.map((def) => ({ ...def, highlights: highlights[def.id] || [] }));
  }

  private totalsPlaced(facts: Fact[]): number {
    return facts.filter((f) => factContext(f).placed).length;
  }

  // --------------------------------------------------------------- mutations ---

  /**
   * Add a new trainee (with a matching employment record). The trainee
   * immediately appears in the registry, search, outcomes, district stats and
   * every derived figure.
   */
  async addTrainee(input: NewTraineeInput): Promise<TraineeRecord> {
    const t = await this.load();
    const program = t.programs.find((p) => p.id === input.programId);
    const provider = t.providers.find((p) => p.id === input.providerId);
    if (!program || !provider) throw new Error('Unknown programme or provider');

    const seq = 20000 + Math.floor(Math.random() * 79999);
    const id = `ST-${input.trainingYear.slice(0, 4)}-MH-${seq}`;
    const start = new Date();
    const enrol = new Date(start.getFullYear() - 1, 6, 15); // start of the previous academic year
    const placed = ['Employed', 'Self-employed', 'Apprenticeship'].includes(input.outcome);

    const trainee: TraineeRecord = {
      id,
      fullName: input.fullName.trim(),
      gender: input.gender,
      age: input.age,
      phone: input.phone || '+91 98200 00000',
      email: input.email || `${input.fullName.trim().toLowerCase().replace(/\s+/g, '.')}.${seq}@example.in`,
      eshramUan: input.eshramUan?.trim() || undefined,
      district: input.district,
      division: t.trainees.find((x) => x.district === input.district)?.division || 'Pune',
      category: input.category || 'General',
      education: input.education || 'Class 12 Pass',
      trainingYear: input.trainingYear,
      programId: input.programId,
      providerId: input.providerId,
      batchId: `B-${input.trainingYear.slice(2, 7)}-NEW`,
      enrolmentDate: enrol.toISOString().slice(0, 10),
      consentStatus: 'granted',
      consentDate: enrol.toISOString().slice(0, 10),
      consentGiven: input.consentGiven ?? true,
      consentVersion: input.consentVersion || 'v1.0-DPDP',
      completionDate: addDaysISO(-150),
      certificationDate: addDaysISO(-140),
      nsqfLevel: input.nsqfLevel || program.nsqfLevel,
      attendanceRate: 90,
      assessmentScore: 80,
      skillRatings: program.assessedSkills.slice(0, 3).map((skill) => ({ skill, score: 78 })),
    };

    const calculatedBaseWage = Math.round((program.durationHours * 40 + 6000) / 100) * 100;
    const baseWage = input.startingWage !== undefined ? input.startingWage : calculatedBaseWage;
    const resolvedDesignation = input.designation || (placed ? (input.outcome === 'Self-employed' ? 'Founder — own micro-enterprise' : 'Recently placed') : input.outcome === 'Further Education' ? 'Pursuing further education' : 'Actively seeking placement');

    const employment: EmploymentRecord = {
      id: `EMP-${seq}`,
      traineeId: id,
      employerId: null,
      outcome: input.outcome,
      designation: resolvedDesignation,
      startDate: placed ? todayISO() : null,
      startingWage: placed ? baseWage : 0,
      currentWage: placed ? baseWage : 0,
      monthsInJob: 0,
      verification: 'self_reported',
      lastVerifiedDate: null,
      jobs: placed
        ? [
            {
              employerId: null,
              designation: input.outcome === 'Self-employed' ? 'Founder — own micro-enterprise' : 'Recently placed',
              startDate: todayISO(),
              endDate: null,
              startingWage: baseWage,
              endingWage: baseWage,
              reasonForLeaving: null,
            },
          ]
        : [],
      wageSnapshots: placed ? [{ atMonths: 0, wage: baseWage }] : [],
      // Business details are placeholders because the current enrolment form only
      // collects optional identifiers. Do not treat these values as verified.
      selfEmployment:
        input.outcome === 'Self-employed'
          ? {
              businessType: 'Not recorded',
              sector: program.sector,
              startDate: '',
              location: input.district,
              revenueRange: 'Not recorded',
              businessStatus: 'Operating',
              employees: 0,
              challenges: [],
              gstin: input.gstin,
              udyamNumber: input.udyamNumber,
            }
          : null,
      apprenticeship: null,
      nonPlacementReason: ['Unemployed', 'Seeking Employment'].includes(input.outcome)
        ? 'Other'
        : null,
      skillsUsedAtWork: [],
      skillRelevance: null,
      employerFeedback: null,
    };

    await backend.insert('trainees', trainee);
    await backend.insert('employees', employment);

    // Update in-memory tables so all consumers recompute immediately.
    this.tables = { ...this.tables!, trainees: [...this.tables!.trainees, trainee], employees: [...this.tables!.employees, employment] };
    this.emit();
    return trainee;
  }

  /** Update complete trainee profile & employment record with database persistence */
  async updateTrainee(
    id: string,
    traineePatch: Partial<TraineeRecord>,
    employmentPatch?: Partial<EmploymentRecord>
  ): Promise<void> {
    const t = await this.load();
    const trainee = t.trainees.find((x) => x.id === id);
    if (!trainee) throw new Error(`Trainee ${id} not found`);

    if (Object.keys(traineePatch).length > 0) {
      await backend.update<TraineeRecord>('trainees', id, traineePatch);
      this.tables = {
        ...this.tables!,
        trainees: this.tables!.trainees.map((x) => (x.id === id ? { ...x, ...traineePatch } : x)),
      };
    }

    if (employmentPatch && Object.keys(employmentPatch).length > 0) {
      const emp = t.employees.find((e) => e.traineeId === id);
      if (emp) {
        await backend.update<EmploymentRecord>('employees', emp.id, employmentPatch);
        this.tables = {
          ...this.tables!,
          employees: this.tables!.employees.map((e) => (e.id === emp.id ? { ...e, ...employmentPatch } : e)),
        };
      }
    }

    this.emit();
  }

  /** Delete a trainee and all associated records with database persistence */
  async deleteTrainee(id: string): Promise<void> {
    const t = await this.load();
    await backend.delete('trainees', id);

    const emp = t.employees.find((e) => e.traineeId === id);
    if (emp) {
      await backend.delete('employees', emp.id);
    }

    const fus = t.followups.filter((f) => f.traineeId === id);
    for (const fu of fus) {
      await backend.delete('followups', fu.id);
    }

    this.tables = {
      ...this.tables!,
      trainees: this.tables!.trainees.filter((x) => x.id !== id),
      employees: this.tables!.employees.filter((e) => e.traineeId !== id),
      followups: this.tables!.followups.filter((f) => f.traineeId !== id),
    };
    this.emit();
  }

  /** Update a trainee's employment outcome; every statistic recomputes. */
  async updateEmploymentOutcome(traineeId: string, outcome: Outcome): Promise<void> {
    const t = await this.load();
    const record = t.employees.find((e) => e.traineeId === traineeId);
    if (!record) throw new Error(`No employment record for ${traineeId}`);

    const placed = ['Employed', 'Self-employed', 'Apprenticeship'].includes(outcome);
    const patch: Partial<EmploymentRecord> = {
      outcome,
      designation: placed
        ? record.designation === '—' || record.designation === 'Seeking placement'
          ? 'Recently placed'
          : record.designation
        : outcome === 'Further Education'
          ? 'Pursuing further education'
          : 'Seeking placement',
      employerId: placed ? record.employerId : null,
      currentWage: placed ? record.currentWage || record.startingWage : 0,
      monthsInJob: placed ? record.monthsInJob : 0,
      verification: 'self_reported',
      lastVerifiedDate: null,
    };
    await backend.update<EmploymentRecord>('employees', record.id, patch);
    this.tables = {
      ...this.tables!,
      employees: this.tables!.employees.map((e) => (e.id === record.id ? { ...e, ...patch } : e)),
    };
    this.emit();
  }

  /** Record a follow-up outcome: updates employment + completes the entry. */
  async recordFollowupOutcome(
    followupId: string,
    outcome: Outcome,
    notes: string
  ): Promise<void> {
    const t = await this.load();
    const fu = t.followups.find((f) => f.id === followupId);
    if (!fu) throw new Error(`Unknown follow-up ${followupId}`);

    await this.updateEmploymentOutcome(fu.traineeId, outcome);
    const patch: Partial<FollowupRecord> = {
      status: 'Completed',
      lastContact: todayISO(),
      employmentConfirmed: ['Employed', 'Self-employed', 'Apprenticeship'].includes(outcome),
      reportedWage: ['Employed', 'Self-employed', 'Apprenticeship'].includes(outcome)
        ? t.employees.find((e) => e.traineeId === fu.traineeId)?.currentWage || 0
        : 0,
      agent: 'District follow-up desk',
      notes,
    };
    await backend.update<FollowupRecord>('followups', followupId, patch);
    this.tables = {
      ...this.tables!,
      followups: this.tables!.followups.map((f) => (f.id === followupId ? { ...f, ...patch } : f)),
    };
    this.emit();
  }

  /** Log a contact attempt against an open follow-up. */
  async contactFollowup(followupId: string): Promise<void> {
    const t = await this.load();
    const fu = t.followups.find((f) => f.id === followupId);
    if (!fu) return;
    const patch: Partial<FollowupRecord> = { lastContact: todayISO() };
    await backend.update<FollowupRecord>('followups', followupId, patch);
    this.tables = {
      ...this.tables!,
      followups: this.tables!.followups.map((f) => (f.id === followupId ? { ...f, ...patch } : f)),
    };
    this.emit();
  }

  /** Record a structured contact attempt (channel + outcome incl. unreachable/relocated). */
  async logFollowupAttempt(
    followupId: string,
    attempt: { channel: ContactAttempt['channel']; status: ContactAttempt['status']; note?: string }
  ): Promise<void> {
    const t = await this.load();
    const fu = t.followups.find((f) => f.id === followupId);
    if (!fu) return;
    const entry: ContactAttempt = { date: todayISO(), ...attempt };
    const attempts = [...(fu.attempts || []), entry];
    const patch: Partial<FollowupRecord> = {
      attempts,
      lastContact: todayISO(),
      contactMethod: attempt.channel,
      contactStatus: attempt.status,
    };
    await backend.update<FollowupRecord>('followups', followupId, patch);
    this.tables = {
      ...this.tables!,
      followups: this.tables!.followups.map((f) => (f.id === followupId ? { ...f, ...patch } : f)),
    };
    this.emit();
  }

  /** Push a follow-up's due date forward. */
  async rescheduleFollowup(followupId: string, days: number): Promise<void> {
    const t = await this.load();
    const fu = t.followups.find((f) => f.id === followupId);
    if (!fu) return;
    const next = new Date(fu.dueDate);
    next.setDate(next.getDate() + days);
    const patch: Partial<FollowupRecord> = { dueDate: next.toISOString().slice(0, 10) };
    await backend.update<FollowupRecord>('followups', followupId, patch);
    this.tables = {
      ...this.tables!,
      followups: this.tables!.followups.map((f) => (f.id === followupId ? { ...f, ...patch } : f)),
    };
    this.emit();
  }

  /**
   * Submit a periodic employment follow-up (e.g. from WhatsApp flow or form).
   * Appends an immutable record to the trainee's follow-up history and updates current employment facts.
   */
  async recordPeriodicFollowup(input: {
    traineeId: string;
    outcome: Outcome;
    reportedWage?: number;
    employerName?: string;
    verification?: string;
    feedback?: string;
    notes?: string;
    channel?: string;
    milestone?: string;
    jobSatisfaction?: number;
    skillRelevanceRating?: number;
  }): Promise<void> {
    const res = await fetch('/api/followups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to record follow-up' }));
      throw new Error(err.error || 'Failed to record follow-up');
    }
    const data = await res.json();
    const newFollowup = data.followup;

    // Update in-memory tables
    const t = await this.load();
    const existingFu = t.followups.find((f) => f.id === newFollowup.id);
    const updatedFollowups = existingFu
      ? t.followups.map((f) => (f.id === newFollowup.id ? newFollowup : f))
      : [newFollowup, ...t.followups];

    const placed = ['Employed', 'Self-employed', 'Apprenticeship'].includes(input.outcome);
    const updatedEmployees = t.employees.map((e) => {
      if (e.traineeId === input.traineeId) {
        return {
          ...e,
          outcome: input.outcome,
          currentWage: placed && input.reportedWage !== undefined ? input.reportedWage : e.currentWage,
          lastVerifiedDate: new Date().toISOString().slice(0, 10),
          verification: (input.channel === 'WhatsApp' ? 'self_reported' : 'document_verified') as import('../types').VerificationStatus,
        };
      }
      return e;
    });

    this.tables = {
      ...this.tables!,
      followups: updatedFollowups,
      employees: updatedEmployees,
    };
    this.emit();
  }

  /** Dispatch a simulated reminder to a trainee and log in SQLite */
  async sendSimulatedReminder(input: {
    traineeId: string;
    traineeName: string;
    phone?: string;
    channel?: 'WhatsApp' | 'SMS' | 'Email' | 'IVR';
    milestone?: string;
    notes?: string;
  }): Promise<import('../types').ReminderLogItem> {
    const res = await fetch('/api/reminders/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      throw new Error('Failed to record simulated reminder');
    }
    const data = await res.json();
    return data.log;
  }

  /** Dispatch bulk simulated reminders to multiple trainees */
  async sendBulkSimulatedReminders(
    trainees: { id: string; fullName: string; phone?: string }[],
    channel: 'WhatsApp' | 'SMS' | 'Email' | 'IVR' = 'WhatsApp',
    milestone = 'Overdue'
  ): Promise<number> {
    const res = await fetch('/api/reminders/bulk-simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ trainees, channel, milestone }),
    });
    if (!res.ok) {
      throw new Error('Failed to send bulk reminders');
    }
    const data = await res.json();
    return data.count;
  }

  /** Fetch all simulated reminder logs from SQLite */
  async fetchReminderLogs(traineeId?: string): Promise<import('../types').ReminderLogItem[]> {
    const url = traineeId ? `/api/reminders?traineeId=${encodeURIComponent(traineeId)}` : '/api/reminders';
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.logs || [];
  }

  /** Add a new training course / programme */
  async addCourse(input: import('../types').CourseInput): Promise<void> {
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('Failed to add course');
    const data = await res.json();
    const t = await this.load();
    this.tables = { ...this.tables!, programs: [...t.programs, data.course] };
    this.emit();
  }

  /** Update an existing training course */
  async updateCourse(id: string, patch: Partial<import('../types').CourseInput>): Promise<void> {
    const res = await fetch(`/api/courses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error('Failed to update course');
    const data = await res.json();
    const t = await this.load();
    this.tables = {
      ...this.tables!,
      programs: t.programs.map((p) => (p.id === id ? { ...p, ...data.course } : p)),
    };
    this.emit();
  }

  /** Delete a training course */
  async deleteCourse(id: string): Promise<void> {
    const res = await fetch(`/api/courses/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete course');
    const t = await this.load();
    this.tables = {
      ...this.tables!,
      programs: t.programs.filter((p) => p.id !== id),
    };
    this.emit();
  }

  /** Add a new training provider */
  async addProvider(input: import('../types').ProviderInput): Promise<void> {
    const res = await fetch('/api/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('Failed to add provider');
    const data = await res.json();
    const t = await this.load();
    this.tables = { ...this.tables!, providers: [...t.providers, data.provider] };
    this.emit();
  }

  /** Update an existing provider */
  async updateProvider(id: string, patch: Partial<import('../types').ProviderInput>): Promise<void> {
    const res = await fetch(`/api/providers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error('Failed to update provider');
    const data = await res.json();
    const t = await this.load();
    this.tables = {
      ...this.tables!,
      providers: t.providers.map((p) => (p.id === id ? { ...p, ...data.provider } : p)),
    };
    this.emit();
  }

  /** Delete a provider */
  async deleteProvider(id: string): Promise<void> {
    const res = await fetch(`/api/providers/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete provider');
    const t = await this.load();
    this.tables = {
      ...this.tables!,
      providers: t.providers.filter((p) => p.id !== id),
    };
    this.emit();
  }

  /** Bulk import parsed trainees */
  async bulkImportTrainees(trainees: unknown[]): Promise<number> {
    const res = await fetch('/api/trainees/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ trainees }),
    });
    if (!res.ok) throw new Error('Failed to bulk import trainees');
    const data = await res.json();
    await this.load(true);
    return data.count;
  }

  /** Discard local mutations and reload the seed JSON files. */
  async resetData(): Promise<void> {
    await backend.reset();
    await this.load(true);
  }
}

/** Shared service instance used by the DataProvider. */
export const skilltrack = new SkillTrackService();
