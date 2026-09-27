import React, { useState } from 'react';
import {
  User,
  GraduationCap,
  Briefcase,
  Award,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  FileText,
  Clock,
  Send,
  Lock,
  ChevronRight,
  Sparkles,
  Download,
} from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { useSkillTrack } from '../../store/DataProvider';
import { useToast } from '../common/Toast';
import { PageHeader } from '../common/PageHeader';
import { Card } from '../common/Card';
import { StatusPill, VerificationBadge } from '../common/Badges';
import { formatINR, formatDate } from '../../lib/format';
import { MAHARASHTRA_DISTRICTS } from '../../data/reference';

export const UserDashboardView: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();
  const { data } = useSkillTrack();
  const { pushToast } = useToast();

  // Find linked trainee record or default to sample trainee
  const linkedTrainee =
    data.trainees.find((t) => t.id === user?.traineeId) ||
    data.trainees.find((t) => t.fullName.toLowerCase() === user?.fullName.toLowerCase()) ||
    data.trainees[0];

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'career' | 'profile'>('overview');

  // Profile edit form state
  const [editName, setEditName] = useState(user?.fullName || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editDistrict, setEditDistrict] = useState(user?.district || 'Pune');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Career assistance form state
  const [inquiryType, setInquiryType] = useState('wage_verification');
  const [inquiryNotes, setInquiryNotes] = useState('');
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({
        fullName: editName,
        phone: editPhone,
        district: editDistrict,
        oldPassword: oldPassword || undefined,
        newPassword: newPassword || undefined,
      });
      pushToast('Profile information updated successfully!', 'success');
      setOldPassword('');
      setNewPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not update profile';
      pushToast(msg, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryNotes.trim()) {
      pushToast('Please enter details for your request.', 'error');
      return;
    }
    setSubmittingInquiry(true);
    setTimeout(() => {
      pushToast('Your request has been submitted to the District Skill Committee!', 'success');
      setInquiryNotes('');
      setSubmittingInquiry(false);
    }, 600);
  };

  const handleDownloadID = () => {
    pushToast('Downloading verified Maharashtra Skill ID card (PDF)...', 'success');
  };

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="My Citizen Dashboard"
        subtitle="Track your training enrolment, government certifications, employment verification and career progression."
        actions={
          <button
            onClick={handleDownloadID}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-gov-200 bg-gov-50 text-gov-800 hover:bg-gov-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download Skill ID
          </button>
        }
      />

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-gov-900 to-gov-800 text-white rounded-xl p-6 shadow-xs border border-gov-950/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xl font-bold shrink-0">
              {user?.fullName ? user.fullName.slice(0, 2).toUpperCase() : 'SK'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold">{user?.fullName || 'Trainee Citizen'}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bhagwa-500 text-white">
                  Verified Candidate
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white">
                  {user?.district || linkedTrainee?.district || 'Maharashtra'}
                </span>
              </div>
              <p className="text-xs text-gov-100/80 mt-1 flex items-center gap-2">
                <span>Registration ID: {linkedTrainee?.traineeId || 'ST-2024-MH-20001'}</span>
                <span>•</span>
                <span>{user?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('profile')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              Account Settings
            </button>
            <button
              onClick={logout}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/80 hover:bg-rose-600 text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Training Enrolment</span>
            <GraduationCap className="w-4 h-4 text-gov-600" />
          </div>
          <p className="text-sm font-bold text-slate-900 truncate">
            {linkedTrainee?.programName || 'Advance Vocational Skills'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            NSQF Level {linkedTrainee?.nsqfLevel || 4} · Certified
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Placement Status</span>
            <Briefcase className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={linkedTrainee?.currentStatus || 'formal_employment'} />
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 truncate">
            {linkedTrainee?.designation || 'Technical Associate'} @ {linkedTrainee?.employerName || 'Industry Partner'}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Monthly Compensation</span>
            <Award className="w-4 h-4 text-bhagwa-600" />
          </div>
          <p className="text-lg font-bold text-slate-900">
            {linkedTrainee?.currentWage ? formatINR(linkedTrainee.currentWage) : '₹16,500'}
            <span className="text-xs text-slate-400 font-normal"> /mo</span>
          </p>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> EPFO Wage Verified
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Department Follow-up</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-sm font-bold text-slate-900">
            {linkedTrainee?.nextFollowupDue ? formatDate(linkedTrainee.nextFollowupDue) : 'Next Milestone Active'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">6-Month Retention Survey</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-gov-700 text-gov-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          My Training & Certification
        </button>
        <button
          onClick={() => setActiveTab('career')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'career'
              ? 'border-gov-700 text-gov-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Career Support & Desk Request
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-gov-700 text-gov-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Profile & Security Settings
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Course Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-gov-700" />
                Curriculum & Institutional Record
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Training Institution</span>
                  <span className="font-semibold text-slate-900 mt-1 block">
                    {linkedTrainee?.providerName || 'Government ITI Pune'}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    District: {linkedTrainee?.district || 'Pune'}, Maharashtra
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Batch & Attendance</span>
                  <span className="font-semibold text-slate-900 mt-1 block">
                    Batch {linkedTrainee?.batchId || 'B-042'} ({linkedTrainee?.trainingYear || '2024-25'})
                  </span>
                  <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">
                    {linkedTrainee?.attendanceRate || 92}% Attendance Recorded
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assessment Score</span>
                  <span className="font-semibold text-slate-900 mt-1 block">
                    {linkedTrainee?.assessmentScore || 82} / 100 Marks
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Grade: A (Distinction)</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Certification Date</span>
                  <span className="font-semibold text-slate-900 mt-1 block">
                    {linkedTrainee?.certificationDate ? formatDate(linkedTrainee.certificationDate) : 'August 2024'}
                  </span>
                  <span className="text-[11px] text-gov-700 block mt-0.5">MSInS Recognized Certificate</span>
                </div>
              </div>

              {/* Assessed Skills */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-semibold text-slate-800 mb-2.5">Validated Skill Competencies</h4>
                <div className="flex flex-wrap gap-2">
                  {(linkedTrainee?.skillRatings || [
                    { skill: 'Industry Standards', score: 85 },
                    { skill: 'Quality Inspection', score: 80 },
                    { skill: 'Safety Practices', score: 90 },
                  ]).map((s) => (
                    <span
                      key={s.skill}
                      className="px-2.5 py-1 text-xs rounded-md bg-gov-50 border border-gov-100 text-gov-800 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {s.skill} <strong className="text-slate-700">({s.score}%)</strong>
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Side Card: Verified Journey */}
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-bhagwa-500" />
                Longitudinal Milestone Track
              </h3>
              <div className="space-y-4 relative pl-4 border-l-2 border-gov-200 ml-2">
                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -left-[21px] top-1" />
                  <p className="text-xs font-bold text-slate-900">Enrolment & DPDP Consent</p>
                  <p className="text-[11px] text-slate-500">Captured with verified Aadhaar consent</p>
                </div>
                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -left-[21px] top-1" />
                  <p className="text-xs font-bold text-slate-900">NSQF Certification Issued</p>
                  <p className="text-[11px] text-slate-500">Assessed by State Board of Skills</p>
                </div>
                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -left-[21px] top-1" />
                  <p className="text-xs font-bold text-slate-900">Industry Placement Recorded</p>
                  <p className="text-[11px] text-slate-500">Formal employment contract logged</p>
                </div>
                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-bhagwa-500 animate-pulse absolute -left-[21px] top-1" />
                  <p className="text-xs font-bold text-slate-900">6-Month Milestone Pending</p>
                  <p className="text-[11px] text-slate-500">Scheduled verification call from District Desk</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Career Support Request */}
      {activeTab === 'career' && (
        <div className="max-w-2xl">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Send className="w-4 h-4 text-gov-700" />
              Departmental Assistance & Inquiries Desk
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Submit a service request or outcome update to the Maharashtra State Innovation Society follow-up officer.
            </p>

            <form onSubmit={handleInquirySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nature of Request</label>
                <select
                  value={inquiryType}
                  onChange={(e) => setInquiryType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-white focus:border-gov-600 outline-none"
                >
                  <option value="wage_verification">Update my Current Wage or Employer Information</option>
                  <option value="reskilling">Request Upskilling / NSQF Level Progression</option>
                  <option value="certificate">Request Duplicate / Digital Certificate Verification</option>
                  <option value="counselling">Book Career Counselling with District Officer</option>
                  <option value="placement_help">Seeking Assistance with New Placement / Re-employment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description & Specifics</label>
                <textarea
                  rows={4}
                  required
                  value={inquiryNotes}
                  onChange={(e) => setInquiryNotes(e.target.value)}
                  placeholder="Provide details about your current position, queries or updates for the district office..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:border-gov-600 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingInquiry}
                className="px-4 py-2 bg-gov-700 hover:bg-gov-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {submittingInquiry ? 'Submitting…' : 'Submit Assistance Request'}
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </Card>
        </div>
      )}

      {/* Tab 3: Profile Settings */}
      {activeTab === 'profile' && (
        <div className="max-w-xl">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <User className="w-4 h-4 text-gov-700" />
              Profile Details & Security
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Keep your contact information updated to receive follow-up alerts and official skilling benefits.
            </p>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:border-gov-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-slate-50 text-slate-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Email address cannot be changed</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">District</label>
                  <select
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-white focus:border-gov-600 outline-none"
                  >
                    {MAHARASHTRA_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:border-gov-600 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  Change Password (Optional)
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Enter existing password"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:border-gov-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:border-gov-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-2.5 bg-gov-700 hover:bg-gov-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
              >
                {savingProfile ? 'Saving Changes…' : 'Save Profile Changes'}
              </button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

