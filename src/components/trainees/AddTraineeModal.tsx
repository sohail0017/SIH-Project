import React, { useMemo, useState } from 'react';
import { X, UserPlus, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useSkillTrack } from '../../store/DataProvider';
import { useToast } from '../common/Toast';
import { MAHARASHTRA_DISTRICTS, TRAINING_YEARS } from '../../data/reference';
import { Outcome } from '../../services/model';
import { Trainee } from '../../types';
import { RegistrationConfirmationModal } from './RegistrationConfirmationModal';

interface AddTraineeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OUTCOMES: Outcome[] = [
  'Employed',
  'Self-employed',
  'Apprenticeship',
  'Further Education',
  'Seeking Employment',
  'Unemployed',
];

const inputCls =
  'w-full py-2 pl-3 pr-8 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:border-gov-400 outline-none transition-colors cursor-pointer';
const labelCls = 'block text-[10px] uppercase font-semibold tracking-wide text-slate-400 mb-1.5';

export const AddTraineeModal: React.FC<AddTraineeModalProps> = ({ isOpen, onClose }) => {
  const { data, addTrainee } = useSkillTrack();
  const { pushToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [eshramUan, setEshramUan] = useState('');
  const [gstin, setGstin] = useState('');
const [udyamNumber, setUdyamNumber] = useState('');
  const [gender, setGender] = useState<'Female' | 'Male'>('Female');
  const [age, setAge] = useState('22');
  const [district, setDistrict] = useState<string>('Pune');
  const [programId, setProgramId] = useState<string>(data.programs[0]?.id || '');
  const [providerId, setProviderId] = useState<string>('');
  const [trainingYear, setTrainingYear] = useState<string>('2024-25');
  const [outcome, setOutcome] = useState<Outcome>('Employed');
  const [startingWage, setStartingWage] = useState('16500');
  const [consentGiven, setConsentGiven] = useState(false);
  const [ackDuplicate, setAckDuplicate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Newly created trainee for confirmation slip
  const [confirmedTrainee, setConfirmedTrainee] = useState<Trainee | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  // Real-time duplicate detection
  const duplicateMatch = useMemo(() => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanName = fullName.trim().toLowerCase();
    if (!cleanPhone && cleanName.length < 3) return null;

    return data.trainees.find((t) => {
      const tPhone = (t.phone || '').replace(/\D/g, '').slice(-10);
      const tName = t.fullName.trim().toLowerCase();
      if (cleanPhone && cleanPhone.length >= 10 && tPhone === cleanPhone) {
        return true;
      }
      if (cleanName.length >= 3 && tName === cleanName && t.district === district) {
        return true;
      }
      return false;
    });
  }, [data.trainees, phone, fullName, district]);

  const eligibleProviders = useMemo(
    () => data.providers.filter((p) => p.districtsCovered.includes(district)),
    [data.providers, district]
  );

  const effectiveProviderId = eligibleProviders.some((p) => p.id === providerId)
    ? providerId
    : eligibleProviders[0]?.id || '';

  if (!isOpen) return null;

  const canSubmit =
    fullName.trim().length > 2 &&
    programId &&
    effectiveProviderId &&
    age &&
    consentGiven &&
    (!duplicateMatch || ackDuplicate);

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      await addTrainee({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        // Business identifiers are persisted on employees.selfEmployment for self-employed trainees.
        // They are optional and remain unverified until staff verifies the submitted documents.
        gstin: outcome === 'Self-employed' ? gstin.trim().toUpperCase() || undefined : undefined,
        udyamNumber: outcome === 'Self-employed' ? udyamNumber.trim().toUpperCase() || undefined : undefined,
        eshramUan: eshramUan.trim() || undefined,
        gender,
        age: Math.max(18, Math.min(45, parseInt(age, 10) || 22)),
        district,
        programId,
        providerId: effectiveProviderId,
        trainingYear,
        outcome,
        startingWage: Number(startingWage) || 16500,
        consentGiven: true,
        consentVersion: 'v1.0-DPDP',
        
      });

      pushToast(
        `${fullName.trim()} registered with DPDP consent. Official confirmation slip generated.`,
        'success'
      );

      // Fetch or synthesize new trainee object for immediate confirmation slip display
      const latestTrainee =
        data.trainees.find((t) => t.fullName.toLowerCase() === fullName.trim().toLowerCase()) ||
        ({
          id: `ST-${trainingYear.slice(0, 4)}-MH-NEW`,
          traineeId: `ST-${trainingYear.slice(0, 4)}-MH-NEW`,
          fullName: fullName.trim(),
          gender,
          age: parseInt(age, 10) || 22,
          phone: phone || '+91 98200 00000',
          email: email || `${fullName.trim().toLowerCase().replace(/\s+/g, '.')}@example.in`,
          district,
          division: 'Pune',
          category: 'General',
          education: 'Class 12 Pass',
          trainingYear,
          programId,
          programName: data.programs.find((p) => p.id === programId)?.courseName || programId,
          sector: data.programs.find((p) => p.id === programId)?.sector || 'Technical',
          providerId: effectiveProviderId,
          providerName: data.providers.find((p) => p.id === effectiveProviderId)?.name || effectiveProviderId,
          batchId: `B-${trainingYear.slice(2, 7)}-NEW`,
          enrolmentDate: new Date().toISOString().slice(0, 10),
          consentStatus: 'granted',
          consentDate: new Date().toISOString().slice(0, 10),
          consentGiven: true,
          consentVersion: 'v1.0-DPDP',
          completionDate: new Date().toISOString().slice(0, 10),
          certificationDate: new Date().toISOString().slice(0, 10),
          nsqfLevel: 4,
          attendanceRate: 92,
          assessmentScore: 82,
          currentStatus: outcome === 'Employed' ? 'formal_employment' : 'self_employed',
          verificationStatus: 'self_reported',
          initialWage: Number(startingWage) || 16500,
          currentWage: Number(startingWage) || 16500,
          monthsInCurrentJob: 0,
          employerName: outcome === 'Employed' ? 'Tech Associate' : 'Self-employed',
          designation: 'Technical Associate',
          lastFollowupDate: '',
          nextFollowupDue: '',
          timelineEvents: [],
          followupLogs: [],
          skillRatings: [],
          employmentHistory: [],
          wageSnapshots: [],
          skillsUsedAtWork: [],
        } as unknown as Trainee);

      setConfirmedTrainee(latestTrainee);
      setConfirmationOpen(true);
      setFullName('');
      setPhone('');
      setEmail('');
      setGstin('');
      setUdyamNumber('');
      setEshramUan('');
      setConsentGiven(false);
      setAckDuplicate(false);

    } catch {
      pushToast('Could not add the trainee. Please check the form and try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 md:p-6 bg-slate-950/40 animate-fade"
      onClick={onClose}
    >
      <div
        className="animate-pop w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Add Trainee</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              New enrolment record — becomes available across the platform immediately
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto">
          <div className="sm:col-span-2">
            <label className={labelCls}>Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rutuja Jadhav"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-300 focus:border-gov-400 outline-none transition-colors"
            />
          </div>
          <div>
            <label className={labelCls}>Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value as 'Female' | 'Male')} className={inputCls}>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Age</label>
            <input
              type="number"
              min={18}
              max={45}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:border-gov-400 outline-none transition-colors"
            />
          </div>
          <div>
            <label className={labelCls}>District</label>
            <select value={district} onChange={(e) => setDistrict(e.target.value)} className={inputCls}>
              {MAHARASHTRA_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Training year</label>
            <select value={trainingYear} onChange={(e) => setTrainingYear(e.target.value)} className={inputCls}>
              {TRAINING_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Programme</label>
            <select value={programId} onChange={(e) => setProgramId(e.target.value)} className={inputCls}>
              {data.programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.courseName} · {p.sector}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Training provider (serving {district})</label>
            <select
              value={effectiveProviderId}
              onChange={(e) => setProviderId(e.target.value)}
              className={inputCls}
            >
              {eligibleProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-300 focus:border-gov-400 outline-none transition-colors"
            />
          </div>
          <div>
            <label className={labelCls}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="candidate@example.in"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-300 focus:border-gov-400 outline-none transition-colors"
            />
          </div>
          <div>
              <label className={labelCls}>eShram UAN (Optional)</label>
              <input
              type="text"
              inputMode="numeric"
              maxLength={12}
              value={eshramUan}
              onChange={(e) => setEshramUan(e.target.value.replace(/\D/g, '').slice(0, 12))}
              placeholder="12-digit UAN"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:border-gov-400 outline-none transition-colors"
            />
          </div>
          <div>
            <label className={labelCls}>Current outcome</label>
            <select value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)} className={inputCls}>
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          {outcome === 'Self-employed' && (
  <>
    <div>
      <label className={labelCls}>Business GSTIN (Optional)</label>
      <input
        type="text"
        maxLength={15}
        value={gstin}
        onChange={(e) => setGstin(e.target.value.toUpperCase())}
        placeholder="15-character GSTIN"
        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:border-gov-400 outline-none transition-colors"
      />
    </div>
    <div>
      <label className={labelCls}>Udyam Registration Number (Optional)</label>
      <input
        type="text"
        maxLength={19}
        value={udyamNumber}
        onChange={(e) => setUdyamNumber(e.target.value.toUpperCase())}
        placeholder="Example: UDYAM-MH-00-0000000"
        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:border-gov-400 outline-none transition-colors"
      />
    </div>
  </>
)}
          <div>
            <label className={labelCls}>Monthly Wage (₹)</label>
            <input
              type="number"
              value={startingWage}
              onChange={(e) => setStartingWage(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:border-gov-400 outline-none transition-colors"
            />
          </div>

          {/* Duplicate Detection Warning Banner */}
          {duplicateMatch && (
            <div className="sm:col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs animate-fade">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-900">Duplicate Candidate Detected</p>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  A trainee matching this record already exists in the registry: <strong>{duplicateMatch.fullName}</strong> ({duplicateMatch.id}, District: {duplicateMatch.district}).
                </p>
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ackDuplicate}
                    onChange={(e) => setAckDuplicate(e.target.checked)}
                    className="accent-amber-600 rounded cursor-pointer"
                  />
                  <span className="text-[11px] font-semibold text-amber-900">
                    I verify this is a distinct candidate / valid new enrolment
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* DPDP Statutory Consent Checkbox */}
          <div className="sm:col-span-2 p-3.5 bg-gov-50/80 border border-gov-200 rounded-lg space-y-2">
            <div className="flex items-center gap-1.5 text-gov-900 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-gov-700" />
              <span>Digital Personal Data Protection (DPDP) Compliance</span>
              <span className="ml-auto text-[9px] font-mono bg-gov-200/80 text-gov-900 px-1.5 py-0.5 rounded">
                v1.0-DPDP
              </span>
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="accent-gov-700 mt-0.5 shrink-0 rounded cursor-pointer"
                required
              />
              <span className="text-[11px] text-slate-700 leading-relaxed">
                <strong className="text-slate-900">Explicit Trainee Consent:</strong> I explicitly consent to the collection, processing, periodic outcome tracking (30/60/90/180-day follow-ups), and employment verification cross-checks under the <strong>DPDP Act, 2023</strong> by the Maharashtra State Innovation Society.
              </span>
            </label>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 border border-slate-300 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold text-white bg-gov-700 hover:bg-gov-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Register Trainee & Generate Slip'}
          </button>
        </footer>
      </div>

      {/* Official Registration Slip Modal */}
      {confirmedTrainee && (
        <RegistrationConfirmationModal
          trainee={confirmedTrainee}
          isOpen={confirmationOpen}
          onClose={() => {
            setConfirmationOpen(false);
            setConfirmedTrainee(null);
            onClose();
          }}
        />
      )}
    </div>
  );
};
