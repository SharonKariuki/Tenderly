// Dates are shown the Kenyan way: 20 Oct 2026.
const DATE = new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
const SHORT = new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short' });
const TIME = new Intl.DateTimeFormat('en-KE', { hour: 'numeric', minute: '2-digit' });

export const formatDate = (iso: string) => DATE.format(new Date(iso));
export const formatShortDate = (iso: string | Date) => SHORT.format(new Date(iso));
export const formatTime = (iso: string) => TIME.format(new Date(iso));

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from now until the date; negative once it has passed. */
export function daysUntil(iso: string, now = new Date()): number {
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY_MS);
}

/** Monday of the week to show: this week, or next week on a Sunday. */
export function weekStart(now = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? 1 : 1 - day));
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
