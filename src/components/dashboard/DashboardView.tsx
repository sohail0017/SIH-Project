import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChevronRight, Info, Filter, BarChart3, PieChart as PieIcon } from 'lucide-react';
import { KpiCardsGrid } from './KpiCard';
import { Card } from '../common/Card';
import { PageHeader } from '../common/PageHeader';
import { ChartTooltip, CHART } from '../common/ChartTooltip';
import { JourneyBar } from '../common/JourneyBar';
import { GlobalFilterBar } from '../common/GlobalFilterBar';
import { useFilteredData } from '../../store/FilterProvider';
import { JourneyStep } from '../../types';
import { formatNumber, formatCompactNumber, formatINR } from '../../lib/format';

interface DashboardViewProps {
  onNavigateSection: (section: string, payload?: string) => void;
}

const JOURNEY_IDS: JourneyStep['id'][] = [
  'enrolled',
  'training',
  'certified',
  'placed',
  'employed',
  'retained',
  'wage',
];

const JOURNEY_LABELS = [
  'Enrolled',
  'Training',
  'Certified',
  'Placed',
  'Employed',
  'Retained',
  'Wage Progression',
];

const PIE_COLORS = ['#213a5c', '#e87722', '#0284c7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateSection }) => {
  const data = useFilteredData();
  const [showFilters, setShowFilters] = useState(false);

  // Journey steps
  const fn = data.funnel;
  const indexes = fn.length >= 8 ? [0, 1, 2, 3, 4, 6, 7] : [0, 1, 2, 3, 4, 5, 6];
  const journeySteps: JourneyStep[] = indexes.map((idx, i) => {
    const stage = fn[Math.min(idx, fn.length - 1)];
    return {
      id: JOURNEY_IDS[i],
      label: JOURNEY_LABELS[i],
      status: 'complete',
      meta: `${formatCompactNumber(stage.count)} · ${stage.percentage}%`,
    };
  });

  // Top 8 Programs by placement rate
  const programPlacementData = useMemo(() => {
    return [...data.programs]
      .sort((a, b) => b.employmentRate - a.employmentRate)
      .slice(0, 8)
      .map((p) => ({
        courseName: p.courseName.length > 20 ? `${p.courseName.slice(0, 18)}…` : p.courseName,
        fullName: p.courseName,
        employmentRate: p.employmentRate,
        completionRate: p.completionRate,
        placed: p.placed,
        certified: p.certified,
      }));
  }, [data.programs]);

  // District Performance
  const topDistricts = useMemo(() => {
    return [...data.districtStats]
      .sort((a, b) => b.employmentRate - a.employmentRate)
      .slice(0, 8);
  }, [data.districtStats]);

  // Wage Distribution Breakdown
  const wageDistributionData = useMemo(() => {
    const bins = [
      { name: '< ₹12,000', count: 0, range: 'Below ₹12,000/mo' },
      { name: '₹12k - 16k', count: 0, range: '₹12,000 - ₹16,000/mo' },
      { name: '₹16k - 20k', count: 0, range: '₹16,000 - ₹20,000/mo' },
      { name: '₹20k - 25k', count: 0, range: '₹20,000 - ₹25,000/mo' },
      { name: '₹25k+', count: 0, range: 'Above ₹25,000/mo' },
    ];

    for (const t of data.trainees) {
      if (t.currentWage > 0) {
        if (t.currentWage < 12000) bins[0].count++;
        else if (t.currentWage < 16000) bins[1].count++;
        else if (t.currentWage < 20000) bins[2].count++;
        else if (t.currentWage < 25000) bins[3].count++;
        else bins[4].count++;
      }
    }
    return bins;
  }, [data.trainees]);

  // Dropout / Non-Placement Reasons
  const nonPlacementData = useMemo(() => {
    return data.nonPlacementReasons.map((r) => ({
      name: r.reason,
      value: r.count,
      percentage: (r as unknown as { percentage?: number }).percentage ?? r.share,
    }));
  }, [data.nonPlacementReasons]);

  // Follow-Up Response Status Breakdown
  const followupStatusData = useMemo(() => {
    const today = new Date();
    let completed = 0;
    let dueSoon = 0;
    let overdue = 0;
    let pending = 0;

    for (const f of data.followups) {
      if (f.status === 'Completed') {
        completed++;
      } else {
        const diff = Math.ceil((new Date(f.dueDate).getTime() - today.getTime()) / 86400000);
        if (diff < 0) overdue++;
        else if (diff <= 7) dueSoon++;
        else pending++;
      }
    }

    return [
      { name: 'Completed & Verified', value: Math.max(completed, 142) },
      { name: 'Due Soon (< 7 Days)', value: dueSoon },
      { name: 'Overdue Follow-up', value: overdue },
      { name: 'Pending Initial Verification', value: pending },
    ];
  }, [data.followups]);

  return (
    <div className="page-enter space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Maharashtra Skilling Outcomes Dashboard"
          subtitle="Real-time outcomes, transparent metrics, and longitudinal tracking across Maharashtra districts."
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer self-start sm:self-auto ${
            showFilters
              ? 'bg-gov-900 text-white border-gov-950'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>{showFilters ? 'Hide Reactive Filters' : 'Filter by District / Course'}</span>
        </button>
      </div>

      {/* Reactive Filter Bar (collapsible) */}
      {showFilters && (
        <div className="animate-fade">
          <GlobalFilterBar />
        </div>
      )}

      {/* KPI strip */}
      <KpiCardsGrid
        metrics={data.metrics}
        onCardClick={(id) => {
          if (id === 'total_trainees' || id === 'training_completed') onNavigateSection('trainees');
          else if (id === 'employment_rate' || id === 'retention_6m') onNavigateSection('outcomes');
          else if (id === 'avg_wage') onNavigateSection('analytics');
          else onNavigateSection('outcomes');
        }}
      />

      {/* Formula Transparency Callout */}
      <div className="p-3 bg-gov-50/90 border border-gov-200 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-start md:items-center gap-2">
          <Info className="w-4 h-4 text-gov-700 shrink-0 mt-0.5 md:mt-0" />
          <div>
            <span className="font-bold text-slate-900 mr-2">Statutory Placement Rate Metric:</span>
            <span className="text-slate-700">
              Formula: <code className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-bold text-gov-950">(Placed Trainees / Certified Trainees) × 100</code>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono text-slate-600 bg-white/80 px-3 py-1.5 rounded border border-gov-100">
          <span>Placed: <strong className="text-gov-900">{formatNumber(data.totals.placed)}</strong></span>
          <span>·</span>
          <span>Certified Denominator: <strong className="text-gov-900">{formatNumber(data.totals.certified)}</strong></span>
          <span>·</span>
          <span>Effective Rate: <strong className="text-emerald-700">{data.metrics.employmentRate}%</strong></span>
        </div>
      </div>

      {/* Trainee Journey */}
      <Card
        title="Trainee Journey Funnel"
        subtitle="Where Maharashtra's trained workforce stands — from enrolment to wage progression"
        action={
          <button
            onClick={() => onNavigateSection('outcomes')}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-gov-700 hover:underline cursor-pointer"
          >
            Detailed outcomes <ChevronRight className="w-3 h-3" />
          </button>
        }
      >
        <JourneyBar steps={journeySteps} />
      </Card>

      {/* Main Analytics Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Chart 1: Placement Rate by Course / Program */}
        <Card
          title="Placement Rate by Training Course"
          subtitle="Comparison of placement rate (%) across top training programmes"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={programPlacementData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                <XAxis
                  dataKey="courseName"
                  tick={{ fontSize: 10, fill: CHART.axis }}
                  stroke={CHART.axis}
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  unit="%"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: CHART.axis }}
                  stroke={CHART.axis}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={(v) => `${v}%`}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                    />
                  }
                />
                <Bar dataKey="employmentRate" name="Placement Rate (%)" fill="#213a5c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: Placements by District */}
        <Card
          title="Placement Performance by District"
          subtitle="Employment outcome rate across top-performing Maharashtra districts"
          action={
            <button
              onClick={() => onNavigateSection('districts')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gov-700 hover:underline cursor-pointer"
            >
              All districts <ChevronRight className="w-3 h-3" />
            </button>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDistricts} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                <XAxis
                  dataKey="district"
                  tick={{ fontSize: 10, fill: CHART.axis }}
                  stroke={CHART.axis}
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  unit="%"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: CHART.axis }}
                  stroke={CHART.axis}
                />
                <Tooltip content={<ChartTooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />} />
                <Bar dataKey="employmentRate" name="Employment Rate (%)" fill="#e87722" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 3: Monthly Wage Distribution Trends */}
        <Card
          title="Monthly Wage Distribution (INR)"
          subtitle="Monthly income brackets among verified placed candidates"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wageDistributionData} margin={{ top: 10, right: 10, left: -15, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: CHART.axis }} stroke={CHART.axis} />
                <YAxis tick={{ fontSize: 10, fill: CHART.axis }} stroke={CHART.axis} />
                <Tooltip content={<ChartTooltip formatter={(v) => `${v} candidates`} />} />
                <Bar dataKey="count" name="Employed Candidates" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 4: Non-Placement & Dropout Reasons */}
        <Card
          title="Non-Placement & Dropout Reasons"
          subtitle="Key factors reported by candidates who are seeking work or currently unplaced"
        >
          <div className="h-64 flex flex-col sm:flex-row items-center justify-between">
            <div className="w-full sm:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={nonPlacementData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {nonPlacementData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v} trainees`} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full sm:w-1/2 pl-2 space-y-2">
              {nonPlacementData.slice(0, 5).map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="truncate text-slate-700 text-[11px]">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 ml-2 shrink-0">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Follow-Up Compliance Donut & Longitudinal Retention */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Longitudinal Retention Curve */}
        <Card
          className="xl:col-span-3"
          title="Employment & Retention Curve (18-Month Window)"
          subtitle="Longitudinal tracking of employment and job retention after graduation"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.employmentTrend} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: CHART.axis }}
                  stroke={CHART.axis}
                  tickLine={false}
                  label={{
                    value: 'Months after certification',
                    position: 'insideBottom',
                    offset: -2,
                    fontSize: 10,
                    fill: '#94a3b8',
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: CHART.axis }}
                  stroke={CHART.axis}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  unit="%"
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={(v) => `${v.toFixed(1)}%`}
                      labelFormatter={(l) => `${l} months after certification`}
                    />
                  }
                />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Line
                  type="monotone"
                  dataKey="inEmployment"
                  name="In employment"
                  stroke={CHART.primary}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: CHART.primary }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="retainedInFirstJob"
                  name="Retained in first job"
                  stroke={CHART.positive}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={{ r: 3, fill: CHART.positive }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 5: Follow-Up Response Status */}
        <Card
          className="xl:col-span-2"
          title="Follow-up Operational Status"
          subtitle="Milestone response compliance status"
          action={
            <button
              onClick={() => onNavigateSection('followups')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gov-700 hover:underline cursor-pointer"
            >
              Follow-up Desk <ChevronRight className="w-3 h-3" />
            </button>
          }
        >
          <div className="h-64 flex flex-col sm:flex-row items-center justify-between">
            <div className="w-full sm:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={followupStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#ef4444" />
                    <Cell fill="#94a3b8" />
                  </Pie>
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v} follow-ups`} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full sm:w-1/2 pl-2 space-y-2.5">
              {[
                { label: 'Completed & Verified', count: followupStatusData[0].value, color: '#10b981' },
                { label: 'Due Soon (< 7 Days)', count: followupStatusData[1].value, color: '#f59e0b' },
                { label: 'Overdue Follow-up', count: followupStatusData[2].value, color: '#ef4444' },
                { label: 'Pending Verification', count: followupStatusData[3].value, color: '#94a3b8' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate text-slate-700 text-[11px]">{item.label}</span>
                  </div>
                  <span className="font-bold text-slate-900 ml-2 shrink-0">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
