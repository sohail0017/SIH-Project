import React, { useMemo, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ZAxis,
  Cell,
} from 'recharts';
import { PageHeader } from '../common/PageHeader';
import { Card } from '../common/Card';
import { ChartTooltip, CHART } from '../common/ChartTooltip';
import { GradeBadge, EmployerVerificationBadge } from '../common/Badges';
import { GlobalFilterBar, EmptyFilterState } from '../common/GlobalFilterBar';
import { useFilteredData } from '../../store/FilterProvider';
import { formatNumber } from '../../lib/format';

const DeltaText: React.FC<{ value: number; unit?: string; invert?: boolean }> = ({
  value,
  unit = '',
  invert = false,
}) => {
  const good = invert ? value < 0 : value > 0;
  const neutral = Math.abs(value) < 0.05;
  return (
    <span
      className={`text-[10px] font-semibold tabular-nums ml-1.5 ${
        neutral ? 'text-slate-300' : good ? 'text-emerald-600' : 'text-rose-600'
      }`}
    >
      {value > 0 ? '+' : ''}
      {value.toFixed(1)}
      {unit}
    </span>
  );
};

export const ProvidersView: React.FC = () => {
  const data = useFilteredData();
  const [type, setType] = useState<string>('all');

  const PROVIDER_BENCHMARKS = data.providerBenchmarks;

  const types = useMemo(() => Array.from(new Set(data.providers.map((p) => p.type))), [data.providers]);
  const providers = useMemo(
    () => data.providers.filter((p) => type === 'all' || p.type === type),
    [data.providers, type]
  );

  const scatterData = providers.map((p) => ({
    x: p.employmentRate,
    y: p.retentionRate6M,
    z: p.totalTrainees,
    name: p.name,
  }));

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="Provider Performance"
        subtitle="Outcome performance of Maharashtra's empanelled training providers, benchmarked against the state average."
      />

      {/* Central filter bar */}
      <GlobalFilterBar />

      {data.totals.certified === 0 ? (
        <EmptyFilterState certifiedOnly />
      ) : (
        <>
          <Card
            title="Performance Benchmark"
            subtitle="Employment rate vs 6-month retention. Bubble size reflects trainee volume. Dashed lines mark state averages."
          >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 5, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
              <XAxis
                type="number"
                dataKey="x"
                name="Employment rate"
                domain={scatterData.length ? [
                  Math.max(0, Math.floor(Math.min(...scatterData.map((d) => d.x)) - 5)),
                  Math.min(100, Math.ceil(Math.max(...scatterData.map((d) => d.x)) + 5)),
                ] : [0, 100]}
                tick={{ fontSize: 11, fill: CHART.axis }}
                tickLine={false}
                unit="%"
                label={{ value: 'Employment rate', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#94a3b8' }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="6-month retention"
                domain={scatterData.length ? [
                  Math.max(0, Math.floor(Math.min(...scatterData.map((d) => d.y)) - 5)),
                  Math.min(100, Math.ceil(Math.max(...scatterData.map((d) => d.y)) + 5)),
                ] : [0, 100]}
                tick={{ fontSize: 11, fill: CHART.axis }}
                tickLine={false}
                unit="%"
              />
              <ZAxis type="number" dataKey="z" range={[80, 620]} name="Trainees" />
              <ReferenceLine
                x={PROVIDER_BENCHMARKS.employment}
                stroke={CHART.axis}
                strokeDasharray="4 4"
              />
              <ReferenceLine
                y={PROVIDER_BENCHMARKS.retention6M}
                stroke={CHART.axis}
                strokeDasharray="4 4"
              />
              <Tooltip
                content={
                    <ChartTooltip
                      formatter={(v, name) =>
                        name === 'Trainees' ? formatNumber(v) : `${v.toFixed(1)}%`
                      }
                    />
                }
              />
              <Scatter data={scatterData} name="Providers">
                {scatterData.map((d) => (
                  <Cell
                    key={d.name}
                    fill={
                      d.x >= PROVIDER_BENCHMARKS.employment && d.y >= PROVIDER_BENCHMARKS.retention6M
                        ? CHART.primary
                        : CHART.primaryLight
                    }
                    fillOpacity={0.75}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card
        title="Provider Scorecard"
        subtitle={`Deltas shown against state benchmarks: completion ${PROVIDER_BENCHMARKS.completion}%, employment ${PROVIDER_BENCHMARKS.employment}%, retention ${PROVIDER_BENCHMARKS.retention6M}%, wage growth +${PROVIDER_BENCHMARKS.wageGrowth12M}%, verification ${PROVIDER_BENCHMARKS.verification}%`}
        padded={false}
        action={
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="py-1.5 pl-2.5 pr-7 text-xs bg-white border border-slate-200 rounded text-slate-700 focus:border-gov-400 outline-none transition-colors cursor-pointer"
          >
            <option value="all">All provider types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        }
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
                <th className="py-2.5 px-3 text-right hidden lg:table-cell">Wage Growth 12M</th>
                <th className="py-2.5 px-3 text-right hidden lg:table-cell">Verification</th>
                <th className="py-2.5 pl-3 pr-5 text-right">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[...providers]
                .sort((a, b) => b.employmentRate - a.employmentRate)
                .map((p) => (
                  <tr key={p.id} className="hover:bg-gov-50/50 transition-colors">
                    <td className="py-3 pl-5 pr-3">
                      <p className="font-semibold text-slate-800">{p.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {p.type} · {p.districtsCovered.length} district
                        {p.districtsCovered.length === 1 ? '' : 's'} · {p.centres} centre
                        {p.centres === 1 ? '' : 's'}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600 tabular-nums hidden md:table-cell">
                      {formatNumber(p.totalTrainees)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap hidden xl:table-cell">
                      <span className="font-semibold text-slate-700">{p.completionRate}%</span>
                      <DeltaText value={p.completionRate - PROVIDER_BENCHMARKS.completion} unit="p" />
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                      <span className="font-semibold text-slate-700">{p.employmentRate}%</span>
                      <DeltaText value={p.employmentRate - PROVIDER_BENCHMARKS.employment} unit="p" />
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap hidden xl:table-cell">
                      <span className="font-semibold text-slate-700">{p.retentionRate6M}%</span>
                      <DeltaText value={p.retentionRate6M - PROVIDER_BENCHMARKS.retention6M} unit="p" />
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap hidden lg:table-cell">
                      <span className="font-semibold text-slate-700">+{p.wageGrowth12M}%</span>
                      <DeltaText value={p.wageGrowth12M - PROVIDER_BENCHMARKS.wageGrowth12M} unit="p" />
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap hidden lg:table-cell">
                      <span className="font-semibold text-slate-700">{p.outcomeVerificationScore}%</span>
                      <DeltaText value={p.outcomeVerificationScore - PROVIDER_BENCHMARKS.verification} unit="p" />
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right">
                      <GradeBadge grade={p.performanceTier} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-3 text-[10px] text-slate-400 border-t border-slate-100">
          Tier combines completion, employment, retention and verification outcomes. Wage growth
          compares average monthly wage 12 months after placement against the starting wage.
          Demonstration data.
        </p>
      </Card>

      {/* Employer validation register */}
      <Card
        title="Employer Validation Register"
        subtitle="Empanelled employers with verification status, history and trainees hired"
        padded={false}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase font-semibold tracking-wide text-slate-500">
                <th className="py-2.5 pl-5 pr-3">Employer</th>
                <th className="py-2.5 px-3 hidden md:table-cell">Sector</th>
                <th className="py-2.5 px-3 hidden md:table-cell">District</th>
                <th className="py-2.5 px-3 text-right">Trainees Currently Employed</th>
                <th className="py-2.5 px-3 text-right hidden sm:table-cell">Total Hired</th>
                <th className="py-2.5 px-3 hidden lg:table-cell">Verification History</th>
                <th className="py-2.5 pl-3 pr-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[...data.employers]
                .sort((a, b) => b.currentEmployees - a.currentEmployees)
                .map((e) => (
                  <tr key={e.id} className="hover:bg-gov-50/50 transition-colors">
                    <td className="py-3 pl-5 pr-3 font-semibold text-slate-800">{e.name}</td>
                    <td className="py-3 px-3 text-slate-500 hidden md:table-cell">{e.sector}</td>
                    <td className="py-3 px-3 text-slate-500 hidden md:table-cell">{e.district}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-800 tabular-nums">
                      {e.currentEmployees}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600 tabular-nums hidden sm:table-cell">
                      {e.totalHired}
                    </td>
                    <td className="py-3 px-3 hidden lg:table-cell">
                      {e.verificationHistory.length > 0 ? (
                        <span className="text-[10px] text-slate-500">
                          {e.verificationHistory[0].date} — {e.verificationHistory[0].action}
                          {e.verificationHistory.length > 1 && (
                            <span className="text-slate-400"> (+{e.verificationHistory.length - 1} more)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">No verification records</span>
                      )}
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right">
                      <EmployerVerificationBadge status={e.verificationStatus} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-3 text-[10px] text-slate-400 border-t border-slate-100">
          Verification covers GST/CIN records, site visits and EPFO establishment cross-checks.
          “Total hired” counts every trainee ever placed with the employer, including past jobs.
          Demonstration data.
        </p>
      </Card>
        </>
      )}
    </div>
  );
};

