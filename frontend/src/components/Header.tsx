import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { AccessibilitySettings } from './access/AccessibilitySettings';
import { ActingForChip } from './access/ActingForChip';
import { useApp } from '../context/AppState';

interface HeaderProps {
  onMenuClick: () => void;
  menuOpen?: boolean;
}

export function Header({ onMenuClick, menuOpen = false }: HeaderProps) {
  const { profile } = useApp();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const headingId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const initials = profile.ownerName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('input, button, a')?.focus();
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
    <header className="sticky top-0 z-40 bg-white/40 backdrop-blur-md border-b border-white/30 transition-all duration-300">
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        {/* Menu button for mobile */}
        <button
          onClick={onMenuClick}
          aria-label="Open navigation"
          aria-expanded={menuOpen}
          className="focus-ring lg:hidden w-10 h-10 rounded-lg bg-white/60 hover:bg-white/80 flex items-center justify-center text-plum transition-all"
        >
          <Menu size={20} aria-hidden />
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        <ActingForChip />

        {/* Avatar: account and accessibility settings */}
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label="Account and accessibility settings"
            className="focus-ring w-11 h-11 rounded-full bg-plum border-2 border-coral/40 shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-300"
          >
            <span className="text-white font-bold text-sm" aria-hidden>
              {initials}
            </span>
          </button>

          {open && (
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-labelledby={headingId}
              className="card absolute right-0 top-14 z-50 w-[min(22rem,calc(100vw-2rem))] p-6 hover:transform-none"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-plum-ink">{profile.ownerName}</p>
                  <p className="text-sm text-plum-muted">{profile.businessName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    buttonRef.current?.focus();
                  }}
                  aria-label="Close settings"
                  className="focus-ring flex h-11 w-11 items-center justify-center rounded-full text-plum hover:bg-gray-100"
                >
                  <X size={18} aria-hidden />
                </button>
              </div>
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="focus-ring mb-5 flex min-h-[44px] items-center rounded-tile bg-gray-100 px-4 text-sm font-semibold text-plum hover:bg-gray-200"
              >
                Business profile
              </Link>
              <h2 id={headingId} className="mb-3 text-base font-bold text-plum-ink">
                Accessibility
              </h2>
              <AccessibilitySettings />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
