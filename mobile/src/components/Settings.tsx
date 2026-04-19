import { motion } from 'motion/react';
import { ShieldCheck, Lock, ChevronRight, LogOut } from 'lucide-react';
import { Screen } from '../types';
import { BottomNav } from './Dashboard';
import { useAuth } from '../context/AuthContext';

interface SettingsProps {
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}

const LogoMark = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#0070f3" />
    <path d="M16 4L8 28l1 1 7-3 7 3 1-1L16 4Z" fill="white" opacity="0.95" />
    <rect x="10" y="14" width="12" height="1.5" rx="0.75" fill="white" opacity="0.5" />
  </svg>
);

export default function Settings({ onNavigate, onLogout }: SettingsProps) {
  const { user, logout } = useAuth();

  const handleLogout = () => { logout(); onLogout(); };

  const roleConfig: Record<string, { label: string; color: string }> = {
    admin:   { label: 'Admin',   color: 'text-error'   },
    manager: { label: 'Manager', color: 'text-tertiary' },
    viewer:  { label: 'Viewer',  color: 'text-primary'  },
  };
  const role = roleConfig[user?.role || 'viewer'];
  const username = user?.email?.split('@')[0] || 'User';
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <motion.div
      className="bg-background text-on-surface min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header — no bell */}
      <header className="bg-surface flex items-center px-6 py-4 w-full fixed top-0 z-50">
        <div className="flex items-center gap-3">
          <LogoMark />
          <h1 className="text-xl font-extrabold tracking-tighter text-white font-headline">
            AutoBiz AI
          </h1>
        </div>
      </header>

      <main className="pt-24 pb-36 px-6 max-w-lg mx-auto">

        {/* Profile avatar */}
        <section className="mb-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-28 h-28 rounded-[1.5rem] bg-primary-container/15 border-2 border-primary/20 flex items-center justify-center">
              <span className="font-headline font-extrabold text-4xl text-primary tracking-tighter">
                {initials}
              </span>
            </div>
            <div>
              <h2 className="font-headline text-3xl font-bold tracking-tight text-white mb-1 capitalize">
                {username}
              </h2>
              <p className="text-on-surface-variant tracking-wide opacity-80 text-sm">
                {user?.email}
              </p>
              <div className="inline-flex items-center mt-3 px-3 py-1 bg-surface-container-high rounded-full border border-outline-variant/10">
                <ShieldCheck size={13} className="text-secondary mr-2" />
                <span className={`font-mono text-[10px] uppercase tracking-widest ${role.color}`}>
                  Role: {role.label}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Account */}
        <section className="space-y-3 mb-8">
          <h3 className="font-headline text-xs font-bold uppercase tracking-[0.2em] text-outline mb-4">Account</h3>
          <div className="bg-surface-container-low p-5 rounded-[16px] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="font-semibold text-on-surface text-sm">Email</p>
                <p className="text-xs text-on-surface-variant/80 font-mono">{user?.email}</p>
              </div>
            </div>
          </div>
          <div className="bg-surface-container-low p-5 rounded-[16px] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="font-semibold text-on-surface text-sm">Role</p>
                <p className={`text-xs font-mono font-bold ${role.color}`}>{role.label}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="space-y-3 mb-8">
          <h3 className="font-headline text-xs font-bold uppercase tracking-[0.2em] text-outline mb-4">Security</h3>
          <div className="bg-surface-container-low p-5 rounded-[16px] flex items-center justify-between cursor-pointer hover:bg-surface-container transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
                <Lock size={18} />
              </div>
              <p className="font-semibold text-on-surface text-sm">Change Password</p>
            </div>
            <ChevronRight size={18} className="text-on-surface-variant/40" />
          </div>
        </section>

        {/* Navigation shortcuts */}
        <section className="space-y-3 mb-8">
          <h3 className="font-headline text-xs font-bold uppercase tracking-[0.2em] text-outline mb-4">Navigate</h3>
          {[
            { label: 'Dashboard',       screen: Screen.Dashboard      },
            { label: 'AI Chat',         screen: Screen.AIChat         },
            { label: 'Inventory',       screen: Screen.Inventory      },
            { label: 'Sales',           screen: Screen.SalesRecords   },
            { label: 'Purchase Orders', screen: Screen.PurchaseOrders },
          ].map(({ label, screen }) => (
            <button
              key={screen}
              className="w-full bg-surface-container-low p-4 rounded-[14px] flex items-center justify-between hover:bg-surface-container transition-colors"
              onClick={() => onNavigate(screen)}
            >
              <span className="font-semibold text-on-surface text-sm">{label}</span>
              <ChevronRight size={16} className="text-on-surface-variant/40" />
            </button>
          ))}
        </section>

        {/* Sign out */}
        <section>
          <button
            className="w-full py-4 px-6 rounded-[16px] bg-error-container/10 border border-error-container/20 flex items-center justify-center gap-3 active:scale-95 transition-transform"
            onClick={handleLogout}
          >
            <LogOut size={18} className="text-error" />
            <span className="font-headline font-bold text-error tracking-wide">Sign Out</span>
          </button>
        </section>

        {/* Credits */}
        <div className="mt-12 text-center space-y-1">
          <p className="font-mono text-[10px] text-outline/50 tracking-wider">All rights reserved</p>
          <p className="font-mono text-[10px] text-outline/40 tracking-wider">
            Built by Umair Ahmad | Muhammad Bilal
          </p>
        </div>
      </main>

      <BottomNav activeScreen={Screen.Settings} onNavigate={onNavigate} />
    </motion.div>
  );
}