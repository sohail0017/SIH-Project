import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Menu, User, Shield, LogOut, ChevronDown, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';

interface HeaderProps {
  currentSection: string;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onToggleSidebar: () => void;
  onOpenAuth: () => void;
  onNavigate: (section: string) => void;
  unreadCount: number;
}

const SECTION_TITLES: Record<string, string> = {
  dashboard: 'State Skilling Overview',
  districts: 'Districts Analytics',
  outcomes: 'Employment Outcomes',
  trainees: 'Trainees Longitudinal Registry',
  skillgaps: 'Sector Skill Gaps',
  providers: 'Training Providers',
  followups: 'Departmental Follow-ups',
  analytics: 'Longitudinal Analytics',
  insights: 'Insights & Impact',
  reports: 'Standard Department Reports',
  'user-dashboard': 'Citizen Skilling Portal',
  'admin-dashboard': 'State Administration Console',
};

/** Abstract institutional emblem (chakra-inspired mark) — not the official seal. */
const Emblem: React.FC = () => (
  <svg viewBox="0 0 44 44" className="w-10 h-10 shrink-0" aria-hidden>
    <circle cx="22" cy="22" r="21" fill="#213a5c" />
    <circle cx="22" cy="22" r="16.5" fill="none" stroke="#e87722" strokeWidth="1.6" />
    <circle cx="22" cy="22" r="3.4" fill="#ffffff" />
    {Array.from({ length: 12 }).map((_, i) => {
      const angle = (i * 30 * Math.PI) / 180;
      const x1 = 22 + 5.4 * Math.cos(angle);
      const y1 = 22 + 5.4 * Math.sin(angle);
      const x2 = 22 + 15 * Math.cos(angle);
      const y2 = 22 + 15 * Math.sin(angle);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth="1.5" />;
    })}
  </svg>
);

export const Header: React.FC<HeaderProps> = ({
  currentSection,
  onOpenSearch,
  onOpenNotifications,
  onToggleSidebar,
  onOpenAuth,
  onNavigate,
  unreadCount,
}) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
      {/* Saffron identity strip */}
      <div className="h-[3px] bg-bhagwa-500" aria-hidden />

      <div className="h-[72px] flex items-center gap-3 px-4 md:px-6">
        {/* Mobile menu */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Government identity block */}
        <div
          className="flex items-center gap-3 min-w-0 cursor-pointer"
          onClick={() => onNavigate('dashboard')}
        >
          <Emblem />
          <div className="min-w-0 hidden sm:block">
            <p className="text-[13px] font-bold text-gov-900 leading-tight tracking-tight">
              Government of Maharashtra
            </p>
            <p className="text-[11px] font-medium text-slate-600 leading-tight truncate">
              Maharashtra State Innovation Society
            </p>
            <p className="text-[10px] text-slate-400 leading-tight truncate hidden md:block">
              Department of Skills, Employment, Entrepreneurship and Innovation
            </p>
          </div>
        </div>

        <div className="flex-1" />

        {/* Global search */}
        <button
          onClick={onOpenSearch}
          className="hidden md:flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-400 hover:border-slate-300 hover:bg-white transition-colors w-64"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left truncate">Search trainees, districts…</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-400">
            Ctrl K
          </kbd>
        </button>
        <button
          onClick={onOpenSearch}
          className="md:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-bhagwa-500 text-white text-[9px] font-bold">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Account / Authentication Button */}
        {isAuthenticated && user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white transition-all cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-gov-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {user.fullName ? user.fullName.slice(0, 1).toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-xs font-semibold text-slate-800 max-w-[120px] truncate">{user.fullName}</p>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider ${
                    isAdmin ? 'text-gov-700 font-extrabold' : 'text-slate-500'
                  }`}
                >
                  {isAdmin ? 'Administrator' : 'Citizen'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 animate-pop text-xs">
                <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/50">
                  <p className="font-semibold text-slate-900 truncate">{user.fullName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isAdmin ? 'bg-gov-100 text-gov-800' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {user.role}
                    </span>
                    <span className="text-[10px] text-slate-400">{user.district || 'Maharashtra'}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onNavigate('user-dashboard');
                    setUserDropdownOpen(false);
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  My Citizen Dashboard
                </button>

                {isAdmin && (
                  <button
                    onClick={() => {
                      onNavigate('admin-dashboard');
                      setUserDropdownOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-gov-50 text-gov-800 flex items-center gap-2 font-medium transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5 text-gov-600" />
                    State Admin Console
                  </button>
                )}

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={async () => {
                    setUserDropdownOpen(false);
                    await logout();
                    onNavigate('login');
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-rose-50 text-rose-700 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gov-700 hover:bg-gov-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}

        {/* Product identity */}
        <div className="h-9 w-px bg-slate-200 mx-1 hidden lg:block" aria-hidden />
        <div className="hidden lg:block text-right leading-tight">
          <p className="text-[15px] font-extrabold tracking-tight text-gov-900">
            Skill<span className="text-bhagwa-500">Track</span>
          </p>
          <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400">
            Skilling Outcomes Platform
          </p>
        </div>
      </div>

      {/* Scope bar — clarifies fixed geographic scope on every screen */}
      <div className="h-8 bg-gov-900 flex items-center justify-between px-4 md:px-6">
        <p className="text-[11px] font-medium text-gov-100/90 truncate">
          {SECTION_TITLES[currentSection] || 'SkillTrack — Maharashtra'}
        </p>
        <p className="text-[11px] text-gov-100/60 whitespace-nowrap hidden sm:block">
          Geographic scope: <span className="font-semibold text-gov-100/90">Maharashtra</span>
        </p>
      </div>
    </header>
  );
};
