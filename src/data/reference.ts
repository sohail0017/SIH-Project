// ============================================================================
// SkillTrack — static reference content
// ----------------------------------------------------------------------------
// Geography (fixed Maharashtra scope), operational notifications and report
// definitions. These are presentation/reference constants — all statistics
// are derived from the JSON tables via the service layer.
// ============================================================================

import { NotificationItem, ReportDef } from '../types';

export const DEMONSTRATION_DATA_NOTE =
  'Demonstration data for illustration. Not official Government of Maharashtra statistics.';

export const MAHARASHTRA_DIVISIONS = [
  'Konkan',
  'Pune',
  'Nashik',
  'Chhatrapati Sambhajinagar',
  'Amravati',
  'Nagpur',
] as const;

export const MAHARASHTRA_DISTRICTS = [
  'Mumbai City',
  'Mumbai Suburban',
  'Thane',
  'Palghar',
  'Raigad',
  'Ratnagiri',
  'Sindhudurg',
  'Pune',
  'Satara',
  'Sangli',
  'Solapur',
  'Kolhapur',
  'Ahilyanagar',
  'Nashik',
  'Dhule',
  'Nandurbar',
  'Jalgaon',
  'Chhatrapati Sambhajinagar',
  'Jalna',
  'Beed',
  'Latur',
  'Dharashiv',
  'Nanded',
  'Parbhani',
  'Hingoli',
  'Amravati',
  'Akola',
  'Washim',
  'Buldhana',
  'Yavatmal',
  'Nagpur',
  'Wardha',
  'Bhandara',
  'Gondia',
  'Chandrapur',
  'Gadchiroli',
] as const;

export const TRAINING_YEARS = ['2021-22', '2022-23', '2023-24', '2024-25', '2025-26'] as const;

export const DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'NOTIF-01',
    title: 'September follow-up wave dispatched',
    message:
      'WhatsApp and SMS follow-ups sent for 90-day and 180-day milestones across districts with open entries.',
    timestamp: '10 minutes ago',
    read: false,
    type: 'sync',
    linkToSection: 'followups',
  },
  {
    id: 'NOTIF-02',
    title: 'Outcome verification pending',
    message:
      'Several placements await EPFO reconciliation. The concerned district officers have been notified.',
    timestamp: '2 hours ago',
    read: false,
    type: 'alert',
    linkToSection: 'outcomes',
  },
  {
    id: 'NOTIF-03',
    title: 'EV service technician demand rising',
    message:
      'Employer demand index for EV diagnostics is the largest gap in the Automotive sector this quarter.',
    timestamp: '1 day ago',
    read: false,
    type: 'update',
    linkToSection: 'skillgaps',
  },
  {
    id: 'NOTIF-04',
    title: 'Q2 district performance report generated',
    message: 'District Performance report for Apr–Jun 2026 is ready for review.',
    timestamp: '2 days ago',
    read: true,
    type: 'update',
    linkToSection: 'reports',
  },
];

/** Report catalogue — highlights are derived from live data by the service. */
export const REPORT_DEFS: Omit<ReportDef, 'highlights'>[] = [
  {
    id: 'RPT-01',
    title: 'Maharashtra Employment Outcomes',
    description:
      'Verified post-training employment, self-employment and apprenticeship outcomes across all districts and programmes.',
    period: 'April – June 2026',
    icon: 'outcomes',
  },
  {
    id: 'RPT-02',
    title: 'District Performance',
    description:
      'District-wise ranking on trainee volume, completion, employment and retention, with division-level comparisons.',
    period: 'April – June 2026',
    icon: 'district',
  },
  {
    id: 'RPT-03',
    title: 'Programme Performance',
    description:
      'Course-level conversion from enrolment to employment, retention and wage progression across MSInS-supported programmes.',
    period: 'FY 2025-26 (to date)',
    icon: 'programme',
  },
  {
    id: 'RPT-04',
    title: 'Skill Gap Analysis',
    description:
      'Employer demand versus training supply across the twelve priority sectors, with priority classifications for curriculum planning.',
    period: 'Q2 FY 2026-27',
    icon: 'skills',
  },
  {
    id: 'RPT-05',
    title: 'Impact Summary',
    description:
      'Executive summary of skilling outcomes, livelihoods created, wage gains and retention for departmental leadership.',
    period: 'FY 2021-22 – FY 2025-26',
    icon: 'impact',
  },
];
