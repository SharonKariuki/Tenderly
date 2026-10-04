import React from 'react';
import { Check, Clock, X, AlertCircle } from 'lucide-react';

// Status Chips
export function StatusChip({ status }: { status: 'ready' | 'actionNeeded' | 'notEligible' | 'missing' | 'optional' }) {
  const styles = {
    ready: 'chip chip-ok',
    actionNeeded: 'chip chip-warn',
    notEligible: 'chip chip-not-eligible',
    missing: 'chip chip-missing',
    optional: 'chip chip-optional',
  };

  const icons = {
    ready: <Check size={14} />,
    actionNeeded: <Clock size={14} />,
    notEligible: <X size={14} />,
    missing: <AlertCircle size={14} />,
    optional: null,
  };

  const labels = {
    ready: 'Ready',
    actionNeeded: 'Action needed',
    notEligible: 'Not eligible',
    missing: 'Missing',
    optional: 'Optional',
  };

  return (
    <span className={styles[status]}>
      {icons[status]}
      {labels[status]}
    </span>
  );
}

// Buttons
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outlined' | 'coral';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outlined: 'btn-outlined',
    coral: 'btn-coral',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={`btn ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Card
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hero?: boolean;
  scam?: boolean;
}

export function Card({ children, className = '', hero = false, scam = false }: CardProps) {
  const styles = scam ? 'card-scam' : hero ? 'card-hero' : 'card';
  return <div className={`${styles} ${className}`}>{children}</div>;
}

// Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = '', ...props }: InputProps) {
  return <input className={`input ${className}`} {...props} />;
}

// Match Ring
interface MatchRingProps {
  score: number;
  size?: 'sm' | 'lg';
  /** 'dark' when the ring sits on a plum card. */
  tone?: 'light' | 'dark';
}

export function MatchRing({ score, size = 'sm', tone = 'light' }: MatchRingProps) {
  const box = size === 'lg' ? 144 : 64;
  const stroke = size === 'lg' ? 12 : 6;
  const r = (box - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(Math.max(score, 0), 100) / 100);
  const color = score >= 80 ? '#2F8F6B' : score >= 50 ? '#E3A12F' : '#7A6670';
  const track = tone === 'dark' ? 'rgba(255, 250, 249, 0.2)' : 'rgba(91, 26, 51, 0.1)';

  return (
    <div
      className="relative flex flex-shrink-0 items-center justify-center"
      style={{ width: box, height: box }}
      role="img"
      aria-label={`${score}% match`}
    >
      <svg className="absolute inset-0 -rotate-90" width={box} height={box} viewBox={`0 0 ${box} ${box}`} aria-hidden>
        <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={box / 2}
          cy={box / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span
        className={`${size === 'lg' ? 'text-3xl' : 'text-sm'} font-semibold tabular-nums ${
          tone === 'dark' ? 'text-white' : 'text-plum-ink'
        }`}
      >
        {score}%
      </span>
    </div>
  );
}

// Progress Bar
interface ProgressBarProps {
  value: number;
  max?: number;
  tone?: 'light' | 'dark';
}

export function ProgressBar({ value, max = 100, tone = 'light' }: ProgressBarProps) {
  const percentage = max ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div
      className={`h-2 overflow-hidden rounded-full ${tone === 'dark' ? 'bg-white/20' : 'bg-plum/10'}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${tone === 'dark' ? 'bg-white' : 'bg-plum'}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

// Countdown Ring
interface CountdownRingProps {
  daysRemaining: number;
  /** Days the full ring stands for. */
  window?: number;
  tone?: 'light' | 'dark';
}

export function CountdownRing({ daysRemaining, window = 30, tone = 'light' }: CountdownRingProps) {
  const box = 112;
  const stroke = 10;
  const r = (box - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(Math.max(daysRemaining, 0), window) / window);
  const track = tone === 'dark' ? 'rgba(255, 250, 249, 0.2)' : 'rgba(91, 26, 51, 0.1)';

  return (
    <div
      className="relative flex flex-shrink-0 flex-col items-center justify-center"
      style={{ width: box, height: box }}
      role="img"
      aria-label={`${daysRemaining} days left`}
    >
      <svg className="absolute inset-0 -rotate-90" width={box} height={box} viewBox={`0 0 ${box} ${box}`} aria-hidden>
        <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={box / 2}
          cy={box / 2}
          r={r}
          fill="none"
          stroke="#E5484D"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className={`text-3xl font-semibold leading-none tabular-nums ${tone === 'dark' ? 'text-white' : 'text-coral'}`}>
        {daysRemaining}
      </span>
      <span className={`mt-1 text-xs ${tone === 'dark' ? 'text-white/80' : 'text-plum-muted'}`}>days left</span>
    </div>
  );
}

// Pill
interface PillProps {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  outlined?: boolean;
}

export function Pill({ children, className = '', active = false, outlined = false }: PillProps) {
  const baseClass = 'rounded-pill px-4 py-2 transition-all';
  const activeClass = active ? 'bg-plum text-white' : 'bg-white/65 text-plum-ink';
  const outlinedClass = outlined ? 'border-2 border-plum' : '';
  return <span className={`${baseClass} ${activeClass} ${outlinedClass} ${className}`}>{children}</span>;
}

// Help Text
export function HelpText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-xs text-plum-muted ${className}`}>{children}</p>;
}

// Badge
export function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center px-3 py-1 rounded-pill border border-coral/30 bg-blush text-plum-ink text-xs font-bold animate-pop ${className}`}>{children}</span>;
}
