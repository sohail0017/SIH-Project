import React, { useEffect, useState } from 'react';
import { Trainee, NotificationItem } from './types';
import { DEMO_NOTIFICATIONS } from './data/reference';

import { DataProvider, useSkillTrack } from './store/DataProvider';
import { FilterProvider } from './store/FilterProvider';
import { AuthProvider, useAuth } from './store/AuthContext';
import { Header } from './components/layout/Header';
import { Sidebar, MobileSidebar } from './components/layout/Sidebar';
import { ToastProvider, useToast } from './components/common/Toast';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { NotificationsDrawer } from './components/common/NotificationsDrawer';
import { TraineeProfileModal } from './components/trainees/TraineeProfileModal';
import { AuthModal } from './components/auth/AuthModal';
import { LoginPage } from './components/auth/LoginPage';

import { DashboardView } from './components/dashboard/DashboardView';
import { DistrictAnalyticsView } from './components/districts/DistrictAnalyticsView';
import { EmploymentOutcomesView } from './components/outcomes/EmploymentOutcomesView';
import { TraineeListing } from './components/trainees/TraineeListing';
import { SkillGapsView } from './components/skillgaps/SkillGapsView';
import { ProvidersView } from './components/providers/ProvidersView';
import { FollowupsView } from './components/followups/FollowupsView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { InsightsView } from './components/insights/InsightsView';
import { ReportsView } from './components/reports/ReportsView';
import { UserDashboardView } from './components/user/UserDashboardView';
import { AdminDashboardView } from './components/admin/AdminDashboardView';
import { ShieldAlert, ArrowLeft, Shield } from 'lucide-react';

const VALID_SECTIONS = new Set([
  'login',
  'register',
  'dashboard',
  'districts',
  'outcomes',
  'trainees',
  'skillgaps',
  'providers',
  'followups',
  'analytics',
  'insights',
  'reports',
  'user-dashboard',
  'admin-dashboard',
]);

/** Parse "#section" or "#section/payload" from the URL hash. */
function readHash(): { section: string; payload?: string } {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return { section: 'login' };
  const [section, payload] = raw.split('/');
  if (!VALID_SECTIONS.has(section)) return { section: 'login' };
  return { section, payload: payload ? decodeURIComponent(payload) : undefined };
}

/** Institutional loading screen shown while session verification is active */
const AuthCheckingScreen: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f7fa] gap-4">
    <svg viewBox="0 0 44 44" className="w-12 h-12" aria-hidden>
      <circle cx="22" cy="22" r="21" fill="#213a5c" />
      <circle cx="22" cy="22" r="16.5" fill="none" stroke="#e87722" strokeWidth="1.6" />
      <circle cx="22" cy="22" r="3.4" fill="#ffffff" />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={22 + 5.4 * Math.cos(angle)}
            y1={22 + 5.4 * Math.sin(angle)}
            x2={22 + 15 * Math.cos(angle)}
            y2={22 + 15 * Math.sin(angle)}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        );
      })}
    </svg>
    <div className="text-center">
      <p className="text-sm font-extrabold tracking-tight text-gov-900">
        Skill<span className="text-bhagwa-500">Track</span>
      </p>
      <p className="text-xs text-slate-500 mt-1">Verifying secure government session…</p>
    </div>
    <div className="w-56 space-y-2 mt-1">
      <div className="skeleton h-3" />
      <div className="skeleton h-3 w-4/5 mx-auto" />
    </div>
  </div>
);

interface AppShellProps {
  route: { section: string; payload?: string };
  onNavigate: (section: string, payload?: string) => void;
}

const AppShell: React.FC<AppShellProps> = ({ route, onNavigate }) => {
  const { data, resetData } = useSkillTrack();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { pushToast } = useToast();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const section = route.section;
  const districtFocus = route.section === 'districts' ? route.payload : undefined;

  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEMO_NOTIFICATIONS);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const handleNotificationClick = (item: NotificationItem) => {
    setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    if (item.linkToSection) {
      onNavigate(item.linkToSection);
      setNotificationsOpen(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const today = new Date();
  const followupsDue = data.followups.filter((f) => new Date(f.dueDate) < today).length;

  const handleReset = () => {
    resetData();
    pushToast('Local mutations cleared — official seed data reloaded.', 'info');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7fa] text-slate-900 font-sans antialiased">
      <Header
        currentSection={section}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onToggleSidebar={() => setMobileNavOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onNavigate={onNavigate}
        unreadCount={unreadCount}
      />

      <div className="flex flex-1">
        <Sidebar
          currentSection={section}
          onSelectSection={(s) => onNavigate(s)}
          followupsDue={followupsDue}
        />

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            {section === 'dashboard' && <DashboardView onNavigateSection={onNavigate} />}
            {section === 'districts' && <DistrictAnalyticsView initialDistrict={districtFocus} />}
            {section === 'outcomes' && <EmploymentOutcomesView />}
            {section === 'trainees' && <TraineeListing onSelectTrainee={setSelectedTrainee} />}
            {section === 'skillgaps' && <SkillGapsView />}
            {section === 'providers' && <ProvidersView />}
            {section === 'followups' && <FollowupsView />}
            {section === 'analytics' && <AnalyticsView />}
            {section === 'insights' && <InsightsView />}
            {section === 'reports' && <ReportsView />}
            {section === 'user-dashboard' && <UserDashboardView />}
            {section === 'admin-dashboard' && (
              isAdmin ? (
                <AdminDashboardView onOpenAuthModal={() => setAuthModalOpen(true)} />
              ) : (
                <div className="page-enter max-w-lg mx-auto py-16 px-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert className="w-7 h-7 text-rose-700" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Administrator Privileges Required</h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    You are currently authenticated as{' '}
                    <span className="font-semibold text-slate-700">{user?.fullName || 'Citizen'}</span> with the role of{' '}
                    <span className="font-semibold text-slate-700">Citizen</span>. Access to the State Administration
                    Console is restricted to verified departmental administrators.
                  </p>
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={() => onNavigate('user-dashboard')}
                      className="w-full sm:w-auto px-4 py-2 bg-gov-700 hover:bg-gov-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                    >
                      Go to Citizen Dashboard
                    </button>
                    <button
                      onClick={() => onNavigate('dashboard')}
                      className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                    >
                      State Skilling Overview
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </main>
      </div>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500 text-center sm:text-left">
            © 2026 Government of Maharashtra · Maharashtra State Innovation Society, Department of
            Skills, Employment, Entrepreneurship and Innovation
          </p>
          <p className="text-[11px] text-slate-400 text-center sm:text-right">
            SkillTrack · Maharashtra Skilling Outcomes Platform ·{' '}
            <button onClick={handleReset} className="text-gov-700 hover:underline font-medium">
              Reset local changes
            </button>
          </p>
        </div>
      </footer>

      <MobileSidebar
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        currentSection={section}
        onSelectSection={(s) => onNavigate(s)}
        followupsDue={followupsDue}
      />

      {selectedTrainee && (
        <TraineeProfileModal trainee={selectedTrainee} onClose={() => setSelectedTrainee(null)} />
      )}

      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        trainees={data.trainees}
        programs={data.programs}
        providers={data.providers}
        onSelectTrainee={setSelectedTrainee}
        onNavigate={onNavigate}
      />

      <NotificationsDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllRead={markAllRead}
        onNotificationClick={handleNotificationClick}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccessRedirect={(target) => onNavigate(target)}
      />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, loading: authLoading, isAdmin } = useAuth();
  const [route, setRoute] = useState<{ section: string; payload?: string }>(() => readHash());
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);

  const navigate = (next: string, payload?: string) => {
    const hash = payload ? `#${next}/${encodeURIComponent(payload)}` : `#${next}`;
    if (window.location.hash !== hash) {
      window.history.pushState(null, '', hash);
    }
    setRoute({ section: next, payload });
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const onPop = () => setRoute(readHash());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // While verifying session
  if (authLoading) {
    return <AuthCheckingScreen />;
  }

  // Gated Route: Unauthenticated users are routed to the secure Login Page
  if (!isAuthenticated) {
    // If the user requested a specific protected page, remember it
    const requested =
      route.section !== 'login' && route.section !== 'register' ? route.section : pendingTarget || 'dashboard';

    return (
      <LoginPage
        defaultTab={route.section === 'register' ? 'register' : 'login'}
        redirectSection={requested}
        onSuccess={(target) => {
          navigate(target || requested || 'dashboard');
        }}
      />
    );
  }

  // If authenticated but hash is #login or #register, redirect to dashboard or intended target
  if (route.section === 'login' || route.section === 'register') {
    const target = pendingTarget || (isAdmin ? 'dashboard' : 'user-dashboard');
    navigate(target);
    return <AuthCheckingScreen />;
  }

  // Authenticated Protected App Shell
  return (
    <DataProvider>
      <FilterProvider>
        <AppShell route={route} onNavigate={navigate} />
      </FilterProvider>
    </DataProvider>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
