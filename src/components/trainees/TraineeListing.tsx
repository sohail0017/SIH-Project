import React, { useMemo, useState } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, Eye, UserPlus, Edit2, Trash2 } from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { Card } from '../common/Card';
import { StatusPill, VerificationBadge } from '../common/Badges';
import { JourneyDots, computeJourney } from '../common/JourneyBar';
import { GlobalFilterBar, EmptyFilterState } from '../common/GlobalFilterBar';
import { useFilteredData } from '../../store/FilterProvider';
import { useSkillTrack } from '../../store/DataProvider';
import { useToast } from '../common/Toast';
import { AddTraineeModal } from './AddTraineeModal';
import { EditTraineeModal } from './EditTraineeModal';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { Trainee, EmploymentStatus, VerificationStatus } from '../../types';
import { formatNumber, formatINR } from '../../lib/format';

interface TraineeListingProps {
  onSelectTrainee: (trainee: Trainee) => void;
}

const PAGE_SIZE = 8;

export const TraineeListing: React.FC<TraineeListingProps> = ({ onSelectTrainee }) => {
  const data = useFilteredData();
  const { deleteTrainee } = useSkillTrack();
  const { pushToast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editingTrainee, setEditingTrainee] = useState<Trainee | null>(null);
  const [deletingTrainee, setDeletingTrainee] = useState<Trainee | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [verification, setVerification] = useState('all');
  const [page, setPage] = useState(1);

  const trainees = data.trainees;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trainees.filter((t) => {
      const matchesSearch =
        q === '' ||
        t.fullName.toLowerCase().includes(q) ||
        t.traineeId.toLowerCase().includes(q) ||
        t.district.toLowerCase().includes(q) ||
        t.programName.toLowerCase().includes(q) ||
        t.employerName.toLowerCase().includes(q);
      return (
        matchesSearch &&
        (status === 'all' || t.currentStatus === status) &&
        (verification === 'all' || t.verificationStatus === verification)
      );
    });
  }, [trainees, search, status, verification]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleExport = () => {
    const header = 'Trainee ID,Name,District,Programme,Status,Verification,Starting Wage,Current Wage\n';
    const rows = filtered
      .map(
        (t) =>
          `${t.traineeId},"${t.fullName}","${t.district}","${t.programName}",${t.currentStatus},${t.verificationStatus},${t.initialWage},${t.currentWage}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Maharashtra_Trainee_Register.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="Trainees"
        subtitle="Longitudinal registry of certified trainees — follow the journey from enrolment to wage progression."
        actions={
          <>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-gov-200 bg-gov-50 text-gov-800 hover:bg-gov-100 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Trainee
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              Export CSV
            </button>
          </>
        }
      />

      {/* Central filter bar — the registry below shows the filtered dataset */}
      <GlobalFilterBar />

      {data.metrics.totalTrainees === 0 ? (
        <EmptyFilterState />
      ) : (
        <>
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, ID, district, employer…"
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:border-gov-400 outline-none transition-colors"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="py-2 pl-3 pr-8 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:border-gov-400 outline-none transition-colors cursor-pointer"
        >
          <option value="all">All employment statuses</option>
          <option value="formal_employment">Employed</option>
          <option value="self_employed">Self-employed</option>
          <option value="apprenticeship">Apprenticeship</option>
          <option value="higher_education">Further Education</option>
          <option value="seeking_employment">Seeking Employment</option>
          <option value="unemployed">Unemployed</option>
        </select>
        <select
          value={verification}
          onChange={(e) => {
            setVerification(e.target.value);
            setPage(1);
          }}
          className="py-2 pl-3 pr-8 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:border-gov-400 outline-none transition-colors cursor-pointer"
        >
          <option value="all">All verification levels</option>
          <option value="epfo_verified">EPFO verified</option>
          <option value="employer_verified">Employer verified</option>
          <option value="document_verified">Document verified</option>
          <option value="self_reported">Self-reported</option>
        </select>
      </div>

      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase font-semibold tracking-wide text-slate-500">
                <th className="py-2.5 pl-5 pr-3">Trainee</th>
                <th className="py-2.5 px-3 hidden md:table-cell">District</th>
                <th className="py-2.5 px-3 hidden lg:table-cell">Programme</th>
                <th className="py-2.5 px-3 hidden xl:table-cell">Journey</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 hidden xl:table-cell">Verification</th>
                <th className="py-2.5 px-3 text-right">Monthly Wage</th>
                <th className="py-2.5 pl-3 pr-5 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => onSelectTrainee(t)}
                  className="hover:bg-gov-50/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 pl-5 pr-3">
                    <p className="font-semibold text-slate-800">{t.fullName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{t.traineeId}</p>
                    <p className="text-[10px] text-slate-400 md:hidden">{t.district}</p>
                  </td>
                  <td className="py-3 px-3 text-slate-600 whitespace-nowrap hidden md:table-cell">{t.district}</td>
                  <td className="py-3 px-3 max-w-[200px] hidden lg:table-cell">
                    <p className="text-slate-700 truncate">{t.programName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{t.sector}</p>
                  </td>
                  <td className="py-3 px-3 hidden xl:table-cell">
                    <JourneyDots steps={computeJourney(t)} />
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <StatusPill status={t.currentStatus as EmploymentStatus} />
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap hidden xl:table-cell">
                    <VerificationBadge status={t.verificationStatus as VerificationStatus} />
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                    {t.currentWage > 0 ? (
                      <div>
                        <p className="font-semibold text-slate-800">{formatINR(t.currentWage)}</p>
                        {t.currentWage > t.initialWage && t.initialWage > 0 && (
                          <p className="text-[10px] text-emerald-600">
                            +{Math.round(((t.currentWage - t.initialWage) / t.initialWage) * 100)}% since placement
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 pl-3 pr-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTrainee(t);
                        }}
                        className="p-1.5 rounded text-[11px] font-semibold text-gov-700 hover:bg-gov-50 transition-colors"
                        title={`View ${t.fullName}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTrainee(t);
                        }}
                        className="p-1.5 rounded text-[11px] font-semibold text-slate-600 hover:text-gov-700 hover:bg-gov-50 transition-colors"
                        title={`Edit ${t.fullName}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingTrainee(t);
                        }}
                        className="p-1.5 rounded text-[11px] font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title={`Delete ${t.fullName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                    No trainees match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-500">
          <p>
            Showing{' '}
            <span className="font-semibold text-slate-700">
              {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filtered.length)}
            </span>{' '}
            of <span className="font-semibold text-slate-700">{formatNumber(filtered.length)}</span>{' '}
            records
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={safePage === 1}
              onClick={() => setPage(safePage - 1)}
              className="p-1 rounded border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-semibold text-slate-700">
              Page {safePage} of {totalPages}
            </span>
            <button
              disabled={safePage === totalPages}
              onClick={() => setPage(safePage + 1)}
              className="p-1 rounded border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Card>

          <AddTraineeModal isOpen={addOpen} onClose={() => setAddOpen(false)} />

          {editingTrainee && (
            <EditTraineeModal
              trainee={editingTrainee}
              isOpen={!!editingTrainee}
              onClose={() => setEditingTrainee(null)}
            />
          )}

          {deletingTrainee && (
            <DeleteConfirmModal
              isOpen={!!deletingTrainee}
              title="Delete Trainee Record"
              itemName={deletingTrainee.fullName}
              itemIdentifier={deletingTrainee.traineeId}
              onClose={() => setDeletingTrainee(null)}
              onConfirm={async () => {
                await deleteTrainee(deletingTrainee.id);
                pushToast(`Trainee ${deletingTrainee.fullName} (${deletingTrainee.traineeId}) deleted successfully.`, 'success');
              }}
            />
          )}
        </>
      )}
    </div>
  );
};
