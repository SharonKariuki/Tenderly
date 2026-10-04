import { Link } from 'react-router-dom';
import { Card, Page, PageHeading } from '../components/ui';
import { mockEvents } from '../data/mock';
import { daysUntil, formatTime } from '../lib/format';
import { CalendarPlus, MapPin } from 'lucide-react';
import type { TenderEvent } from '../lib/types';

// A calendar file the phone or computer can add, built in the browser.
function calendarLink(e: TenderEvent): string {
  const start = new Date(e.startsAt);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TenderReady//EN',
    'BEGIN:VEVENT',
    `UID:${e.id}@tenderready`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${e.kind === 'briefing' ? 'Information meeting' : 'Site visit'}: ${e.title}`,
    `LOCATION:${e.venue}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export function Meetings() {
  const upcoming = mockEvents.filter((e) => daysUntil(e.startsAt) >= 0).sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return (
    <Page className="max-w-3xl">
      <PageHeading title="Meetings and visits" subtitle="Information meetings and site visits for your tenders." />
      {upcoming.length ? (
        <ul className="space-y-4">
          {upcoming.map((e) => (
            <li key={e.id}>
              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  {e.kind === 'briefing' ? 'Information meeting' : 'Site visit'} ·{' '}
                  {new Date(e.startsAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })},{' '}
                  {formatTime(e.startsAt)}
                </p>
                <h2 className="mt-1 text-base font-semibold text-ink">{e.title}</h2>
                <p className="text-sm text-ink-soft">{e.entity}</p>
                <p className="mt-2 flex items-start gap-1.5 text-sm text-ink-soft">
                  <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden /> {e.venue}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link to={`/tenders/${e.tenderId}`} className="btn btn-secondary px-4 text-sm">
                    See the tender
                  </Link>
                  <a href={calendarLink(e)} download={`${e.id}.ics`} className="btn btn-outlined px-4 text-sm">
                    <CalendarPlus size={17} aria-hidden /> Add to my calendar
                  </a>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.venue)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outlined px-4 text-sm"
                  >
                    <MapPin size={17} aria-hidden /> Directions
                  </a>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Card className="p-8 text-center text-ink-soft">No meetings or site visits coming up.</Card>
      )}
    </Page>
  );
}
