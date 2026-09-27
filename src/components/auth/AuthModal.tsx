import React, { useState } from 'react';
import { X, Lock, Mail, User, Phone, ShieldCheck, CheckCircle, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../common/Toast';
import { MAHARASHTRA_DISTRICTS } from '../../data/reference';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
  onSuccessRedirect?: (section: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'login',
  onSuccessRedirect,
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
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Register form state
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [district, setDistrict] = useState('Pune');
  const [phone, setPhone] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginEmail || !loginPassword) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(loginEmail.trim(), loginPassword);
      pushToast('Successfully signed in. Welcome to SkillTrack!', 'success');
      onClose();
      if (onSuccessRedirect) {
        onSuccessRedirect('user-dashboard');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed. Please verify credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail.trim())) {
      setError('Please enter a valid email address.');
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
      pushToast('Account registered successfully! Welcome to SkillTrack.', 'success');
      onClose();
      if (onSuccessRedirect) {
        onSuccessRedirect('user-dashboard');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
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

  const isPasswordValid = regPassword.length >= 8 && /[a-zA-Z]/.test(regPassword) && /[0-9]/.test(regPassword);
  const passwordsMatch = regPassword.length > 0 && regPassword === confirmPassword;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade"
      onClick={onClose}
    >
      <div
        className="animate-pop w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Saffron Identity Strip */}
        <div className="h-[3px] bg-bhagwa-500" />

        {/* Modal Header */}
        <header className="px-6 pt-5 pb-3 border-b border-slate-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gov-700 bg-gov-50 px-2 py-0.5 rounded border border-gov-100">
                Government of Maharashtra
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">SkillTrack Authentication</h2>
            <p className="text-xs text-slate-500">Secure access to departmental insights, citizen registry and outcome tracking</p>
            <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
              <ShieldCheck className="w-3 h-3" /> Secure session · role-based access
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-semibold text-center transition-colors border-b-2 ${
              tab === 'login'
                ? 'border-gov-700 text-gov-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-semibold text-center transition-colors border-b-2 ${
              tab === 'register'
                ? 'border-gov-700 text-gov-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Citizen Account
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Official / Citizen Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="user@skilltrack.gov.in"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:border-gov-600 focus:ring-1 focus:ring-gov-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2 text-xs border border-slate-200 rounded-md focus:border-gov-600 focus:ring-1 focus:ring-gov-600 outline-none transition-all"
                  />
                  <button type="button" onClick={() => setShowLoginPassword((v) => !v)} className="absolute right-3 top-2 text-slate-400 hover:text-slate-700" aria-label={showLoginPassword ? 'Hide password' : 'Show password'}>
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 text-center">Your session is protected by a secure HTTP-only cookie.</p>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-gov-700 hover:bg-gov-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Authenticating…' : 'Sign In'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Demo 1-Click Fillers for Judges / Evaluation */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Hackathon Evaluation Demo Credentials:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={fillDemoAdmin}
                    className="px-2.5 py-1.5 text-[11px] font-medium border border-gov-200 bg-gov-50 text-gov-800 rounded hover:bg-gov-100 transition-colors text-center"
                  >
                    ⚡ Fill Demo Admin
                  </button>
                  <button
                    type="button"
                    onClick={fillDemoCitizen}
                    className="px-2.5 py-1.5 text-[11px] font-medium border border-bhagwa-200 bg-bhagwa-50 text-bhagwa-800 rounded hover:bg-bhagwa-100 transition-colors text-center"
                  >
                    ⚡ Fill Demo Citizen
                  </button>
                </div>
              </div>
            </form>
          ) : (
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
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:border-gov-600 focus:ring-1 focus:ring-gov-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:border-gov-600 focus:ring-1 focus:ring-gov-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">District</label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-md focus:border-gov-600 outline-none bg-white"
                  >
                    {MAHARASHTRA_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone (Optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98..."
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-md focus:border-gov-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <span className={`text-[10px] ${isPasswordValid ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                    Min 8 chars, letters & numbers
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showRegPassword ? "text" : "password"}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    className="w-full pl-9 pr-10 py-2 text-xs border border-slate-200 rounded-md focus:border-gov-600 focus:ring-1 focus:ring-gov-600 outline-none transition-all"
                  />
                  <button type="button" onClick={() => setShowRegPassword((v) => !v)} className="absolute right-3 top-2 text-slate-400 hover:text-slate-700" aria-label={showRegPassword ? 'Hide password' : 'Show password'}>
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Confirm Password</label>
                  {confirmPassword && (
                    <span className={`text-[10px] font-semibold ${passwordsMatch ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {passwordsMatch ? '✓ Matches' : '✗ Does not match'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className="w-full pl-9 pr-10 py-2 text-xs border border-slate-200 rounded-md focus:border-gov-600 focus:ring-1 focus:ring-gov-600 outline-none transition-all"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute right-3 top-2 text-slate-400 hover:text-slate-700" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-2.5 px-4 bg-gov-700 hover:bg-gov-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Creating Account…' : 'Register Citizen Account'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

