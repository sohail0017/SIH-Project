import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  TrendingUp,
  Users,
  Layers,
  Building2,
  PhoneCall,
  BarChart3,
  FileText,
  Lightbulb,
  Info,
  User,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../store/AuthContext';

interface SidebarProps {
  currentSection: string;
  onSelectSection: (section: string) => void;
  followupsDue: number;
}

const PUBLIC_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'districts', label: 'Districts', icon: MapPin },
  { id: 'outcomes', label: 'Outcomes', icon: TrendingUp },
  { id: 'trainees', label: 'Trainees', icon: Users },
  { id: 'skillgaps', label: 'Skill Gaps', icon: Layers },
  { id: 'providers', label: 'Providers', icon: Building2 },
  { id: 'followups', label: 'Follow-ups', icon: PhoneCall, badgeKey: 'followups' as const },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'insights', label: 'Insights & Impact', icon: Lightbulb },
  { id: 'reports', label: 'Reports', icon: FileText },
];

export const SidebarNav: React.FC<SidebarProps> = ({ currentSection, onSelectSection, followupsDue }) => {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
      {/* Personalized Portals */}
      {isAuthenticated && (
        <div className="mb-3 pb-2 border-b border-slate-100">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Personal Portal
          </p>
          <button
            onClick={() => onSelectSection('user-dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors group ${
              currentSection === 'user-dashboard'
                ? 'bg-gov-700 text-white'
                : 'text-slate-600 hover:text-gov-800 hover:bg-gov-50'
            }`}
          >
            <User
              className={`w-4 h-4 shrink-0 ${
                currentSection === 'user-dashboard' ? 'text-white' : 'text-slate-400 group-hover:text-gov-700'
              }`}
            />
            <span className="flex-1 text-left">My Dashboard</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => onSelectSection('admin-dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors group ${
                currentSection === 'admin-dashboard'
                  ? 'bg-gov-700 text-white'
                  : 'text-gov-800 hover:bg-gov-50'
              }`}
            >
              <Shield
                className={`w-4 h-4 shrink-0 ${
                  currentSection === 'admin-dashboard' ? 'text-white' : 'text-gov-600 group-hover:text-gov-700'
                }`}
              />
              <span className="flex-1 text-left font-semibold">Admin Console</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-bhagwa-100 text-bhagwa-700">
                ADMIN
              </span>
            </button>
          )}
        </div>
      )}

      {/* Main State Platform Navigation */}
      <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
        State Skilling Registry
      </p>
      {PUBLIC_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = currentSection === item.id;
        const badge = item.badgeKey === 'followups' ? followupsDue : null;
        return (
          <button
            key={item.id}
            onClick={() => onSelectSection(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors group ${
              isActive
                ? 'bg-gov-700 text-white'
                : 'text-slate-600 hover:text-gov-800 hover:bg-gov-50'
            }`}
          >
            <Icon
              className={`w-4 h-4 shrink-0 ${
                isActive ? 'text-white' : 'text-slate-400 group-hover:text-gov-700'
              }`}
            />
            <span className="flex-1 text-left">{item.label}</span>
            {badge !== null && badge > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-bhagwa-100 text-bhagwa-700'
                }`}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

const SidebarFooter = () => (
  <div className="px-4 py-3 border-t border-slate-100">
    <div className="flex items-start gap-2 text-slate-400">
      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <p className="text-[10px] leading-relaxed">
        SkillTrack Maharashtra Outcomes Platform. MSInS Department of Skills & Innovation.
      </p>
    </div>
  </div>
);

export const Sidebar: React.FC<SidebarProps> = (props) => (
  <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-slate-200 sticky top-[107px] h-[calc(100vh-107px)]">
    <SidebarNav {...props} />
    <SidebarFooter />
  </aside>
);

export const MobileSidebar: React.FC<
  SidebarProps & { open: boolean; onClose: () => void }
> = ({ open, onClose, ...props }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl flex flex-col z-10 animate-slide-right">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs font-bold text-gov-900">SkillTrack Navigation</p>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <SidebarNav {...props} />
        <SidebarFooter />
      </div>
    </div>
  );
};
