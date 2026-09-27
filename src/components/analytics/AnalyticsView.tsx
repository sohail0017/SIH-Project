import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  Cell,
} from 'recharts';
import { PageHeader } from '../common/PageHeader';
import { Card } from '../common/Card';
import { ChartTooltip, CHART } from '../common/ChartTooltip';
import { GradeBadge } from '../common/Badges';
import { GlobalFilterBar, EmptyFilterState } from '../common/GlobalFilterBar';
import { useFilteredData } from '../../store/FilterProvider';
import { formatNumber, formatINR } from '../../lib/format';

type Tab = 'programme' | 'provider' | 'district' | 'demographics';

const TABS: { id: Tab; label: string }[] = [
  { id: 'programme', label: 'Programme Performance' },
  { id: 'provider', label: 'Provider Performance' },
  { id: 'district', label: 'District Performance' },
  { id: 'demographics', label: 'Demographics & Reasons' },
];

export const AnalyticsView: React.FC = () => {
  const data = useFilteredData();
  const [tab, setTab] = useState<Tab>('programme');

  const benchmarks = data.providerBenchmarks;

  const districtScatter = useMemo(
    () =>
      data.districtStats.map((d) => ({
        x: d.employmentRate,
        y: d.retention6M,
        z: d.trainees,
        name: d.district,
      })),
    [data.districtStats]
  );

  const topGaps = useMemo(
    () => [...data.skillGaps].sort((a, b) => b.gap - a.gap).slice(0, 5),
    [data.skillGaps]
  );

  const providersByGrowth = useMemo(
    () =>
      [...data.providers].sort(
        (a, b) => (b.wageGrowth12M ?? -Infinity) - (a.wageGrowth12M ?? -Infinity)
      ),
    [data.providers]
  );

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="Analytics"
        subtitle="Cohort trends, employment, retention, wage progression and skill gaps across Maharashtra's programmes, providers and districts."
      />

      {/* Central filter bar */}
      <GlobalFilterBar />

      {data.totals.certified === 0 ? (
        <EmptyFilterState certifiedOnly />
      ) : (
        <>
          {/* Tab switcher — scrolls horizontally when tabs don't fit */}
          <div className="w-full overflow-x-auto">
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg w-fit min-w-0">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 sm:px-4 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                    tab === t.id ? 'bg-white text-gov-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>


      {/* ------------------------------------------------------------- */}
      {/* Programme Performance                                          */}
      {/* ------------------------------------------------------------- */}
      {tab === 'programme' && (
        <div className="space-y-5 animate-fade">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <Card
              title="Cohort Trends by Training Year"
              subtitle="Employment rate and 6-month retention of certified trainees, by year of enrolment"
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.cohortTrends} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: CHART.axis }} tickLine={false} stroke={CHART.axis} />
                    <YAxis domain={data.cohortTrends.length ? ['dataMin - 3', 'dataMax + 3'] : [0, 100]} tick={{ fontSize: 11, fill: CHART.axis }} tickLine={false} stroke={CHART.axis} unit="%" />
                    <Tooltip content={<ChartTooltip formatter={(v) => `${v.toFixed(1)}%`} />} />
                    <Legend iconType="plainline" wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <Line type="monotone" dataKey="employmentRate" name="Employment rate" stroke={CHART.primary} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="retention6M" name="6-month retention" stroke={CHART.positive} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              title="Wage Progression by Sector"
              subtitle="Average monthly wage at placement vs 12 months after placement"
            >
              <div className="h-64 overflow-x-auto">
                <div className="h-full min-w-[520px]">
                  <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.wageBySector} margin={{ top: 5, right: 10, left: -8, bottom: 38 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                    <XAxis
                      dataKey="sector"
                      tick={{ fontSize: 9, fill: CHART.axis }}
                      angle={-38}
                      textAnchor="end"
                      interval={0}
                      tickLine={false}
                      stroke={CHART.axis}
                    />
                    <YAxis tick={{ fontSize: 10, fill: CHART.axis }} tickLine={false} stroke={CHART.axis} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatter={(v) => formatINR(v)}
                          labelFormatter={(l) => String(l)}
                        />
                      }
                      cursor={{ fill: 'rgba(38,79,131,0.06)' }}
                    />
                    <Legend iconType="square" wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                    <Bar dataKey="starting" name="At placement" fill={CHART.primaryLight} radius={[3, 3, 0, 0]} barSize={13} />
                    <Bar dataKey="month12" name="At 12 months" fill={CHART.primary} radius={[3, 3, 0, 0]} barSize={13} />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <Card
              className="xl:col-span-2"
              title="Programme Performance"
              subtitle="Enrolment to employment conversion across MSInS-supported programmes"
              padded={false}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase font-semibold tracking-wide text-slate-500">
                      <th className="py-2.5 pl-5 pr-3">Programme</th>
                      <th className="py-2.5 px-3 text-right hidden md:table-cell">Enrolled</th>
                      <th className="py-2.5 px-3 text-right hidden lg:table-cell">Completion</th>
                      <th className="py-2.5 px-3 text-right">Employment</th>
                      <th className="py-2.5 px-3 text-right hidden xl:table-cell">Retention 6M</th>
                      <th className="py-2.5 px-3 text-right hidden md:table-cell">Wage (start → 12M)</th>
                      <th className="py-2.5 pl-3 pr-5 text-right hidden xl:table-cell">Relevance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...data.programs]
                      .sort((a, b) => b.employmentRate - a.employmentRate)
                      .map((p) => {
                        const rel = data.trainingRelevance.byProgram.find((r) => r.id === p.id);
                        return (
                        <tr key={p.id} className="hover:bg-gov-50/50 transition-colors">
                          <td className="py-2.5 pl-5 pr-3">
                            <p className="font-semibold text-slate-800">{p.courseName}</p>
                            <p className="text-[10px] text-slate-400">{p.sector} · NSQF {p.nsqfLevel}</p>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums hidden md:table-cell">{formatNumber(p.enrolled)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums hidden lg:table-cell">{p.completionRate}%</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-800 tabular-nums">{p.employmentRate}%</td>
                          <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums hidden xl:table-cell">{p.retentionRate6M}%</td>
                          <td className="py-2.5 pl-3 pr-5 text-right text-slate-600 tabular-nums whitespace-nowrap hidden md:table-cell">
                            {p.averageStartingWage === null ? '—' : formatINR(p.averageStartingWage)} →{' '}
                            {p.averageWage12M === null ? '—' : formatINR(p.averageWage12M)}
                          </td>
                          <td className="py-2.5 pl-3 pr-5 text-right text-slate-600 tabular-nums hidden xl:table-cell">
                            {rel ? `${rel.relevance}%` : '—'}
                          </td>
                        </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Largest Skill Gaps" subtitle="Top 5 demand-supply shortfalls steering curriculum updates">
              <ol className="space-y-3">
                {topGaps.map((g, i) => (
                  <li key={g.id} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded bg-slate-100 text-[10px] font-bold text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{g.skill}</p>
                      <p className="text-[10px] text-slate-400">
                        {g.sector} · gap of <span className="font-semibold text-rose-600">{g.gap} pts</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Provider Performance                                           */}
      {/* ------------------------------------------------------------- */}
      {tab === 'provider' && (
        <div className="space-y-5 animate-fade">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <Card
              title="Wage Progression Milestones"
              subtitle="Average, median and 75th percentile monthly wages after placement"
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.wageMilestones} margin={{ top: 5, right: 10, left: -4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                    <XAxis dataKey="milestone" tick={{ fontSize: 10, fill: CHART.axis }} tickLine={false} stroke={CHART.axis} />
                    <YAxis tick={{ fontSize: 10, fill: CHART.axis }} tickLine={false} stroke={CHART.axis} domain={['dataMin - 2000', 'dataMax + 2000']} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip content={<ChartTooltip formatter={(v) => formatINR(v)} />} />
                    <Legend iconType="plainline" wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <Line type="monotone" dataKey="averageWage" name="Average" stroke={CHART.primary} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="medianWage" name="Median" stroke={CHART.positive} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="p75" name="75th percentile" stroke={CHART.primaryLight} strokeWidth={1.5} strokeDasharray="2 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              title="12-Month Wage Growth by Provider"
              subtitle={`Percentage increase from starting wage${benchmarks.wageGrowth12M === null ? '' : `, against the +${benchmarks.wageGrowth12M}% state benchmark`}`}
            >
              <div className="h-64 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={providersByGrowth.map((p) => ({
                      name: p.name.length > 26 ? `${p.name.slice(0, 25)}…` : p.name,
                      growth: p.wageGrowth12M,
                    }))}
                    layout="vertical"
                    margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART.grid} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: CHART.axis }} tickLine={false} stroke={CHART.axis} unit="%" domain={providersByGrowth.length ? [0, Math.ceil(Math.max(0, ...providersByGrowth.map((p) => p.wageGrowth12M ?? 0)) + 5)] : [0, 50]} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9.5, fill: '#475569' }} width={150} tickLine={false} stroke="transparent" />
                    <Tooltip content={<ChartTooltip formatter={(v) => `+${v.toFixed(1)}%`} />} cursor={{ fill: 'rgba(38,79,131,0.06)' }} />
                    {benchmarks.wageGrowth12M !== null && (
                      <ReferenceLine x={benchmarks.wageGrowth12M} stroke={CHART.axis} strokeDasharray="4 4" />
                    )}
                    <Bar dataKey="growth" name="Wage growth" radius={[0, 3, 3, 0]} barSize={15}>
                      {providersByGrowth.map((p, i) => (
                        <Cell
                          key={i}
                          fill={
                            p.wageGrowth12M !== null &&
                            benchmarks.wageGrowth12M !== null &&
                            p.wageGrowth12M >= benchmarks.wageGrowth12M
                              ? CHART.primary
                              : CHART.primaryLight
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card
            title="Provider Outcomes Summary"
            subtitle="Employment, retention and verification outcomes by provider"
            padded={false}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase font-semibold tracking-wide text-slate-500">
                    <th className="py-2.5 pl-5 pr-3">Provider</th>
                    <th className="py-2.5 px-3 text-right hidden md:table-cell">Trainees</th>
                    <th className="py-2.5 px-3 text-right hidden xl:table-cell">Completion</th>
                    <th className="py-2.5 px-3 text-right">Employment</th>
                    <th className="py-2.5 px-3 text-right hidden xl:table-cell">Retention 6M</th>
                    <th className="py-2.5 px-3 text-right hidden lg:table-cell">Verification</th>
                    <th className="py-2.5 px-3 text-right hidden xl:table-cell">Relevance</th>
                    <th className="py-2.5 pl-3 pr-5 text-right">Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[...data.providers]
                    .sort((a, b) => b.employmentRate - a.employmentRate)
                    .map((p) => {
                      const rel = data.trainingRelevance.byProvider.find((r) => r.id === p.id);
                      return (
                        <tr key={p.id} className="hover:bg-gov-50/50 transition-colors">
                          <td className="py-2.5 pl-5 pr-3">
                            <p className="font-semibold text-slate-800">{p.name}</p>
                            <p className="text-[10px] text-slate-400">{p.type}</p>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums hidden md:table-cell">{formatNumber(p.totalTrainees)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums hidden xl:table-cell">{p.completionRate}%</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-800 tabular-nums">{p.employmentRate}%</td>
                          <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums hidden xl:table-cell">{p.retentionRate6M}%</td>
                          <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums hidden lg:table-cell">{p.outcomeVerificationScore}%</td>
                          <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums hidden xl:table-cell">
                            {rel ? `${rel.relevance}%` : '—'}
                          </td>
                          <td className="py-2.5 pl-3 pr-5 text-right">
                            <GradeBadge grade={p.performanceTier} />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* District Performance                                           */}
      {/* ------------------------------------------------------------- */}
      {tab === 'district' && (
        <div className="space-y-5 animate-fade">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
            <Card
              className="xl:col-span-3"
              title="Employment vs Retention by District"
              subtitle={`All ${data.districtStats.length} districts. Bubble size reflects trainee volume; dashed lines mark state averages.`}
            >
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Employment rate"
                      domain={districtScatter.length ? [Math.max(0, Math.floor(Math.min(...districtScatter.map((d) => d.x)) - 5)), Math.min(100, Math.ceil(Math.max(...districtScatter.map((d) => d.x)) + 5))] : [0, 100]}
                      tick={{ fontSize: 11, fill: CHART.axis }}
                      tickLine={false}
                      stroke={CHART.axis}
                      unit="%"
                      label={{ value: 'Employment rate', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#94a3b8' }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="6-month retention"
                      domain={districtScatter.length ? [Math.max(0, Math.floor(Math.min(...districtScatter.map((d) => d.y)) - 5)), Math.min(100, Math.ceil(Math.max(...districtScatter.map((d) => d.y)) + 5))] : [0, 100]}
                      tick={{ fontSize: 11, fill: CHART.axis }}
                      tickLine={false}
                      stroke={CHART.axis}
                      unit="%"
                    />
                    <ZAxis type="number" dataKey="z" range={[40, 420]} name="Trainees" />
                    <ReferenceLine x={data.metrics.employmentRate} stroke={CHART.axis} strokeDasharray="4 4" />
                    <ReferenceLine y={data.metrics.retentionRate6M} stroke={CHART.axis} strokeDasharray="4 4" />
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatter={(v, name) => (name === 'Trainees' ? formatNumber(v) : `${v.toFixed(1)}%`)}
                        />
                      }
                    />
                    <Scatter data={districtScatter} name="Districts" fill={CHART.primary} fillOpacity={0.65} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              className="xl:col-span-2"
              title="Division Outcomes"
              subtitle="Aggregated employment and retention by revenue division"
              padded={false}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase font-semibold tracking-wide text-slate-500">
                      <th className="py-2.5 pl-5 pr-3">Division</th>
                      <th className="py-2.5 px-3 text-right hidden md:table-cell">Trainees</th>
                      <th className="py-2.5 px-3 text-right">Employment</th>
                      <th className="py-2.5 pl-3 pr-5 text-right">Retention</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.divisionSummary.map((d) => (
                      <tr key={d.division} className="hover:bg-gov-50/50 transition-colors">
                        <td className="py-2.5 pl-5 pr-3 font-semibold text-slate-800">{d.division}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums hidden md:table-cell">{formatNumber(d.trainees)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-800 tabular-nums">{d.employmentRate}%</td>
                        <td className="py-2.5 pl-3 pr-5 text-right text-slate-600 tabular-nums">
                          {d.retention6M === null ? '—' : `${d.retention6M}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card
            title="Retention by District"
            subtitle={`6-month retention of placed trainees — lowest districts first, for targeted intervention${data.metrics.retentionRate6M === null ? '' : ` (state average ${data.metrics.retentionRate6M}%)`}`}
            padded={false}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase font-semibold tracking-wide text-slate-500">
                    <th className="py-2.5 pl-5 pr-3">District</th>
                    <th className="py-2.5 px-3 text-right hidden md:table-cell">Trainees</th>
                    <th className="py-2.5 px-3">Retention 6M</th>
                    <th className="py-2.5 px-3 text-right hidden sm:table-cell">
                      Vs state {data.metrics.retentionRate6M === null ? '' : `(${data.metrics.retentionRate6M}%)`}
                    </th>
                    <th className="py-2.5 pl-3 pr-5 text-right hidden sm:table-cell">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[...data.districtStats]
                    .sort((a, b) => a.retention6M - b.retention6M)
                    .slice(0, 12)
                    .map((d) => {
                      const diff =
                        data.metrics.retentionRate6M === null
                          ? null
                          : d.retention6M - data.metrics.retentionRate6M;
                      return (
                        <tr key={d.district} className="hover:bg-gov-50/50 transition-colors">
                          <td className="py-2.5 pl-5 pr-3 font-semibold text-slate-800">{d.district}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums hidden md:table-cell">{formatNumber(d.trainees)}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                                <div
                                  className="h-full rounded-sm"
                                  style={{
                                    width: `${d.retention6M}%`,
                                    backgroundColor: diff !== null && diff < -8 ? CHART.warning : CHART.primary,
                                  }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500 tabular-nums w-9">{d.retention6M}%</span>
                            </div>
                          </td>
                          <td className={`py-2.5 px-3 text-right font-semibold tabular-nums hidden sm:table-cell ${diff === null ? 'text-slate-400' : diff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {diff === null ? '—' : `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} pts`}
                          </td>
                          <td className="py-2.5 pl-3 pr-5 text-right hidden sm:table-cell">
                            <GradeBadge grade={d.grade} />
                          </td>
                        </tr>
                      );
                     })}
                 </tbody>
               </table>
             </div>
           </Card>
         </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Demographics & Reasons                                         */}
      {/* ------------------------------------------------------------- */}
      {tab === 'demographics' && (
        <div className="space-y-5 animate-fade">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {([
              ['Gender', data.demographics.gender],
              ['Age Group', data.demographics.age],
              ['Social Category', data.demographics.category],
            ] as const).map(([title, rows]) => (
              <Card key={title} title={title} subtitle="Completion, employment and retention outcomes" padded={false}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase font-semibold tracking-wide text-slate-500">
                        <th className="py-2.5 pl-5 pr-3">Group</th>
                        <th className="py-2.5 px-3 text-right hidden sm:table-cell">Trainees</th>
                        <th className="py-2.5 px-3 text-right">Completion</th>
                        <th className="py-2.5 px-3 text-right">Employment</th>
                        <th className="py-2.5 pl-3 pr-5 text-right">Retention</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rows.map((r) => (
                        <tr key={r.group} className="hover:bg-gov-50/50 transition-colors">
                          <td className="py-2.5 pl-5 pr-3 font-semibold text-slate-800">{r.group}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums hidden sm:table-cell">{formatNumber(r.trainees)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums">{r.completionRate}%</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-800 tabular-nums">{r.employmentRate}%</td>
                          <td className="py-2.5 pl-3 pr-5 text-right text-slate-600 tabular-nums">
                            {r.retention6M === null ? '—' : `${r.retention6M}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Non-placement reasons */}
            <Card
              title="Reasons for Non-Placement"
              subtitle={`Reported by trainees not yet placed (attrition context: ${data.attrition.jobChurnRate}% job churn)`}
            >
              <div className="space-y-3">
                {data.nonPlacementReasons.map((r) => (
                  <div key={r.reason}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-700 font-medium">{r.reason}</span>
                      <span className="text-slate-500 tabular-nums">
                        {r.count} · <span className="font-semibold text-slate-700">{r.share}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-sm" style={{ width: `${r.share}%` }} />
                    </div>
                  </div>
                ))}
                {data.nonPlacementReasons.length === 0 && (
                  <p className="text-xs text-slate-400">No non-placement records in the current dataset.</p>
                )}
              </div>
            </Card>

            {/* Attrition reasons */}
            <Card
              title="Reasons for Attrition"
              subtitle={`${data.attrition.attritionRate}% of first placements ended within 6 months — why trainees left`}
            >
              <div className="space-y-3">
                {data.attrition.reasons.map((r) => (
                  <div key={r.reason}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-700 font-medium">{r.reason}</span>
                      <span className="text-slate-500 tabular-nums">
                        {r.count} · <span className="font-semibold text-slate-700">{r.share}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                      <div className="h-full bg-rose-400 rounded-sm" style={{ width: `${r.share}%` }} />
                    </div>
                  </div>
                ))}
                {data.attrition.reasons.length === 0 && (
                  <p className="text-xs text-slate-400">No ended jobs recorded in the current dataset.</p>
                )}
              </div>
            </Card>
          </div>

          {/* Training relevance */}
          <Card
            title="Training Relevance"
            subtitle={`Trainee-rated relevance of training to their work — state average ${data.trainingRelevance.stateAverage}%`}
            padded={false}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase font-semibold tracking-wide text-slate-500">
                    <th className="py-2.5 pl-5 pr-3">Programme</th>
                    <th className="py-2.5 px-3 text-right">Rated by</th>
                    <th className="py-2.5 px-3 w-48">Relevance score</th>
                    <th className="py-2.5 pl-3 pr-5 text-right">Vs state</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.trainingRelevance.byProgram.map((r) => {
                    const diff = r.relevance - data.trainingRelevance.stateAverage;
                    return (
                      <tr key={r.id} className="hover:bg-gov-50/50 transition-colors">
                        <td className="py-2.5 pl-5 pr-3 font-semibold text-slate-800">{r.name}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums">{r.rated}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                              <div className="h-full bg-gov-600 rounded-sm" style={{ width: `${r.relevance}%` }} />
                            </div>
                            <span className="text-[10px] text-slate-500 tabular-nums w-9">{r.relevance}%</span>
                          </div>
                        </td>
                        <td className={`py-2.5 pl-3 pr-5 text-right font-semibold tabular-nums ${diff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {diff >= 0 ? '+' : ''}
                          {diff.toFixed(1)} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Skill usage: taught vs used */}
          <Card
            title="Skills Taught vs Skills Used at Work"
            subtitle="Share of employed trainees actually using each curriculum skill on the job — lowest usage first"
            padded={false}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase font-semibold tracking-wide text-slate-500">
                    <th className="py-2.5 pl-5 pr-3">Skill</th>
                    <th className="py-2.5 px-3 hidden md:table-cell">Sector</th>
                    <th className="py-2.5 px-3 text-right">Employed Trainees</th>
                    <th className="py-2.5 px-3 text-right">Using at Work</th>
                    <th className="py-2.5 pl-3 pr-5 w-48">Usage Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.skillUsage.slice(0, 12).map((s) => (
                    <tr key={`${s.skill}-${s.sector}`} className="hover:bg-gov-50/50 transition-colors">
                      <td className="py-2.5 pl-5 pr-3 font-semibold text-slate-800">{s.skill}</td>
                      <td className="py-2.5 px-3 text-slate-500 hidden md:table-cell">{s.sector}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums">{s.taught}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums">{s.used}</td>
                      <td className="py-2.5 pl-3 pr-5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                            <div
                              className="h-full rounded-sm"
                              style={{
                                width: `${s.usageRate}%`,
                                backgroundColor: s.usageRate < 50 ? CHART.warning : CHART.primary,
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 tabular-nums w-9">{s.usageRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
        </>
      )}
    </div>
  );
};

