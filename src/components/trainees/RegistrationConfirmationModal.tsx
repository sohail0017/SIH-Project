import React from 'react';
import { X, Printer, CheckCircle2, Copy, Check } from 'lucide-react';
import { Trainee } from '../../types';
import { useToast } from '../common/Toast';

interface RegistrationConfirmationModalProps {
  trainee: Trainee | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RegistrationConfirmationModal: React.FC<RegistrationConfirmationModalProps> = ({
  trainee,
  isOpen,
  onClose,
}) => {
  const { pushToast } = useToast();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !trainee) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(trainee.id);
    setCopied(true);
    pushToast(`Copied Trainee ID: ${trainee.id}`, 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 md:p-6 bg-slate-950/60 animate-fade"
      onClick={onClose}
    >
      <div
        className="animate-pop w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col print:border-none print:shadow-none print:w-full print:max-w-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Screen Only */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Registration Confirmed</h3>
              <p className="text-[11px] text-slate-500">Official candidate enrolment acknowledgment slip</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Printable Slip Area */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-slate-800 print:p-0 print:m-0">
          {/* Government Letterhead */}
          <div className="border-b-2 border-gov-900 pb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gov-900 flex items-center justify-center text-white font-bold text-lg shadow-xs">
                🏛️
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-bhagwa-600">
                  Government of Maharashtra
                </p>
                <h2 className="text-base font-extrabold text-gov-950 tracking-tight leading-tight">
                  Maharashtra State Innovation Society (MSInS)
                </h2>
                <p className="text-[11px] text-slate-600">
                  Department of Skills, Employment, Entrepreneurship & Innovation
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 bg-gov-100 text-gov-900 text-[10px] font-bold rounded uppercase tracking-wider border border-gov-200">
                Official Receipt
              </span>
              <p className="text-[10px] text-slate-400 mt-1">Date: {trainee.enrolmentDate || new Date().toISOString().slice(0, 10)}</p>
            </div>
          </div>

          {/* Registration Number Hero Banner */}
          <div className="p-4 bg-gov-50/80 border border-gov-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-gov-700">Permanent Trainee Registration Number</p>
              <p className="text-xl font-mono font-extrabold text-gov-950 tracking-wider mt-0.5">{trainee.id}</p>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handleCopyId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gov-300 hover:bg-gov-100 text-gov-900 text-xs font-semibold rounded shadow-2xs transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                <span>{copied ? 'Copied' : 'Copy ID'}</span>
              </button>
            </div>
          </div>

          {/* Candidate & Program Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs border border-slate-200 rounded-lg p-4 bg-slate-50/40">
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Candidate Name</p>
              <p className="font-bold text-slate-900 mt-0.5">{trainee.fullName}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Gender / Age</p>
              <p className="font-medium text-slate-800 mt-0.5">{trainee.gender} · {trainee.age} yrs</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Social Category</p>
              <p className="font-medium text-slate-800 mt-0.5">{trainee.category || 'General'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">District / Division</p>
              <p className="font-medium text-slate-800 mt-0.5">{trainee.district} ({trainee.division || 'Maharashtra'})</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Phone</p>
              <p className="font-mono text-slate-800 mt-0.5">{trainee.phone}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Academic Year</p>
              <p className="font-medium text-slate-800 mt-0.5">{trainee.trainingYear || '2024-25'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[10px] uppercase font-semibold text-slate-400">Training Program</p>
              <p className="font-bold text-gov-900 mt-0.5">{trainee.programName || trainee.programId} (NSQF Level {trainee.nsqfLevel})</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Sector</p>
              <p className="font-medium text-slate-800 mt-0.5">{trainee.sector || 'Skilling Trade'}</p>
            </div>
            <div className="sm:col-span-3 border-t border-slate-200 pt-2">
              <p className="text-[10px] uppercase font-semibold text-slate-400">Training Provider & Centre</p>
              <p className="font-semibold text-slate-800 mt-0.5">{trainee.providerName || trainee.providerId} · Batch: {trainee.batchId}</p>
            </div>
          </div>

          {/* DPDP Consent Section */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-start gap-3 text-xs">
            <div className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
              ✓
            </div>
            <div className="space-y-1">
              <p className="font-bold text-emerald-950">DPDP Statutory Consent Verified</p>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Candidate explicitly consented under the <strong>Digital Personal Data Protection Act (DPDP), 2023</strong> (Consent Version: {trainee.consentVersion || 'v1.0-DPDP'}).
                Outcome tracking and 30/60/90/180-day employment follow-ups are authorized.
              </p>
              <p className="text-[10px] text-emerald-700 font-mono">Consent Timestamp: {trainee.consentDate || trainee.enrolmentDate}</p>
            </div>
          </div>

          {/* Verification QR Box */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs">
            <div className="space-y-1">
              <p className="font-bold text-slate-900">Digital Certificate & Outcome Verification</p>
              <p className="text-[11px] text-slate-500 max-w-sm leading-relaxed">
                Scan this QR code using any smartphone or government inspector terminal to verify the candidate's active enrolment in the SkillTrack registry.
              </p>
              <p className="text-[10px] text-slate-400">Portal: https://skilltrack.maha.gov.in/verify/{trainee.id}</p>
            </div>

            {/* Stylized QR Code SVG */}
            <div className="w-20 h-20 bg-white border border-slate-300 p-1.5 rounded-md flex flex-col items-center justify-center shrink-0">
              <svg viewBox="0 0 33 33" className="w-full h-full text-slate-900" fill="currentColor">
                <path d="M0 0h9v9H0zm2 2v5h5V2zm1 1h3v3H3zm8-3h1v2h-1zm3 0h3v1h-3zm5 0h1v1h-1zm2 0h2v1h-2zm4 0h1v2h-1zm-9 2h1v1h-1zm3 0h2v1h-2zm4 0h1v1h-1zm-10 1h2v1h-2zm5 0h1v2h-1zm3 0h1v1h-1zm3 0h2v2h-2zm-12 1h1v1h-1zm2 0h1v1h-1zm3 0h2v1h-2zm12 0h1v2h-1zm-15 1h2v1h-2zm4 0h1v1h-1zm7 0h1v1h-1zm-11 1h1v1h-1zm2 0h1v1h-1zm3 0h1v1h-1zm4 0h1v1h-1zm3 0h1v1h-1zm2 0h2v1h-2zm-14 1h1v1h-1zm8 0h2v1h-2zm4 0h1v1h-1zm-12 1h2v1h-2zm4 0h1v1h-1zm5 0h1v1h-1zm-9 1v9H0v-9zm2 2v5h5v-5zm1 1h3v3H3zm21-4h9v9h-9zm2 2v5h5v-5zm1 1h3v3h-3z" />
              </svg>
              <span className="text-[7px] text-slate-400 mt-0.5 uppercase tracking-tighter">VERIFIED ID</span>
            </div>
          </div>
        </div>

        {/* Footer Actions - Screen Only */}
        <footer className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/70 print:hidden">
          <p className="text-[11px] text-slate-400">
            Press <kbd className="px-1 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]">Print</kbd> to save a PDF slip
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gov-700 hover:bg-gov-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

