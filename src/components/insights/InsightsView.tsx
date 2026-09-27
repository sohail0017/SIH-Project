import React from 'react';
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Wallet,
  BadgeCheck,
  Layers,
  Store,
  GraduationCap,
  Clock3,
  Building2,
  MapPin,
  BookOpen,
  Coins,
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { Card } from '../common/Card';
import { GlobalFilterBar, EmptyFilterState } from '../common/GlobalFilterBar';
import { useFilteredData } from '../../store/FilterProvider';
import { formatNumber, formatINR } from '../../lib/format';

const severityStyles: Record<string, { dot: string; label: string }> = {
  high: { dot: 'bg-rose-500', label: 'Priority action' },
  medium: { dot: 'bg-amber-500', label: 'Monitor & act' },
  low: { dot: 'bg-slate-400', label: 'Watch' },
};

const fmt = (v: number | null, suffix = '') => (v === null ? '—' : `${v}${suffix}`);
const fmtWage = (v: number | null) => (v === null ? '—' : formatINR(v));

export const InsightsView: React.FC = () => {
  const data = useFilteredData();
  const { impact, insights, resourceAllocation, wageSummary } = data;

  const impactCards = [
    { label: 'Training Completion', value: fmt(impact.completionRate, '%'), icon: GraduationCap },
    { label: 'Employment Generated', value: formatNumber(impact.employmentGenerated), icon: TrendingUp },
    { label: 'Self-Employment', value: formatNumber(impact.selfEmployment), icon: Store },
    { label: 'Apprenticeships', value: formatNumber(impact.apprenticeships), icon: Layers },
    { label: '6-Month Retention', value: fmt(impact.retentionRate6M, '%'), icon: Clock3 },
    { label: 'Wage Progression', value: fmt(impact.wageGrowthPct, '+%'), icon: Wallet },
    { label: 'Skill Relevance', value: fmt(impact.skillRelevancePct, '%'), icon: BadgeCheck },
    { label: 'Outcome Verification', value: fmt(impact.verificationRate, '%'), icon: Coins },
  ];

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="Insights & Impact"
        subtitle="Evidence-based findings from Maharashtra's skilling outcomes — each with the supporting metric, a possible reason and a recommended action."
      />

      {/* Central filter bar */}
      <GlobalFilterBar />

      {data.totals.certified === 0 ? (
        <EmptyFilterState certifiedOnly />
      ) : (
        <>
          {/* Impact measurement */}
          <Card
            title="Programme Impact"
            subtitle="Overall impact of MSInS-supported skilling across Maharashtra (demonstration data)"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
              {impactCards.map((c) => {
                const Icon = c.icon;
                return (
                  <div
                    key={c.label}
                    className="p-4 bg-white border border-slate-200 rounded-lg hover:border-gov-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-medium text-slate-500 leading-tight">{c.label}</span>
                      <Icon className="w-4 h-4 text-slate-300" />
                    </div>
                    <p className="text-lg leading-none font-bold tracking-tight text-slate-900 tabular-nums">
                      {c.value}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-3">
              Average monthly wage: {fmtWage(wageSummary.avgCurrent)} (median {fmtWage(wageSummary.medianCurrent)})
              · placement wage {fmtWage(wageSummary.avgStarting)} → 3-month {fmtWage(wageSummary.avg3M)} → 6-month{' '}
              {fmtWage(wageSummary.avg6M)} → 12-month {fmtWage(wageSummary.avg12M)}
            </p>
          </Card>

          {/* Findings & recommended actions */}
          <Card
            title="Findings & Recommended Actions"
            subtitle="Rule-based analysis of live outcome data — findings update automatically as records and filters change"
          >
            {insights.length === 0 && (
              <p className="text-xs text-slate-400">
                No threshold breaches detected — all programmes, providers, districts and follow-up
                operations are within acceptable ranges.
              </p>
            )}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {insights.map((ins) => {
                const sev = severityStyles[ins.severity] || severityStyles.low;
                return (
                  <article
                    key={ins.id}
                    className="p-4 border border-slate-200 rounded-lg bg-white hover:border-gov-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                        {ins.area}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">{sev.label}</span>
                    </div>
                    <h3 className="text-[13px] font-semibold text-slate-900 leading-snug flex items-start gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-gov-600 mt-0.5 shrink-0" />
                      {ins.finding}
                    </h3>
                    <p className="mt-2 text-xs font-semibold text-gov-800 tabular-nums bg-gov-50 border border-gov-100 rounded px-2 py-1 inline-block">
                      {ins.metric}
                    </p>
                    <p className="mt-2.5 text-[11px] text-slate-500 leading-relaxed">
                      <span className="font-semibold text-slate-600">Possible reason: </span>
                      {ins.reason}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-700 leading-relaxed flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-px shrink-0" />
                      <span>
                        <span className="font-semibold">Recommended action: </span>
                        {ins.action}
                      </span>
                    </p>
                  </article>
                );
              })}
            </div>
          </Card>

          {/* Resource allocation */}
          <Card
            title="Resource Allocation Guidance"
            subtitle="Where investment, intervention and additional training capacity would have the highest impact"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              {[
                {
                  icon: BookOpen,
                  title: 'Courses needing investment',
                  hint: 'Lowest employment conversion',
                  rows: resourceAllocation.coursesNeedingInvestment.map((r) => ({
                    name: r.name,
                    value: `${r.metric}% employed`,
                  })),
                },
                {
                  icon: MapPin,
                  title: 'Districts needing intervention',
                  hint: 'Lowest employment + retention',
                  rows: resourceAllocation.districtsNeedingIntervention.map((r) => ({
                    name: r.name,
                    value: `${r.metric}% combined`,
                  })),
                },
                {
                  icon: Layers,
                  title: 'Skills needing capacity',
                  hint: 'Largest demand–supply gaps',
                  rows: resourceAllocation.skillsNeedingCapacity.map((r) => ({
                    name: r.name,
                    value: `gap ${r.gap} pts`,
                  })),
                },
                {
                  icon: Building2,
                  title: 'Providers needing improvement',
                  hint: 'Lowest employment outcomes',
                  rows: resourceAllocation.providersNeedingImprovement.map((r) => ({
                    name: r.name,
                    value: `${r.metric}% employed`,
                  })),
                },
                {
                  icon: TrendingUp,
                  title: 'Strongest employment demand',
                  hint: 'Highest employer demand index',
                  rows: resourceAllocation.strongestDemand.map((r) => ({
                    name: r.name,
                    value: `demand ${r.demand}/100`,
                  })),
                },
              ].map((panel) => {
                const Icon = panel.icon;
                return (
                  <div key={panel.title} className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-gov-700" />
                      <h3 className="text-xs font-semibold text-slate-900 leading-tight">{panel.title}</h3>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-3">{panel.hint}</p>
                    <ol className="space-y-2">
                      {panel.rows.map((r, i) => (
                        <li key={r.name} className="flex items-start justify-between gap-2">
                          <span className="text-[11px] text-slate-600 leading-snug min-w-0">
                            <span className="text-slate-300 font-bold mr-1">{i + 1}</span>
                            {r.name}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 tabular-nums whitespace-nowrap">
                            {r.value}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
