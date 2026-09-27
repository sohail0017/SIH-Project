import React from 'react';
import { Users, CheckCircle2, Briefcase, Clock3, IndianRupee, ShieldCheck } from 'lucide-react';
import { DashboardMetrics } from '../../types';
import { formatNumber, formatINR } from '../../lib/format';

interface KpiCardsGridProps {
  metrics: DashboardMetrics;
  onCardClick?: (kpiId: string) => void;
}

export const KpiCardsGrid: React.FC<KpiCardsGridProps> = ({ metrics, onCardClick }) => {
  const cards = [
    {
      id: 'total_trainees',
      label: 'Total Trainees',
      value: formatNumber(metrics.totalTrainees),
      sub: 'Enrolled since 2021-22',
      icon: Users,
    },
    {
      id: 'training_completed',
      label: 'Training Completed',
      value: formatNumber(metrics.trainingCompleted),
      sub: `${metrics.completionRate}% completion rate`,
      icon: CheckCircle2,
    },
    {
      id: 'employment_rate',
      label: 'Employment Rate',
      value: `${metrics.employmentRate}%`,
      sub: 'Of certified trainees',
      icon: Briefcase,
    },
    {
      id: 'retention_6m',
      label: '6-Month Retention',
      value: metrics.retentionRate6M === null ? '—' : `${metrics.retentionRate6M}%`,
      sub: metrics.retentionRate6M === null ? 'No 6-month observations yet' : 'Of placed trainees',
      icon: Clock3,
    },
    {
      id: 'avg_wage',
      label: 'Average Monthly Wage',
      value: metrics.averageMonthlyWage === null ? '—' : formatINR(metrics.averageMonthlyWage),
      sub:
        metrics.wageGrowth12M === null
          ? 'No wage progression records yet'
          : `+${metrics.wageGrowth12M}% within 12 months`,
      icon: IndianRupee,
    },
    {
      id: 'verified_outcomes',
      label: 'Verified Outcomes',
      value: `${metrics.verifiedOutcomesRate}%`,
      sub: 'EPFO / employer / document',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            onClick={() => onCardClick?.(card.id)}
            className="text-left p-4 bg-white border border-slate-200 rounded-lg hover:border-gov-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-medium text-slate-500 leading-tight">
                {card.label}
              </span>
              <Icon className="w-4 h-4 text-slate-300 group-hover:text-gov-600 transition-colors" />
            </div>
            <p
              className="text-[22px] leading-none font-bold tracking-tight text-slate-900 tabular-nums"
              data-testid={`kpi-${card.id}`}
            >
              {card.value}
            </p>
            <p className="mt-2 text-[10px] text-slate-400 leading-tight">{card.sub}</p>
          </button>
        );
      })}
    </div>
  );
};
