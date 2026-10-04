// Types of work shown on the Map, with illustrative closing days for their open tenders.

export type Window = 'week' | 'month' | 'quarter' | 'all';

export const WINDOWS: { id: Window; label: string; maxDays: number }[] = [
  { id: 'week', label: 'This week', maxDays: 7 },
  { id: 'month', label: 'This month', maxDays: 30 },
  { id: 'quarter', label: 'This quarter', maxDays: 90 },
  { id: 'all', label: 'All open', maxDays: Infinity },
];

export const SECTORS = [
  { id: 'it', name: 'IT & Tech', match: 94, tenders: 12 },
  { id: 'construction', name: 'Construction', match: 65, tenders: 8 },
  { id: 'health', name: 'Healthcare', match: 55, tenders: 6 },
  { id: 'education', name: 'Education', match: 78, tenders: 14 },
  { id: 'cleaning', name: 'Cleaning', match: 88, tenders: 11 },
  { id: 'energy', name: 'Energy', match: 45, tenders: 5 },
  { id: 'agriculture', name: 'Agriculture', match: 62, tenders: 9 },
  { id: 'transport', name: 'Transport', match: 72, tenders: 10 },
].map((sector, i) => ({
  ...sector,
  // Illustrative closing days for each open tender in the sector, nearest first.
  closingDays: Array.from({ length: sector.tenders }, (_, k) => 2 + ((i * 7 + k * 11) % 85)).sort((a, b) => a - b),
}));

export const hubColor = (match: number) => (match >= 80 ? 'var(--color-brand-600)' : match >= 60 ? 'var(--color-brand-400)' : 'var(--color-muted)');
