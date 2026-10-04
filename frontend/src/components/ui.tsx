import React from 'react';
import { Check, Clock, X, AlertCircle, Zap } from 'lucide-react';

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
}

export function MatchRing({ score, size = 'sm' }: MatchRingProps) {
  const sizeClass = size === 'lg' ? 'w-[180px] h-[180px]' : 'w-[56px] h-[56px]';
  const fontSize = size === 'lg' ? 'text-4xl' : 'text-lg';
  const radius = size === 'lg' ? 90 : 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color = score >= 80 ? '#2F8F6B' : score >= 50 ? '#E3A12F' : '#7FA58F';
  const bgColor = '#FBE4E6';

  return (
    <div className={`${sizeClass} relative flex items-center justify-center bg-gradient-to-br ${score >= 80 ? 'from-ok-bg/30 to-ok-bg/10' : score >= 50 ? 'from-warn-bg/30 to-warn-bg/10' : 'from-lilac-light/30 to-lilac-light/10'} rounded-full`}>
      <svg className="absolute transform -rotate-90" width="100%" height="100%" viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
        <circle cx={radius} cy={radius} r={radius - 6} fill="none" stroke={bgColor} strokeWidth="7" />
        <circle
          cx={radius}
          cy={radius}
          r={radius - 6}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className={`${fontSize} font-semibold text-plum-ink text-center`}>{score}%</div>
    </div>
  );
}

// Progress Bar
interface ProgressBarProps {
  value: number;
  max?: number;
}

export function ProgressBar({ value, max = 100 }: ProgressBarProps) {
  const percentage = (value / max) * 100;
  return (
    <div className="progress-track rounded-full bg-blush h-2">
      <div
        className="h-full bg-gradient-to-r from-plum to-coral rounded-full transition-all duration-500"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

// Countdown Ring
interface CountdownRingProps {
  daysRemaining: number;
  deadline: string;
}

export function CountdownRing({ daysRemaining, deadline }: CountdownRingProps) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (daysRemaining / 30) * circumference;

  return (
    <div className="w-[180px] h-[180px] relative flex flex-col items-center justify-center">
      <svg className="absolute" width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r="84" fill="none" stroke="#5B1A33" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        <circle cx="90" cy="90" r="84" fill="none" stroke="#E5484D" strokeWidth="12" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="text-center">
        <div className="text-4xl font-light text-coral">{daysRemaining}</div>
        <div className="text-xs text-plum-muted">days left</div>
      </div>
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
