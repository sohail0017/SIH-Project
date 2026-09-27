import React, { useMemo, useState } from 'react';
import { PageHeader } from '../common/PageHeader';
import { Card } from '../common/Card';
import { PriorityBadge } from '../common/Badges';
import { CHART } from '../common/ChartTooltip';
import { useSkillTrack } from '../../store/DataProvider';

const priorityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;

export const SkillGapsView: React.FC = () => {
  const { data } = useSkillTrack();
  const [sector, setSector] = useState<string>('all');

  const skillGaps = data.skillGaps;

  const sectors = useMemo(
    () => Array.from(new Set(skillGaps.map((g) => g.sector))).sort(),
    [skillGaps]
  );

  const gaps = useMemo(
    () =>
      skillGaps
        .filter((g) => sector === 'all' || g.sector === sector)
        .sort((a, b) => b.gap - a.gap || priorityRank[a.priority] - priorityRank[b.priority]),
    [skillGaps, sector]
  );

  const criticalCount = gaps.filter((g) => g.priority === 'Critical').length;
  const highCount = gaps.filter((g) => g.priority === 'High').length;
  const employerPartners = data.employers.filter((e) => e.verificationStatus === 'verified').length;

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="Skill Gap Analysis"
        subtitle={`Employer demand versus training supply across Maharashtra's ${sectors.length} priority sectors — used to steer curriculum and seat allocation.`}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Critical gaps', value: String(criticalCount), accent: 'text-rose-700' },
          { label: 'High-priority gaps', value: String(highCount), accent: 'text-amber-700' },
          { label: 'Sectors assessed', value: String(sectors.length), accent: 'text-slate-900' },
          { label: 'Employer partners', value: String(employerPartners), accent: 'text-slate-900' },
        ].map((s) => (
          <div key={s.label} className="p-4 bg-white border border-slate-200 rounded-lg">
            <p className="text-[11px] font-medium text-slate-500">{s.label}</p>
            <p className={`mt-1.5 text-xl font-bold tabular-nums ${s.accent}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <Card
        title="Demand vs Supply by Skill"
        subtitle="Employer demand index (0–100) against current training supply capacity. Gap = demand − supply."
        padded={false}
        action={
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="py-1.5 pl-2.5 pr-7 text-xs bg-white border border-slate-200 rounded text-slate-700 focus:border-gov-400 outline-none transition-colors cursor-pointer"
          >
            <option value="all">All sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase font-semibold tracking-wide text-slate-500">
                <th className="py-2.5 pl-5 pr-3">Skill</th>
                <th className="py-2.5 px-3 hidden md:table-cell">Sector</th>
                <th className="py-2.5 px-3 hidden sm:table-cell w-[210px]">Demand vs Supply</th>
                <th className="py-2.5 px-3 text-right hidden lg:table-cell">Employer Demand</th>
                <th className="py-2.5 px-3 text-right hidden lg:table-cell">Training Supply</th>
                <th className="py-2.5 px-3 text-right">Gap</th>
                <th className="py-2.5 pl-3 pr-5 text-right">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {gaps.map((g) => (
                <tr key={g.id} className="hover:bg-gov-50/50 transition-colors">
                  <td className="py-3 pl-5 pr-3">
                    <p className="font-semibold text-slate-800">{g.skill}</p>
                    <p className="text-[10px] text-slate-400 md:hidden">{g.sector}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 max-w-[260px] hidden xl:block">{g.note}</p>
                  </td>
                  <td className="py-3 px-3 text-slate-500 hidden md:table-cell">{g.sector}</td>
                  <td className="py-3 px-3 hidden sm:table-cell">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] uppercase font-semibold text-slate-400 w-12">
                          Demand
                        </span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-gov-800 rounded-sm transition-all duration-500"
                            style={{ width: `${g.employerDemand}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] uppercase font-semibold text-slate-400 w-12">
                          Supply
                        </span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm transition-all duration-500"
                            style={{
                              width: `${g.trainingSupply}%`,
                              backgroundColor: CHART.positive,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-800 tabular-nums hidden lg:table-cell">
                    {g.employerDemand}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600 tabular-nums hidden lg:table-cell">
                    {g.trainingSupply}
                  </td>
                  <td
                    className={`py-3 px-3 text-right font-bold tabular-nums ${
                      g.gap >= 35 ? 'text-rose-700' : g.gap >= 20 ? 'text-amber-700' : 'text-slate-600'
                    }`}
                  >
                    −{g.gap}
                  </td>
                  <td className="py-3 pl-3 pr-5 text-right">
                    <PriorityBadge priority={g.priority} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-3 text-[10px] text-slate-400 border-t border-slate-100">
          Demand index reflects quarterly employer surveys across Maharashtra; supply reflects
          current sanctioned training capacity. Demonstration data.
        </p>
      </Card>
    </div>
  );
};
