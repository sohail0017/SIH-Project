import React from 'react';
import { TrendingUp, MapPin, BookOpen, Layers, Target, Download, CalendarDays, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { useToast } from '../common/Toast';
import { useSkillTrack } from '../../store/DataProvider';
import { formatDate } from '../../lib/format';
import { ReportDef } from '../../types';

const ICONS = {
  outcomes: TrendingUp,
  district: MapPin,
  programme: BookOpen,
  skills: Layers,
  impact: Target,
} as const;

export const ReportsView: React.FC = () => {
  const { data } = useSkillTrack();
  const { pushToast } = useToast();

  const handleGenerate = (report: ReportDef) => {
    try {
      let filename = `Maharashtra_SkillTrack_${report.id}_${new Date().toISOString().slice(0, 10)}.csv`;
      let csvContent = '';

      if (report.id === 'rep_quarterly_outcomes' || report.icon === 'outcomes') {
        filename = `Maharashtra_Quarterly_Outcomes_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        csvContent = 'Trainee ID,Full Name,District,Program,Outcome,Starting Wage,Current Wage,Verification\n';
        for (const t of data.trainees) {
          csvContent += `"${t.traineeId}","${t.fullName}","${t.district}","${t.programName}","${t.currentStatus}",${t.initialWage},${t.currentWage},"${t.verificationStatus}"\n`;
        }
      } else if (report.id === 'rep_district_ranking' || report.icon === 'district') {
        filename = `Maharashtra_District_Performance_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        csvContent = 'District,Division,Certified,Employment Rate (%),6-Month Retention (%),Average Monthly Wage (INR),Grade\n';
        for (const d of data.districtStats) {
          csvContent += `"${d.district}","${d.division}",${d.certified},${d.employmentRate},${d.retention6M},${d.averageWage || 0},"${d.grade}"\n`;
        }
      } else if (report.id === 'rep_programme_roi' || report.icon === 'programme') {
        filename = `Maharashtra_Programme_Performance_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        csvContent = 'Programme Name,Sector,NSQF Level,Duration (Hrs),Enrolled,Certified,Employment Rate (%),Average Wage (INR)\n';
        for (const p of data.programs) {
          csvContent += `"${p.courseName}","${p.sector}",${p.nsqfLevel},${p.durationHours},${p.enrolled},${p.certified},${p.employmentRate},${p.averageStartingWage || 0}\n`;
        }
      } else if (report.id === 'rep_skills_mismatch' || report.icon === 'skills') {
        filename = `Maharashtra_Skill_Gap_Index_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        csvContent = 'Skill Competency,Sector,Employer Demand Index (0-100),Training Supply Index (0-100),Net Gap,Priority Status\n';
        for (const s of data.skillGaps) {
          csvContent += `"${s.skill}","${s.sector}",${s.employerDemand},${s.trainingSupply},${s.gap},"${s.priority}"\n`;
        }
      } else {
        filename = `Maharashtra_Executive_Skilling_Summary_${new Date().toISOString().slice(0, 10)}.csv`;
        csvContent = 'Metric,Value,Unit\n';
        csvContent += `Total Trainees Enrolled,${data.metrics.totalTrainees},Count\n`;
        csvContent += `Certified Trainees,${data.totals.certified},Count\n`;
        csvContent += `State Employment Rate,${data.metrics.employmentRate},%\n`;
        csvContent += `6-Month Retention Rate,${data.metrics.retentionRate6M || 0},%\n`;
        csvContent += `Average Monthly Starting Wage,${data.metrics.averageMonthlyWage || 0},INR\n`;
        csvContent += `Outcome Verification Rate,${data.metrics.verifiedOutcomesRate},%\n`;
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      pushToast(`Generated and downloaded: ${filename}`, 'success');
    } catch {
      pushToast('Could not generate report.', 'error');
    }
  };

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="Reports"
        subtitle="Standard departmental reports generated live from Maharashtra's longitudinal skilling registry."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.reports.map((report) => {
          const Icon = ICONS[report.icon];
          return (
            <article
              key={report.id}
              className="flex flex-col p-5 bg-white border border-slate-200 rounded-lg hover:border-gov-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="w-10 h-10 rounded-md bg-gov-50 border border-gov-100 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-gov-700" />
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                  <CalendarDays className="w-3 h-3" />
                  {report.period}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-slate-900 leading-snug">{report.title}</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed flex-1">
                {report.description}
              </p>

              <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3.5 flex-1">
                {report.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-[11px] text-slate-600">
                    <span className="w-1 h-1 rounded-full bg-gov-500 mt-1.5 shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleGenerate(report)}
                className="mt-4 inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-md text-xs font-semibold text-white bg-gov-700 hover:bg-gov-800 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Generate & Download CSV
              </button>
            </article>
          );
        })}

        {/* Reporting context card */}
        <article className="flex flex-col justify-center p-5 bg-gov-900 rounded-lg text-gov-50">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              Automated Data Pipeline
            </p>
          </div>
          <p className="text-xs text-gov-100/80 leading-relaxed">
            All reports aggregate live numbers across 36 Maharashtra districts, 2,000 trainee records, 12 NSQF training
            curriculums, and verified EPFO wage entries.
          </p>
          <div className="mt-4 pt-3 border-t border-gov-800 text-[11px] text-gov-100/60">
            Source: Department of Skills, Employment, Entrepreneurship & Innovation (MSInS)
          </div>
        </article>
      </div>
    </div>
  );
};
