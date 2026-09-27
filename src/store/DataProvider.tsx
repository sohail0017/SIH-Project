import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { skilltrack, SkillTrackData, NewTraineeInput } from '../services/skilltrack';
import { Outcome, ContactAttempt, TraineeRecord, EmploymentRecord } from '../services/model';

interface SkillTrackContextValue {
  data: SkillTrackData;
  loading: boolean;
  error: string | null;
  /** Reload the JSON tables from the backend. */
  refresh: () => void;
  addTrainee: (input: NewTraineeInput) => Promise<void>;
  updateTrainee: (
    id: string,
    traineePatch: Partial<TraineeRecord>,
    employmentPatch?: Partial<EmploymentRecord>
  ) => Promise<void>;
  deleteTrainee: (id: string) => Promise<void>;
  updateEmploymentOutcome: (traineeId: string, outcome: Outcome) => Promise<void>;
  recordFollowupOutcome: (followupId: string, outcome: Outcome, notes: string) => Promise<void>;
  recordPeriodicFollowup: (input: {
    traineeId: string;
    outcome: Outcome;
    reportedWage?: number;
    employerName?: string;
    verification?: string;
    feedback?: string;
    notes?: string;
    channel?: string;
    milestone?: string;
    jobSatisfaction?: number;
    skillRelevanceRating?: number;
  }) => Promise<void>;
  contactFollowup: (followupId: string) => Promise<void>;
  logFollowupAttempt: (
    followupId: string,
    attempt: { channel: ContactAttempt['channel']; status: ContactAttempt['status']; note?: string }
  ) => Promise<void>;
  rescheduleFollowup: (followupId: string, days: number) => Promise<void>;
  sendSimulatedReminder: (input: {
    traineeId: string;
    traineeName: string;
    phone?: string;
    channel?: 'WhatsApp' | 'SMS' | 'Email' | 'IVR';
    milestone?: string;
    notes?: string;
  }) => Promise<import('../types').ReminderLogItem>;
  sendBulkSimulatedReminders: (
    trainees: { id: string; fullName: string; phone?: string }[],
    channel?: 'WhatsApp' | 'SMS' | 'Email' | 'IVR',
    milestone?: string
  ) => Promise<number>;
  fetchReminderLogs: (traineeId?: string) => Promise<import('../types').ReminderLogItem[]>;
  addCourse: (input: import('../types').CourseInput) => Promise<void>;
  updateCourse: (id: string, patch: Partial<import('../types').CourseInput>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  addProvider: (input: import('../types').ProviderInput) => Promise<void>;
  updateProvider: (id: string, patch: Partial<import('../types').ProviderInput>) => Promise<void>;
  deleteProvider: (id: string) => Promise<void>;
  bulkImportTrainees: (trainees: unknown[]) => Promise<number>;
  resetData: () => void;
}

const SkillTrackContext = createContext<SkillTrackContextValue | null>(null);

/** Loading screen shown while the JSON tables are fetched. */
const DataLoadingScreen: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f7fa] gap-4">
    <svg viewBox="0 0 44 44" className="w-12 h-12" aria-hidden>
      <circle cx="22" cy="22" r="21" fill="#213a5c" />
      <circle cx="22" cy="22" r="16.5" fill="none" stroke="#e87722" strokeWidth="1.6" />
      <circle cx="22" cy="22" r="3.4" fill="#ffffff" />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={22 + 5.4 * Math.cos(angle)}
            y1={22 + 5.4 * Math.sin(angle)}
            x2={22 + 15 * Math.cos(angle)}
            y2={22 + 15 * Math.sin(angle)}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        );
      })}
    </svg>
    <div className="text-center">
      <p className="text-sm font-extrabold tracking-tight text-gov-900">
        Skill<span className="text-bhagwa-500">Track</span>
      </p>
      <p className="text-xs text-slate-500 mt-1">Loading Maharashtra skilling outcomes…</p>
    </div>
    <div className="w-56 space-y-2">
      <div className="skeleton h-3" />
      <div className="skeleton h-3 w-4/5 mx-auto" />
      <div className="skeleton h-3 w-3/5 mx-auto" />
    </div>
  </div>
);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = skilltrack.subscribe(() => setVersion((v) => v + 1));
    skilltrack
      .load()
      .then(() => setReady(true))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load data'));
    return unsubscribe;
  }, []);

  const value = useMemo<SkillTrackContextValue | null>(() => {
    const data = skilltrack.getData();
    if (!data) return null;
    return {
      data,
      loading: !ready,
      error,
      refresh: () => {
        skilltrack.load(true).catch((e) => setError(e instanceof Error ? e.message : 'Failed to load data'));
      },
      addTrainee: async (input) => {
        await skilltrack.addTrainee(input);
      },
      updateTrainee: async (id, traineePatch, employmentPatch) => {
        await skilltrack.updateTrainee(id, traineePatch, employmentPatch);
      },
      deleteTrainee: async (id) => {
        await skilltrack.deleteTrainee(id);
      },
      updateEmploymentOutcome: async (traineeId, outcome) => {
        await skilltrack.updateEmploymentOutcome(traineeId, outcome);
      },
      recordFollowupOutcome: async (followupId, outcome, notes) => {
        await skilltrack.recordFollowupOutcome(followupId, outcome, notes);
      },
      recordPeriodicFollowup: async (input) => {
        await skilltrack.recordPeriodicFollowup(input);
      },
      contactFollowup: async (id) => {
        await skilltrack.contactFollowup(id);
      },
      logFollowupAttempt: async (id, attempt) => {
        await skilltrack.logFollowupAttempt(id, attempt);
      },
      rescheduleFollowup: async (id, days) => {
        await skilltrack.rescheduleFollowup(id, days);
      },
      sendSimulatedReminder: async (input) => {
        return await skilltrack.sendSimulatedReminder(input);
      },
      sendBulkSimulatedReminders: async (trainees, channel, milestone) => {
        return await skilltrack.sendBulkSimulatedReminders(trainees, channel, milestone);
      },
      fetchReminderLogs: async (traineeId) => {
        return await skilltrack.fetchReminderLogs(traineeId);
      },
      addCourse: async (input) => {
        await skilltrack.addCourse(input);
      },
      updateCourse: async (id, patch) => {
        await skilltrack.updateCourse(id, patch);
      },
      deleteCourse: async (id) => {
        await skilltrack.deleteCourse(id);
      },
      addProvider: async (input) => {
        await skilltrack.addProvider(input);
      },
      updateProvider: async (id, patch) => {
        await skilltrack.updateProvider(id, patch);
      },
      deleteProvider: async (id) => {
        await skilltrack.deleteProvider(id);
      },
      bulkImportTrainees: async (trainees) => {
        return await skilltrack.bulkImportTrainees(trainees);
      },
      resetData: () => {
        skilltrack.resetData().catch(() => undefined);
      },
    };
  }, [version, ready, error]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa] p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-6 text-center">
          <p className="text-sm font-semibold text-slate-900">Unable to load SkillTrack data</p>
          <p className="text-xs text-slate-500 mt-2">{error}</p>
          <button
            onClick={() => {
              setError(null);
              skilltrack
                .load(true)
                .then(() => setReady(true))
                .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load data'));
            }}
            className="mt-4 px-4 py-2 rounded-md text-xs font-semibold text-white bg-gov-700 hover:bg-gov-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!value) return <DataLoadingScreen />;

  return <SkillTrackContext.Provider value={value}>{children}</SkillTrackContext.Provider>;
};

export function useSkillTrack(): SkillTrackContextValue {
  const ctx = useContext(SkillTrackContext);
  if (!ctx) throw new Error('useSkillTrack must be used within a DataProvider');
  return ctx;
}
