import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, ShieldCheck, FolderOpen, Compass, Plus, X } from 'lucide-react';
import { AccessibilitySettings } from './access/AccessibilitySettings';
import { ActingForChip } from './access/ActingForChip';
import { useApp } from '../context/AppState';
import { agpoCategories } from '../config/agpo';
import type { AgpoCategory } from '../lib/types';

const navItems = [
  { path: '/', label: 'Today', icon: LayoutDashboard },
  { path: '/tenders', label: 'Tenders', icon: FileText },
  { path: '/check', label: 'Check a tender', icon: ShieldCheck },
  { path: '/documents', label: 'Documents', icon: FolderOpen },
  { path: '/map', label: 'Map', icon: Compass },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg" aria-label="TenderReady home">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <path d="M16 5a10 10 0 1 0 0 20" fill="none" stroke="var(--color-brand-600)" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M19 11a5 5 0 0 1 0 8" fill="none" stroke="var(--color-accent-500)" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      <span className="text-xl font-semibold tracking-tight text-ink">
        <span className="text-brand-600">T</span>enderready
      </span>
    </Link>
  );
}

export function initialsOf(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Your name, business group and accessibility settings, opened from your avatar. */
export function SettingsMenu({ placement }: { placement: 'below' | 'above' }) {
  const { profile, updateProfile } = useApp();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const headingId = useId();
  const groupId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('select, input, button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Your profile and accessibility settings"
        className={
          placement === 'below'
            ? 'flex h-11 w-11 items-center justify-center rounded-full bg-accent-500 text-sm font-semibold text-white ring-4 ring-brand-100'
            : 'flex w-full min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-brand-50'
        }
      >
        {placement === 'below' ? (
          initialsOf(profile.ownerName)
        ) : (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-500 text-xs font-semibold text-white">
              {initialsOf(profile.ownerName)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{profile.ownerName}</span>
              <span className="block text-xs text-ink-soft">Profile and accessibility</span>
            </span>
          </>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-labelledby={headingId}
          className={`card absolute z-50 w-[min(22rem,calc(100vw-2rem))] p-5 ${
            placement === 'below' ? 'right-0 top-14' : 'bottom-full left-0 mb-2'
          }`}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p id={headingId} className="font-semibold text-ink">
                {profile.ownerName}
              </p>
              <p className="text-sm text-ink-soft">{profile.businessName}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
              aria-label="Close"
              className="-m-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-brand-50"
            >
              <X size={18} aria-hidden />
            </button>
          </div>

          <label htmlFor={groupId} className="mb-1 block text-sm font-semibold text-ink">
            Your business is owned by
          </label>
          <select
            id={groupId}
            value={profile.agpoCategory}
            onChange={(e) => updateProfile({ agpoCategory: e.target.value as AgpoCategory })}
            className="input mb-1"
          >
            {agpoCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id === 'none' ? 'None of these groups' : c.label}
              </option>
            ))}
          </select>
          <p className="mb-5 text-xs text-ink-soft">
            Some tenders are kept for women, youth and people with disabilities. This shows you the ones you can bid
            for.
          </p>

          <h2 className="mb-3 text-sm font-semibold text-ink">Accessibility</h2>
          <AccessibilitySettings />
        </div>
      )}
    </div>
  );
}

// Left sidebar on desktop, top bar with a scrolling nav row on smaller screens
export function Header() {
  return (
    <aside className="flex shrink-0 flex-col border-b border-line bg-white lg:w-64 lg:border-b-0 lg:border-r lg:px-5 lg:py-8">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5 lg:px-3 lg:pt-0">
        <Logo />
        <div className="flex items-center gap-2 lg:hidden">
          <ActingForChip />
          <SettingsMenu placement="below" />
        </div>
      </div>

      <nav
        aria-label="Main"
        className="mt-3 flex flex-wrap gap-1 px-4 pb-3 sm:px-5 lg:mt-12 lg:flex-col lg:flex-nowrap lg:gap-2 lg:px-0 lg:pb-0"
      >
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-medium transition lg:gap-3 lg:px-4 ${
                isActive ? 'bg-brand-600 text-white shadow-brand' : 'text-ink-soft hover:bg-brand-50 hover:text-brand-700'
              }`
            }
          >
            <Icon size={19} strokeWidth={1.8} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto hidden space-y-3 lg:block">
        <div className="hidden lg:block">
          <ActingForChip />
        </div>
        <SettingsMenu placement="above" />
        <Link
          to="/check"
          className="flex items-center justify-between gap-3 rounded-2xl bg-brand-50 p-4 text-sm font-semibold leading-snug text-ink transition hover:bg-brand-100"
        >
          Check a new
          <br />
          tender
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white shadow-brand" aria-hidden>
            <Plus size={18} />
          </span>
        </Link>
      </div>
    </aside>
  );
}
