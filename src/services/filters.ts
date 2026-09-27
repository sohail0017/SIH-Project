// ============================================================================
// SkillTrack — central filter definitions
// ----------------------------------------------------------------------------
// The single source of truth for platform-wide filtering. Filters apply to
// TRAINES first (they own district / programme / provider / gender / age /
// training year / certification date); employment and follow-up records are
// then joined via traineeId so every downstream statistic — KPIs, charts,
// tables, insights — is computed from the SAME filtered dataset.
//
// Do not implement filtering inside individual components: use
// useFilteredData() (store/FilterProvider) which composes SkillTrackData
// through SkillTrackService.getFilteredData().
// ============================================================================

import { Tables, Outcome } from './model';

export interface FilterState {
  /** 'all' | district name (exact data spelling) */
  district: string;
  /** 'all' | trainingPrograms.id */
  programme: string;
  /** 'all' | providers.id */
  provider: string;
  /** 'all' | e.g. '2023-24' */
  trainingYear: string;
  /** 'all' | 'Female' | 'Male' */
  gender: string;
  /** 'all' | '18-21' | '22-25' | '26+' */
  ageGroup: string;
  /** 'all' | one of the seven canonical Outcome values */
  employmentStatus: string;
  /** '' | ISO date — certification date range lower bound */
  certifiedFrom: string;
  /** '' | ISO date — certification date range upper bound */
  certifiedTo: string;
}

export const EMPTY_FILTERS: FilterState = {
  district: 'all',
  programme: 'all',
  provider: 'all',
  trainingYear: 'all',
  gender: 'all',
  ageGroup: 'all',
  employmentStatus: 'all',
  certifiedFrom: '',
  certifiedTo: '',
};

export const AGE_GROUPS = ['18-21', '22-25', '26+'] as const;

export const EMPLOYMENT_STATUSES: Outcome[] = [
  'Employed',
  'Self-employed',
  'Apprenticeship',
  'Further Education',
  'Seeking Employment',
  'Unemployed',
  'Unknown',
];

export function isFilterEmpty(filters: FilterState): boolean {
  return (
    filters.district === 'all' &&
    filters.programme === 'all' &&
    filters.provider === 'all' &&
    filters.trainingYear === 'all' &&
    filters.gender === 'all' &&
    filters.ageGroup === 'all' &&
    filters.employmentStatus === 'all' &&
    filters.certifiedFrom === '' &&
    filters.certifiedTo === ''
  );
}

export function activeFilterCount(filters: FilterState): number {
  return (
    (filters.district !== 'all' ? 1 : 0) +
    (filters.programme !== 'all' ? 1 : 0) +
    (filters.provider !== 'all' ? 1 : 0) +
    (filters.trainingYear !== 'all' ? 1 : 0) +
    (filters.gender !== 'all' ? 1 : 0) +
    (filters.ageGroup !== 'all' ? 1 : 0) +
    (filters.employmentStatus !== 'all' ? 1 : 0) +
    (filters.certifiedFrom !== '' ? 1 : 0) +
    (filters.certifiedTo !== '' ? 1 : 0)
  );
}

function matchesAgeGroup(age: number, group: string): boolean {
  if (group === '18-21') return age <= 21;
  if (group === '22-25') return age >= 22 && age <= 25;
  if (group === '26+') return age >= 26;
  return true;
}

/**
 * Apply the filter state to the raw tables. Trainees are filtered on their own
 * fields; the employment-status filter additionally joins employees.json via
 * traineeId (a secondary dataset that has no district/programme fields of its
 * own). Employees and follow-ups are then restricted to the surviving
 * trainees so every join downstream stays consistent.
 */
export function applyTableFilters(tables: Tables, filters: FilterState): Tables {
  if (isFilterEmpty(filters)) return tables;

  const empByTrainee = new Map(tables.employees.map((e) => [e.traineeId, e]));

  let matched = tables.trainees.filter((t) => {
    if (filters.district !== 'all' && t.district !== filters.district) return false;
    if (filters.programme !== 'all' && t.programId !== filters.programme) return false;
    if (filters.provider !== 'all' && t.providerId !== filters.provider) return false;
    if (filters.trainingYear !== 'all' && t.trainingYear !== filters.trainingYear) return false;
    if (filters.gender !== 'all' && t.gender !== filters.gender) return false;
    if (filters.ageGroup !== 'all' && !matchesAgeGroup(t.age, filters.ageGroup)) return false;
    // Date range applies to certification date; uncertified trainees cannot
    // fall inside a certification-date window.
    if (filters.certifiedFrom && (!t.certificationDate || t.certificationDate < filters.certifiedFrom))
      return false;
    if (filters.certifiedTo && (!t.certificationDate || t.certificationDate > filters.certifiedTo))
      return false;
    return true;
  });

  // Employment status lives on the employment record, not the trainee — join first.
  if (filters.employmentStatus !== 'all') {
    matched = matched.filter((t) => empByTrainee.get(t.id)?.outcome === filters.employmentStatus);
  }

  const ids = new Set(matched.map((t) => t.id));
  return {
    ...tables,
    trainees: matched,
    employees: tables.employees.filter((e) => ids.has(e.traineeId)),
    followups: tables.followups.filter((f) => ids.has(f.traineeId)),
  };
}
