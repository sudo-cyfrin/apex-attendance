import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  Shield, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Fingerprint,
  KeyRound,
  Send
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    const result = await loginWithGoogle();
    if (!result.success) {
      setErrorMessage(result.message || 'Google Sign-In was cancelled or failed.');
    }
    setLoading(false);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both corporate email and password.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    if (isRegister) {
      const res = await registerWithEmail(email, password, name);
      if (!res.success) {
        if (res.message?.includes('email-already-in-use')) {
          setErrorMessage('This email is already registered in Firebase. Switch to the "Sign In" tab above, or click "Continue with Google" at the top.');
        } else {
          setErrorMessage(res.message || 'Failed to create account.');
        }
      }
    } else {
      const res = await loginWithEmail(email, password);
      if (!res.success) {
        if (res.message?.includes('invalid-credential') || res.message?.includes('wrong-password')) {
          setErrorMessage('Invalid password. If you originally created this account with Google, click the "Continue with Google" button at the top, or click "Forgot Password?" below to set a new password.');
        } else if (res.message?.includes('user-not-found')) {
          setErrorMessage('No account found for this email. Switch to "Create Account" tab to register.');
        } else {
          setErrorMessage(res.message || 'Authentication failed. Please check your credentials.');
        }
      }
    }
    setLoading(false);
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    const res = await resetPassword(resetEmail);
    setResetLoading(false);
    if (res.success) {
      setInfoMessage(res.message || 'Password reset link sent to your inbox!');
      setShowForgotModal(false);
    } else {
      setErrorMessage(res.message || 'Failed to send reset link.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden selection:bg-blue-500/30">
      {/* Dynamic Ambient Background Gradients */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium tracking-wide uppercase mb-4 shadow-sm shadow-blue-500/10">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Enterprise Attendance Node</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">
            Apex Attendance Portal
          </h1>
          <p className="text-slate-400 text-sm">
            Sign in to access corporate attendance, shift compensation, and admin audit.
          </p>
        </div>

        {/* Card */}
        <div 
          id="login-card-container"
          className="bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-7 shadow-2xl shadow-black/60 relative"
        >
          {/* Top subtle highlight */}
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />

          {/* Primary Authentication Options */}
          <div className="space-y-2.5">
            <button
              id="google-login-btn"
              type="button"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm transition-all shadow-md active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="w-full border-t border-white/10" />
            <span className="bg-[#0F172A] px-3 text-xs text-slate-400 uppercase tracking-wider relative">
              Or with Corporate Email & Password
            </span>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-900/90 p-1 rounded-xl border border-white/5 mb-5">
            <button
              id="tab-signin"
              type="button"
              onClick={() => {
                setIsRegister(false);
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                !isRegister
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              id="tab-register"
              type="button"
              onClick={() => {
                setIsRegister(true);
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                isRegister
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Success / Info Message */}
          {infoMessage && (
            <div 
              id="login-info-alert"
              className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-300 text-xs leading-relaxed animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Error Message with friendly guidance */}
          {errorMessage && (
            <div 
              id="login-error-alert"
              className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex flex-col gap-2 text-red-300 text-xs leading-relaxed animate-in fade-in"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="input-name"
                      type="text"
                      placeholder="e.g. Jordan Lee"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Corporate Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="input-email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Password
                </label>
                {!isRegister && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email || '');
                      setShowForgotModal(true);
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="input-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              id="submit-auth-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-500/25 active:scale-[0.99] disabled:opacity-50 cursor-pointer mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'Register Employee Account' : 'Authenticate & Enter'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Footer notice */}
        <div className="text-center mt-6 text-xs text-slate-400 flex items-center justify-center gap-2">
          <Fingerprint className="w-3.5 h-3.5 text-blue-400" />
          <span>Secured by Firebase Authentication & Role Verification</span>
        </div>
      </div>

      {/* Forgot / Reset Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0F172A] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Reset Account Password</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter your email to receive a secure Firebase password reset link.
            </p>

            <form onSubmit={handleSendReset} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
                >
                  {resetLoading ? 'Sending...' : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Link</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
