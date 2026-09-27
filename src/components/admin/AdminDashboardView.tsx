import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  Users,
  Database,
  Activity,
  UserPlus,
  Edit2,
  Trash2,
  RotateCcw,
  Search,
  CheckCircle,
  AlertTriangle,
  Lock,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { useSkillTrack } from '../../store/DataProvider';
import { useToast } from '../common/Toast';
import { PageHeader } from '../common/PageHeader';
import { Card } from '../common/Card';
import { StatusPill, VerificationBadge } from '../common/Badges';
import { apiRequest } from '../../services/api';
import { Trainee } from '../../types';
import { formatNumber, formatINR, formatDate } from '../../lib/format';
import { MAHARASHTRA_DISTRICTS } from '../../data/reference';
import { AddTraineeModal } from '../trainees/AddTraineeModal';
import { EditTraineeModal } from '../trainees/EditTraineeModal';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';

interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'user';
  district?: string;
  phone?: string;
  createdAt: string;
}

interface ActivityLogItem {
  id: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  timestamp: string;
}

interface AdminDashboardViewProps {
  onOpenAuthModal?: () => void;
}

const PAGE_SIZE = 8;

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onOpenAuthModal }) => {
  const { user, isAdmin } = useAuth();
  const { data, refresh, deleteTrainee } = useSkillTrack();
  const { pushToast } = useToast();

  const [tab, setTab] = useState<'users' | 'trainees' | 'logs' | 'database'>('trainees');

  // Users state
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Trainee CRUD state
  const [traineeSearch, setTraineeSearch] = useState('');
  const [traineeDistrict, setTraineeDistrict] = useState('all');
  const [traineePage, setTraineePage] = useState(1);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingTrainee, setEditingTrainee] = useState<Trainee | null>(null);
  const [deletingTrainee, setDeletingTrainee] = useState<Trainee | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Load users when tab active
  useEffect(() => {
    if (isAdmin && (tab === 'users' || tab === 'database')) {
      setLoadingUsers(true);
      apiRequest<{ users: UserRecord[] }>('/api/admin/users')
        .then((res) => setUsers(res.users || []))
        .catch(() => undefined)
        .finally(() => setLoadingUsers(false));
    }
  }, [isAdmin, tab]);

  // Load logs when tab active
  useEffect(() => {
    if (isAdmin && (tab === 'logs' || tab === 'database')) {
      setLoadingLogs(true);
      apiRequest<{ logs: ActivityLogItem[] }>('/api/admin/logs')
        .then((res) => setLogs(res.logs || []))
        .catch(() => undefined)
        .finally(() => setLoadingLogs(false));
    }
  }, [isAdmin, tab]);

  // Filtered trainees for admin management table
  const filteredTrainees = useMemo(() => {
    const q = traineeSearch.trim().toLowerCase();
    return data.trainees.filter((t) => {
      const matchSearch =
        !q ||
        t.fullName.toLowerCase().includes(q) ||
        t.traineeId.toLowerCase().includes(q) ||
        t.district.toLowerCase().includes(q) ||
        t.programName.toLowerCase().includes(q);
      const matchDistrict = traineeDistrict === 'all' || t.district === traineeDistrict;
      return matchSearch && matchDistrict;
    });
  }, [data.trainees, traineeSearch, traineeDistrict]);

  const totalPages = Math.max(1, Math.ceil(filteredTrainees.length / PAGE_SIZE));
  const currentTrainees = filteredTrainees.slice((traineePage - 1) * PAGE_SIZE, traineePage * PAGE_SIZE);

  if (!isAdmin) {
    return (
      <div className="page-enter max-w-xl mx-auto py-12 px-4 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-rose-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Restricted Administrator Console</h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          This portal is reserved for authorized Directorate officials of the Maharashtra State Innovation Society
          (MSInS). Please sign in with administrator credentials to access user management, audit logs, and record
          moderation.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={onOpenAuthModal}
            className="px-4 py-2 bg-gov-700 hover:bg-gov-800 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
          >
            Sign In with Administrator Account
          </button>
        </div>
      </div>
    );
  }

  const handleRoleToggle = async (targetUser: UserRecord) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    try {
      await apiRequest(`/api/admin/users/${targetUser.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });
      pushToast(`Updated role for ${targetUser.fullName} to ${newRole}`, 'success');
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update role';
      pushToast(msg, 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      await apiRequest(`/api/admin/users/${deletingUser.id}`, { method: 'DELETE' });
      pushToast(`User ${deletingUser.fullName} removed successfully`, 'success');
      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not delete user';
      pushToast(msg, 'error');
    }
  };

  const handleDeleteTraineeConfirm = async () => {
    if (!deletingTrainee) return;
    try {
      await deleteTrainee(deletingTrainee.id);
      pushToast(`Trainee ${deletingTrainee.fullName} (${deletingTrainee.traineeId}) deleted from database`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete trainee';
      pushToast(msg, 'error');
    }
  };

  const handleResetDatabase = async () => {
    setResetting(true);
    try {
      await apiRequest('/api/admin/reset', { method: 'POST' });
      refresh();
      pushToast('Database reset to original Maharashtra official seed records.', 'success');
      setResetModalOpen(false);
    } catch {
      pushToast('Failed to reset database.', 'error');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title="State Administration Console"
        subtitle="MSInS Directorate control panel for statewide user management, database audit logs, and trainee registry moderation."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-gov-200 bg-gov-50 text-gov-800 hover:bg-gov-100 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Trainee
            </button>
            <button
              onClick={() => setResetModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              Reset Database
            </button>
          </div>
        }
      />

      {/* Admin Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Registered Accounts</span>
            <Users className="w-4 h-4 text-gov-600" />
          </div>
          <p className="text-xl font-bold text-slate-900">{users.length || 2}</p>
          <p className="text-[11px] text-slate-500 mt-1">Verified Administrators & Citizens</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Trainee Database</span>
            <Database className="w-4 h-4 text-bhagwa-600" />
          </div>
          <p className="text-xl font-bold text-slate-900">{formatNumber(data.metrics.totalTrainees)}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            {formatNumber(data.totals.certified)} certified trainees
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Verification Rate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-slate-900">{data.metrics.verifiedOutcomesRate}%</p>
          <p className="text-[11px] text-slate-500 mt-1">EPFO & employer verified</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Follow-up Backlog</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-slate-900">{data.followups.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Open contact milestones</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setTab('trainees')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            tab === 'trainees' ? 'border-gov-700 text-gov-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Trainee Registry CRUD ({formatNumber(filteredTrainees.length)})
        </button>
        <button
          onClick={() => setTab('users')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            tab === 'users' ? 'border-gov-700 text-gov-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          User Management ({users.length})
        </button>
        <button
          onClick={() => setTab('logs')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            tab === 'logs' ? 'border-gov-700 text-gov-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Audit Logs
        </button>
        <button
          onClick={() => setTab('database')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            tab === 'database' ? 'border-gov-700 text-gov-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          System & Database Engine
        </button>
      </div>

      {/* Tab 1: Trainee CRUD Table */}
      {tab === 'trainees' && (
        <Card className="overflow-hidden">
          {/* Filter / Search bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search trainee name, ID, program..."
                value={traineeSearch}
                onChange={(e) => {
                  setTraineeSearch(e.target.value);
                  setTraineePage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:border-gov-600 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={traineeDistrict}
                onChange={(e) => {
                  setTraineeDistrict(e.target.value);
                  setTraineePage(1);
                }}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:border-gov-600 outline-none"
              >
                <option value="all">All 36 Districts</option>
                {MAHARASHTRA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setAddModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-gov-700 hover:bg-gov-800 text-white transition-colors flex items-center gap-1.5 shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Trainee
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Trainee ID & Name</th>
                  <th className="px-4 py-3">District</th>
                  <th className="px-4 py-3">Programme</th>
                  <th className="px-4 py-3">Outcome Status</th>
                  <th className="px-4 py-3">Current Wage</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentTrainees.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{t.fullName}</p>
                      <span className="text-[10px] font-mono text-slate-400">{t.traineeId}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t.district}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{t.programName}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={t.currentStatus} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {t.currentWage > 0 ? formatINR(t.currentWage) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <VerificationBadge status={t.verificationStatus} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingTrainee(t)}
                          className="p-1.5 text-slate-600 hover:text-gov-700 hover:bg-gov-50 rounded transition-colors"
                          title="Edit Trainee"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingTrainee(t)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Trainee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {currentTrainees.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No trainee records matching search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {(traineePage - 1) * PAGE_SIZE + 1}–{Math.min(traineePage * PAGE_SIZE, filteredTrainees.length)} of{' '}
              {filteredTrainees.length} trainees
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={traineePage <= 1}
                onClick={() => setTraineePage((p) => p - 1)}
                className="p-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium text-slate-700">
                {traineePage} / {totalPages}
              </span>
              <button
                disabled={traineePage >= totalPages}
                onClick={() => setTraineePage((p) => p + 1)}
                className="p-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 2: User Management */}
      {tab === 'users' && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Registered Platform Users</h3>
              <p className="text-[11px] text-slate-500">Manage administrator privileges and citizen accounts</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Full Name & Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">District</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{u.fullName}</p>
                      <span className="text-slate-500">{u.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-gov-100 text-gov-800 border border-gov-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.district || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{u.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleRoleToggle(u)}
                          className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
                        >
                          {u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                        </button>
                        {u.id !== user?.id && (
                          <button
                            onClick={() => setDeletingUser(u)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: System Audit Logs */}
      {tab === 'logs' && (
        <Card className="p-5">
          <h3 className="text-xs font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gov-700" />
            Live Mutation Audit Stream
          </h3>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {logs.map((l) => (
              <div key={l.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold bg-gov-100 text-gov-800 px-1.5 py-0.5 rounded">
                      {l.action}
                    </span>
                    <span className="text-xs font-semibold text-slate-900">{l.entityType} ({l.entityId})</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{l.details || 'Operation completed.'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">By: {l.userName || 'System'}</p>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">{formatDate(l.timestamp)}</span>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No audit records recorded yet.</p>
            )}
          </div>
        </Card>
      )}

      {/* Tab 4: Database & System Tools */}
      {tab === 'database' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-gov-700" />
              Engine Information
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Database Engine</span>
                <span className="font-semibold text-slate-800">SQLite (node:sqlite WAL mode)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Persistence File</span>
                <span className="font-mono text-[11px] text-slate-700">data/skilltrack.db</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Total Trainees</span>
                <span className="font-semibold text-slate-800">{formatNumber(data.metrics.totalTrainees)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Total Outcomes</span>
                <span className="font-semibold text-slate-800">{formatNumber(data.totals.placed)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Active Programs</span>
                <span className="font-semibold text-slate-800">{data.programs.length}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Training Providers</span>
                <span className="font-semibold text-slate-800">{data.providers.length}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              Database Restoration Tools
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              For live hackathon evaluations, you can instantly restore all 2,000 official Maharashtra seed records and
              default demo accounts back to their original state.
            </p>
            <button
              onClick={() => setResetModalOpen(true)}
              className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Maharashtra Seed Dataset
            </button>
          </Card>
        </div>
      )}

      {/* Modals */}
      <AddTraineeModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} />

      {editingTrainee && (
        <EditTraineeModal
          trainee={editingTrainee}
          isOpen={!!editingTrainee}
          onClose={() => setEditingTrainee(null)}
        />
      )}

      {deletingTrainee && (
        <DeleteConfirmModal
          isOpen={!!deletingTrainee}
          title="Delete Trainee Record"
          itemName={deletingTrainee.fullName}
          itemIdentifier={deletingTrainee.traineeId}
          onClose={() => setDeletingTrainee(null)}
          onConfirm={handleDeleteTraineeConfirm}
        />
      )}

      {deletingUser && (
        <DeleteConfirmModal
          isOpen={!!deletingUser}
          title="Delete User Account"
          itemName={deletingUser.fullName}
          itemIdentifier={deletingUser.email}
          onClose={() => setDeletingUser(null)}
          onConfirm={handleDeleteUser}
        />
      )}

      {resetModalOpen && (
        <DeleteConfirmModal
          isOpen={resetModalOpen}
          title="Restore Seed Dataset"
          itemName="All database records"
          itemIdentifier="Maharashtra 2,000 registry"
          onClose={() => setResetModalOpen(false)}
          onConfirm={handleResetDatabase}
        />
      )}
    </div>
  );
};

