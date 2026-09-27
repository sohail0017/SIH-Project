import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Search, ChevronDown, ChevronUp, MapPin, X } from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { Card } from '../common/Card';
import { ChartTooltip, CHART } from '../common/ChartTooltip';
import { GradeBadge } from '../common/Badges';
import { GlobalFilterBar, EmptyFilterState } from '../common/GlobalFilterBar';
import { MAHARASHTRA_DIVISIONS } from '../../data/reference';
import { useFilteredData } from '../../store/FilterProvider';
import { formatNumber, formatINR } from '../../lib/format';

type SortKey = 'trainees' | 'completionRate' | 'employmentRate' | 'retention6M' | 'averageWage';

interface DistrictAnalyticsViewProps {
  initialDistrict?: string;
}

export const DistrictAnalyticsView: React.FC<DistrictAnalyticsViewProps> = ({ initialDistrict }) => {
  const data = useFilteredData();
  const [search, setSearch] = useState('');
  const [division, setDivision] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('employmentRate');
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<string | null>(initialDistrict ?? null);

  // Respond to external navigation (e.g. global search) while already mounted.
  React.useEffect(() => {
    if (initialDistrict !== undefined) setSelected(initialDistrict);
  }, [initialDistrict]);

  const districtStats = data.districtStats;

  const districts = useMemo(() => {
    const q = search.trim().toLowerCase();
    // null averageWage sorts last in both directions
    const sortVal = (d: (typeof districtStats)[number]) =>
      d[sortKey] === null ? (sortAsc ? Infinity : -Infinity) : (d[sortKey] as number);
    return districtStats
      .filter(
        (d) =>
          (division === 'all' || d.division === division) &&
          (q === '' || d.district.toLowerCase().includes(q) || d.division.toLowerCase().includes(q))
      )
      .sort((a, b) => (sortAsc ? sortVal(a) - sortVal(b) : sortVal(b) - sortVal(a)));
  }, [districtStats, search, division, sortKey, sortAsc]);

  const selectedStat = useMemo(
    () => districtStats.find((d) => d.district === selected) || null,
    [districtStats, selected]
  );

  const chartData = useMemo(
    () =>
      [...districtStats]
        .sort((a, b) => b.employmentRate - a.employmentRate)
        .slice(0, 12)
        .map((d) => ({
          district: d.district.length > 14 ? `${d.district.slice(0, 13)}…` : d.district,
          employmentRate: d.employmentRate,
          full: d.district,
          isSel: d.district === selected,
        })),
    [districtStats, selected]
  );

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const SortHeader: React.FC<{ label: string; k: SortKey; align?: string; className?: string }> = ({ label, k, align = 'text-right', className = '' }) => (
    <th className={`py-2.5 px-3 ${align} ${className}`}>
      <button
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 hover:text-gov-700 transition-colors ${sortKey === k ? 'text-gov-800' : ''}`}
      >
        {label}
        {sortKey === k &&
          (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </button>
    </th>
  );

  const comparisonRows = selectedStat
    ? [
        { label: 'Completion', value: selectedStat.completionRate, state: data.metrics.completionRate },
        { label: 'Employment', value: selectedStat.employmentRate, state: data.metrics.employmentRate },
        { label: '6-Month Retention', value: selectedStat.retention6M, state: data.metrics.retentionRate6M },
      ]
    : [];

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="District Analytics"
        subtitle={`Skilling outcomes across Maharashtra's ${data.districtStats.length} districts and six revenue divisions. Click any district to drill down.`}
      />

      {/* Central filter bar */}
      <GlobalFilterBar />

      {data.totals.certified === 0 && data.districtStats.length === 0 ? (
        <EmptyFilterState certifiedOnly />
      ) : (
        <>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search district…"
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:border-gov-400 outline-none transition-colors"
          />
        </div>
        <select
          value={division}
          onChange={(e) => setDivision(e.target.value)}
          className="py-2 pl-3 pr-8 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:border-gov-400 outline-none transition-colors cursor-pointer"
        >
          <option value="all">All divisions</option>
          {MAHARASHTRA_DIVISIONS.map((d) => (
            <option key={d} value={d}>
              {d} Division
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Ranked table */}
        <Card
          className="xl:col-span-3"
          title="District Ranking"
          subtitle={`${districts.length} district${districts.length === 1 ? '' : 's'} shown`}
          padded={false}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase font-semibold tracking-wide text-slate-500">
                  <th className="py-2.5 pl-5 pr-3">District</th>
                  <SortHeader label="Trainees" k="trainees" className="hidden md:table-cell" />
                  <SortHeader label="Completion" k="completionRate" className="hidden lg:table-cell" />
                  <SortHeader label="Employment" k="employmentRate" />
                  <SortHeader label="Retention" k="retention6M" className="hidden xl:table-cell" />
                  <th className="py-2.5 pl-3 pr-5 text-right">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {districts.map((d) => (
                  <tr
                    key={d.district}
                    onClick={() => setSelected(d.district === selected ? null : d.district)}
                    className={`cursor-pointer transition-colors ${
                      selected === d.district ? 'bg-gov-50' : 'hover:bg-gov-50/50'
                    }`}
                  >
                    <td className="py-2.5 pl-5 pr-3">
                      <p className="font-semibold text-slate-800">{d.district}</p>
                      <p className="text-[10px] text-slate-400">{d.division} Division</p>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums hidden md:table-cell">
                      {formatNumber(d.trainees)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums hidden lg:table-cell">
                      {d.completionRate.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-800 tabular-nums">
                      {d.employmentRate.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums hidden xl:table-cell">
                      {d.retention6M.toFixed(1)}%
                    </td>
                    <td className="py-2.5 pl-3 pr-5 text-right">
                      <GradeBadge grade={d.grade} />
                    </td>
                  </tr>
                ))}
                {districts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No districts match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right column: chart + drill-down */}
        <div className="xl:col-span-2 space-y-5">
          <Card
            title="Employment Rate — Top 12 Districts"
            subtitle="Share of certified trainees in employment"
          >
            <div className="h-[300px] -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART.grid} />
                  <XAxis type="number" domain={chartData.length ? [Math.max(0, Math.floor(Math.min(...chartData.map((d) => d.employmentRate)) - 5)), Math.min(100, Math.ceil(Math.max(...chartData.map((d) => d.employmentRate)) + 5))] : [0, 100]} tick={{ fontSize: 10, fill: CHART.axis }} stroke={CHART.axis} tickLine={false} unit="%" />
                  <YAxis type="category" dataKey="district" tick={{ fontSize: 10, fill: '#475569' }} width={104} tickLine={false} stroke="transparent" />
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(v) => `${v.toFixed(1)}%`}
                        labelFormatter={(l) => String(l)}
                      />
                    }
                    cursor={{ fill: 'rgba(38,79,131,0.06)' }}
                  />
                  <Bar dataKey="employmentRate" name="Employment rate" radius={[0, 3, 3, 0]} barSize={14}>
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.full}
                        fill={entry.isSel ? CHART.primary : CHART.primaryLight}
                        cursor="pointer"
                        onClick={() => setSelected(entry.full === selected ? null : entry.full)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Drill-down panel */}
          {selectedStat && (
            <Card padded={false} className="animate-pop overflow-hidden">
              <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-md bg-gov-50 border border-gov-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-gov-700" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{selectedStat.district}</h3>
                    <p className="text-[11px] text-slate-400">
                      {selectedStat.division} Division · Maharashtra
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <GradeBadge grade={selectedStat.grade} />
                  <button
                    onClick={() => setSelected(null)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    aria-label="Close district detail"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-100 border-b border-slate-100">
                {[
                  { label: 'Trainees', value: formatNumber(selectedStat.trainees) },
                  {
                    label: 'Avg. Monthly Wage',
                    value: selectedStat.averageWage === null ? '—' : formatINR(selectedStat.averageWage),
                  },
                  { label: 'Verified Outcomes', value: `${selectedStat.verificationRate}%` },
                  { label: 'Retention 6M', value: `${selectedStat.retention6M}%` },
                ].map((s) => (
                  <div key={s.label} className="px-4 py-3 bg-white">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                      {s.label}
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-1 tabular-nums">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="px-5 py-4 space-y-3.5 border-b border-slate-100">
                <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                  Against state average
                </p>
                {comparisonRows.map((row) => {
                  const diff = row.state === null ? null : row.value - row.state;
                  return (
                    <div key={row.label}>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-600 font-medium">{row.label}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-slate-800 font-semibold tabular-nums">
                            {row.value.toFixed(1)}%
                          </span>
                          {diff === null ? (
                            <span className="text-[10px] text-slate-400">no baseline</span>
                          ) : (
                            <span
                              className={`text-[10px] font-semibold tabular-nums ${
                                diff >= 0 ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {diff >= 0 ? '+' : ''}
                              {diff.toFixed(1)} pts
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="relative h-1.5 bg-slate-100 rounded-sm">
                        <div
                          className="absolute inset-y-0 left-0 bg-gov-600 rounded-sm"
                          style={{ width: `${row.value}%` }}
                        />
                        {row.state !== null && (
                          <div
                            className="absolute inset-y-[-2px] w-px bg-slate-400"
                            style={{ left: `${row.state}%` }}
                            title={`State average: ${row.state}%`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-5 py-4">
                <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-2">
                  Leading sectors
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedStat.topSectors.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-1 rounded text-[11px] font-medium bg-gov-50 text-gov-800 border border-gov-100"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Division summary */}
      <Card title="Division Summary" subtitle="Aggregated outcomes by revenue division" padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase font-semibold tracking-wide text-slate-500">
                <th className="py-2.5 pl-5 pr-3">Division</th>
                <th className="py-2.5 px-3 text-right hidden md:table-cell">Trainees</th>
                <th className="py-2.5 px-3 text-right">Employment Rate</th>
                <th className="py-2.5 px-3 text-right hidden sm:table-cell">Retention (6M)</th>
                <th className="py-2.5 pl-3 pr-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.divisionSummary.map((d) => (
                <tr
                  key={d.division}
                  onClick={() => {
                    setDivision(d.division);
                    setSearch('');
                  }}
                  className="hover:bg-gov-50/50 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 pl-5 pr-3 font-semibold text-slate-800">{d.division}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums hidden md:table-cell">
                    {formatNumber(d.trainees)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-800 font-semibold tabular-nums">
                    {d.employmentRate.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums hidden sm:table-cell">
                    {d.retention6M.toFixed(1)}%
                  </td>
                  <td className="py-2.5 pl-3 pr-5 text-right">
                    <ChevronDown className="w-3.5 h-3.5 text-slate-300 -rotate-90 inline-block" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
        </>
      )}
    </div>
  );
};
