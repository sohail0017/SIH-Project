import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Card } from './Card';
import { useSkillTrack } from '../../store/DataProvider';
import { useFilters } from '../../store/FilterProvider';
import { AGE_GROUPS, EMPLOYMENT_STATUSES, FilterState } from '../../services/filters';
import { TRAINING_YEARS } from '../../data/reference';
import { formatNumber } from '../../lib/format';

const selectCls =
  'w-full min-w-0 py-1.5 pl-2.5 pr-7 text-xs bg-white border border-slate-200 rounded text-slate-700 focus:border-gov-400 outline-none transition-colors cursor-pointer';
const labelCls = 'block text-[10px] uppercase font-semibold tracking-wide text-slate-400 mb-1.5';
const dateCls =
  'w-full min-w-0 py-1.5 px-2 text-[11px] bg-white border border-slate-200 rounded text-slate-700 focus:border-gov-400 outline-none transition-colors';

/**
 * The platform-wide filter bar. Filter selections flow into the central
 * FilterProvider, and every data-driven view consumes the SAME filtered
 * dataset via useFilteredData() — no component filters on its own.
 */
export const GlobalFilterBar: React.FC = () => {
  const { data } = useSkillTrack();
  const { filters, setFilter, resetFilters, activeCount, filtered } = useFilters();

  // Options come from the UNFILTERED dataset so dropdowns never lose entries.
  const districtOptions = [...data.districtStats].sort((a, b) => a.district.localeCompare(b.district));
  const shownTrainees = filtered.metrics.totalTrainees;
  const shownCertified = filtered.totals.certified;

  const cells: React.ReactNode[] = [];

  cells.push(
    <div key="district" className="px-4 py-3 bg-white">
      <label className={labelCls}>District</label>
      <select
        aria-label="Filter by district"
        value={filters.district}
        onChange={(e) => setFilter('district', e.target.value)}
        className={selectCls}
      >
        <option value="all">All districts</option>
        {districtOptions.map((d) => (
          <option key={d.district} value={d.district}>
            {d.district}
          </option>
        ))}
      </select>
    </div>
  );

  cells.push(
    <div key="programme" className="px-4 py-3 bg-white">
      <label className={labelCls}>Programme / Course</label>
      <select
        aria-label="Filter by programme"
        value={filters.programme}
        onChange={(e) => setFilter('programme', e.target.value)}
        className={selectCls}
      >
        <option value="all">All programmes</option>
        {data.programs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.courseName}
          </option>
        ))}
      </select>
    </div>
  );

  cells.push(
    <div key="provider" className="px-4 py-3 bg-white">
      <label className={labelCls}>Training Provider</label>
      <select
        aria-label="Filter by training provider"
        value={filters.provider}
        onChange={(e) => setFilter('provider', e.target.value)}
        className={selectCls}
      >
        <option value="all">All providers</option>
        {data.providers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );

  cells.push(
    <div key="trainingYear" className="px-4 py-3 bg-white">
      <label className={labelCls}>Training Year</label>
      <select
        aria-label="Filter by training year"
        value={filters.trainingYear}
        onChange={(e) => setFilter('trainingYear', e.target.value)}
        className={selectCls}
      >
        <option value="all">All years</option>
        {TRAINING_YEARS.filter((y) => data.cohortTrends.some((c) => c.year === y)).map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );

  cells.push(
    <div key="gender" className="px-4 py-3 bg-white">
      <label className={labelCls}>Gender</label>
      <select
        aria-label="Filter by gender"
        value={filters.gender}
        onChange={(e) => setFilter('gender', e.target.value)}
        className={selectCls}
      >
        <option value="all">All genders</option>
        {data.demographics.gender.map((g) => (
          <option key={g.group} value={g.group}>
            {g.group}
          </option>
        ))}
      </select>
    </div>
  );

  cells.push(
    <div key="ageGroup" className="px-4 py-3 bg-white">
      <label className={labelCls}>Age Group</label>
      <select
        aria-label="Filter by age group"
        value={filters.ageGroup}
        onChange={(e) => setFilter('ageGroup', e.target.value)}
        className={selectCls}
      >
        <option value="all">All ages</option>
        {AGE_GROUPS.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
    </div>
  );

  cells.push(
    <div key="employmentStatus" className="px-4 py-3 bg-white">
      <label className={labelCls}>Employment Status</label>
      <select
        aria-label="Filter by employment status"
        value={filters.employmentStatus}
        onChange={(e) => setFilter('employmentStatus', e.target.value)}
        className={selectCls}
      >
        <option value="all">All statuses</option>
        {EMPLOYMENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );

  cells.push(
    <div key="certifiedDate" className="px-4 py-3 bg-white">
      <label className={labelCls}>Certification Date</label>
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          aria-label="Certification date from"
          value={filters.certifiedFrom}
          onChange={(e) => setFilter('certifiedFrom', e.target.value)}
          className={dateCls}
        />
        <span className="text-slate-300 text-[10px]">to</span>
        <input
          type="date"
          aria-label="Certification date to"
          value={filters.certifiedTo}
          onChange={(e) => setFilter('certifiedTo', e.target.value)}
          className={dateCls}
        />
      </div>
    </div>
  );

  return (
    <Card padded={false}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-100 border-y border-slate-100">
        {cells}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t border-slate-100 bg-slate-50/50">
        <p className="text-[11px] text-slate-500">
          {activeCount > 0 && (
            <>
              <span className="font-semibold text-slate-700">{activeCount}</span> filter
              {activeCount === 1 ? '' : 's'} active ·{' '}
            </>
          )}
          Showing <span className="font-semibold text-slate-700">{formatNumber(shownTrainees)}</span> of{' '}
          <span className="font-semibold text-slate-700">{formatNumber(data.metrics.totalTrainees)}</span>{' '}
          trainees · <span className="font-semibold text-slate-700">{formatNumber(shownCertified)}</span>{' '}
          certified
        </p>
        {activeCount > 0 && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-gov-700 hover:underline"
          >
            <RotateCcw className="w-3 h-3" /> Clear filters
          </button>
        )}
      </div>
    </Card>
  );
};

/** Shown when the filter selection matches no records at all. */
export const EmptyFilterState: React.FC<{ certifiedOnly?: boolean }> = ({ certifiedOnly }) => {
  const { resetFilters } = useFilters();
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-6 py-16 text-center">
      <p className="text-sm font-semibold text-slate-900">
        No {certifiedOnly ? 'certified trainees' : 'data'} available for the selected filters
      </p>
      <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
        No records match the current filter combination. Adjust or clear the filters to see
        Maharashtra-wide skilling outcomes.
      </p>
      <button
        onClick={resetFilters}
        className="mt-5 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold text-white bg-gov-700 hover:bg-gov-800 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Clear all filters
      </button>
    </div>
  );
};

export type { FilterState };
