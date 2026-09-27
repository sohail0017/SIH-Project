// ============================================================================
// SkillTrack — derivation engine
// ----------------------------------------------------------------------------
// Pure functions that compute every statistic, chart series and ranking the
// platform displays, directly from the raw JSON tables. Nothing here is
// hardcoded: when a trainee or employment record changes, every figure below
// changes with it.
// ============================================================================

import {
  TraineeRecord,
  EmploymentRecord,
  ProgramRecord,
  ProviderRecord,
  EmployerRecord,
  SkillGapRecord,
  Outcome,
} from './model';
import {
  DashboardMetrics,
  DistrictStat,
  EmploymentStatus,
  FunnelStage,
  OutcomeDistributionRow,
  SkillGap,
  TrainingProgram,
  TrainingProvider,
} from '../types';

// ---------------------------------------------------------------- helpers ---

export const CATEGORY_COLORS: Record<Outcome, string> = {
  Employed: '#1e40af',
  'Self-employed': '#047857',
  Apprenticeship: '#6d28d9',
  'Further Education': '#0e7490',
  'Seeking Employment': '#b45309',
  Unemployed: '#be123c',
  Unknown: '#94a3b8',
};

export const OUTCOME_TO_STATUS: Record<Outcome, EmploymentStatus> = {
  Employed: 'formal_employment',
  'Self-employed': 'self_employed',
  Apprenticeship: 'apprenticeship',
  'Further Education': 'higher_education',
  'Seeking Employment': 'seeking_employment',
  Unemployed: 'unemployed',
  Unknown: 'inactive',
};

export const OUTCOME_ORDER: Outcome[] = [
  'Employed',
  'Self-employed',
  'Apprenticeship',
  'Further Education',
  'Seeking Employment',
  'Unemployed',
  'Unknown',
];

export function monthsBetween(a: Date, b: Date): number {
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return Math.max(0, m);
}

const mean = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
const r1 = (n: number) => Math.round(n * 10) / 10;
const median = (nums: number[]) => {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const percentile75 = (nums: number[]) => {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.75))];
};

// ------------------------------------------------------------- joined facts ---

/** An employment record joined with its trainee's training context. */
export interface Fact {
  traineeId: string;
  programId: string;
  providerId: string;
  district: string;
  division: string;
  sector: string;
  trainingYear: string;
  gender: string;
  age: number;
  outcome: Outcome;
  employerId: string | null;
  designation: string;
  startDate: string | null;
  startingWage: number;
  currentWage: number;
  monthsInJob: number;
  verification: string;
  /** Months elapsed between certification and today. */
  monthsSinceCert: number;
  /** Months between certification and placement (null if never placed). */
  startLag: number | null;
}

export interface FactContext {
  placed: boolean;
  employedNow: boolean;
  verified: boolean;
  monthsSincePlacement: number; // valid when startLag !== null
}

export function buildFacts(
  trainees: TraineeRecord[],
  employees: EmploymentRecord[],
  programs: ProgramRecord[],
  today: Date
): Fact[] {
  const traineeById = new Map(trainees.map((t) => [t.id, t]));
  const sectorOf = new Map(programs.map((p) => [p.id, p.sector]));
  const facts: Fact[] = [];

  for (const emp of employees) {
    const t = traineeById.get(emp.traineeId);
    if (!t || !t.certificationDate) continue; // inner join; only certified trainees have outcomes
    const cert = new Date(t.certificationDate);
    const start = emp.startDate ? new Date(emp.startDate) : null;
    facts.push({
      traineeId: t.id,
      programId: t.programId,
      providerId: t.providerId,
      district: t.district,
      division: t.division,
      sector: sectorOf.get(t.programId) || 'Other',
      trainingYear: t.trainingYear,
      gender: t.gender,
      age: t.age,
      outcome: emp.outcome,
      employerId: emp.employerId,
      designation: emp.designation,
      startDate: emp.startDate,
      startingWage: emp.startingWage,
      currentWage: emp.currentWage,
      monthsInJob: emp.monthsInJob,
      verification: emp.verification,
      monthsSinceCert: monthsBetween(cert, today),
      startLag: start ? monthsBetween(cert, start) : null,
    });
  }
  return facts;
}

export function factContext(f: Fact): FactContext {
  const placed = ['Employed', 'Self-employed', 'Apprenticeship'].includes(f.outcome);
  return {
    placed,
    employedNow: f.outcome === 'Employed' || f.outcome === 'Self-employed',
    verified: ['epfo_verified', 'employer_verified', 'document_verified'].includes(f.verification),
    monthsSincePlacement: f.startLag !== null ? f.monthsSinceCert - f.startLag : 0,
  };
}

/** Estimated monthly wage `m` months after certification (linear between
 * starting and current wage across the job tenure); null if not employed then. */
export function wageAt(f: Fact, m: number): number | null {
  if (f.startLag === null || f.startLag > m) return null;
  const end = f.startLag + Math.max(f.monthsInJob, 1);
  if (m > end) return null;
  const t = (m - f.startLag) / Math.max(f.monthsInJob, 1);
  return Math.round(f.startingWage + (f.currentWage - f.startingWage) * Math.min(t, 1));
}

const PLACED_OUTCOMES: Outcome[] = ['Employed', 'Self-employed', 'Apprenticeship'];
const NOT_PLACED_WITH_HISTORY: Outcome[] = ['Unemployed', 'Seeking Employment'];

/** The months-after-certification window during which the trainee was in
 * employment, or null if never employed. */
function employmentWindow(f: Fact): [number, number] | null {
  if (f.startLag === null) return null;
  const start = f.startLag;
  if (f.outcome === 'Employed' || f.outcome === 'Self-employed') return [start, Infinity];
  if (f.outcome === 'Apprenticeship') return [start, start + Math.max(f.monthsInJob, 1)];
  if (NOT_PLACED_WITH_HISTORY.includes(f.outcome)) return [start, start + f.monthsInJob]; // left job, not re-employed
  return null; // Further Education / Unknown
}

/** Whether the trainee was in employment `m` months after certification. */
function inEmploymentAt(f: Fact, m: number, includeApprenticeship = true): boolean {
  if (f.monthsSinceCert < m) return false;
  if (!includeApprenticeship && f.outcome === 'Apprenticeship') return false;
  const w = employmentWindow(f);
  if (!w) return false;
  return w[0] <= m && m <= w[1];
}

/** Whether the trainee was still in their first job `m` months after certification. */
function retainedInFirstJobAt(f: Fact, m: number): boolean {
  if (f.monthsSinceCert < m) return false;
  if (!PLACED_OUTCOMES.includes(f.outcome) && !NOT_PLACED_WITH_HISTORY.includes(f.outcome)) return false;
  if (f.startLag === null || f.startLag > m) return false;
  return m <= f.startLag + Math.max(f.monthsInJob, 1);
}

// ----------------------------------------------------------------- metrics ---

export function computeMetrics(trainees: TraineeRecord[], facts: Fact[]): DashboardMetrics {
  const completed = trainees.filter((t) => t.completionDate).length;
  const certified = trainees.filter((t) => t.certificationDate).length;
  const employed = facts.filter((f) => factContext(f).employedNow);
  const placed = facts.filter((f) => factContext(f).placed);
  const window6 = placed.filter((f) => factContext(f).monthsSincePlacement >= 6);
  const retained6 = window6.filter((f) => f.monthsInJob >= 6);
  const wages = employed.map((f) => f.currentWage).filter((w) => w > 0);
  const verified = facts.filter((f) => factContext(f).verified);
  const growthRows = employed.filter((f) => f.monthsInJob >= 12 && f.startingWage > 0);

  return {
    totalTrainees: trainees.length,
    trainingCompleted: completed,
    completionRate: r1(pct(completed, trainees.length)),
    employmentRate: r1(pct(employed.length, certified)),
    // null = no denominator (e.g. nobody placed 6+ months ago) — "no data",
    // distinct from a genuine 0%.
    retentionRate6M: window6.length > 0 ? r1(pct(retained6.length, window6.length)) : null,
    averageMonthlyWage: wages.length > 0 ? Math.round(mean(wages)) : null,
    verifiedOutcomesRate: r1(pct(verified.length, facts.length)),
    wageGrowth12M: growthRows.length > 0 ? r1(mean(growthRows.map((f) => (f.currentWage - f.startingWage) / f.startingWage)) * 100) : null,
  };
}

export function computeFunnel(trainees: TraineeRecord[], facts: Fact[]): FunnelStage[] {
  const total = trainees.length;
  const completed = trainees.filter((t) => t.completionDate).length;
  const certified = trainees.filter((t) => t.certificationDate).length;
  const placed = facts.filter((f) => factContext(f).placed).length;
  const at30d = facts.filter((f) => inEmploymentAt(f, 1)).length;
  const at3 = facts.filter((f) => inEmploymentAt(f, 3)).length;
  const at6 = facts.filter((f) => inEmploymentAt(f, 6)).length;
  const at12 = facts.filter((f) => inEmploymentAt(f, 12)).length;

  return [
    { stage: 'Enrolled', count: total, percentage: r1(pct(total, total)), description: 'Candidates enrolled in MSInS-supported skilling programmes' },
    { stage: 'Training Completed', count: completed, percentage: r1(pct(completed, total)), description: 'Completed the full course curriculum' },
    { stage: 'Certified', count: certified, percentage: r1(pct(certified, total)), description: 'Assessed and certified against NSQF standards' },
    { stage: 'Placed', count: placed, percentage: r1(pct(placed, total)), description: 'Entered wage employment, self-employment or apprenticeship' },
    { stage: 'Employed at 30 Days', count: at30d, percentage: r1(pct(at30d, total)), description: 'In employment at the 30-day outcome checkpoint' },
    { stage: 'Employed at 3 Months', count: at3, percentage: r1(pct(at3, total)), description: 'Still in employment 90 days after placement' },
    { stage: 'Retained at 6 Months', count: at6, percentage: r1(pct(at6, total)), description: 'Continuous employment confirmed at the 180-day milestone' },
    { stage: 'Retained at 12 Months', count: at12, percentage: r1(pct(at12, total)), description: 'Longitudinal stability with recorded wage progression' },
  ];
}

export function computeDistribution(facts: Fact[]): OutcomeDistributionRow[] {
  return OUTCOME_ORDER.map((category) => {
    const count = facts.filter((f) => f.outcome === category).length;
    return {
      category,
      count,
      percentage: r1(pct(count, facts.length)),
      color: CATEGORY_COLORS[category],
    };
  });
}

export function computeEmploymentTrend(facts: Fact[]) {
  // month 1 approximates the 30-day outcome checkpoint.
  // null = no trainee has reached that month yet (gap in the line, NOT 0%).
  return [0, 1, 3, 6, 9, 12, 15, 18].map((m) => {
    const cohort = facts.filter((f) => f.monthsSinceCert >= m);
    const inEmployment = cohort.filter((f) => inEmploymentAt(f, m, false));
    const started = cohort.filter((f) => f.startLag !== null && f.startLag <= m);
    const retained = started.filter((f) => retainedInFirstJobAt(f, m));
    return {
      month: String(m),
      inEmployment: cohort.length > 0 ? r1(pct(inEmployment.length, cohort.length)) : null,
      retainedInFirstJob: started.length > 0 ? r1(pct(retained.length, started.length)) : null,
    };
  });
}

export function computeWageMilestones(facts: Fact[]) {
  const defs = [
    { milestone: 'Placement', at: 0 },
    { milestone: '3 Months', at: 3 },
    { milestone: '6 Months', at: 6 },
    { milestone: '12 Months', at: 12 },
    { milestone: '18 Months', at: 18 },
  ];
  // Fixed survivor cohort (18+ months of tenure) so the curve shows pure
  // wage growth without composition effects.
  const survivors = facts.filter((f) => f.startLag !== null && f.monthsInJob >= 18);
  const pool = survivors.length >= 40 ? survivors : facts;
  return defs.map(({ milestone, at }) => {
    const vals = pool.map((f) => wageAt(f, at)).filter((v): v is number => v !== null);
    // null when nobody was employed at that milestone (gap, NOT ₹0).
    return {
      milestone,
      averageWage: vals.length ? Math.round(mean(vals)) : null,
      medianWage: vals.length ? Math.round(median(vals)) : null,
      p75: vals.length ? Math.round(percentile75(vals)) : null,
    };
  });
}

export function computeWageBySector(facts: Fact[]) {
  const sectors = Array.from(new Set(facts.map((f) => f.sector))).sort();
  return sectors
    .map((sector) => {
      const rows = facts.filter((f) => f.sector === sector && factContext(f).employedNow);
      if (rows.length === 0) return null; // no employed trainees → no wages to report
      const at = (m: number) => rows.map((f) => wageAt(f, m)).filter((v): v is number => v !== null);
      return {
        sector,
        starting: Math.round(mean(rows.map((f) => f.startingWage))),
        month6: at(6).length ? Math.round(mean(at(6))) : null,
        month12: at(12).length ? Math.round(mean(at(12))) : null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}

export function computeCohortTrends(facts: Fact[]) {
  const years = Array.from(new Set(facts.map((f) => f.trainingYear))).sort();
  return years.map((year) => {
    const cohort = facts.filter((f) => f.trainingYear === year);
    const employed = cohort.filter((f) => factContext(f).employedNow);
    const placed = cohort.filter((f) => factContext(f).placed);
    const window6 = placed.filter((f) => factContext(f).monthsSincePlacement >= 6);
    const retained = window6.filter((f) => f.monthsInJob >= 6);
    const wages = employed.map((f) => f.currentWage).filter((w) => w > 0);
    return {
      year,
      employmentRate: r1(pct(employed.length, cohort.length)),
      retention6M: window6.length > 0 ? r1(pct(retained.length, window6.length)) : null,
      avgWage: wages.length > 0 ? Math.round(mean(wages)) : null,
    };
  });
}

// --------------------------------------------------------- district / division ---

export function computeDistrictStats(trainees: TraineeRecord[], facts: Fact[]): DistrictStat[] {
  const districts = Array.from(new Set(trainees.map((t) => t.district))).sort();
  return districts.map((district) => {
    const dt = trainees.filter((t) => t.district === district);
    const df = facts.filter((f) => f.district === district);
    const certified = dt.filter((t) => t.certificationDate).length;
    const employed = df.filter((f) => factContext(f).employedNow);
    const placed = df.filter((f) => factContext(f).placed);
    const window6 = placed.filter((f) => factContext(f).monthsSincePlacement >= 6);
    const retained = window6.filter((f) => f.monthsInJob >= 6);
    const verified = df.filter((f) => factContext(f).verified);
    const wages = employed.map((f) => f.currentWage).filter((w) => w > 0);

    const sectorCount = new Map<string, number>();
    df.forEach((f) => sectorCount.set(f.sector, (sectorCount.get(f.sector) || 0) + 1));
    const topSectors = [...sectorCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([s]) => s);

    const employmentRate = r1(pct(employed.length, certified));
    const grade = employmentRate >= 80 ? 'A+' : employmentRate >= 72 ? 'A' : employmentRate >= 64 ? 'B' : 'C';

    return {
      district,
      division: dt[0]?.division || '',
      trainees: dt.length,
      certified,
      completionRate: r1(pct(dt.filter((t) => t.completionDate).length, dt.length)),
      employmentRate,
      retention6M: r1(pct(retained.length, window6.length)),
      averageWage: wages.length > 0 ? Math.round(mean(wages)) : null,
      verificationRate: r1(pct(verified.length, df.length)),
      topSectors,
      grade,
    };
  });
}

export function computeDivisionSummary(trainees: TraineeRecord[], facts: Fact[]) {
  const divisions = Array.from(new Set(trainees.map((t) => t.division))).sort();
  return divisions.map((division) => {
    const df = facts.filter((f) => f.division === division);
    const employed = df.filter((f) => factContext(f).employedNow);
    const placed = df.filter((f) => factContext(f).placed);
    const window6 = placed.filter((f) => factContext(f).monthsSincePlacement >= 6);
    const retained = window6.filter((f) => f.monthsInJob >= 6);
    return {
      division,
      trainees: trainees.filter((t) => t.division === division).length,
      employmentRate: r1(pct(employed.length, df.length)),
      retention6M: window6.length > 0 ? r1(pct(retained.length, window6.length)) : null,
    };
  });
}

// ------------------------------------------------------------ programmes ---

export function computeProgramStats(
  trainees: TraineeRecord[],
  facts: Fact[],
  programs: ProgramRecord[],
  employers: EmployerRecord[]
): TrainingProgram[] {
  const employerName = new Map(employers.map((e) => [e.id, e.name]));
  return programs.map((p) => {
    const pt = trainees.filter((t) => t.programId === p.id);
    const pf = facts.filter((f) => f.programId === p.id);
    const certified = pt.filter((t) => t.certificationDate).length;
    const employed = pf.filter((f) => factContext(f).employedNow);
    const placed = pf.filter((f) => factContext(f).placed);
    const window6 = placed.filter((f) => factContext(f).monthsSincePlacement >= 6);
    const retained = window6.filter((f) => f.monthsInJob >= 6);
    const at12 = pf.map((f) => wageAt(f, 12)).filter((v): v is number => v !== null);

    const hireCount = new Map<string, number>();
    pf.forEach((f) => {
      if (f.employerId) hireCount.set(f.employerId, (hireCount.get(f.employerId) || 0) + 1);
    });
    const topEmployers = [...hireCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => employerName.get(id) || id);

    return {
      id: p.id,
      courseName: p.courseName,
      sector: p.sector,
      nsqfLevel: p.nsqfLevel,
      durationHours: p.durationHours,
      providerCount: new Set(pt.map((t) => t.providerId)).size,
      enrolled: pt.length,
      completed: pt.filter((t) => t.completionDate).length,
      certified,
      placed: placed.length,
      completionRate: r1(pct(pt.filter((t) => t.completionDate).length, pt.length)),
      employmentRate: r1(pct(employed.length, certified)),
      averageStartingWage: employed.length ? Math.round(mean(employed.map((f) => f.startingWage))) : null,
      averageWage12M:
        at12.length || employed.length
          ? Math.round(mean(at12.length ? at12 : employed.map((f) => f.currentWage)))
          : null,
      retentionRate6M: r1(pct(retained.length, window6.length)),
      topEmployers,
    };
  });
}

// -------------------------------------------------------------- providers ---

export interface ProviderBenchmarks {
  completion: number;
  employment: number;
  retention6M: number;
  wageGrowth12M: number | null;
  verification: number;
}

export function computeProviderStats(
  trainees: TraineeRecord[],
  facts: Fact[],
  providers: ProviderRecord[]
): { providers: TrainingProvider[]; benchmarks: ProviderBenchmarks } {
  const rows: TrainingProvider[] = providers.map((p) => {
    const pt = trainees.filter((t) => t.providerId === p.id);
    const pf = facts.filter((f) => f.providerId === p.id);
    const certified = pt.filter((t) => t.certificationDate).length;
    const employed = pf.filter((f) => factContext(f).employedNow);
    const placed = pf.filter((f) => factContext(f).placed);
    const window6 = placed.filter((f) => factContext(f).monthsSincePlacement >= 6);
    const retained = window6.filter((f) => f.monthsInJob >= 6);
    const verified = pf.filter((f) => factContext(f).verified);
    const growthRows = employed.filter((f) => f.monthsInJob >= 12 && f.startingWage > 0);

    const employmentRate = r1(pct(employed.length, certified));
    const verificationScore = Math.round(pct(verified.length, pf.length));
    const tier =
      employmentRate >= 80 && verificationScore >= 85 ? 'A+' : employmentRate >= 72 ? 'A' : employmentRate >= 64 ? 'B' : 'C';

    return {
      id: p.id,
      code: p.code,
      name: p.name,
      type: p.type,
      districtsCovered: p.districtsCovered,
      centres: p.centres,
      totalTrainees: pt.length,
      certified,
      completionRate: r1(pct(pt.filter((t) => t.completionDate).length, pt.length)),
      employmentRate,
      retentionRate6M: r1(pct(retained.length, window6.length)),
      averageStartingWage: employed.length ? Math.round(mean(employed.map((f) => f.startingWage))) : null,
      wageGrowth12M: growthRows.length
        ? r1(mean(growthRows.map((f) => (f.currentWage - f.startingWage) / f.startingWage)) * 100)
        : null,
      outcomeVerificationScore: verificationScore,
      performanceTier: tier as TrainingProvider['performanceTier'],
    };
  });

  // Benchmarks are averages over providers that actually have trainees in the
  // current (possibly filtered) dataset — providers with none must not drag
  // the reference lines toward 0.
  const withData = rows.filter((r) => r.totalTrainees > 0);
  const growthVals = withData
    .map((r) => r.wageGrowth12M)
    .filter((v): v is number => v !== null);
  const benchmarks: ProviderBenchmarks = {
    completion: r1(mean(withData.map((r) => r.completionRate))),
    employment: r1(mean(withData.map((r) => r.employmentRate))),
    retention6M: r1(mean(withData.map((r) => r.retentionRate6M))),
    wageGrowth12M: growthVals.length ? r1(mean(growthVals)) : null,
    verification: Math.round(mean(withData.map((r) => r.outcomeVerificationScore))),
  };
  return { providers: rows, benchmarks };
}

// -------------------------------------------------------------- skill gaps ---

export function computeSkillGaps(records: SkillGapRecord[]): SkillGap[] {
  return records.map((s) => ({
    id: s.id,
    skill: s.skill,
    sector: s.sector,
    employerDemand: s.employerDemand,
    trainingSupply: s.trainingSupply,
    gap: s.employerDemand - s.trainingSupply,
    priority: s.priority,
    note: s.note,
  }));
}

// ============================================================================
// Attrition, non-placement & demographic analytics
// ============================================================================

export interface ReasonCount {
  reason: string;
  count: number;
  share: number;
}

export interface AttritionStats {
  /** Ended jobs as a share of all jobs recorded. */
  jobChurnRate: number;
  /** Ended first jobs (trainee left and was not re-employed) as a share of
   *  first placements with a 6-month observation window. */
  attritionRate: number;
  reasons: ReasonCount[];
}

export function computeAttrition(trainees: TraineeRecord[], employees: EmploymentRecord[], today: Date): AttritionStats {
  const allJobs = employees.flatMap((e) => e.jobs || []);
  const ended = allJobs.filter((j) => j.endDate);

  const reasonCount = new Map<string, number>();
  ended.forEach((j) => {
    const r = j.reasonForLeaving || 'Other';
    reasonCount.set(r, (reasonCount.get(r) || 0) + 1);
  });
  const reasons: ReasonCount[] = [...reasonCount.entries()]
    .map(([reason, count]) => ({ reason, count, share: r1(pct(count, ended.length)) }))
    .sort((a, b) => b.count - a.count);

  // Trainee-level attrition: left first job AND not currently employed,
  // among first placements with >= 6 months of observation.
  const traineeById = new Map(trainees.map((t) => [t.id, t]));
  let atRisk = 0;
  let churned = 0;
  for (const e of employees) {
    const t = traineeById.get(e.traineeId);
    if (!t || !t.certificationDate) continue;
    const placed = PLACED_OUTCOMES.includes(e.outcome) || NOT_PLACED_WITH_HISTORY.includes(e.outcome);
    if (!placed || !e.startDate) continue;
    const cert = new Date(t.certificationDate);
    const start = new Date(e.startDate);
    if (monthsBetween(cert, today) - monthsBetween(cert, start) < 6) continue;
    atRisk += 1;
    if (NOT_PLACED_WITH_HISTORY.includes(e.outcome)) churned += 1;
  }

  return {
    jobChurnRate: r1(pct(ended.length, allJobs.length)),
    attritionRate: r1(pct(churned, atRisk)),
    reasons,
  };
}

export function computeNonPlacementReasons(employees: EmploymentRecord[]): ReasonCount[] {
  const group = employees.filter(
    (e) => (e.outcome === 'Unemployed' || e.outcome === 'Seeking Employment') && e.nonPlacementReason
  );
  const reasonCount = new Map<string, number>();
  group.forEach((e) => reasonCount.set(e.nonPlacementReason!, (reasonCount.get(e.nonPlacementReason!) || 0) + 1));
  return [...reasonCount.entries()]
    .map(([reason, count]) => ({ reason, count, share: r1(pct(count, group.length)) }))
    .sort((a, b) => b.count - a.count);
}

export interface DemographicRow {
  group: string;
  trainees: number;
  certified: number;
  completionRate: number;
  employmentRate: number;
  retention6M: number | null;
}

function demographicRows(
  trainees: TraineeRecord[],
  facts: Fact[],
  keyOf: (t: TraineeRecord) => string
): DemographicRow[] {
  const groups = Array.from(new Set(trainees.map(keyOf)));
  return groups.map((group) => {
    const gt = trainees.filter((t) => keyOf(t) === group);
    const ids = new Set(gt.map((t) => t.id));
    const gf = facts.filter((f) => ids.has(f.traineeId));
    const certified = gt.filter((t) => t.certificationDate).length;
    const employed = gf.filter((f) => factContext(f).employedNow);
    const placed = gf.filter((f) => factContext(f).placed);
    const window6 = placed.filter((f) => factContext(f).monthsSincePlacement >= 6);
    const retained = window6.filter((f) => f.monthsInJob >= 6);
    return {
      group,
      trainees: gt.length,
      certified,
      completionRate: r1(pct(gt.filter((t) => t.completionDate).length, gt.length)),
      employmentRate: r1(pct(employed.length, certified)),
      retention6M: window6.length > 0 ? r1(pct(retained.length, window6.length)) : null,
    };
  });
}

export function computeDemographics(trainees: TraineeRecord[], facts: Fact[]) {
  const ageGroup = (t: TraineeRecord) => (t.age <= 21 ? '18–21' : t.age <= 25 ? '22–25' : '26+');
  return {
    gender: demographicRows(trainees, facts, (t) => t.gender).sort((a, b) => b.trainees - a.trainees),
    age: demographicRows(trainees, facts, ageGroup).sort((a, b) => a.group.localeCompare(b.group)),
    category: demographicRows(trainees, facts, (t) => t.category).sort((a, b) => b.trainees - a.trainees),
  };
}

// ============================================================================
// Training relevance & skill usage
// ============================================================================

export interface SkillUsageRow {
  skill: string;
  sector: string;
  taught: number;
  used: number;
  usageRate: number;
}

/** Skills taught (curriculum) vs skills actually used at work. */
export function computeSkillUsage(
  trainees: TraineeRecord[],
  employees: EmploymentRecord[],
  programs: ProgramRecord[]
): SkillUsageRow[] {
  const employedByTrainee = new Map(
    employees
      .filter((e) => ['Employed', 'Self-employed', 'Apprenticeship'].includes(e.outcome))
      .map((e) => [e.traineeId, e])
  );

  const rows: SkillUsageRow[] = [];
  for (const p of programs) {
    const members = trainees.filter((t) => t.programId === p.id);
    const employedMembers = members.filter((t) => employedByTrainee.has(t.id));
    for (const skill of p.assessedSkills) {
      const used = employedMembers.filter(
        (t) => employedByTrainee.get(t.id)!.skillsUsedAtWork?.includes(skill)
      ).length;
      rows.push({
        skill,
        sector: p.sector,
        taught: employedMembers.length,
        used,
        usageRate: r1(pct(used, employedMembers.length)),
      });
    }
  }
  return rows.sort((a, b) => a.usageRate - b.usageRate);
}

export interface RelevanceRow {
  id: string;
  name: string;
  relevance: number;
  rated: number;
}

/** Trainee-rated training relevance (1–5 → %) by programme and provider. */
export function computeTrainingRelevance(
  trainees: TraineeRecord[],
  employees: EmploymentRecord[],
  programs: ProgramRecord[],
  providers: ProviderRecord[]
): { byProgram: RelevanceRow[]; byProvider: RelevanceRow[]; stateAverage: number } {
  const programById = new Map(programs.map((p) => [p.id, p.courseName]));
  const providerById = new Map(providers.map((p) => [p.id, p.name]));
  const traineeById = new Map(trainees.map((t) => [t.id, t]));

  const programScores = new Map<string, number[]>();
  const providerScores = new Map<string, number[]>();
  const all: number[] = [];

  for (const e of employees) {
    if (typeof e.skillRelevance !== 'number' || e.skillRelevance <= 0) continue;
    const t = traineeById.get(e.traineeId);
    if (!t) continue;
    all.push(e.skillRelevance);
    const ps = programScores.get(t.programId) || [];
    ps.push(e.skillRelevance);
    programScores.set(t.programId, ps);
    const vs = providerScores.get(t.providerId) || [];
    vs.push(e.skillRelevance);
    providerScores.set(t.providerId, vs);
  }

  const toRow = (scores: Map<string, number[]>, names: Map<string, string>): RelevanceRow[] =>
    [...scores.entries()]
      .map(([id, vals]) => ({
        id,
        name: names.get(id) || id,
        relevance: r1(mean(vals) * 20),
        rated: vals.length,
      }))
      .sort((a, b) => a.relevance - b.relevance);

  return {
    byProgram: toRow(programScores, programById),
    byProvider: toRow(providerScores, providerById),
    stateAverage: r1(mean(all) * 20),
  };
}

// ============================================================================
// Employer validation stats
// ============================================================================

export interface EmployerStat {
  id: string;
  name: string;
  sector: string;
  district: string;
  verificationStatus: 'verified' | 'pending' | 'flagged';
  verifiedDate: string | null;
  verificationHistory: { date: string; action: string; note: string }[];
  /** Trainees currently working at this employer. */
  currentEmployees: number;
  /** All trainees ever hired (any job in history). */
  totalHired: number;
}

export function computeEmployerStats(
  employers: EmployerRecord[],
  employees: EmploymentRecord[]
): EmployerStat[] {
  return employers.map((er) => {
    const current = employees.filter((e) => e.employerId === er.id && ['Employed', 'Apprenticeship'].includes(e.outcome));
    const everIds = new Set<string>();
    employees.forEach((e) => {
      if (e.employerId === er.id) everIds.add(e.traineeId);
      (e.jobs || []).forEach((j) => {
        if (j.employerId === er.id) everIds.add(e.traineeId);
      });
    });
    return {
      id: er.id,
      name: er.name,
      sector: er.sector,
      district: er.district,
      verificationStatus: er.verificationStatus,
      verifiedDate: er.verifiedDate,
      verificationHistory: er.verificationHistory,
      currentEmployees: current.length,
      totalHired: everIds.size,
    };
  });
}

// ============================================================================
// Wage progression summary (explicit snapshots)
// ============================================================================

export interface WageSummary {
  avgStarting: number | null;
  avg3M: number | null;
  avg6M: number | null;
  avg12M: number | null;
  avgCurrent: number | null;
  medianCurrent: number | null;
  avgIncreasePct: number | null;
}

export function computeWageSummary(employees: EmploymentRecord[]): WageSummary {
  const employed = employees.filter((e) => ['Employed', 'Self-employed'].includes(e.outcome) && e.startingWage > 0);
  const snapshot = (m: number) =>
    employed.map((e) => e.wageSnapshots?.find((s) => s.atMonths === m)?.wage).filter((v): v is number => !!v);
  const s0 = snapshot(0);
  const s3 = snapshot(3);
  const s6 = snapshot(6);
  const s12 = snapshot(12);
  const currents = employed.map((e) => e.currentWage).filter((w) => w > 0);
  const growthRows = employed.filter((e) => (e.wageSnapshots?.length ?? 0) > 0);
  const increases = growthRows.map((e) => (e.currentWage - e.startingWage) / e.startingWage);
  const startingPool = s0.length ? s0 : employed.map((e) => e.startingWage);

  return {
    avgStarting: startingPool.length ? Math.round(mean(startingPool)) : null,
    avg3M: s3.length ? Math.round(mean(s3)) : null,
    avg6M: s6.length ? Math.round(mean(s6)) : null,
    avg12M: s12.length ? Math.round(mean(s12)) : null,
    avgCurrent: currents.length ? Math.round(mean(currents)) : null,
    medianCurrent: currents.length ? Math.round(median(currents)) : null,
    avgIncreasePct: increases.length ? r1(mean(increases) * 100) : null,
  };
}

// ============================================================================
// Impact measurement
// ============================================================================

export interface ImpactMeasures {
  totalTrainees: number;
  completionRate: number;
  employmentGenerated: number;
  selfEmployment: number;
  apprenticeships: number;
  activeApprenticeships: number;
  retentionRate6M: number | null;
  wageGrowthPct: number | null;
  skillRelevancePct: number | null;
  verificationRate: number;
}

export function computeImpact(
  trainees: TraineeRecord[],
  facts: Fact[],
  employees: EmploymentRecord[]
): ImpactMeasures {
  const employed = facts.filter((f) => factContext(f).employedNow);
  const placed = facts.filter((f) => factContext(f).placed);
  const window6 = placed.filter((f) => factContext(f).monthsSincePlacement >= 6);
  const retained = window6.filter((f) => f.monthsInJob >= 6);
  const verified = facts.filter((f) => factContext(f).verified);
  const relevanceRows = employees.filter((e) => typeof e.skillRelevance === 'number' && e.skillRelevance! > 0);
  const wageSummary = computeWageSummary(employees);
  const apprenticeshipRecords = employees.filter((e) => e.apprenticeship);

  return {
    totalTrainees: trainees.length,
    completionRate: r1(pct(trainees.filter((t) => t.completionDate).length, trainees.length)),
    employmentGenerated: employed.length,
    selfEmployment: employees.filter((e) => e.outcome === 'Self-employed').length,
    apprenticeships: apprenticeshipRecords.length,
    activeApprenticeships: employees.filter((e) => e.outcome === 'Apprenticeship').length,
    retentionRate6M: window6.length > 0 ? r1(pct(retained.length, window6.length)) : null,
    wageGrowthPct: wageSummary.avgIncreasePct,
    skillRelevancePct: relevanceRows.length ? r1(mean(relevanceRows.map((e) => e.skillRelevance!)) * 20) : null,
    verificationRate: r1(pct(verified.length, facts.length)),
  };
}

// ============================================================================
// Insights, remedial actions & resource allocation
// ============================================================================

export interface Insight {
  id: string;
  area: string;
  severity: 'high' | 'medium' | 'low';
  finding: string;
  metric: string;
  reason: string;
  action: string;
}

export interface ResourceAllocation {
  coursesNeedingInvestment: { name: string; metric: number }[];
  districtsNeedingIntervention: { name: string; metric: number }[];
  skillsNeedingCapacity: { name: string; gap: number }[];
  providersNeedingImprovement: { name: string; metric: number }[];
  strongestDemand: { name: string; demand: number }[];
}

export interface FollowupOperations {
  open: number;
  overdue: number;
  completed: number;
  completionRate: number;
  unreachable: number;
}

export function computeFollowupOperations(
  followups: { status: string; dueDate: string; attempts?: { status: string }[] }[],
  today: Date
): FollowupOperations {
  const open = followups.filter((f) => f.status === 'Open');
  const completed = followups.filter((f) => f.status === 'Completed');
  const overdue = open.filter((f) => new Date(f.dueDate) < today);
  const unreachable = open.filter((f) =>
    (f.attempts || []).some((a) => a.status === 'Unreachable' || a.status === 'Relocated' || a.status === 'No response')
  );
  return {
    open: open.length,
    overdue: overdue.length,
    completed: completed.length,
    completionRate: r1(pct(completed.length, followups.length)),
    unreachable: unreachable.length,
  };
}

/**
 * Rule-based policy insights: each converts live data into a finding, the
 * supporting metric, a possible reason and a recommended (remedial) action.
 */
export function computeInsights(
  programs: TrainingProgram[],
  providers: TrainingProvider[],
  districts: DistrictStat[],
  skillGaps: SkillGap[],
  followupOps: FollowupOperations,
  stateEmployment: number,
  stateRetention: number | null
): Insight[] {
  const insights: Insight[] = [];

  // Only entities with certified trainees can be judged on outcomes —
  // anything else would produce misleading 0% findings.
  const judgedPrograms = programs.filter((p) => p.certified > 0);
  const judgedProviders = providers.filter((p) => p.certified > 0);

  // 1. Low-employment course → review curriculum
  const weakestCourse = [...judgedPrograms].sort((a, b) => a.employmentRate - b.employmentRate)[0];
  if (weakestCourse && weakestCourse.employmentRate < stateEmployment + 2) {
    insights.push({
      id: 'INS-COURSE',
      area: 'Programme',
      severity: weakestCourse.employmentRate < stateEmployment - 5 ? 'high' : 'medium',
      finding: `“${weakestCourse.courseName}” records the lowest employment conversion among programmes`,
      metric: `${weakestCourse.employmentRate}% employment vs ${stateEmployment}% state average`,
      reason: 'Curriculum may be misaligned with employer demand, or placement tie-ups for this course are weak.',
      action: 'Review the course curriculum with sector skill councils and strengthen employer linkages.',
    });
  }

  // 2. Largest skill gap → add training capacity
  const topGap = [...skillGaps].sort((a, b) => b.gap - a.gap)[0];
  if (topGap) {
    insights.push({
      id: 'INS-SKILL',
      area: 'Skills',
      severity: topGap.priority === 'Critical' ? 'high' : 'medium',
      finding: `“${topGap.skill}” shows the largest demand–supply shortfall in ${topGap.sector}`,
      metric: `Gap of ${topGap.gap} points (demand ${topGap.employerDemand} vs supply ${topGap.trainingSupply})`,
      reason: topGap.note,
      action: `Introduce or expand training capacity for ${topGap.skill} in high-demand districts.`,
    });
  }

  // 3. Low-retention district → investigate employers/job conditions
  const weakRetention = [...districts].filter((d) => d.trainees >= 15).sort((a, b) => a.retention6M - b.retention6M)[0];
  if (weakRetention && stateRetention !== null && weakRetention.retention6M < stateRetention - 8) {
    insights.push({
      id: 'INS-RETENTION',
      area: 'District',
      severity: 'high',
      finding: `${weakRetention.district} has the weakest 6-month retention among districts with meaningful intake`,
      metric: `${weakRetention.retention6M}% retention vs ${stateRetention}% state average`,
      reason: 'Local employers may offer unstable contracts, or wages/working conditions prompt early exits.',
      action: `Investigate employer and job conditions in ${weakRetention.district}; engage local employers on retention.`,
    });
  }

  // 4. Poor provider performance → provider intervention
  const weakProvider = [...judgedProviders].sort((a, b) => a.employmentRate - b.employmentRate)[0];
  if (weakProvider && (weakProvider.performanceTier === 'C' || weakProvider.employmentRate < stateEmployment - 6)) {
    insights.push({
      id: 'INS-PROVIDER',
      area: 'Provider',
      severity: 'medium',
      finding: `${weakProvider.name} is performing below the state benchmark on employment outcomes`,
      metric: `${weakProvider.employmentRate}% employment (tier ${weakProvider.performanceTier})`,
      reason: 'Training quality, industry tie-ups or candidate selection may need strengthening.',
      action: 'Initiate a provider performance review and provide improvement support before the next sanction cycle.',
    });
  }

  // 5. Low follow-up completion → field-team action (only when follow-ups
  //    exist in the current dataset — an empty queue is not "0% completion")
  const totalFollowups = followupOps.open + followupOps.completed;
  if (totalFollowups > 0 && (followupOps.completionRate < 75 || followupOps.overdue > 5)) {
    insights.push({
      id: 'INS-FOLLOWUP',
      area: 'Follow-ups',
      severity: followupOps.overdue > 8 ? 'high' : 'medium',
      finding: 'Follow-up completion is lagging, weakening outcome verification',
      metric: `${followupOps.completionRate}% completed · ${followupOps.overdue} overdue · ${followupOps.unreachable} unreachable`,
      reason: 'Field teams may be under-resourced in high-volume districts, or trainee contact details are outdated.',
      action: 'Deploy field-team action for pending and overdue follow-ups; refresh contact registers.',
    });
  }

  return insights;
}

/** Where to invest: courses, districts, skills, providers, demand. */
export function computeResourceAllocation(
  programs: TrainingProgram[],
  districts: DistrictStat[],
  skillGaps: SkillGap[],
  providers: TrainingProvider[]
): ResourceAllocation {
  // Rank only entities that actually have certified trainees in the current
  // dataset — entities without them would otherwise rank as misleading 0%.
  const judgedPrograms = programs.filter((p) => p.certified > 0);
  const judgedProviders = providers.filter((p) => p.certified > 0);
  return {
    coursesNeedingInvestment: [...judgedPrograms]
      .sort((a, b) => a.employmentRate - b.employmentRate)
      .slice(0, 3)
      .map((p) => ({ name: p.courseName, metric: p.employmentRate })),
    districtsNeedingIntervention: [...districts]
      .filter((d) => d.trainees >= 10 && d.certified > 0)
      .sort((a, b) => a.employmentRate + a.retention6M - (b.employmentRate + b.retention6M))
      .slice(0, 3)
      .map((d) => ({ name: d.district, metric: r1((d.employmentRate + d.retention6M) / 2) })),
    skillsNeedingCapacity: [...skillGaps]
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 3)
      .map((g) => ({ name: g.skill, gap: g.gap })),
    providersNeedingImprovement: [...judgedProviders]
      .sort((a, b) => a.employmentRate - b.employmentRate)
      .slice(0, 3)
      .map((p) => ({ name: p.name, metric: p.employmentRate })),
    strongestDemand: [...skillGaps]
      .sort((a, b) => b.employerDemand - a.employerDemand)
      .slice(0, 3)
      .map((g) => ({ name: `${g.skill} (${g.sector})`, demand: g.employerDemand })),
  };
}
