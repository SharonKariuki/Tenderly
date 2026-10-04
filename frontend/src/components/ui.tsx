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
    ready: <Check size={13} strokeWidth={2.5} aria-hidden />,
    actionNeeded: <Clock size={13} strokeWidth={2.5} aria-hidden />,
    notEligible: <X size={13} strokeWidth={2.5} aria-hidden />,
    missing: <AlertCircle size={13} strokeWidth={2.5} aria-hidden />,
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
  variant?: 'primary' | 'secondary' | 'outlined' | 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', children, ...props }: ButtonProps) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outlined: 'btn-outlined',
    accent: 'btn-accent',
    danger: 'btn-danger',
  };

  const sizes = {
    sm: 'px-4 text-sm',
    md: 'px-5 text-sm',
    lg: 'px-7 text-base',
  };

  return (
    <button
      type={type}
      className={`btn ${variants[variant]} ${sizes[size]} disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
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

// Page wrapper: the main column inside the app shell
export function Page({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 bg-canvas px-4 py-6 sm:px-8 lg:px-10 lg:py-9 focus:outline-none">
      <div className={className}>{children}</div>
    </main>
  );
}

// Page heading with an optional right-hand slot
export function PageHeading({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="h1">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// Section heading with an optional right-hand slot
export function SectionHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="h2">{title}</h2>
      {children}
    </div>
  );
}

// Match Ring
interface MatchRingProps {
  score: number;
  size?: 'sm' | 'lg';
  /** 'dark' when the ring sits on a purple card. */
  tone?: 'light' | 'dark';
}

export function MatchRing({ score, size = 'sm', tone = 'light' }: MatchRingProps) {
  const box = size === 'lg' ? 140 : 56;
  const stroke = size === 'lg' ? 12 : 6;
  const r = (box - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(Math.max(score, 0), 100) / 100);
  const dark = tone === 'dark';
  const color = dark ? '#ffffff' : score >= 80 ? 'var(--color-brand-600)' : score >= 50 ? 'var(--color-accent-500)' : 'var(--color-brand-300)';
  const track = dark ? 'rgb(255 255 255 / 0.25)' : 'var(--color-brand-50)';

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
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
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className={`${size === 'lg' ? 'text-3xl' : 'text-sm'} font-semibold tabular-nums ${dark ? 'text-white' : 'text-ink'}`}>
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
  label?: string;
}

export function ProgressBar({ value, max = 100, tone = 'light', label }: ProgressBarProps) {
  const percentage = max ? Math.min((value / max) * 100, 100) : 0;
  const dark = tone === 'dark';
  return (
    <div
      className={`h-2 overflow-hidden rounded-full ${dark ? 'bg-white/25' : 'bg-brand-50'}`}
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${dark ? 'bg-white' : 'bg-linear-to-r from-brand-600 to-accent-500'}`}
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
}

export function CountdownRing({ daysRemaining, window = 30 }: CountdownRingProps) {
  const r = 34;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(Math.max(daysRemaining, 0), window) / window);

  return (
    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center" role="img" aria-label={`${daysRemaining} days left`}>
      <svg className="absolute inset-0 -rotate-90" width="80" height="80" viewBox="0 0 80 80" aria-hidden>
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-accent-100)" strokeWidth="7" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-accent-500)" strokeWidth="7" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="text-center leading-tight">
        <div className="text-xl font-semibold text-ink tabular-nums">{daysRemaining}</div>
        <div className="text-xs text-ink-soft">days left</div>
      </div>
    </div>
  );
}

// Filter buttons used on Tenders, Documents and Map
export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-white p-1 shadow-card" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-11 rounded-xl px-4 text-sm font-medium transition ${
            value === o.id ? 'bg-brand-600 text-white shadow-brand' : 'text-ink-soft hover:bg-brand-50 hover:text-brand-700'
          }`}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 opacity-75 tabular-nums">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

// A short message shown after an action, read out by screen readers.
export function Notice({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'ok' | 'warn' }) {
  const styles = { info: 'bg-brand-50 text-ink', ok: 'bg-ok-50 text-ok-700', warn: 'bg-danger-50 text-danger-600' };
  return (
    <p className={`rounded-tile p-4 text-sm ${styles[tone]}`} role="status">
      {children}
    </p>
  );
}
