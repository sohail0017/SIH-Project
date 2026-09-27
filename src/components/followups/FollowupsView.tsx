import React, { useMemo, useState, useEffect } from 'react';
import {
  PhoneCall,
  CalendarClock,
  ClipboardEdit,
  X,
  Check,
  History,
  Bell,
  Send,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ListFilter,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { Card } from '../common/Card';
import { StatusPill, ContactStatusBadge } from '../common/Badges';
import { useToast } from '../common/Toast';
import { useSkillTrack } from '../../store/DataProvider';
import { MAHARASHTRA_DISTRICTS } from '../../data/reference';
import { Outcome, ContactAttempt } from '../../services/model';
import { FollowUpItem, ReminderLogItem } from '../../types';
import { WhatsAppFollowupModal } from './WhatsAppFollowupModal';

const OUTCOME_OPTIONS: { value: Outcome; label: string }[] = [
  { value: 'Employed', label: 'Employed' },
  { value: 'Self-employed', label: 'Self-employed' },
  { value: 'Apprenticeship', label: 'Apprenticeship' },
  { value: 'Further Education', label: 'Further Education' },
  { value: 'Seeking Employment', label: 'Seeking Employment' },
  { value: 'Unemployed', label: 'Unemployed' },
  { value: 'Unknown', label: 'Unknown' },
];

const CHANNELS: ContactAttempt['channel'][] = ['Phone call', 'SMS', 'WhatsApp', 'Email', 'Field visit'];
const RESULTS: ContactAttempt['status'][] = [
  'Contacted',
  'No response',
  'Unreachable',
  'Relocated',
  'Failed delivery',
];

const STATUS_TO_PILL: Record<string, string> = {
  Employed: 'formal_employment',
  'Self-employed': 'self_employed',
  Apprenticeship: 'apprenticeship',
  'Further Education': 'higher_education',
  'Seeking Employment': 'seeking_employment',
  Unemployed: 'unemployed',
  Unknown: 'inactive',
};

const TODAY = new Date();

const formatDue = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const FollowupsView: React.FC = () => {
  const {
    data,
    recordFollowupOutcome,
    logFollowupAttempt,
    rescheduleFollowup,
    sendSimulatedReminder,
    sendBulkSimulatedReminders,
    fetchReminderLogs,
  } = useSkillTrack();
  const { pushToast } = useToast();

  const [district, setDistrict] = useState('all');
  const [status, setStatus] = useState('all');
  const [milestoneTab, setMilestoneTab] = useState<'all' | '30' | '60' | '90' | '180' | '365'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'uptodate' | 'duesoon' | 'overdue' | 'unrecorded'>('all');

  const [updating, setUpdating] = useState<string | null>(null);
  const [newOutcome, setNewOutcome] = useState<Outcome>('Employed');
  const [saving, setSaving] = useState(false);

  // Contact-attempt recorder
  const [contactFor, setContactFor] = useState<string | null>(null);
  const [channel, setChannel] = useState<ContactAttempt['channel']>('Phone call');
  const [result, setResult] = useState<ContactAttempt['status']>('Contacted');
  const [note, setNote] = useState('');

  // Interactive WhatsApp Modal
  const [whatsAppItem, setWhatsAppItem] = useState<FollowUpItem | null>(null);

  // Reminder Dispatch Dialog
  const [reminderItem, setReminderItem] = useState<FollowUpItem | null>(null);
  const [reminderChannel, setReminderChannel] = useState<'WhatsApp' | 'SMS' | 'Email' | 'IVR'>('WhatsApp');
  const [reminderCustomNote, setReminderCustomNote] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  // Bulk Reminder Dispatching
  const [bulkSending, setBulkSending] = useState(false);

  // Reminder Logs Drawer
  const [reminderLogsOpen, setReminderLogsOpen] = useState(false);
  const [reminderLogs, setReminderLogs] = useState<ReminderLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const queue = data.followups;

  // Compute status category for each item
  const getItemCategory = (f: FollowUpItem): 'uptodate' | 'duesoon' | 'overdue' | 'unrecorded' => {
    if (f.status === 'Completed') return 'uptodate';
    const diff = Math.ceil((new Date(f.dueDate).getTime() - TODAY.getTime()) / 86400000);
    if (diff < 0) return 'overdue';
    if (diff <= 7) return 'duesoon';
    if (!f.lastContact || f.lastContact === '—' || f.contactStatus === 'Pending') return 'unrecorded';
    return 'uptodate';
  };

  const filtered = useMemo(() => {
    return queue.filter((f) => {
      if (district !== 'all' && f.district !== district) return false;
      if (status !== 'all' && f.employmentStatus !== status) return false;

      // Milestone filter
      if (milestoneTab !== 'all') {
        const mStr = String(f.milestone || '').toLowerCase();
        if (milestoneTab === '30' && !mStr.includes('30')) return false;
        if (milestoneTab === '60' && !mStr.includes('60')) return false;
        if (milestoneTab === '90' && !mStr.includes('90')) return false;
        if (milestoneTab === '180' && !mStr.includes('180')) return false;
        if (milestoneTab === '365' && !mStr.includes('365') && !mStr.includes('year')) return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        const cat = getItemCategory(f);
        if (cat !== categoryFilter) return false;
      }

      return true;
    });
  }, [queue, district, status, milestoneTab, categoryFilter]);

  const overdueItems = useMemo(
    () => queue.filter((f) => getItemCategory(f) === 'overdue'),
    [queue]
  );
  const overdueCount = overdueItems.length;
  const dueSoonCount = useMemo(
    () => queue.filter((f) => getItemCategory(f) === 'duesoon').length,
    [queue]
  );
  const upToDateCount = useMemo(
    () => queue.filter((f) => getItemCategory(f) === 'uptodate').length,
    [queue]
  );

  const handleOpenReminderLogs = async () => {
    setReminderLogsOpen(true);
    setLoadingLogs(true);
    try {
      const logs = await fetchReminderLogs();
      setReminderLogs(logs);
    } catch {
      pushToast('Failed to load reminder logs.', 'error');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSendSingleReminder = async () => {
    if (!reminderItem) return;
    setSendingReminder(true);
    try {
      await sendSimulatedReminder({
        traineeId: reminderItem.traineeId,
        traineeName: reminderItem.traineeName,
        phone: '+91 98200 12345',
        channel: reminderChannel,
        milestone: reminderItem.milestone,
        notes: reminderCustomNote.trim() || `Milestone reminder dispatched via ${reminderChannel}.`,
      });

      pushToast(
        `Demo Reminder Recorded: Simulated ${reminderChannel} ping dispatched to ${reminderItem.traineeName}.`,
        'success'
      );
      setReminderItem(null);
      setReminderCustomNote('');
    } catch {
      pushToast('Could not record reminder.', 'error');
    } finally {
      setSendingReminder(false);
    }
  };

  const handleBulkDispatchOverdue = async () => {
    if (overdueItems.length === 0) {
      pushToast('No overdue follow-ups to remind.', 'info');
      return;
    }
    setBulkSending(true);
    try {
      const traineesToRemind = overdueItems.map((o) => ({
        id: o.traineeId,
        fullName: o.traineeName,
        phone: '+91 98200 00000',
      }));

      const count = await sendBulkSimulatedReminders(traineesToRemind, 'WhatsApp', 'Overdue Follow-up');
      pushToast(
        `Bulk Demo Reminders Recorded: Dispatched WhatsApp follow-up pings to ${count} overdue candidates.`,
        'success'
      );
    } catch {
      pushToast('Failed to dispatch bulk reminders.', 'error');
    } finally {
      setBulkSending(false);
    }
  };

  const handleAttempt = async () => {
    if (!contactFor) return;
    const item = queue.find((f) => f.id === contactFor);
    await logFollowupAttempt(contactFor, { channel, status: result, note: note.trim() || undefined });
    pushToast(
      `Attempt logged for ${item?.traineeName || 'trainee'} — ${channel}: ${result}.`,
      result === 'Contacted' ? 'success' : 'info'
    );
    setContactFor(null);
    setNote('');
  };

  const handleReschedule = async (id: string, name: string, dueDate: string) => {
    await rescheduleFollowup(id, 7);
    const next = new Date(dueDate);
    next.setDate(next.getDate() + 7);
    pushToast(
      `Follow-up for ${name} rescheduled to ${next.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}.`,
      'info'
    );
  };

  const openUpdate = (item: FollowUpItem) => {
    setUpdating(item.id);
    setNewOutcome(
      OUTCOME_OPTIONS.find((o) => o.label === item.employmentStatus)?.value || 'Unknown'
    );
  };

  const confirmUpdate = async () => {
    if (!updating) return;
    const item = queue.find((f) => f.id === updating);
    if (!item) return;
    setSaving(true);
    try {
      await recordFollowupOutcome(
        updating,
        newOutcome,
        `Outcome updated to ${newOutcome} during ${item.milestone} follow-up. Verification pending.`
      );
      pushToast(
        `Outcome updated for ${item.traineeName}: ${newOutcome}. Dashboard statistics recalculated.`,
        'success'
      );
      setUpdating(null);
    } catch {
      pushToast('Could not update the outcome. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updatingItem = queue.find((f) => f.id === updating);
  const contactItem = queue.find((f) => f.id === contactFor);

  return (
    <div className="page-enter space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Flag for Follow-Up System"
          subtitle="Longitudinal employment verification across 30, 60, 90, 180, and 365-day milestones for Maharashtra candidates."
        />
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenReminderLogs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Reminder Logs</span>
          </button>
          <button
            onClick={handleBulkDispatchOverdue}
            disabled={bulkSending || overdueCount === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-md shadow-xs transition-colors cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{bulkSending ? 'Dispatching…' : `Remind Overdue (${overdueCount})`}</span>
          </button>
        </div>
      </div>

      {/* Interval Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2">
          Milestone:
        </span>
        {[
          { id: 'all', label: 'All Milestones' },
          { id: '30', label: '30-Day' },
          { id: '60', label: '60-Day' },
          { id: '90', label: '90-Day' },
          { id: '180', label: '180-Day' },
          { id: '365', label: '365-Day' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMilestoneTab(tab.id as typeof milestoneTab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              milestoneTab === tab.id
                ? 'bg-gov-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Status Categorization Badges & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Status:
          </span>
          {[
            { id: 'all', label: `All (${queue.length})` },
            { id: 'overdue', label: `Overdue (${overdueCount})`, color: 'text-rose-700 bg-rose-50 border-rose-200' },
            { id: 'duesoon', label: `Due Soon (${dueSoonCount})`, color: 'text-amber-700 bg-amber-50 border-amber-200' },
            { id: 'uptodate', label: `Up to Date (${upToDateCount})`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
            { id: 'unrecorded', label: 'No Follow-up Recorded', color: 'text-slate-600 bg-slate-100 border-slate-200' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id as typeof categoryFilter)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                categoryFilter === c.id
                  ? 'border-gov-600 bg-gov-50 text-gov-900 font-bold'
                  : c.color || 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="py-1.5 pl-2.5 pr-7 text-xs bg-white border border-slate-200 rounded text-slate-700 focus:border-gov-400 outline-none transition-colors cursor-pointer"
          >
            <option value="all">All districts</option>
            {MAHARASHTRA_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="py-1.5 pl-2.5 pr-7 text-xs bg-white border border-slate-200 rounded text-slate-700 focus:border-gov-400 outline-none transition-colors cursor-pointer"
          >
            <option value="all">All employment outcomes</option>
            {OUTCOME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase font-semibold tracking-wide text-slate-500">
                <th className="py-2.5 pl-5 pr-3">Trainee & Programme</th>
                <th className="py-2.5 px-3 hidden md:table-cell">District</th>
                <th className="py-2.5 px-3">Follow-up Due & Status</th>
                <th className="py-2.5 px-3 hidden sm:table-cell">Current Outcome</th>
                <th className="py-2.5 px-3 hidden lg:table-cell">Last Contact</th>
                <th className="py-2.5 pl-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((f) => {
                const category = getItemCategory(f);
                return (
                  <tr key={f.id} className="hover:bg-gov-50/40 transition-colors">
                    <td className="py-3 pl-5 pr-3">
                      <p className="font-bold text-slate-900">{f.traineeName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {f.traineeId} · {f.programme}
                      </p>
                      <p className="text-[10px] text-slate-400 md:hidden">{f.district}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap hidden md:table-cell">
                      {f.district}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800 tabular-nums">
                          {formatDue(f.dueDate)}
                        </span>
                        {category === 'overdue' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Overdue
                          </span>
                        )}
                        {category === 'duesoon' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            Due soon
                          </span>
                        )}
                        {category === 'uptodate' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Up to date
                          </span>
                        )}
                        {category === 'unrecorded' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Unrecorded
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{f.milestone}</p>
                    </td>
                    <td className="py-3 px-3 hidden sm:table-cell">
                      <StatusPill
                        status={(STATUS_TO_PILL[f.employmentStatus] || 'inactive') as import('../../types').EmploymentStatus}
                      />
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap hidden lg:table-cell">
                      <p className="text-slate-600">{f.lastContact || '—'}</p>
                      <div className="mt-0.5">
                        <ContactStatusBadge status={f.contactStatus || 'Pending'} />
                      </div>
                    </td>
                    <td className="py-3 pl-3 pr-5">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {/* Interactive WhatsApp Chat Button */}
                        <button
                          onClick={() => setWhatsAppItem(f)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="Open WhatsApp-Style Conversational Outcome Collector"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>

                        {/* Send Reminder (Demo) */}
                        <button
                          onClick={() => setReminderItem(f)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                          title="Simulate dispatching a reminder to candidate"
                        >
                          <Bell className="w-3 h-3 text-blue-600" />
                          <span className="hidden sm:inline">Remind</span>
                        </button>

                        <button
                          onClick={() => setContactFor(f.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <PhoneCall className="w-3 h-3 text-slate-500" />
                          <span className="hidden sm:inline">Log Call</span>
                        </button>
                        <button
                          onClick={() => openUpdate(f)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <ClipboardEdit className="w-3 h-3 text-slate-500" />
                          <span className="hidden sm:inline">Update</span>
                        </button>
                        <button
                          onClick={() => handleReschedule(f.id, f.traineeName, f.dueDate)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <CalendarClock className="w-3 h-3 text-slate-500" />
                          <span className="hidden sm:inline">+7d</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No follow-ups match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Interactive WhatsApp Conversational Flow Modal */}
      {whatsAppItem && (
        <WhatsAppFollowupModal
          trainee={whatsAppItem}
          isOpen={Boolean(whatsAppItem)}
          onClose={() => setWhatsAppItem(null)}
          milestone={whatsAppItem.milestone}
          onSubmitted={() => setWhatsAppItem(null)}
        />
      )}

      {/* Send Reminder (Demo) Modal */}
      {reminderItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/50 animate-fade"
          onClick={() => setReminderItem(null)}
        >
          <div
            className="animate-pop w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-blue-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Send Reminder (Demo)</h3>
                  <p className="text-[11px] text-slate-500">{reminderItem.traineeName} · {reminderItem.milestone}</p>
                </div>
              </div>
              <button
                onClick={() => setReminderItem(null)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                  Notification Channel
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['WhatsApp', 'SMS', 'Email', 'IVR'] as const).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setReminderChannel(ch)}
                      className={`py-2 px-1 text-center font-bold text-xs rounded-lg border transition-all cursor-pointer ${
                        reminderChannel === ch
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                  Simulated Gateway Message Preview
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-700 leading-relaxed">
                  "Namaskar {reminderItem.traineeName}, Government of Maharashtra MSInS requests your {reminderItem.milestone} outcome follow-up update. Click link to submit: https://skilltrack.maha.gov.in/f/{reminderItem.traineeId}"
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                  Internal Officer Note (Optional)
                </label>
                <input
                  type="text"
                  value={reminderCustomNote}
                  onChange={(e) => setReminderCustomNote(e.target.value)}
                  placeholder="e.g. Followed up prior to district review meeting"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-800 leading-relaxed">
                ℹ️ <strong>Demonstration Note:</strong> This action records a live log entry in SQLite (<code>reminder_logs</code>). In production, it connects to CDAC MahaGovt National SMS & WhatsApp Business Gateway.
              </div>
            </div>

            <footer className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setReminderItem(null)}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-slate-600 border border-slate-300 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendSingleReminder}
                disabled={sendingReminder}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingReminder ? 'Dispatching…' : 'Dispatch Reminder'}</span>
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Reminder Logs Drawer */}
      {reminderLogsOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-end bg-slate-950/40 animate-fade"
          onClick={() => setReminderLogsOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-gov-700" />
                <h3 className="text-sm font-bold text-slate-900">Simulated Reminder Logs</h3>
              </div>
              <button
                onClick={() => setReminderLogsOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {loadingLogs ? (
                <p className="text-xs text-slate-400 text-center py-10">Loading logs from database…</p>
              ) : reminderLogs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10">No reminder logs recorded yet.</p>
              ) : (
                reminderLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900">{log.traineeName}</strong>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 uppercase font-mono">
                        {log.channel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">
                      ID: {log.traineeId} · Milestone: {log.milestone || 'Follow-up'}
                    </p>
                    <p className="text-[11px] text-slate-600">{log.notes}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>By: {log.initiatedBy}</span>
                      <span>{new Date(log.sentAt).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Contact Attempt Modal */}
      {contactItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 animate-fade"
          onClick={() => setContactFor(null)}
        >
          <div
            className="animate-pop w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Record Contact Attempt</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {contactItem.traineeName} · {contactItem.milestone} milestone
                </p>
              </div>
              <button
                onClick={() => setContactFor(null)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Channel</p>
                <div className="flex flex-wrap gap-1.5">
                  {CHANNELS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setChannel(c)}
                      className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${
                        channel === c
                          ? 'border-gov-500 bg-gov-50 text-gov-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Result</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {RESULTS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setResult(r)}
                      className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${
                        result === r
                          ? 'border-gov-500 bg-gov-50 text-gov-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Note (optional)</p>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Preferred evening call; new number shared"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-300 focus:border-gov-400 outline-none transition-colors"
                />
              </div>
            </div>
            <footer className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setContactFor(null)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 border border-slate-300 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAttempt}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-white bg-gov-700 hover:bg-gov-800 transition-colors cursor-pointer"
              >
                Log Attempt
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Manual Outcome Update Modal */}
      {updatingItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 animate-fade"
          onClick={() => setUpdating(null)}
        >
          <div
            className="animate-pop w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Update Outcome</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {updatingItem.traineeName} · {updatingItem.district} · {updatingItem.milestone}
                </p>
              </div>
              <button
                onClick={() => setUpdating(null)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="px-5 py-4 space-y-2 max-h-[50vh] overflow-y-auto">
              {OUTCOME_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${
                    newOutcome === o.value
                      ? 'border-gov-500 bg-gov-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="outcome"
                    checked={newOutcome === o.value}
                    onChange={() => setNewOutcome(o.value)}
                    className="accent-gov-700"
                  />
                  <span className="text-xs font-medium text-slate-700">{o.label}</span>
                  {newOutcome === o.value && <Check className="w-3.5 h-3.5 text-gov-700 ml-auto" />}
                </label>
              ))}
            </div>
            <footer className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setUpdating(null)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 border border-slate-300 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpdate}
                disabled={saving}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-white bg-gov-700 hover:bg-gov-800 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {saving ? 'Saving…' : 'Save Outcome'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};
