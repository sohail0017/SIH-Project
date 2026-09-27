import React from 'react';
import { Check } from 'lucide-react';
import { JourneyStageId, JourneyStep, Trainee } from '../../types';

interface JourneyBarProps {
  steps: JourneyStep[];
  compact?: boolean;
}

/**
 * The canonical trainee journey used across the platform:
 * Enrolled -> Training -> Certified -> Placed -> Employed -> Retained -> Wage Progression
 * Wraps into rows on small screens; single connected line from lg up.
 */
export const JourneyBar: React.FC<JourneyBarProps> = ({ steps, compact = false }) => (
  <div className="w-full">
    <ol className="flex flex-wrap items-start justify-center lg:flex-nowrap lg:justify-between lg:min-w-[720px] gap-y-3 gap-x-2">
      {steps.map((step, idx) => (
        <React.Fragment key={`${step.id}-${idx}`}>
          <li className="flex flex-col items-center text-center gap-1.5 min-w-[84px]">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                step.status === 'complete'
                  ? 'bg-gov-700 border-gov-700 text-white'
                  : step.status === 'current'
                    ? 'bg-white border-gov-600 text-gov-700 ring-4 ring-gov-100'
                    : 'bg-white border-slate-300 text-slate-400'
              }`}
            >
              {step.status === 'complete' ? (
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              ) : (
                <span className="text-[10px] font-bold">{idx + 1}</span>
              )}
            </span>
            <span
              className={`text-[11px] leading-tight ${
                step.status === 'pending' ? 'text-slate-400' : 'text-slate-700'
              } font-medium`}
            >
              {step.label}
            </span>
            {step.meta && (
              <span className="text-[10px] text-slate-400 leading-tight">{step.meta}</span>
            )}
          </li>
          {idx < steps.length - 1 && (
            <span
              className={`hidden lg:block flex-1 h-px ${
                step.status === 'complete' ? 'bg-gov-600' : 'bg-slate-200'
              }`}
              style={{ marginBottom: compact ? 18 : 22 }}
              aria-hidden
            />
          )}
        </React.Fragment>
      ))}
    </ol>
  </div>
);

const JOURNEY_STAGES: { id: JourneyStageId; label: string }[] = [
  { id: 'enrolled', label: 'Enrolled' },
  { id: 'training', label: 'Training' },
  { id: 'certified', label: 'Certified' },
  { id: 'placed', label: 'Placed' },
  { id: 'employed', label: 'Employed' },
  { id: 'retained', label: 'Retained' },
  { id: 'wage', label: 'Wage Progression' },
];

/** Derive a trainee's position along the canonical journey. */
export function computeJourney(t: Trainee): JourneyStep[] {
  const placed =
    t.currentStatus === 'formal_employment' ||
    t.currentStatus === 'self_employed' ||
    t.currentStatus === 'apprenticeship';
  const employed = placed && (t.currentStatus !== 'apprenticeship' || t.monthsInCurrentJob >= 1);
  const retained = employed && t.monthsInCurrentJob >= 6;
  const wageProgressed = retained && t.currentWage > t.initialWage && t.initialWage > 0;

  const done = [
    true,
    Boolean(t.completionDate),
    Boolean(t.certificationDate),
    placed,
    employed,
    retained,
    wageProgressed,
  ];

  let currentFound = false;
  return JOURNEY_STAGES.map((s, i) => {
    let status: JourneyStep['status'] = 'pending';
    if (done[i]) status = 'complete';
    else if (!currentFound) {
      status = 'current';
      currentFound = true;
    }
    return { id: s.id, label: s.label, status };
  });
}

/** Compact 7-dot journey indicator for table rows. */
export const JourneyDots: React.FC<{ steps: JourneyStep[] }> = ({ steps }) => (
  <span
    className="inline-flex items-center gap-1"
    title={steps.map((s) => `${s.label}: ${s.status}`).join(' · ')}
  >
    {steps.map((s, i) => (
      <span
        key={`${s.id}-${i}`}
        className={`w-1.5 h-1.5 rounded-full ${
          s.status === 'complete'
            ? 'bg-gov-700'
            : s.status === 'current'
              ? 'bg-gov-300 ring-2 ring-gov-100'
              : 'bg-slate-200'
        }`}
      />
    ))}
  </span>
);
