import React, { useState, useEffect, useRef } from 'react';
import { X, Send, CheckCheck, RotateCcw, Building2, Briefcase, Star, FileText, CheckCircle2, ChevronRight, User } from 'lucide-react';
import { Trainee, FollowUpItem } from '../../types';
import { useSkillTrack } from '../../store/DataProvider';
import { useToast } from '../common/Toast';
import { Outcome } from '../../services/model';

interface WhatsAppFollowupModalProps {
  trainee: Trainee | { id: string; fullName?: string; traineeName?: string; district?: string; programme?: string; programName?: string; phone?: string };
  isOpen: boolean;
  onClose: () => void;
  milestone?: string;
  onSubmitted?: () => void;
}

type ChatStep =
  | 'GREETING_STATUS'
  | 'EMPLOYED_COMPANY'
  | 'EMPLOYED_SALARY'
  | 'EMPLOYED_PROOF'
  | 'EMPLOYED_RATING'
  | 'SELF_TYPE'
  | 'SELF_REVENUE'
  | 'SELF_STATUS'
  | 'SEEKING_REASON'
  | 'SEEKING_SUPPORT'
  | 'EDUCATION_DETAILS'
  | 'REVIEW'
  | 'COMPLETED';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
}

export const WhatsAppFollowupModal: React.FC<WhatsAppFollowupModalProps> = ({
  trainee,
  isOpen,
  onClose,
  milestone = '30-Day Milestone',
  onSubmitted,
}) => {
  const { recordPeriodicFollowup } = useSkillTrack();
  const { pushToast } = useToast();

  const traineeName = 'fullName' in trainee && trainee.fullName ? trainee.fullName : ('traineeName' in trainee && trainee.traineeName ? trainee.traineeName : 'Trainee');
  const programName = 'programName' in trainee && trainee.programName ? trainee.programName : ('programme' in trainee && trainee.programme ? trainee.programme : 'Skill Training Programme');
  const traineeId = trainee.id;

  const [step, setStep] = useState<ChatStep>('GREETING_STATUS');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Form State
  const [outcome, setOutcome] = useState<Outcome>('Employed');
  const [companyName, setCompanyName] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('18000');
  const [proofType, setProofType] = useState('EPFO UAN Contribution');
  const [rating, setRating] = useState<number>(4);
  const [businessType, setBusinessType] = useState('Retail & Service Store');
  const [businessRevenue, setBusinessRevenue] = useState('₹20,000/month');
  const [businessStatus, setBusinessStatus] = useState('Operating Steadily');
  const [seekingReason, setSeekingReason] = useState('Awaiting interview results');
  const [seekingSupport, setSeekingSupport] = useState('Yes, request MahaSwayam job fair call');
  const [educationDetails, setEducationDetails] = useState('Advanced Diploma / Degree');
  const [saving, setSaving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const now = () => {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Initialize conversation
  useEffect(() => {
    if (isOpen) {
      setStep('GREETING_STATUS');
      setMessages([]);
      setIsTyping(true);

      const timer = setTimeout(() => {
        setIsTyping(false);
        setMessages([
          {
            id: 'msg-1',
            sender: 'bot',
            text: `Namaskar ${traineeName}! 🙏 This is the official Maharashtra Skilling Outcomes follow-up assistant from the Department of Skills & Employment (MSInS).`,
            timestamp: now(),
          },
          {
            id: 'msg-2',
            sender: 'bot',
            text: `We are checking in regarding your ${milestone} progress after completing ${programName}. Could you share your current employment status?`,
            timestamp: now(),
          },
        ]);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isOpen, traineeName, programName, milestone]);

  if (!isOpen) return null;

  const pushUserMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, sender: 'user', text, timestamp: now() },
    ]);
  };

  const pushBotMessage = (text: string, nextStep: ChatStep, delay = 500) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: `bot-${Date.now()}`, sender: 'bot', text, timestamp: now() },
      ]);
      setStep(nextStep);
    }, delay);
  };

  // Step 1 Selection
  const handleSelectStatus = (selected: Outcome) => {
    setOutcome(selected);
    pushUserMessage(selected);

    if (selected === 'Employed' || selected === 'Apprenticeship') {
      pushBotMessage(
        `Congratulations on your placement! 🎉 Which company, organization, or employer are you currently associated with?`,
        'EMPLOYED_COMPANY'
      );
    } else if (selected === 'Self-employed') {
      pushBotMessage(
        `Great initiative on entrepreneurship! 🏪 What kind of enterprise, trade, or service unit are you operating?`,
        'SELF_TYPE'
      );
    } else if (selected === 'Further Education') {
      pushBotMessage(
        `Excellent commitment to learning! 🎓 Which university, ITI, or higher degree program have you enrolled in?`,
        'EDUCATION_DETAILS'
      );
    } else {
      pushBotMessage(
        `Thank you for letting us know. What is the primary barrier currently affecting your placement?`,
        'SEEKING_REASON'
      );
    }
  };

  // Employed Sub-flow
  const handleCompanySubmit = (comp: string) => {
    const val = comp.trim() || 'Tata Motors Vendor Unit';
    setCompanyName(val);
    pushUserMessage(val);
    pushBotMessage(
      `Understood. What is your approximate monthly take-home salary or stipend?`,
      'EMPLOYED_SALARY'
    );
  };

  const handleSalarySubmit = (sal: string) => {
    setMonthlySalary(sal);
    pushUserMessage(`₹${Number(sal).toLocaleString('en-IN')}/month`);
    pushBotMessage(
      `Got it. What verification document or proof can be cross-referenced for government records?`,
      'EMPLOYED_PROOF'
    );
  };

  const handleProofSubmit = (proof: string) => {
    setProofType(proof);
    pushUserMessage(proof);
    pushBotMessage(
      `Almost done! On a scale of 1 to 5, how relevant was your training in ${programName} to the skills needed at your current job?`,
      'EMPLOYED_RATING'
    );
  };

  const handleRatingSubmit = (starCount: number) => {
    setRating(starCount);
    pushUserMessage(`${starCount} Stars (${starCount >= 4 ? 'Highly relevant' : 'Moderately relevant'})`);
    pushBotMessage(
      `Thank you! Here is a summary of the follow-up details before we log them to the Maharashtra State Outcome Registry.`,
      'REVIEW'
    );
  };

  // Self-employed Sub-flow
  const handleSelfTypeSubmit = (type: string) => {
    setBusinessType(type);
    pushUserMessage(type);
    pushBotMessage(`What are your estimated monthly net earnings from this enterprise?`, 'SELF_REVENUE');
  };

  const handleSelfRevenueSubmit = (rev: string) => {
    setBusinessRevenue(rev);
    pushUserMessage(rev);
    pushBotMessage(`How is the business currently performing?`, 'SELF_STATUS');
  };

  const handleSelfStatusSubmit = (st: string) => {
    setBusinessStatus(st);
    pushUserMessage(st);
    pushBotMessage(`Thank you for sharing your entrepreneurship journey! Please review your responses.`, 'REVIEW');
  };

  // Seeking Sub-flow
  const handleSeekingReasonSubmit = (reason: string) => {
    setSeekingReason(reason);
    pushUserMessage(reason);
    pushBotMessage(
      `Would you like your profile forwarded to the local District Employment Exchange & upcoming MahaSwayam job fair?`,
      'SEEKING_SUPPORT'
    );
  };

  const handleSeekingSupportSubmit = (support: string) => {
    setSeekingSupport(support);
    pushUserMessage(support);
    pushBotMessage(`Thank you. Your request will be tagged for district job desk intervention. Please review before submission.`, 'REVIEW');
  };

  // Education Sub-flow
  const handleEducationSubmit = (edu: string) => {
    const val = edu.trim() || 'Polytechnic Diploma in Advanced Tech';
    setEducationDetails(val);
    pushUserMessage(val);
    pushBotMessage(`Noted. Your skill progression profile has been updated. Please review before submission.`, 'REVIEW');
  };

  // Final Submit to Database
  const handleFinalSubmit = async () => {
    setSaving(true);
    try {
      await recordPeriodicFollowup({
        traineeId,
        outcome,
        reportedWage: ['Employed', 'Self-employed', 'Apprenticeship'].includes(outcome) ? Number(monthlySalary) || 16000 : 0,
        employerName: outcome === 'Employed' ? companyName : outcome === 'Self-employed' ? businessType : undefined,
        verification: proofType === 'EPFO UAN Contribution' ? 'epfo_verified' : 'self_reported',
        feedback: outcome === 'Employed' ? `Rated training relevance ${rating}/5.` : seekingReason,
        notes: `Simulated WhatsApp outcome capture (${milestone}).`,
        channel: 'WhatsApp',
        milestone,
        jobSatisfaction: rating,
        skillRelevanceRating: rating,
      });

      pushToast(
        `Periodic follow-up for ${traineeName} saved to SkillTrack database!`,
        'success'
      );
      setStep('COMPLETED');
      if (onSubmitted) onSubmitted();
    } catch {
      pushToast('Could not record follow-up. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 md:p-6 bg-slate-950/60 animate-fade"
      onClick={onClose}
    >
      <div
        className="animate-pop w-full max-w-lg bg-[#efeae2] border border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[640px] max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* WhatsApp Official Header */}
        <header className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold border border-emerald-400/40">
                🤖
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#075e54] rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold leading-tight">MahaSkills Bot</h3>
                <span className="px-1 py-0.2 rounded text-[9px] bg-emerald-600/80 font-semibold tracking-wide uppercase">
                  Govt. Verified
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/90 leading-tight">
                {isTyping ? 'Typing…' : 'Online · Official Outcome Follow-up'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Milestone Indicator Bar */}
        <div className="bg-[#128c7e] text-white/90 px-4 py-1.5 text-[11px] flex items-center justify-between font-medium">
          <span>Trainee: {traineeName}</span>
          <span className="bg-emerald-900/40 px-2 py-0.5 rounded text-[10px] font-semibold">{milestone}</span>
        </div>

        {/* Chat Message Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2] bg-radial from-amber-50/20 to-transparent">
          {/* Encryption Note */}
          <div className="mx-auto max-w-xs p-2 rounded-lg bg-amber-100/90 border border-amber-200/80 text-[10px] text-amber-900 text-center shadow-2xs leading-relaxed">
            🔒 Responses are encrypted & logged in compliance with the <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong>.
          </div>

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} animate-fade`}
            >
              <div
                className={`max-w-[82%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed shadow-xs relative ${
                  m.sender === 'user'
                    ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none'
                    : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                }`}
              >
                <p>{m.text}</p>
                <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-400 select-none">
                  <span>{m.timestamp}</span>
                  {m.sender === 'user' && <CheckCheck className="w-3.5 h-3.5 text-blue-500 inline" />}
                </div>
              </div>
            </div>
          ))}

          {/* Bot Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-100 px-3 py-2 rounded-xl text-xs text-slate-400 w-24 shadow-2xs">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Interactive Quick Response Panel */}
        <div className="bg-white border-t border-slate-200 p-3 shrink-0">
          {step === 'GREETING_STATUS' && !isTyping && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 text-center">
                Select your current status
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'Employed' as Outcome, label: '💼 Salaried Job', desc: 'Working in company/trade' },
                  { value: 'Self-employed' as Outcome, label: '🏪 Self-employed', desc: 'Own enterprise/shop' },
                  { value: 'Seeking Employment' as Outcome, label: '🔍 Seeking Job', desc: 'Looking for placement' },
                  { value: 'Further Education' as Outcome, label: '🎓 Further Study', desc: 'Enrolled in higher course' },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => handleSelectStatus(item.value)}
                    className="p-2 text-left rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all cursor-pointer shadow-2xs group"
                  >
                    <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">{item.label}</p>
                    <p className="text-[10px] text-slate-500">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'EMPLOYED_COMPANY' && !isTyping && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Employer Name</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Tata Motors / Foxconn India / Local Tech Co."
                  defaultValue="Tata AutoComp Systems Ltd"
                  id="wa-comp-input"
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => {
                    const el = document.getElementById('wa-comp-input') as HTMLInputElement;
                    handleCompanySubmit(el?.value || 'Tata AutoComp Systems Ltd');
                  }}
                  className="px-4 py-2 bg-[#128c7e] hover:bg-[#075e54] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {step === 'EMPLOYED_SALARY' && !isTyping && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Monthly Take-Home Wage</p>
              <div className="grid grid-cols-4 gap-1.5">
                {['12000', '16500', '21000', '26000'].map((sal) => (
                  <button
                    key={sal}
                    onClick={() => handleSalarySubmit(sal)}
                    className="py-2 px-1 text-center bg-slate-50 hover:bg-emerald-50 hover:border-emerald-500 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer transition-all"
                  >
                    ₹{parseInt(sal, 10).toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'EMPLOYED_PROOF' && !isTyping && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Select Verification Proof</p>
              <div className="grid grid-cols-2 gap-2">
                {['EPFO UAN Contribution', 'Official Offer Letter', 'Bank Salary Credit Slip', 'Candidate Self-Declaration'].map((p) => (
                  <button
                    key={p}
                    onClick={() => handleProofSubmit(p)}
                    className="p-2 text-left rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-xs font-semibold text-slate-800 transition-all cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'EMPLOYED_RATING' && !isTyping && (
            <div className="space-y-2 text-center py-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Rate Training Relevance to Your Job
              </p>
              <div className="flex items-center justify-center gap-3 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRatingSubmit(star)}
                    className="p-2 text-amber-400 hover:text-amber-500 hover:scale-125 transition-transform cursor-pointer"
                  >
                    <Star className={`w-6 h-6 ${star <= rating ? 'fill-amber-400' : 'text-slate-200'}`} />
                    <span className="block text-[10px] font-bold text-slate-600 mt-0.5">{star}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'SELF_TYPE' && !isTyping && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Enterprise Nature</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Retail & Service Store',
                  'Electrical / Electronics Repair',
                  'Garments & Tailoring Boutique',
                  'Food & Agri Processing Unit',
                ].map((t) => (
                  <button
                    key={t}
                    onClick={() => handleSelfTypeSubmit(t)}
                    className="p-2 text-left rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-xs font-semibold text-slate-800 transition-all cursor-pointer"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'SELF_REVENUE' && !isTyping && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Monthly Net Revenue</p>
              <div className="grid grid-cols-3 gap-2">
                {['₹15,000 - ₹25,000', '₹25,000 - ₹40,000', '₹40,000+'].map((r) => (
                  <button
                    key={r}
                    onClick={() => handleSelfRevenueSubmit(r)}
                    className="p-2 text-center rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-xs font-bold text-slate-800 transition-all cursor-pointer"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'SELF_STATUS' && !isTyping && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Current Health</p>
              <div className="grid grid-cols-3 gap-2">
                {['Operating Steadily', 'Expanding / Hiring', 'Facing Capital Hurdle'].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSelfStatusSubmit(s)}
                    className="p-2 text-center rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-xs font-semibold text-slate-800 transition-all cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'SEEKING_REASON' && !isTyping && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Primary Hurdle</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'No local vacancies in trade',
                  'Salary expectation gap',
                  'Relocation restriction',
                  'Awaiting interview results',
                ].map((r) => (
                  <button
                    key={r}
                    onClick={() => handleSeekingReasonSubmit(r)}
                    className="p-2 text-left rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-xs font-semibold text-slate-800 transition-all cursor-pointer"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'SEEKING_SUPPORT' && !isTyping && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Placement Assistance</p>
              <div className="grid grid-cols-2 gap-2">
                {['Yes, request MahaSwayam job fair call', 'No, searching independently'].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSeekingSupportSubmit(s)}
                    className="p-2 text-left rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-xs font-semibold text-slate-800 transition-all cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'EDUCATION_DETAILS' && !isTyping && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Course / Institution</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Government Polytechnic Pune — Diploma"
                  defaultValue="Government Polytechnic Pune — Advanced Diploma"
                  id="wa-edu-input"
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => {
                    const el = document.getElementById('wa-edu-input') as HTMLInputElement;
                    handleEducationSubmit(el?.value || 'Higher Technical Diploma');
                  }}
                  className="px-4 py-2 bg-[#128c7e] hover:bg-[#075e54] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Review Card Before Final Submit */}
          {step === 'REVIEW' && !isTyping && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950">Follow-Up Response Summary</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-800">
                    {outcome}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 pt-1">
                  <div>
                    <span className="text-slate-400 block">Candidate:</span>
                    <strong className="text-slate-900">{traineeName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Channel:</span>
                    <strong className="text-slate-900">WhatsApp (Conversational)</strong>
                  </div>
                  {outcome === 'Employed' && (
                    <>
                      <div>
                        <span className="text-slate-400 block">Employer:</span>
                        <strong className="text-slate-900">{companyName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Reported Wage:</span>
                        <strong className="text-slate-900">₹{Number(monthlySalary).toLocaleString('en-IN')}/mo</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Proof:</span>
                        <strong className="text-slate-900">{proofType}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Relevance:</span>
                        <strong className="text-slate-900">{rating} / 5 Stars</strong>
                      </div>
                    </>
                  )}
                  {outcome === 'Self-employed' && (
                    <>
                      <div>
                        <span className="text-slate-400 block">Trade:</span>
                        <strong className="text-slate-900">{businessType}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Revenue:</span>
                        <strong className="text-slate-900">{businessRevenue}</strong>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep('GREETING_STATUS')}
                  className="flex items-center gap-1 px-3 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Change Answers</span>
                </button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={saving}
                  className="flex-1 py-2 bg-[#128c7e] hover:bg-[#075e54] text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saving ? 'Logging Outcome…' : 'Submit to Government Registry'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === 'COMPLETED' && (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Follow-up Recorded Successfully</h4>
                <p className="text-xs text-slate-500 mt-1">
                  The trainee's employment record and dashboard metrics have been updated.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-gov-700 hover:bg-gov-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

