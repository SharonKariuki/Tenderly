import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Bell, CalendarDays, ClipboardCheck, Compass, FileText, FolderOpen, LayoutDashboard, Menu, MessageCircleQuestion, Plus,
  ShieldCheck, X,
} from 'lucide-react';
import { ActingForChip } from './access/ActingForChip';
import { useApp } from '../context/AppState';

const sections = [
  {
    title: 'Find and check',
    items: [
      { path: '/', label: 'Today', icon: LayoutDashboard },
      { path: '/tenders', label: 'Tenders', icon: FileText },
      { path: '/check', label: 'Check a tender', icon: ShieldCheck },
      { path: '/map', label: 'Map', icon: Compass },
    ],
  },
  {
    title: 'Your work',
    items: [
      { path: '/bids', label: 'My bids', icon: ClipboardCheck },
      { path: '/documents', label: 'Documents', icon: FolderOpen },
      { path: '/meetings', label: 'Meetings and visits', icon: CalendarDays },
      { path: '/alerts', label: 'Alerts', icon: Bell },
      { path: '/ask', label: 'Ask a question', icon: MessageCircleQuestion },
    ],
  },
];

export function initialsOf(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

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

function NavLinks() {
  const { alerts } = useApp();
  const unread = alerts.filter((a) => !a.isRead).length;
  return (
    <>
      {sections.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">{section.title}</p>
          <ul className="space-y-1">
            {section.items.map(({ path, label, icon: Icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={path === '/'}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium transition ${
                      isActive ? 'bg-brand-600 text-white shadow-brand' : 'text-ink-soft hover:bg-brand-50 hover:text-brand-700'
                    }`
                  }
                >
                  <Icon size={19} strokeWidth={1.8} aria-hidden />
                  <span className="flex-1">{label}</span>
                  {path === '/alerts' && unread > 0 && (
                    <span className="rounded-full bg-accent-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {unread}
                      <span className="sr-only"> unread</span>
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

function ProfileLink() {
  const { profile } = useApp();
  return (
    <NavLink
      to="/profile"
      className={({ isActive }) =>
        `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 ${isActive ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-brand-50'}`
      }
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-500 text-xs font-semibold text-white" aria-hidden>
        {initialsOf(profile.ownerName)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">{profile.ownerName}</span>
        <span className="block text-xs text-ink-soft">Profile and settings</span>
      </span>
    </NavLink>
  );
}

// Left sidebar on desktop; on phones a top bar with a menu button that opens the same links.
export function Header() {
  const { profile } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  // Close the phone menu when a link is followed.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    drawer.current?.querySelector<HTMLElement>('a, button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <>
      {/* Phone top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-3 lg:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <Link
            to="/profile"
            aria-label="Profile and settings"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-500 text-sm font-semibold text-white ring-4 ring-brand-100"
          >
            {initialsOf(profile.ownerName)}
          </Link>
          <button
            ref={menuButton}
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="phone-menu"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:bg-brand-50"
          >
            <Menu size={22} aria-hidden />
          </button>
        </div>
      </header>

      {/* Phone menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMenuOpen(false)} aria-hidden />
          <div
            ref={drawer}
            id="phone-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col gap-6 overflow-y-auto bg-white p-5 shadow-shell"
          >
            <div className="flex items-center justify-between">
              <Logo />
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  menuButton.current?.focus();
                }}
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:bg-brand-50"
              >
                <X size={22} aria-hidden />
              </button>
            </div>
            <nav aria-label="Main" className="space-y-6">
              <NavLinks />
            </nav>
            <div className="mt-auto space-y-3">
              <ActingForChip />
              <ProfileLink />
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-white px-5 py-8 lg:flex">
        <div className="px-3">
          <Logo />
        </div>
        <nav aria-label="Main" className="mt-10 space-y-6">
          <NavLinks />
        </nav>
        <div className="mt-auto space-y-3 pt-8">
          <ActingForChip />
          <ProfileLink />
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
    </>
  );
}

