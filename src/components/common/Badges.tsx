import React from 'react';
import { EmploymentStatus, VerificationStatus } from '../../types';

const pillBase =
  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border whitespace-nowrap';

export const StatusPill: React.FC<{ status: EmploymentStatus }> = ({ status }) => {
  switch (status) {
    case 'formal_employment':
      return (
        <span className={`${pillBase} bg-gov-50 text-gov-800 border-gov-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-gov-600" />
          Employed
        </span>
      );
    case 'self_employed':
      return (
        <span className={`${pillBase} bg-emerald-50 text-emerald-800 border-emerald-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          Self-employed
        </span>
      );
    case 'apprenticeship':
      return (
        <span className={`${pillBase} bg-violet-50 text-violet-800 border-violet-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
          Apprenticeship
        </span>
      );
    case 'higher_education':
      return (
        <span className={`${pillBase} bg-cyan-50 text-cyan-800 border-cyan-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-600" />
          Further Education
        </span>
      );
    case 'seeking_employment':
      return (
        <span className={`${pillBase} bg-amber-50 text-amber-800 border-amber-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Seeking Employment
        </span>
      );
    case 'unemployed':
      return (
        <span className={`${pillBase} bg-rose-50 text-rose-800 border-rose-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
          Unemployed
        </span>
      );
    default:
      return (
        <span className={`${pillBase} bg-slate-50 text-slate-600 border-slate-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Unknown
        </span>
      );
  }
};

export const VerificationBadge: React.FC<{ status: VerificationStatus }> = ({ status }) => {
  switch (status) {
    case 'epfo_verified':
      return (
        <span className={`${pillBase} bg-emerald-50 text-emerald-800 border-emerald-200`}>
          EPFO Verified
        </span>
      );
    case 'employer_verified':
      return (
        <span className={`${pillBase} bg-gov-50 text-gov-800 border-gov-200`}>
          Employer Verified
        </span>
      );
    case 'document_verified':
      return (
        <span className={`${pillBase} bg-cyan-50 text-cyan-800 border-cyan-200`}>
          Document Verified
        </span>
      );
    case 'self_reported':
      return (
        <span className={`${pillBase} bg-amber-50 text-amber-800 border-amber-200`}>
          Self-reported
        </span>
      );
    default:
      return (
        <span className={`${pillBase} bg-slate-50 text-slate-600 border-slate-200`}>
          Unverified
        </span>
      );
  }
};

export const GradeBadge: React.FC<{ grade: string }> = ({ grade }) => {
  const styles: Record<string, string> = {
    'A+': 'bg-emerald-50 text-emerald-800 border-emerald-200',
    A: 'bg-gov-50 text-gov-800 border-gov-200',
    B: 'bg-amber-50 text-amber-800 border-amber-200',
    C: 'bg-rose-50 text-rose-800 border-rose-200',
  };
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[30px] px-1.5 py-0.5 rounded text-[11px] font-bold border ${styles[grade] || styles.B}`}
    >
      {grade}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: 'Critical' | 'High' | 'Medium' | 'Low' }> = ({
  priority,
}) => {
  const styles = {
    Critical: 'bg-rose-50 text-rose-800 border-rose-200',
    High: 'bg-amber-50 text-amber-800 border-amber-200',
    Medium: 'bg-gov-50 text-gov-800 border-gov-200',
    Low: 'bg-slate-50 text-slate-600 border-slate-200',
  } as const;
  return (
    <span className={`${pillBase} ${styles[priority]}`}>{priority}</span>
  );
};

/** DPDP-style consent indicator shown on trainee profiles. */
export const ConsentBadge: React.FC<{ status: 'granted' | 'withdrawn'; date: string }> = ({
  status,
  date,
}) => (
  <span
    className={`${pillBase} ${
      status === 'granted'
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
        : 'bg-rose-50 text-rose-800 border-rose-200'
    }`}
    title={`Consent ${status} on ${date}. Contact and outcome tracking are active only with consent.`}
  >
    Consent {status} · {date}
  </span>
);

/** Employer verification status badge. */
export const EmployerVerificationBadge: React.FC<{ status: 'verified' | 'pending' | 'flagged' }> = ({
  status,
}) => {
  const styles = {
    verified: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    flagged: 'bg-rose-50 text-rose-800 border-rose-200',
  } as const;
  const labels = { verified: 'Verified', pending: 'Pending', flagged: 'Flagged' } as const;
  return <span className={`${pillBase} ${styles[status]}`}>{labels[status]}</span>;
};

/** Follow-up contact-attempt outcome badge. */
export const ContactStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    Contacted: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Pending: 'bg-slate-50 text-slate-600 border-slate-200',
    'No response': 'bg-amber-50 text-amber-800 border-amber-200',
    Unreachable: 'bg-rose-50 text-rose-800 border-rose-200',
    Relocated: 'bg-violet-50 text-violet-800 border-violet-200',
    'Failed delivery': 'bg-rose-50 text-rose-800 border-rose-200',
  };
  return (
    <span className={`${pillBase} ${styles[status] || styles.Pending}`}>{status}</span>
  );
};
