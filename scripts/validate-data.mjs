// Data validation for /public/data — checks relationships, duplicates,
// missing fields, invalid dates/numbers and status consistency.
import { readFileSync } from 'node:fs';

const load = (f) => JSON.parse(readFileSync(`public/data/${f}.json`, 'utf8'));
const trainees = load('trainees');
const employees = load('employees');
const programs = load('trainingPrograms');
const providers = load('providers');
const employers = load('employers');
const skills = load('skills');
const followups = load('followups');

const errors = [];
const warn = (msg) => errors.push(msg);

// --- duplicate IDs ---
const dupCheck = (name, rows) => {
  const ids = new Set();
  rows.forEach((r) => {
    if (ids.has(r.id)) warn(`${name}: duplicate id ${r.id}`);
    ids.add(r.id);
  });
};
['trainees', 'employees', 'trainingPrograms', 'providers', 'employers', 'skills', 'followups'].forEach(
  (n) => dupCheck(n, { trainees, employees, trainingPrograms: programs, providers, employers, skills, followups }[n])
);

// --- referential integrity ---
const traineeIds = new Set(trainees.map((t) => t.id));
const programIds = new Set(programs.map((p) => p.id));
const providerIds = new Set(providers.map((p) => p.id));
const employerIds = new Set(employers.map((e) => e.id));

trainees.forEach((t) => {
  if (!programIds.has(t.programId)) warn(`trainee ${t.id}: unknown programId ${t.programId}`);
  if (!providerIds.has(t.providerId)) warn(`trainee ${t.id}: unknown providerId ${t.providerId}`);
});
employees.forEach((e) => {
  if (!traineeIds.has(e.traineeId)) warn(`employee ${e.id}: unknown traineeId ${e.traineeId}`);
  if (e.employerId && !employerIds.has(e.employerId)) warn(`employee ${e.id}: unknown employerId ${e.employerId}`);
  (e.jobs || []).forEach((j) => {
    if (j.employerId && !employerIds.has(j.employerId)) warn(`employee ${e.id} job: unknown employerId ${j.employerId}`);
  });
  if (e.apprenticeship && !employerIds.has(e.apprenticeship.employerId))
    warn(`employee ${e.id}: apprenticeship unknown employerId`);
});
followups.forEach((f) => {
  if (!traineeIds.has(f.traineeId)) warn(`followup ${f.id}: unknown traineeId ${f.traineeId}`);
});

// --- one employment record per trainee ---
const seen = new Set();
employees.forEach((e) => {
  if (seen.has(e.traineeId)) warn(`employee ${e.id}: duplicate outcome record for ${e.traineeId}`);
  seen.add(e.traineeId);
});
trainees.filter((t) => t.certificationDate).forEach((t) => {
  if (!seen.has(t.id)) warn(`certified trainee ${t.id} has no employment record`);
});

// --- dates ---
const dateOk = (s) => !s || /^\d{4}-\d{2}-\d{2}$/.test(s);
const toDate = (s) => new Date(s);
trainees.forEach((t) => {
  ['enrolmentDate', 'consentDate', 'completionDate', 'certificationDate'].forEach((f) => {
    if (!dateOk(t[f])) warn(`trainee ${t.id}: invalid ${f} "${t[f]}"`);
  });
  if (t.completionDate && toDate(t.completionDate) < toDate(t.enrolmentDate))
    warn(`trainee ${t.id}: completion before enrolment`);
  if (t.certificationDate && t.completionDate && toDate(t.certificationDate) < toDate(t.completionDate))
    warn(`trainee ${t.id}: certification before completion`);
  if (t.attendanceRate < 0 || t.attendanceRate > 100) warn(`trainee ${t.id}: bad attendance`);
  if (t.assessmentScore < 0 || t.assessmentScore > 100) warn(`trainee ${t.id}: bad score`);
  if (!t.consentStatus) warn(`trainee ${t.id}: missing consentStatus`);
});
employees.forEach((e) => {
  ['startDate', 'lastVerifiedDate'].forEach((f) => {
    if (!dateOk(e[f])) warn(`employee ${e.id}: invalid ${f} "${e[f]}"`);
  });
  if (e.startingWage < 0 || e.currentWage < 0) warn(`employee ${e.id}: negative wage`);
  if (e.monthsInJob < 0) warn(`employee ${e.id}: negative monthsInJob`);
  (e.wageSnapshots || []).forEach((s) => {
    if (![0, 3, 6, 12].includes(s.atMonths)) warn(`employee ${e.id}: odd snapshot month ${s.atMonths}`);
    if (s.wage <= 0) warn(`employee ${e.id}: non-positive snapshot wage`);
  });
  (e.jobs || []).forEach((j) => {
    if (!dateOk(j.startDate) || !dateOk(j.endDate)) warn(`employee ${e.id}: invalid job dates`);
    if (j.endDate && toDate(j.endDate) < toDate(j.startDate)) warn(`employee ${e.id}: job end before start`);
  });
  if (e.selfEmployment) {
    if (!e.selfEmployment.businessStatus) warn(`employee ${e.id}: SE missing status`);
    if (!Array.isArray(e.selfEmployment.challenges)) warn(`employee ${e.id}: SE challenges not array`);
  }
});

// --- status consistency ---
const VALID_OUTCOMES = ['Employed', 'Self-employed', 'Apprenticeship', 'Further Education', 'Seeking Employment', 'Unemployed', 'Unknown'];
employees.forEach((e) => {
  if (!VALID_OUTCOMES.includes(e.outcome)) warn(`employee ${e.id}: unknown outcome "${e.outcome}"`);
  if (e.outcome === 'Self-employed' && !e.selfEmployment) warn(`employee ${e.id}: self-employed without details`);
  if (e.outcome === 'Apprenticeship' && !e.apprenticeship) warn(`employee ${e.id}: apprenticeship outcome without details`);
  if ((e.outcome === 'Unemployed' || e.outcome === 'Seeking Employment') && !e.nonPlacementReason)
    warn(`employee ${e.id}: non-placement without reason`);
});
followups.forEach((f) => {
  if (!['Open', 'Completed'].includes(f.status)) warn(`followup ${f.id}: bad status`);
  if (!['High', 'Medium', 'Low'].includes(f.priority)) warn(`followup ${f.id}: bad priority`);
  (f.attempts || []).forEach((a) => {
    if (!['Phone call', 'SMS', 'WhatsApp', 'Email', 'Field visit'].includes(a.channel))
      warn(`followup ${f.id}: bad channel "${a.channel}"`);
    if (!['Contacted', 'No response', 'Unreachable', 'Relocated', 'Failed delivery', 'Pending'].includes(a.status))
      warn(`followup ${f.id}: bad attempt status "${a.status}"`);
  });
});
employers.forEach((e) => {
  if (!['verified', 'pending', 'flagged'].includes(e.verificationStatus)) warn(`employer ${e.id}: bad status`);
  if (!Array.isArray(e.verificationHistory)) warn(`employer ${e.id}: history not array`);
});
skills.forEach((s) => {
  if (s.employerDemand < 0 || s.employerDemand > 100 || s.trainingSupply < 0 || s.trainingSupply > 100)
    warn(`skill ${s.id}: index out of range`);
});

console.log(errors.length === 0 ? 'DATA VALIDATION: PASS' : `DATA VALIDATION: ${errors.length} issue(s)`);
errors.slice(0, 30).forEach((e) => console.log('  -', e));
