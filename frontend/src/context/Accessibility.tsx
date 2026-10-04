import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { accessApi } from '../api/client';
import { readStored, writeStored } from '../lib/storage';

export type TextSize = 'standard' | 'large' | 'larger';

export interface AccessibilityPrefs {
  text_size: TextSize;
  high_contrast: boolean;
  reduce_motion: boolean;
  dyslexia_spacing: boolean;
  prompt_seen: boolean;
}

const DEFAULTS: AccessibilityPrefs = {
  text_size: 'standard',
  high_contrast: false,
  reduce_motion: false,
  dyslexia_spacing: false,
  prompt_seen: false,
};
const PREFS_KEY = 'tr_a11y';

interface AccessibilityContextType {
  prefs: AccessibilityPrefs;
  updatePrefs: (changes: Partial<AccessibilityPrefs>) => void;
  /** Read a short message out to screen readers. */
  announce: (message: string, urgent?: boolean) => void;
  /** True when the user, or their system, asks for less motion. */
  motionReduced: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

function systemPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(() => readStored(PREFS_KEY, DEFAULTS));
  const [politeMessage, setPoliteMessage] = useState('');
  const [urgentMessage, setUrgentMessage] = useState('');
  const clearTimer = useRef<number | undefined>(undefined);
  const motionReduced = prefs.reduce_motion || systemPrefersReducedMotion();

  // Saved settings on the business profile win over this browser's copy.
  useEffect(() => {
    accessApi
      .getPrefs()
      .then(({ data }) => {
        const saved = { ...DEFAULTS, ...data };
        setPrefs(saved);
        writeStored(PREFS_KEY, saved);
      })
      .catch(() => {
        // Not signed in or offline: keep this browser's settings.
      });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.textSize = prefs.text_size;
    root.dataset.contrast = prefs.high_contrast ? 'high' : 'standard';
    root.dataset.motion = prefs.reduce_motion ? 'reduce' : 'standard';
    root.dataset.dyslexia = prefs.dyslexia_spacing ? 'on' : 'off';
  }, [prefs]);

  const updatePrefs = useCallback((changes: Partial<AccessibilityPrefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...changes };
      writeStored(PREFS_KEY, next);
      return next;
    });
    accessApi.savePrefs(changes).catch(() => {
      // Kept in this browser; saved to the profile next time the API is reachable.
    });
  }, []);

  const announce = useCallback((message: string, urgent = false) => {
    const set = urgent ? setUrgentMessage : setPoliteMessage;
    // Clearing first makes screen readers repeat a message that has not changed.
    set('');
    window.setTimeout(() => set(message), 50);
    window.clearTimeout(clearTimer.current);
    clearTimer.current = window.setTimeout(() => {
      setPoliteMessage('');
      setUrgentMessage('');
    }, 6000);
  }, []);

  return (
    <AccessibilityContext.Provider value={{ prefs, updatePrefs, announce, motionReduced }}>
      {children}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {politeMessage}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {urgentMessage}
      </div>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return context;
}
