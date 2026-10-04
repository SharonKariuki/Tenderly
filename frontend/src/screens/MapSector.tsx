import { Link, useParams } from 'react-router-dom';
import { BackLink, Card, MatchRing, NotFound, Page } from '../components/ui';
import { SECTORS, WINDOWS } from '../data/sectors';

export function MapSector() {
  const { sectorId } = useParams();
  const sector = SECTORS.find((s) => s.id === sectorId);
  if (!sector) return <NotFound what="type of work" back="/map" backLabel="Back to the map" />;

  const nearest = sector.closingDays[0];

  return (
    <Page className="max-w-3xl">
      <BackLink to="/map">Back to the map</BackLink>

      <Card className="mb-6 flex items-center gap-5 p-6">
        <MatchRing score={sector.match} />
        <div>
          <h1 className="h1">{sector.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {sector.match}% match with your business · {sector.tenders} open tenders
          </p>
        </div>
      </Card>

      <Card className="mb-6 p-6">
        <h2 className="h2 mb-3">How soon they close</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {WINDOWS.map((w) => (
            <div key={w.id} className="rounded-tile bg-brand-50 p-3">
              <dt className="text-xs text-ink-soft">{w.label}</dt>
              <dd className="text-2xl font-light text-ink tabular-nums">{sector.closingDays.filter((d) => d <= w.maxDays).length}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-ink-soft">The nearest one closes in {nearest} days.</p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Days left for each open tender">
          {sector.closingDays.map((d, i) => (
            <li
              key={i}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                d <= 7 ? 'bg-danger-50 text-danger-600' : d <= 30 ? 'bg-accent-50 text-accent-700' : 'bg-brand-50 text-brand-700'
              }`}
            >
              {d} days
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link to="/tenders" className="btn btn-primary px-5 text-sm">
          See my tenders
        </Link>
        <Link to="/map" className="btn btn-outlined px-5 text-sm">
          Pick another type of work
        </Link>
      </div>
    </Page>
  );
}
