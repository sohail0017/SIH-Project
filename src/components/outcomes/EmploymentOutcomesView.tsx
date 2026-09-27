import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { Card } from '../common/Card';
import { ChartTooltip } from '../common/ChartTooltip';
import { GlobalFilterBar, EmptyFilterState } from '../common/GlobalFilterBar';
import { useFilteredData } from '../../store/FilterProvider';
import { CATEGORY_COLORS, OUTCOME_ORDER } from '../../services/derive';
import { formatNumber } from '../../lib/format';
import { Outcome } from '../../services/model';

/** Map a composed trainee status back to the canonical outcome categories. */
const outcomeOf = (t: { currentStatus: string }): Outcome => {
  switch (t.currentStatus) {
    case 'formal_employment':
      return 'Employed';
    case 'self_employed':
      return 'Self-employed';
    case 'apprenticeship':
      return 'Apprenticeship';
    case 'higher_education':
      return 'Further Education';
    case 'seeking_employment':
      return 'Seeking Employment';
    case 'unemployed':
      return 'Unemployed';
    default:
      return 'Unknown';
  }
};

export const EmploymentOutcomesView: React.FC = () => {
  const data = useFilteredData();
  const population = data.totals.certified;
  const distribution = data.outcomeDistribution;

  /** Programme-level breakdown of the SAME filtered dataset. */
  const tableRows = useMemo(() => {
    return data.programs
      .map((p) => {
        const members = data.trainees.filter((t) => t.programId === p.id && t.certificationDate);
        const dist = OUTCOME_ORDER.map((category) => ({
          category,
          count: members.filter((t) => outcomeOf(t) === category).length,
        }));
        const employed = members.filter(
          (t) => outcomeOf(t) === 'Employed' || outcomeOf(t) === 'Self-employed'
        );
        const avgWage = employed.length
          ? Math.round(employed.reduce((acc, t) => acc + t.currentWage, 0) / employed.length)
          : 0;
        return {
          id: p.id,
          courseName: p.courseName,
          sector: p.sector,
          certified: members.length,
          distribution: dist.map((d) => ({
            ...d,
            percentage: members.length ? (d.count / members.length) * 100 : 0,
            color: CATEGORY_COLORS[d.category],
          })),
          employedShare: members.length ? (employed.length / members.length) * 100 : 0,
          avgWage,
        };
      })
      .filter((r) => r.certified > 0);
  }, [data.programs, data.trainees]);

  const handleExport = () => {
    const header = 'Category,Trainees,Share\n';
    const rows = distribution
      .map((d) => `${d.category},${d.count},${d.percentage.toFixed(1)}%`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Maharashtra_Employment_Outcomes.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="Employment Outcomes"
        subtitle="What happens to Maharashtra's trainees after training — verified outcomes across employment, self-employment, apprenticeship, education and unemployment."
        actions={
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export CSV
          </button>
        }
      />

      {/* Central filter bar — Maharashtra is the fixed scope (no state filter) */}
      <GlobalFilterBar />

      {population === 0 ? (
        <EmptyFilterState certifiedOnly />
      ) : (
        <>
          {/* Seven outcome categories */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            {distribution.map((cat) => (
              <div
                key={cat.category}
                className="p-4 bg-white border border-slate-200 rounded-lg hover:border-gov-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-[11px] font-medium text-slate-500 truncate">{cat.category}</span>
                </div>
                <p className="text-[22px] leading-none font-bold tracking-tight text-slate-900 tabular-nums">
                  {cat.percentage.toFixed(1)}%
                </p>
                <p className="mt-2 text-[10px] text-slate-400 tabular-nums">
                  {formatNumber(cat.count)} trainees
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Simple visualization */}
            <Card
              title="Outcome Distribution"
              subtitle="Share of certified trainees by post-training status"
            >
              <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribution}
                      dataKey="percentage"
                      nameKey="category"
                      innerRadius="62%"
                      outerRadius="88%"
                      paddingAngle={1.5}
                      strokeWidth={2}
                      stroke="#ffffff"
                    >
                      {distribution.map((cat) => (
                        <Cell key={cat.category} fill={cat.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip formatter={(v) => `${v.toFixed(1)}%`} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                    Certified
                  </p>
                  <p className="text-lg font-bold text-slate-900 tabular-nums">
                    {formatNumber(population)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                {distribution.map((cat) => (
                  <div key={cat.category} className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-slate-500 truncate">{cat.category}</span>
                    <span className="ml-auto font-semibold text-slate-700 tabular-nums">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Detailed table */}
            <Card
              className="xl:col-span-2"
              title="Outcomes by Programme"
              subtitle="Post-training status distribution of certified trainees, by programme"
              padded={false}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase font-semibold tracking-wide text-slate-500">
                      <th className="py-2.5 pl-5 pr-3">Programme</th>
                      <th className="py-2.5 px-3 text-right">Certified</th>
                      <th className="py-2.5 px-3 hidden md:table-cell">Distribution</th>
                      <th className="py-2.5 px-3 text-right hidden sm:table-cell">Avg. Wage (current)</th>
                      <th className="py-2.5 pl-3 pr-5 text-right">Employed + Self-emp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {tableRows.map((row) => (
                      <tr key={row.id} className="hover:bg-gov-50/50 transition-colors">
                        <td className="py-3 pl-5 pr-3">
                          <p className="font-semibold text-slate-800">{row.courseName}</p>
                          <p className="text-[10px] text-slate-400">{row.sector}</p>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600 tabular-nums">
                          {formatNumber(row.certified)}
                        </td>
                        <td className="py-3 px-3 hidden md:table-cell">
                          <div
                            className="flex h-2 w-44 rounded-sm overflow-hidden"
                            title={row.distribution
                              .map((d) => `${d.category} ${d.percentage.toFixed(1)}%`)
                              .join(' · ')}
                          >
                            {row.distribution.map((d) => (
                              <div
                                key={d.category}
                                style={{ width: `${d.percentage}%`, backgroundColor: d.color }}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600 tabular-nums hidden sm:table-cell">
                          {row.avgWage > 0 ? `₹${formatNumber(row.avgWage)}` : '—'}
                        </td>
                        <td className="py-3 pl-3 pr-5 text-right font-semibold text-slate-800 tabular-nums">
                          {row.employedShare.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                    {tableRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                          No certified trainees match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="px-5 py-3 text-[10px] text-slate-400 border-t border-slate-100">
                Percentages are shares of certified trainees. “Employed + Self-employed” is the reported
                employment rate. Figures are demonstration data.
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
