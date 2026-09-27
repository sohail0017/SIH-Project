import React, { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  BadgeCheck,
  Phone,
  Building2,
  GraduationCap,
  IndianRupee,
  Briefcase,
  Store,
  AlertCircle,
  ArrowRight,
  Edit2,
  Trash2,
  Printer,
  MessageSquare,
} from 'lucide-react';
import { Trainee } from '../../types';
import { StatusPill, VerificationBadge, ConsentBadge } from '../common/Badges';
import { JourneyBar, computeJourney } from '../common/JourneyBar';
import { formatINR, formatDate } from '../../lib/format';
import { useSkillTrack } from '../../store/DataProvider';
import { useToast } from '../common/Toast';
import { EditTraineeModal } from './EditTraineeModal';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { RegistrationConfirmationModal } from './RegistrationConfirmationModal';
import { WhatsAppFollowupModal } from '../followups/WhatsAppFollowupModal';

interface TraineeProfileModalProps {
  trainee: Trainee | null;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  enrolled: 'Enrolment',
  training: 'Training',
  certified: 'Certification',
  placed: 'Placement',
  employed: 'Employment',
  retained: 'Retention',
  wage: 'Wage Progression',
};

const Section: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({
  title,
  icon: Icon,
  children,
}) => (
  <div>
    <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 mb-3">
      <Icon className="w-3.5 h-3.5 text-gov-700" />
      {title}
    </h3>
    {children}
  </div>
);

export const TraineeProfileModal: React.FC<TraineeProfileModalProps> = ({ trainee, onClose }) => {
  const { deleteTrainee } = useSkillTrack();
  const { pushToast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [slipOpen, setSlipOpen] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [currentTrainee, setCurrentTrainee] = useState<Trainee | null>(trainee);

  useEffect(() => {
    setCurrentTrainee(trainee);
  }, [trainee]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (trainee) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [trainee, onClose]);

  if (!trainee || !currentTrainee) return null;

  const journey = computeJourney(currentTrainee);
  const wageGrowth =
    currentTrainee.initialWage > 0 && currentTrainee.currentWage > currentTrainee.initialWage
      ? Math.round(((currentTrainee.currentWage - currentTrainee.initialWage) / currentTrainee.initialWage) * 100)
      : 0;

  const se = currentTrainee.selfEmployment;
  const appr = currentTrainee.apprenticeshipDetails;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 md:p-6 bg-slate-950/50 animate-fade"
      onClick={onClose}
    >
      <div
        className="animate-pop bg-white rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">{trainee.fullName}</h2>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-500">
                {trainee.traineeId}
              </span>
              <StatusPill status={trainee.currentStatus} />
              <VerificationBadge status={trainee.verificationStatus} />
            </div>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 flex-wrap">
              <MapPin className="w-3 h-3 shrink-0" />
              {trainee.district}, Maharashtra · {trainee.programName} · {trainee.providerName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Close profile"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Journey + consent */}
        <div className="px-5 py-4 bg-slate-50/60 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-[10px] uppercase font-semibold tracking-wide text-slate-400">
              Trainee journey
            </p>
            <ConsentBadge status={trainee.consentStatus} date={formatDate(trainee.consentDate)} />
          </div>
          <JourneyBar steps={journey} compact />
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Key facts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100 border-b border-slate-100">
            {[
              {
                icon: GraduationCap,
                label: 'NSQF Level & Score',
                value: `Level ${trainee.nsqfLevel} · ${trainee.assessmentScore}%`,
              },
              {
                icon: BadgeCheck,
                label: 'Attendance',
                value: `${trainee.attendanceRate}%`,
              },
              {
                icon: Building2,
                label: 'Employer',
                value: trainee.employerName,
              },
              {
                icon: IndianRupee,
                label: 'Wage (start → current)',
                value:
                  trainee.currentWage > 0
                    ? `${formatINR(trainee.initialWage)} → ${formatINR(trainee.currentWage)}${wageGrowth > 0 ? ` (+${wageGrowth}%)` : ''}`
                    : '—',
              },
            ].map((f) => (
              <div key={f.label} className="px-4 py-3.5 bg-white">
                <p className="flex items-center gap-1.5 text-[10px] uppercase font-semibold tracking-wide text-slate-400">
                  <f.icon className="w-3 h-3" />
                  {f.label}
                </p>
                <p className="text-xs font-semibold text-slate-800 mt-1.5 leading-snug">{f.value}</p>
              </div>
            ))}
          </div>
          {trainee.eshramUan && (
  <div className="px-5 py-4 border-b border-slate-100">
    <Section title="Worker Registration" icon={BadgeCheck}>
      <p className="text-xs text-slate-600">
        eShram UAN: <span className="font-mono font-semibold">{trainee.eshramUan}</span>
      </p>
    </Section>
  </div>
)}
          {/* Wage snapshots (0/3/6/12 months) */}
          {trainee.wageSnapshots.length > 0 && (
            <div className="px-5 py-4 border-b border-slate-100">
              <Section title="Wage Progression" icon={IndianRupee}>
                <div className="flex flex-wrap items-center gap-2">
                  {trainee.wageSnapshots.map((s) => (
                    <div
                      key={s.atMonths}
                      className="px-3 py-2 rounded-md border border-slate-200 bg-slate-50/60"
                    >
                      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                        {s.atMonths === 0 ? 'Placement' : `${s.atMonths} mo`}
                      </p>
                      <p className="text-xs font-bold text-slate-800 tabular-nums mt-0.5">
                        {formatINR(s.wage)}
                      </p>
                    </div>
                  ))}
                  {trainee.currentWage > 0 && (
                    <div className="flex items-center gap-1 text-slate-300">
                      <ArrowRight className="w-3.5 h-3.5" />
                      <div className="px-3 py-2 rounded-md border border-gov-200 bg-gov-50">
                        <p className="text-[10px] uppercase tracking-wide text-gov-700 font-semibold">
                          Current
                        </p>
                        <p className="text-xs font-bold text-gov-900 tabular-nums mt-0.5">
                          {formatINR(trainee.currentWage)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            </div>
          )}

          {/* Non-placement reason */}
          {trainee.nonPlacementReason && (
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-start gap-2.5 p-3 rounded-md bg-amber-50/70 border border-amber-100">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-semibold text-amber-800">Reason for non-placement</p>
                  <p className="text-xs text-amber-800/80 mt-0.5">{trainee.nonPlacementReason}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 p-5">
            {/* Timeline */}
            <div className="md:col-span-3">
              <Section title="Outcome Timeline" icon={BadgeCheck}>
                <ol className="relative border-l-2 border-slate-100 ml-1.5 space-y-5">
                  {trainee.timelineEvents.map((ev) => (
                    <li key={ev.id} className="pl-5 relative">
                      <span
                        className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2 border-white ${
                          ev.verified ? 'bg-gov-700' : 'bg-slate-300'
                        }`}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          {CATEGORY_LABELS[ev.category] || ev.category}
                        </span>
                        <span className="text-[10px] text-slate-400">·</span>
                        <span className="text-[10px] text-slate-500 font-medium tabular-nums">
                          {formatDate(ev.date)}
                        </span>
                        {ev.verified ? (
                          <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                            Unverified
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">{ev.title}</p>
                      {ev.badge && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-gov-50 border border-gov-100 text-[10px] font-semibold text-gov-800">
                          {ev.badge}
                        </span>
                      )}
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {ev.description}
                      </p>
                      {ev.evidence && (
                        <p className="text-[10px] text-slate-400 mt-1">Evidence: {ev.evidence}</p>
                      )}
                    </li>
                  ))}
                </ol>
              </Section>

              {/* Employment history */}
              {trainee.employmentHistory.length > 0 && (
                <div className="mt-6">
                  <Section title="Employment History" icon={Briefcase}>
                    <div className="space-y-2.5">
                      {trainee.employmentHistory.map((job, i) => (
                        <div
                          key={`${job.startDate}-${i}`}
                          className={`p-3 rounded-md border ${
                            job.endDate ? 'border-slate-200 bg-slate-50/50' : 'border-gov-200 bg-gov-50/60'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-800">
                              {job.designation}
                              <span className="text-slate-400 font-normal"> · {job.employerName}</span>
                            </p>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                job.endDate
                                  ? 'bg-slate-100 text-slate-500'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              }`}
                            >
                              {job.endDate ? 'Ended' : 'Current'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
                            {formatDate(job.startDate)} — {job.endDate ? formatDate(job.endDate) : 'present'} ·{' '}
                            {formatINR(job.startingWage)}
                            {job.endingWage > job.startingWage ? ` → ${formatINR(job.endingWage)}` : ''}
                          </p>
                          {job.reasonForLeaving && (
                            <p className="text-[10px] text-rose-700 mt-1">
                              Reason for leaving: {job.reasonForLeaving}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Section>
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="md:col-span-2 space-y-6">
              {/* Self-employment details */}
              {se && (
                <Section title="Self-Employment Details" icon={Store}>
                  <dl className="text-xs divide-y divide-slate-100 border border-slate-200 rounded-md">
                    {[
                      ['Business type', se.businessType],
                      ['Sector', se.sector],
                      ['Started', formatDate(se.startDate)],
                      ['Location', se.location],
                      ['Income range', se.revenueRange],
                      ['Status', se.businessStatus],
                      ['People employed', String(se.employees)],
                      ...(se.challenges.length ? [['Challenges', se.challenges.join(', ')]] : []),
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-start justify-between gap-3 px-3 py-2">
                        <dt className="text-slate-400 shrink-0">{k}</dt>
                        <dd className="text-slate-700 font-medium text-right">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </Section>
              )}

              {/* Apprenticeship details */}
              {appr && (
                <Section title="Apprenticeship Details" icon={GraduationCap}>
                  <dl className="text-xs divide-y divide-slate-100 border border-slate-200 rounded-md">
                    {[
                      ['Employer', appr.employerName || '—'],
                      ['Period', `${formatDate(appr.startDate)} — ${formatDate(appr.endDate)}`],
                      ['Stipend', formatINR(appr.stipend)],
                      ['Completed', appr.completed ? 'Yes' : 'In progress'],
                      ...(appr.convertedToPermanent
                        ? [
                            ['Converted to permanent', 'Yes'],
                            ['Conversion date', appr.conversionDate ? formatDate(appr.conversionDate) : '—'],
                          ]
                        : []),
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-start justify-between gap-3 px-3 py-2">
                        <dt className="text-slate-400 shrink-0">{k}</dt>
                        <dd className="text-slate-700 font-medium text-right">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </Section>
              )}

              {/* Skills: taught vs used at work */}
              <Section title="Assessed Skills & Workplace Usage" icon={GraduationCap}>
                <div className="space-y-2.5">
                  {trainee.skillRatings.map((s) => {
                    const used = trainee.skillsUsedAtWork.includes(s.skill);
                    return (
                      <div key={s.skill}>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-600 truncate flex items-center gap-1.5">
                            {s.skill}
                            {used && (
                              <span
                                className="text-[9px] font-bold px-1 py-px rounded bg-emerald-50 text-emerald-700 border border-emerald-100"
                                title="Skill actually used at work"
                              >
                                USED AT WORK
                              </span>
                            )}
                          </span>
                          <span className="font-semibold text-slate-700 tabular-nums">{s.score}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                          <div
                            className={`h-full rounded-sm transition-all duration-500 ${used ? 'bg-gov-600' : 'bg-slate-300'}`}
                            style={{ width: `${s.score}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {trainee.skillRelevance != null && (
                  <p className="text-[11px] text-slate-500 mt-3">
                    Trainee-rated training relevance:{' '}
                    <span className="font-semibold text-gov-800">{trainee.skillRelevance}/5</span>
                  </p>
                )}
                {trainee.employerFeedback && (
                  <p className="text-[11px] text-slate-500 mt-2 border-t border-slate-100 pt-2">
                    <span className="font-semibold text-slate-600">Employer feedback:</span>{' '}
                    {trainee.employerFeedback}
                  </p>
                )}
              </Section>

              {/* Follow-up log */}
              <Section title="Follow-up Log" icon={Phone}>
                <div className="space-y-3">
                  {trainee.followupLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-md border border-slate-200 bg-slate-50/50">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {log.channel}
                        </span>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          {formatDate(log.date)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{log.notes}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                        <span>Satisfaction {log.jobSatisfaction}/5</span>
                        <span>Relevance {log.skillRelevanceRating}/5</span>
                      </div>
                    </div>
                  ))}
                  {trainee.followupLogs.length === 0 && (
                    <p className="text-[11px] text-slate-400">No follow-ups recorded yet.</p>
                  )}
                </div>
              </Section>
            </div>
          </div>
        </div>

        <footer className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[10px] text-slate-400">
            Next follow-up due: {currentTrainee.nextFollowupDue ? formatDate(currentTrainee.nextFollowupDue) : '—'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSlipOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Print Slip
            </button>
            <button
              onClick={() => setWhatsAppOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              WhatsApp Follow-Up
            </button>
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Record
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </footer>

        {slipOpen && (
          <RegistrationConfirmationModal
            trainee={currentTrainee}
            isOpen={slipOpen}
            onClose={() => setSlipOpen(false)}
          />
        )}

        {whatsAppOpen && (
          <WhatsAppFollowupModal
            trainee={currentTrainee}
            isOpen={whatsAppOpen}
            onClose={() => setWhatsAppOpen(false)}
            onSubmitted={() => {
              setWhatsAppOpen(false);
            }}
          />
        )}

        {editOpen && (
          <EditTraineeModal
            trainee={currentTrainee}
            isOpen={editOpen}
            onClose={() => setEditOpen(false)}
            onSaved={(updated) => setCurrentTrainee(updated)}
          />
        )}

        {deleteOpen && (
          <DeleteConfirmModal
            isOpen={deleteOpen}
            title="Delete Trainee Record"
            itemName={currentTrainee.fullName}
            itemIdentifier={currentTrainee.traineeId}
            onClose={() => setDeleteOpen(false)}
            onConfirm={async () => {
              await deleteTrainee(currentTrainee.id);
              pushToast(`Trainee ${currentTrainee.fullName} deleted successfully.`, 'success');
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
};
