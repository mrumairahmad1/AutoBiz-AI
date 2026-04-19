import { motion } from 'motion/react';

interface SplashScreenProps {
  onNext: () => void;
}

const LogoMark = ({ size = 48 }: { size?: number }) => (
  <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#0070f3" />
      <path d="M16 4L8 28l1 1 7-3 7 3 1-1L16 4Z" fill="white" opacity="0.95" />
      <rect x="10" y="14" width="12" height="1.5" rx="0.75" fill="white" opacity="0.5" />
    </svg>
  </div>
);

const CREDITS = 'All rights reserved · Built by Umair Ahmad | Muhammad Bilal';

export default function SplashScreen({ onNext }: SplashScreenProps) {
  return (
    <motion.div
      className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4 }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 kinetic-gradient pointer-events-none" />
      <div className="fixed -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="fixed -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center px-8">

        {/* Logo */}
        <motion.div
          className="mb-8 relative"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
        >
          <div className="relative">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 border-[1px] border-primary/15 rounded-full scale-[2.2] animate-[spin_18s_linear_infinite]" />
            {/* Middle pulse ring */}
            <div className="absolute inset-0 border-[1.5px] border-primary/20 rounded-full scale-[1.6] animate-[pulse_3s_ease-in-out_infinite]" />
            {/* Green accent dot */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full shadow-[0_0_8px_rgba(65,226,121,0.8)]" />
            <LogoMark size={72} />
          </div>
        </motion.div>

        {/* Brand name */}
        <motion.div
          className="text-center mb-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        >
          <h1 className="font-headline font-extrabold text-6xl tracking-tighter text-white leading-none">
            AutoBiz
          </h1>
          <h1 className="font-headline font-extrabold text-6xl tracking-tighter leading-none" style={{ color: '#0070f3' }}>
            AI
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          className="font-mono text-xs tracking-[0.35em] text-outline uppercase mb-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          Business. Automated.
        </motion.p>

        {/* Get Started button */}
        <motion.button
          className="relative w-full max-w-xs py-4 rounded-[14px] font-headline font-bold text-base tracking-wide text-white overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0070f3 0%, #005cc5 100%)',
            boxShadow: '0 0 32px rgba(0,112,243,0.45), 0 8px 24px rgba(0,0,0,0.4)',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.65 }}
          whileTap={{ scale: 0.97 }}
          onClick={onNext}
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            Get Started
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
          {/* Shimmer */}
          <motion.div
            className="absolute inset-0 bg-white/10"
            initial={{ x: '-100%', skewX: -15 }}
            animate={{ x: '200%', skewX: -15 }}
            transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
          />
        </motion.button>
      </div>

      {/* Bottom credits */}
      <motion.div
        className="absolute bottom-8 left-0 w-full px-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
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