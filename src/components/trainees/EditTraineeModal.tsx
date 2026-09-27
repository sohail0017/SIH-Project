import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, ShieldAlert } from 'lucide-react';
import { Trainee, EmploymentStatus, VerificationStatus } from '../../types';
import { Outcome } from '../../services/model';
import { useSkillTrack } from '../../store/DataProvider';
import { useToast } from '../common/Toast';
import { MAHARASHTRA_DISTRICTS, TRAINING_YEARS } from '../../data/reference';

interface EditTraineeModalProps {
  trainee: Trainee | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updated: Trainee) => void;
}

const OUTCOME_MAP: Record<EmploymentStatus, Outcome> = {
  formal_employment: 'Employed',
  self_employed: 'Self-employed',
  apprenticeship: 'Apprenticeship',
  higher_education: 'Further Education',
  seeking_employment: 'Seeking Employment',
  unemployed: 'Unemployed',
  inactive: 'Unknown',
};

export const EditTraineeModal: React.FC<EditTraineeModalProps> = ({
  trainee,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { data, updateTrainee } = useSkillTrack();
  const { pushToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [eshramUan, setEshramUan] = useState('');
  const [age, setAge] = useState(22);
  const [gender, setGender] = useState<'Female' | 'Male' | 'Other'>('Female');
  const [district, setDistrict] = useState('Pune');
  const [category, setCategory] = useState<Trainee['category']>('General');
  const [education, setEducation] = useState('12th Pass');
  const [trainingYear, setTrainingYear] = useState('2024-25');
  const [nsqfLevel, setNsqfLevel] = useState(4);
  const [attendanceRate, setAttendanceRate] = useState(90);
  const [assessmentScore, setAssessmentScore] = useState(80);

  // Employment fields
  const [outcome, setOutcome] = useState<Outcome>('Employed');
  const [designation, setDesignation] = useState('');
  const [employerName, setEmployerName] = useState('');
  const [startingWage, setStartingWage] = useState(15000);
  const [currentWage, setCurrentWage] = useState(16500);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('self_reported');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (trainee) {
      setFullName(trainee.fullName);
      setPhone(trainee.phone);
      setEmail(trainee.email);
      setEshramUan(trainee.eshramUan || '');
      setAge(trainee.age);
      setGender(trainee.gender);
      setDistrict(trainee.district);
      setCategory(trainee.category);
      setEducation(trainee.education);
      setTrainingYear(trainee.trainingYear);
      setNsqfLevel(trainee.nsqfLevel);
      setAttendanceRate(trainee.attendanceRate);
      setAssessmentScore(trainee.assessmentScore);

      const matchedOutcome = OUTCOME_MAP[trainee.currentStatus] || 'Employed';
      setOutcome(matchedOutcome);
      setDesignation(trainee.designation === '—' ? '' : trainee.designation);
      setEmployerName(trainee.employerName === '—' ? '' : trainee.employerName);
      setStartingWage(trainee.initialWage || 15000);
      setCurrentWage(trainee.currentWage || 16500);
      setVerificationStatus(trainee.verificationStatus);
    }
  }, [trainee]);

  if (!isOpen || !trainee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) {
      pushToast('Full name must be at least 2 characters.', 'error');
      return;
    }

    setSaving(true);
    try {
      await updateTrainee(
        trainee.id,
        {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          eshramUan: eshramUan.trim() || undefined,
          age: Number(age),
          gender: gender === 'Other' ? 'Female' : gender,
          district,
          category,
          education,
          trainingYear,
          nsqfLevel: Number(nsqfLevel),
          attendanceRate: Number(attendanceRate),
          assessmentScore: Number(assessmentScore),
        },
        {
          outcome,
          designation: designation.trim() || 'Technical Associate',
          startingWage: Number(startingWage),
          currentWage: Number(currentWage),
          verification: verificationStatus,
        }
      );

      pushToast(`Trainee record for ${fullName.trim()} updated successfully!`, 'success');

      if (onSaved) {
        onSaved({
          ...trainee,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          age: Number(age),
          district,
          category,
          education,
          trainingYear,
          nsqfLevel: Number(nsqfLevel),
          attendanceRate: Number(attendanceRate),
          assessmentScore: Number(assessmentScore),
          designation: designation.trim() || '—',
          initialWage: Number(startingWage),
          currentWage: Number(currentWage),
          verificationStatus,
        });
      }

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update record.';
      pushToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center p-3 md:p-6 bg-slate-950/50 backdrop-blur-xs animate-fade"
      onClick={onClose}
    >
      <div
        className="animate-pop w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gov-700 bg-gov-50 px-2 py-0.5 rounded border border-gov-100">
                Edit Record
              </span>
              <span className="text-xs font-mono text-slate-400">{trainee.traineeId}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">Modify Trainee Information</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Personal Info */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Personal & Contact Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:border-gov-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'Female' | 'Male' | 'Other')}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:border-gov-600 outline-none"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Age</label>
                <input
                  type="number"
                  min={18}
                  max={60}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:border-gov-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:border-gov-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:border-gov-600 outline-none"
                />
              </div>
              <div>
  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
    eShram UAN (Optional)
  </label>
  <input
    type="text"
    inputMode="numeric"
    maxLength={12}
    value={eshramUan}
    onChange={(e) => setEshramUan(e.target.value.replace(/\D/g, '').slice(0, 12))}
    placeholder="12-digit UAN"
    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:border-gov-600 outline-none"
  />
</div>
            </div>
          </div>

          {/* Regional & Academic */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Geography & Training Progress
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">District</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:border-gov-600 outline-none"
                >
                  {MAHARASHTRA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Social Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Trainee['category'])}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:border-gov-600 outline-none"
                >
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="EWS">EWS</option>
                  <option value="SEBC">SEBC</option>
                  <option value="VJNT">VJNT</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">NSQF Level</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={nsqfLevel}
                  onChange={(e) => setNsqfLevel(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:border-gov-600 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Attendance Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={attendanceRate}
                  onChange={(e) => setAttendanceRate(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:border-gov-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Assessment Score (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={assessmentScore}
                  onChange={(e) => setAssessmentScore(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:border-gov-600 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Employment Outcomes & Wages */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Placement & Wage Progression
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Current Outcome</label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as Outcome)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:border-gov-600 outline-none"
                >
                  <option value="Employed">Employed</option>
                  <option value="Self-employed">Self-employed</option>
                  <option value="Apprenticeship">Apprenticeship</option>
                  <option value="Further Education">Further Education</option>
                  <option value="Seeking Employment">Seeking Employment</option>
                  <option value="Unemployed">Unemployed</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Designation</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Quality Technician"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:border-gov-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Verification Level</label>
                <select
                  value={verificationStatus}
                  onChange={(e) => setVerificationStatus(e.target.value as VerificationStatus)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:border-gov-600 outline-none"
                >
                  <option value="epfo_verified">EPFO Verified</option>
                  <option value="employer_verified">Employer Verified</option>
                  <option value="document_verified">Document Verified</option>
                  <option value="self_reported">Self Reported</option>
                  <option value="unverified">Unverified</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Starting Wage (₹ / mo)</label>
                <input
                  type="number"
                  value={startingWage}
                  onChange={(e) => setStartingWage(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:border-gov-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Current Wage (₹ / mo)</label>
                <input
                  type="number"
                  value={currentWage}
                  onChange={(e) => setCurrentWage(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:border-gov-600 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold rounded-md bg-gov-700 hover:bg-gov-800 text-white transition-colors flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

