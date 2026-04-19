import { motion, AnimatePresence } from 'motion/react';
import { Mail, EyeOff, Eye, Lock, ArrowLeft, Send } from 'lucide-react';
import React, { useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface LoginScreenProps {
  onLogin: () => void;
}

type Mode = 'login' | 'forgot' | 'otp';

const LogoMark = () => (
  <svg width="36" height="36" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#0070f3" />
    <path d="M16 4L8 28l1 1 7-3 7 3 1-1L16 4Z" fill="white" opacity="0.95" />
    <rect x="10" y="14" width="12" height="1.5" rx="0.75" fill="white" opacity="0.5" />
  </svg>
);

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const { login } = useAuth();

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password state
  const [mode, setMode] = useState<Mode>('login');
  const [fpEmail, setFpEmail] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState('');
  const [fpSuccess, setFpSuccess] = useState('');

  // OTP state
  const [otp, setOtp] = useState('');
  const [newPass, setNewPass] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError('Email and password are required.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/auth/login', { email, password });
      login(res.data.access_token);
      onLogin();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpEmail.trim()) { setFpError('Email is required.'); return; }
    setFpLoading(true);
    setFpError('');
    setFpSuccess('');
    try {
      await API.post('/auth/forgot-password', { email: fpEmail.trim() });
      setFpSuccess('OTP sent to your registered email.');
      setMode('otp');
    } catch (err: any) {
      const detail = err.response?.data?.detail || '';
      if (err.response?.status === 404 || detail.toLowerCase().includes('not found') || detail.toLowerCase().includes('not registered')) {
        setFpError('This email is not registered in our system.');
      } else {
        setFpError(detail || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setFpLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || !newPass.trim()) { setOtpError('OTP and new password are required.'); return; }
    setOtpLoading(true);
    setOtpError('');
    try {
      await API.post('/auth/reset-password', { email: fpEmail, otp, new_password: newPass });
      setMode('login');
      setEmail(fpEmail);
      setError('');
    } catch (err: any) {
      setOtpError(err.response?.data?.detail || 'Invalid OTP or expired. Try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <motion.div
      className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center overflow-hidden p-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="fixed inset-0 kinetic-gradient pointer-events-none" />
      <div className="fixed -bottom-24 -left-24 w-96 h-96 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="fixed -top-24 -right-24 w-96 h-96 rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />

      <main className="relative z-10 w-full max-w-md flex flex-col items-center">

        {/* Logo */}
        <header className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[16px] bg-surface-container-high mb-5 border border-outline-variant/10 relative">
            <LogoMark />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-secondary rounded-full shadow-[0_0_6px_rgba(65,226,121,0.8)]" />
          </div>
          <h1 className="font-headline font-extrabold text-4xl tracking-tighter text-white">
            AutoBiz AI
          </h1>
          <p className="text-outline font-mono text-[10px] mt-1 tracking-[0.3em] uppercase">
            {mode === 'login' ? 'SYSTEM.ACCESS_REQUIRED' : mode === 'forgot' ? 'ACCOUNT.RECOVERY' : 'OTP.VERIFICATION'}
          </p>
        </header>

        <AnimatePresence mode="wait">

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <motion.section
              key="login"
              className="glass-panel w-full p-8 rounded-[16px] border border-outline-variant/10 shadow-[0_24px_48px_rgba(0,0,0,0.8)]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <form className="space-y-5" onSubmit={handleLogin}>
                {error && (
                  <motion.div
                    className="flex items-center gap-2 px-4 py-3 rounded-[10px] bg-error-container/10 border border-error/30 text-error text-xs font-medium"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Lock size={13} />
                    {error}
                  </motion.div>
                )}

                {/* Email field */}
                <div className="relative group">
                  <input
                    autoComplete="email"
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-[10px] py-4 px-4 pr-12 text-on-surface focus:border-primary/40 focus:outline-none transition-all peer placeholder-transparent text-sm"
                    id="email"
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder=" "
                    required
                    type="email"
                    value={email}
                  />
                  <label className="absolute left-4 top-4 text-on-surface-variant pointer-events-none transition-all origin-left text-sm peer-focus:-translate-y-7 peer-focus:scale-[0.82] peer-focus:text-primary peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:scale-[0.82]" htmlFor="email">
                    Corporate Email
                  </label>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors">
                    <Mail size={17} />
                  </div>
                </div>

                {/* Password field */}
                <div className="relative group">
                  <input
                    autoComplete="current-password"
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-[10px] py-4 px-4 pr-12 text-on-surface focus:border-primary/40 focus:outline-none transition-all peer placeholder-transparent text-sm"
                    id="password"
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder=" "
                    required
                    type={showPass ? 'text' : 'password'}
                    value={password}
                  />
                  <label className="absolute left-4 top-4 text-on-surface-variant pointer-events-none transition-all origin-left text-sm peer-focus:-translate-y-7 peer-focus:scale-[0.82] peer-focus:text-primary peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:scale-[0.82]" htmlFor="password">
                    Security Key
                  </label>
                  <button className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors" onClick={() => setShowPass(p => !p)} type="button">
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                {/* Forgot password link */}
                <div className="flex justify-end">
                  <button
                    className="text-[11px] font-semibold text-primary/70 hover:text-primary transition-colors"
                    onClick={() => { setMode('forgot'); setFpEmail(email); setFpError(''); setFpSuccess(''); }}
                    type="button"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  className="w-full bg-primary-container text-on-primary-container font-headline font-bold py-4 rounded-[10px] shadow-[0_0_20px_rgba(0,112,243,0.3)] flex items-center justify-center gap-3 active:scale-95 transition-all duration-200 disabled:opacity-60"
                  disabled={loading}
                  type="submit"
                >
                  {loading
                    ? <><div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> INITIALIZING...</>
                    : 'INITIALIZE ACCESS'
                  }
                </button>
              </form>
            </motion.section>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <motion.section
              key="forgot"
              className="glass-panel w-full p-8 rounded-[16px] border border-outline-variant/10 shadow-[0_24px_48px_rgba(0,0,0,0.8)]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <button className="flex items-center gap-2 text-outline text-xs font-medium mb-6 hover:text-on-surface transition-colors" onClick={() => setMode('login')} type="button">
                <ArrowLeft size={14} /> Back to login
              </button>

              <h2 className="font-headline font-bold text-xl text-white mb-1">Reset Password</h2>
              <p className="text-on-surface-variant text-xs mb-6 leading-5">
                Enter your registered email. We will send an OTP to verify your identity.
              </p>

              <form className="space-y-5" onSubmit={handleForgot}>
                {fpError && (
                  <motion.div
                    className="flex items-center gap-2 px-4 py-3 rounded-[10px] bg-error-container/10 border border-error/30 text-error text-xs font-medium"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Lock size={13} />
                    {fpError}
                  </motion.div>
                )}

                <div className="relative group">
                  <input
                    autoComplete="email"
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-[10px] py-4 px-4 pr-12 text-on-surface focus:border-primary/40 focus:outline-none transition-all peer placeholder-transparent text-sm"
                    onChange={(e) => { setFpEmail(e.target.value); setFpError(''); }}
                    placeholder=" "
                    required
                    type="email"
                    value={fpEmail}
                  />
                  <label className="absolute left-4 top-4 text-on-surface-variant pointer-events-none transition-all origin-left text-sm peer-focus:-translate-y-7 peer-focus:scale-[0.82] peer-focus:text-primary peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:scale-[0.82]">
                    Registered Email
                  </label>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors">
                    <Mail size={17} />
                  </div>
                </div>

                <button
                  className="w-full bg-primary-container text-on-primary-container font-headline font-bold py-4 rounded-[10px] shadow-[0_0_20px_rgba(0,112,243,0.3)] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-60"
                  disabled={fpLoading}
                  type="submit"
                >
                  {fpLoading
                    ? <><div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> SENDING OTP...</>
                    : <><Send size={16} /> SEND OTP</>
                  }
                </button>
              </form>
            </motion.section>
          )}

          {/* OTP VERIFICATION FORM */}
          {mode === 'otp' && (
            <motion.section
              key="otp"
              className="glass-panel w-full p-8 rounded-[16px] border border-outline-variant/10 shadow-[0_24px_48px_rgba(0,0,0,0.8)]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <button className="flex items-center gap-2 text-outline text-xs font-medium mb-6 hover:text-on-surface transition-colors" onClick={() => setMode('forgot')} type="button">
                <ArrowLeft size={14} /> Change email
              </button>

              <h2 className="font-headline font-bold text-xl text-white mb-1">Enter OTP</h2>
              <p className="text-on-surface-variant text-xs mb-1 leading-5">
                OTP sent to <span className="text-primary font-mono">{fpEmail}</span>
              </p>
              <p className="text-on-surface-variant/60 text-[10px] mb-6">Enter the code and set your new password.</p>

              <form className="space-y-4" onSubmit={handleOtpSubmit}>
                {otpError && (
                  <motion.div
                    className="flex items-center gap-2 px-4 py-3 rounded-[10px] bg-error-container/10 border border-error/30 text-error text-xs font-medium"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Lock size={13} />
                    {otpError}
                  </motion.div>
                )}

                {/* OTP input */}
                <div className="relative group">
                  <input
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-[10px] py-4 px-4 text-on-surface focus:border-primary/40 focus:outline-none transition-all peer placeholder-transparent text-sm font-mono tracking-[0.3em] text-center"
                    maxLength={6}
                    onChange={(e) => { setOtp(e.target.value); setOtpError(''); }}
                    placeholder=" "
                    required
                    type="text"
                    value={otp}
                  />
                  <label className="absolute left-4 top-4 text-on-surface-variant pointer-events-none transition-all origin-left text-sm peer-focus:-translate-y-7 peer-focus:scale-[0.82] peer-focus:text-primary peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:scale-[0.82]">
                    OTP Code
                  </label>
                </div>

                {/* New password */}
                <div className="relative group">
                  <input
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-[10px] py-4 px-4 pr-12 text-on-surface focus:border-primary/40 focus:outline-none transition-all peer placeholder-transparent text-sm"
                    onChange={(e) => { setNewPass(e.target.value); setOtpError(''); }}
                    placeholder=" "
                    required
                    type="password"
                    value={newPass}
                  />
                  <label className="absolute left-4 top-4 text-on-surface-variant pointer-events-none transition-all origin-left text-sm peer-focus:-translate-y-7 peer-focus:scale-[0.82] peer-focus:text-primary peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:scale-[0.82]">
                    New Password
                  </label>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant">
                    <Lock size={16} />
                  </div>
                </div>

                <button
                  className="w-full bg-primary-container text-on-primary-container font-headline font-bold py-4 rounded-[10px] shadow-[0_0_20px_rgba(0,112,243,0.3)] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-60"
                  disabled={otpLoading}
                  type="submit"
                >
                  {otpLoading
                    ? <><div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> VERIFYING...</>
                    : 'RESET PASSWORD'
                  }
                </button>
              </form>
            </motion.section>
          )}

        </AnimatePresence>
      </main>

      {/* Bottom credits */}
      <motion.div
        className="relative z-10 mt-12 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <p className="font-mono text-[10px] text-outline/50 tracking-wider leading-5">
          All rights reserved
        </p>
        <p className="font-mono text-[10px] text-outline/40 tracking-wider">
          Built by Umair Ahmad | Muhammad Bilal
        </p>
      </motion.div>
    </motion.div>
  );
}