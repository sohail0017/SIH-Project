import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  Phone,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Shield,
  Award,
  Users,
  BarChart3,
  MapPin,
  LockKeyhole,
} from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../common/Toast';
import { MAHARASHTRA_DISTRICTS } from '../../data/reference';

interface LoginPageProps {
  onSuccess: (targetSection?: string) => void;
  defaultTab?: 'login' | 'register';
  redirectSection?: string;
}

/** Abstract institutional emblem (chakra-inspired mark) */
const Emblem: React.FC = () => (
  <svg viewBox="0 0 44 44" className="w-12 h-12 shrink-0" aria-hidden>
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

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  defaultTab = 'login',
  redirectSection,
}) => {
  const { login, register } = useAuth();
  const { pushToast } = useToast();

  const [tab, setTab] = useState<'login' | 'register'>(defaultTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [district, setDistrict] = useState('Pune');
  const [phone, setPhone] = useState('');
  const [consentAgreed, setConsentAgreed] = useState(true);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginEmail || !loginPassword) {
      setError('Please enter both your official email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(loginEmail.trim(), loginPassword);
      pushToast('Authentication successful. Welcome to SkillTrack!', 'success');
      onSuccess(redirectSection || 'dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed. Please verify your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters long.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail.trim())) {
      setError('Please provide a valid email address.');
      return;
    }

    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(regPassword);
    const hasNumber = /[0-9]/.test(regPassword);
    if (!hasLetter || !hasNumber) {
      setError('Password must contain both letters and numbers.');
      return;
    }

    if (regPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    if (!consentAgreed) {
      setError('You must agree to the data protection consent notice to register.');
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        confirmPassword,
        district,
        phone: phone.trim() || undefined,
      });
      pushToast('Citizen account registered successfully! Welcome to SkillTrack.', 'success');
      onSuccess('user-dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setTab('login');
    setLoginEmail('admin@skilltrack.gov.in');
    setLoginPassword('Admin@12345');
    setError(null);
  };

  const fillDemoCitizen = () => {
    setTab('login');
    setLoginEmail('citizen@skilltrack.gov.in');
    setLoginPassword('Citizen@12345');
    setError(null);
  };

  const isPasswordValid =
    regPassword.length >= 8 && /[a-zA-Z]/.test(regPassword) && /[0-9]/.test(regPassword);
  const passwordsMatch = regPassword.length > 0 && regPassword === confirmPassword;

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7fa] text-slate-900 font-sans antialiased">
      {/* Top Saffron Identity Strip */}
      <div className="h-[3px] bg-bhagwa-500 w-full" aria-hidden />

      {/* Institutional Top Bar */}
      <header className="bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto h-[76px] flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Emblem />
            <div>
              <p className="text-[14px] font-bold text-gov-900 leading-tight tracking-tight">
                Government of Maharashtra
              </p>
              <p className="text-[12px] font-medium text-slate-600 leading-tight">
                Maharashtra State Innovation Society
              </p>
              <p className="text-[10px] text-slate-400 leading-tight hidden sm:block">
                Department of Skills, Employment, Entrepreneurship and Innovation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-gov-50 border border-gov-100 text-gov-800 text-[11px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-gov-700" />
              <span>Official Government Portal</span>
            </div>
            <div className="text-right leading-tight border-l border-slate-200 pl-3">
              <p className="text-[15px] font-extrabold tracking-tight text-gov-900">
                Skill<span className="text-bhagwa-500">Track</span>
              </p>
              <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400">
                Skilling Outcomes Platform
              </p>
            </div>
          </div>
        </div>

        {/* Scope bar */}
        <div className="h-8 bg-gov-900 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <p className="text-[11px] font-medium text-gov-100/90 truncate flex items-center gap-1.5">
            <LockKeyhole className="w-3 h-3 text-bhagwa-400" />
            <span>Secure Authentication Gateway · Restricted Access</span>
          </p>
          <p className="text-[11px] text-gov-100/60 whitespace-nowrap hidden sm:block">
            Geographic scope: <span className="font-semibold text-gov-100/90">Maharashtra</span>
          </p>
        </div>
      </header>

      {/* Main Authentication Section */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Institutional Trust & System Features */}
          <div className="lg:col-span-6 flex flex-col justify-between bg-gradient-to-br from-gov-900 via-gov-800 to-gov-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-gov-800">
            {/* Subtle decorative background watermarks */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-bhagwa-500/10 blur-2xl pointer-events-none" />

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-bhagwa-300 text-xs font-semibold backdrop-blur-xs mb-4 border border-white/10">
                <Shield className="w-3.5 h-3.5" />
                <span>Maharashtra Skilling Outcomes Platform</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Secure Access to State Skilling Registry
              </h1>

              <p className="text-xs sm:text-sm text-gov-100/80 mt-3 leading-relaxed">
                Centralized monitoring platform tracking long-term employment, wage progression, and
                retention outcomes across 36 districts of Maharashtra.
              </p>

              {/* Key Highlights */}
              <div className="mt-6 space-y-3.5">
                <div className="flex items-start gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
                  <div className="w-8 h-8 rounded-md bg-bhagwa-500/20 text-bhagwa-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">36 Districts Statewide Coverage</h4>
                    <p className="text-[11px] text-gov-100/70 mt-0.5">
                      Longitudinal tracking of certified trainees across rural and urban centers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
                  <div className="w-8 h-8 rounded-md bg-gov-400/20 text-gov-300 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Longitudinal Retention Verification</h4>
                    <p className="text-[11px] text-gov-100/70 mt-0.5">
                      Continuous follow-up tracking at 3, 6, and 12-month post-placement intervals.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
                  <div className="w-8 h-8 rounded-md bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">DPDP Act Compliant Architecture</h4>
                    <p className="text-[11px] text-gov-100/70 mt-0.5">
                      Consent-based citizen verification with secure tokenized session management.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Institutional Security Notice */}
            <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-gov-100/60">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-bhagwa-400" />
                256-bit TLS · HTTP-Only Session
              </span>
              <span>Govt. of Maharashtra</span>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col justify-between">
            {/* Top Card Accent */}
            <div className="h-[3px] bg-bhagwa-500" />

            <div className="p-6 sm:p-8">
              {/* Card Header */}
              <div className="mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gov-700 bg-gov-50 px-2.5 py-0.5 rounded border border-gov-100">
                    Single Sign-On
                  </span>
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Secure Session
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-2">Sign in to SkillTrack</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authorized access for Department Officials, Training Providers, and Enrolled Citizens
                </p>
              </div>

              {/* Segmented Tab Switcher */}
              <div className="flex border border-slate-200 rounded-lg p-1 bg-slate-50 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    tab === 'login'
                      ? 'bg-white text-gov-900 shadow-xs border border-slate-200/80 font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Official & Citizen Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('register');
                    setError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    tab === 'register'
                      ? 'bg-white text-gov-900 shadow-xs border border-slate-200/80 font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Create Citizen Account
                </button>
              </div>

              {/* Error Alert Box */}
              {error && (
                <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-rose-800 text-xs animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* Tab 1: Sign In */}
              {tab === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Official or Citizen Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="e.g. admin@skilltrack.gov.in"
                        autoComplete="email"
                        className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-lg focus:border-gov-600 focus:ring-1 focus:ring-gov-600 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">Password</label>
                      <span className="text-[10px] text-slate-400">Encrypted via bcrypt</span>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your account password"
                        autoComplete="current-password"
                        className="w-full pl-9 pr-10 py-2.5 text-xs border border-slate-200 rounded-lg focus:border-gov-600 focus:ring-1 focus:ring-gov-600 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((v) => !v)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                        aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 p-2.5 rounded-md flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-gov-700 shrink-0" />
                    <span>Protected by secure HTTP-only cookies and JWT authentication.</span>
                  </p>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-gov-700 hover:bg-gov-800 active:bg-gov-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                          />
                        </svg>
                        <span>Authenticating Credentials…</span>
                      </span>
                    ) : (
                      <>
                        <span>Sign In to SkillTrack</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  {/* Demo Evaluation Credentials Quick Fillers */}
                  <div className="mt-5 pt-4 border-t border-slate-200/70">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        ⚡ Quick Evaluation Logins:
                      </p>
                      <span className="text-[10px] text-slate-400">Click to fill</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={fillDemoAdmin}
                        className="px-3 py-2 text-left border border-gov-200 bg-gov-50/70 hover:bg-gov-100/80 rounded-lg transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gov-900">Demo Admin</span>
                          <span className="text-[9px] font-bold uppercase text-gov-700 bg-gov-100 px-1.5 py-0.5 rounded">
                            Full Admin
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                          admin@skilltrack.gov.in
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={fillDemoCitizen}
                        className="px-3 py-2 text-left border border-bhagwa-200 bg-bhagwa-50/70 hover:bg-bhagwa-100/80 rounded-lg transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">Demo Citizen</span>
                          <span className="text-[9px] font-bold uppercase text-bhagwa-700 bg-bhagwa-100 px-1.5 py-0.5 rounded">
                            Citizen
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                          citizen@skilltrack.gov.in
                        </p>
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* Tab 2: Create Citizen Account */
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Ramesh Narayan Deshmukh"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-gov-600 focus:ring-1 focus:ring-gov-600 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-gov-600 focus:ring-1 focus:ring-gov-600 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        District
                      </label>
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:border-gov-600 outline-none bg-white"
                      >
                        {MAHARASHTRA_DISTRICTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phone (Optional)
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98..."
                        className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:border-gov-600 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Password</label>
                      <span
                        className={`text-[10px] ${
                          isPasswordValid ? 'text-emerald-600 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        Min 8 chars, letters & numbers
                      </span>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Create strong password"
                        autoComplete="new-password"
                        className="w-full pl-9 pr-10 py-2 text-xs border border-slate-200 rounded-lg focus:border-gov-600 focus:ring-1 focus:ring-gov-600 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword((v) => !v)}
                        className="absolute right-3 top-2 text-slate-400 hover:text-slate-700"
                        aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Confirm Password
                      </label>
                      {confirmPassword && (
                        <span
                          className={`text-[10px] font-semibold ${
                            passwordsMatch ? 'text-emerald-600' : 'text-rose-500'
                          }`}
                        >
                          {passwordsMatch ? '✓ Matches' : '✗ Does not match'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                        className="w-full pl-9 pr-10 py-2 text-xs border border-slate-200 rounded-lg focus:border-gov-600 focus:ring-1 focus:ring-gov-600 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-2 text-slate-400 hover:text-slate-700"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* DPDP Consent */}
                  <label className="flex items-start gap-2 pt-1 text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentAgreed}
                      onChange={(e) => setConsentAgreed(e.target.checked)}
                      className="mt-0.5 rounded text-gov-700 focus:ring-gov-600 border-slate-300"
                    />
                    <span>
                      I agree to verify my skilling records under the Maharashtra Digital Skilling
                      Privacy Framework (DPDP Act, 2023).
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-2.5 px-4 bg-gov-700 hover:bg-gov-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? 'Creating Account…' : 'Register Citizen Account'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>

            {/* Legal Notice Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 text-center">
              Official State Portal · Unauthorized access is strictly prohibited and subject to legal
              action under the Information Technology Act.
            </div>
          </div>
        </div>
      </main>

      {/* Official Government Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500 text-center sm:text-left">
            © 2026 Government of Maharashtra · Maharashtra State Innovation Society, Department of
            Skills, Employment, Entrepreneurship and Innovation
          </p>
          <p className="text-[11px] text-slate-400 text-center sm:text-right">
            SkillTrack · Maharashtra Skilling Outcomes Platform
          </p>
        </div>
      </footer>
    </div>
  );
};
