import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Page, PageHeading, FilterTabs } from '../components/ui';
import { Toggle } from '../components/access/Toggle';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

type Window = 'week' | 'month' | 'quarter' | 'all';

const WINDOWS: { id: Window; label: string; maxDays: number }[] = [
  { id: 'week', label: 'This week', maxDays: 7 },
  { id: 'month', label: 'This month', maxDays: 30 },
  { id: 'quarter', label: 'This quarter', maxDays: 90 },
  { id: 'all', label: 'All open', maxDays: Infinity },
];

const SECTORS = [
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

const hubColor = (match: number) => (match >= 80 ? 'var(--color-brand-600)' : match >= 60 ? 'var(--color-brand-400)' : 'var(--color-muted)');

// Map geometry, in viewBox units.
const W = 800;
const H = 640;
const CX = W / 2;
const CY = H / 2;
const RING = 220;

export function Map() {
  const navigate = useNavigate();
  const [windowId, setWindowId] = useState<Window>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showHubs, setShowHubs] = useState(true);
  const [showTenders, setShowTenders] = useState(true);
  const [showDays, setShowDays] = useState(true);

  const maxDays = WINDOWS.find((w) => w.id === windowId)!.maxDays;
  const inWindow = (days: number[]) => days.filter((d) => d <= maxDays);
  const countFor = (w: (typeof WINDOWS)[number]) =>
    SECTORS.reduce((n, s) => n + s.closingDays.filter((d) => d <= w.maxDays).length, 0);
  const selected = SECTORS.find((s) => s.id === selectedId) ?? null;
  const toggleSector = (id: string) => setSelectedId((current) => (current === id ? null : id));

  return (
    <Page>
      <PageHeading title="Map" subtitle="Where your open tenders are, by type of work and by how soon they close." />

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <FilterTabs
          label="Closing within"
          value={windowId}
          onChange={setWindowId}
          options={WINDOWS.map((w) => ({ id: w.id, label: w.label, count: countFor(w) }))}
        />
        <div className="flex gap-2">
          <Button variant="outlined" size="sm" aria-label="Zoom in" disabled={zoom >= 1.6} onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.2).toFixed(1)))}>
            <ZoomIn size={18} aria-hidden />
          </Button>
          <Button variant="outlined" size="sm" aria-label="Zoom out" disabled={zoom <= 0.8} onClick={() => setZoom((z) => Math.max(0.8, +(z - 0.2).toFixed(1)))}>
            <ZoomOut size={18} aria-hidden />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_20rem] gap-4">
        {/* Map */}
        <div className="card overflow-hidden bg-linear-to-br from-white via-brand-50/60 to-accent-50">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="block w-full h-auto"
            role="group"
            aria-label="Map of your tenders. Each circle is a type of work; the dots are its open tenders."
          >
            <g transform={`translate(${CX} ${CY}) scale(${zoom}) translate(${-CX} ${-CY})`}>
              <circle cx={CX} cy={CY} r={RING} fill="none" stroke="var(--color-brand-200)" strokeDasharray="6 8" />
              {SECTORS.map((sector, i) => {
                const angle = (i / SECTORS.length) * Math.PI * 2 - Math.PI / 2;
                const x = CX + Math.cos(angle) * RING;
                const y = CY + Math.sin(angle) * RING;
                const dots = inWindow(sector.closingDays).slice(0, 5);
                const active = selectedId === sector.id;
                // Dots fan outwards; the name sits on the inner side so the two never meet.
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const anchor = cos > 0.3 ? 'end' : cos < -0.3 ? 'start' : 'middle';
                const nameGap = anchor === 'middle' ? 66 : 52;
                const nameX = x - cos * nameGap;
                const nameY = y - sin * nameGap + 6;
                return (
                  <g key={sector.id}>
                    <line x1={CX} y1={CY} x2={x} y2={y} stroke="var(--color-brand-300)" strokeWidth="2" strokeDasharray="8 6" pointerEvents="none" />
                    {showTenders &&
                      dots.map((days, k) => {
                        const a = angle + (k - (dots.length - 1) / 2) * 0.32;
                        const dx = x + Math.cos(a) * 88;
                        const dy = y + Math.sin(a) * 88;
                        return (
                          <g key={k}>
                            <circle cx={dx} cy={dy} r="13" fill={days <= 7 ? 'var(--color-danger-500)' : days <= 30 ? 'var(--color-accent-500)' : 'var(--color-brand-500)'} />
                            {showDays && (
                              <text x={dx} y={dy + 4} fontSize="11" fontWeight="700" fill="#FFFAF9" textAnchor="middle">
                                {days}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    {showHubs && (
                      <g
                        role="button"
                        tabIndex={0}
                        aria-pressed={active}
                        aria-label={`${sector.name}: ${sector.match}% match, ${inWindow(sector.closingDays).length} open tenders in this window`}
                        onClick={() => toggleSector(sector.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleSector(sector.id);
                          }
                        }}
                        className="map-hub cursor-pointer"
                      >
                        <circle cx={x} cy={y} r="42" fill="white" stroke={active ? 'var(--color-accent-500)' : hubColor(sector.match)} strokeWidth={active ? 5 : 3} />
                        <text x={x} y={y + 7} fontSize="20" fontWeight="700" fill="var(--color-brand-700)" textAnchor="middle">
                          {sector.match}%
                        </text>
                        <text x={nameX} y={nameY} fontSize="17" fontWeight="600" fill="var(--color-ink)" textAnchor={anchor} pointerEvents="none">
                          {sector.name}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
              <circle cx={CX} cy={CY} r="70" fill="var(--color-accent-100)" />
              <circle cx={CX} cy={CY} r="56" fill="var(--color-accent-500)" />
              <text x={CX} y={CY + 6} fontSize="17" fontWeight="700" fill="white" textAnchor="middle">
                Your profile
              </text>
            </g>
          </svg>

          {/* Legend */}
          <div className="border-t border-line bg-white px-4 py-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Toggle checked={showHubs} onChange={setShowHubs}>
                Types of work
              </Toggle>
              <Toggle checked={showTenders} onChange={setShowTenders}>
                Open tenders
              </Toggle>
              <Toggle checked={showDays} onChange={setShowDays}>
                Days left on dots
              </Toggle>
            </div>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-danger-500" aria-hidden /> closes within 7 days
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-accent-500" aria-hidden /> within 30 days
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-brand-500" aria-hidden /> later
              </span>
            </p>
          </div>
        </div>

        {/* Sector list and details */}
        <aside className="card p-5 self-start">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="h2">{selected.name}</h2>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close details"
                  className="-m-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-brand-50"
                >
                  <X size={18} aria-hidden />
                </button>
              </div>
              <dl className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-tile bg-brand-50 p-3">
                  <dt className="text-sm text-ink-soft">Match</dt>
                  <dd className="text-3xl font-light text-ink tabular-nums">{selected.match}%</dd>
                </div>
                <div className="rounded-tile bg-brand-50 p-3">
                  <dt className="text-sm text-ink-soft">Open now</dt>
                  <dd className="text-3xl font-light text-ink tabular-nums">{inWindow(selected.closingDays).length}</dd>
                </div>
              </dl>
              <p className="text-sm text-ink-soft mb-4">
                {inWindow(selected.closingDays).length
                  ? `The nearest closes in ${inWindow(selected.closingDays)[0]} days.`
                  : 'Nothing closes in this window. Try a longer one.'}
              </p>
              <Button variant="primary" className="w-full" onClick={() => navigate('/tenders')}>
                See these tenders
              </Button>
            </>
          ) : (
            <>
              <h2 className="h2 mb-1">Types of work</h2>
              <p className="text-sm text-ink-soft mb-3">Pick one to see its tenders.</p>
              <ul className="space-y-1">
                {SECTORS.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => toggleSector(s.id)}
                      className="flex w-full min-h-11 items-center justify-between gap-3 rounded-tile px-3 text-left hover:bg-brand-50"
                    >
                      <span className="flex items-center gap-2 font-medium text-ink">
                        <span className="h-3 w-3 rounded-full" style={{ background: hubColor(s.match) }} aria-hidden />
                        {s.name}
                      </span>
                      <span className="text-sm text-ink-soft tabular-nums">
                        {s.match}% · {inWindow(s.closingDays).length} open
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </Page>
  );
}
