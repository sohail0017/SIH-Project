import React, { createContext, useContext, useMemo, useState } from 'react';
import { skilltrack, SkillTrackData } from '../services/skilltrack';
import { FilterState, EMPTY_FILTERS, activeFilterCount } from '../services/filters';
import { useSkillTrack } from './DataProvider';

interface FilterContextValue {
  filters: FilterState;
  setFilter: (key: keyof FilterState, value: string) => void;
  resetFilters: () => void;
  activeCount: number;
  /** The single filtered dataset every data-driven view must consume. */
  filtered: SkillTrackData;
}

const FilterContext = createContext<FilterContextValue | null>(null);

/**
 * Central filter state. `filtered` is recomposed by SkillTrackService from the
 * SAME tables and derivation pipeline as the unfiltered dataset, so KPIs,
 * charts, tables and insights can never diverge from the filter selection.
 */
export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, loading, error } = useSkillTrack();
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const setFilter = (key: keyof FilterState, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const resetFilters = () => setFilters(EMPTY_FILTERS);

  // Recompose whenever the filters or the underlying data change. `data` here
  // is the unfiltered composition — its identity changes on every data load
  // or mutation (add trainee, update outcome, …).
  const filtered = useMemo(
    () => skilltrack.getFilteredData(filters) ?? data,
    [filters, data]
  );

  const value = useMemo<FilterContextValue>(
    () => ({
      filters,
      setFilter,
      resetFilters,
      activeCount: activeFilterCount(filters),
      filtered,
    }),
    [filters, filtered]
  );

  if (loading || error || !data) return null;
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

/** Filter state and the centrally filtered dataset. */
export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within a FilterProvider');
  return ctx;
}

/**
 * The filtered dataset for data-driven views. Identical to the full dataset
 * when no filters are active. Components must consume this instead of
 * implementing their own filtering.
 */
export function useFilteredData(): SkillTrackData {
  return useFilters().filtered;
}
