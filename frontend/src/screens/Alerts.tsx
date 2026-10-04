import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Page, PageHeading } from '../components/ui';
import { useApp } from '../context/AppState';
import { BID_TENDER_ID } from '../data/mock';
import { Alert } from '../lib/types';
import { AlertCircle, ChevronRight, Clock, Megaphone, Star } from 'lucide-react';

const icon: Record<Alert['type'], ReactNode> = {
  newMatch: <Star size={18} aria-hidden />,
  expiringDoc: <Clock size={18} aria-hidden />,
  briefing: <Megaphone size={18} aria-hidden />,
  scamWarning: <AlertCircle size={18} aria-hidden />,
};

// The page each alert opens.
const target: Record<Alert['type'], string> = {
  newMatch: `/tenders/${BID_TENDER_ID}`,
  expiringDoc: '/documents/2',
  briefing: '/meetings',
  scamWarning: '/check',
};

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export function Alerts() {
  const navigate = useNavigate();
  const { alerts, markAlertRead, markAllAlertsRead } = useApp();
  const unread = alerts.filter((a) => !a.isRead).length;

  return (
    <Page className="max-w-3xl">
      <PageHeading title="Alerts" subtitle={unread ? `${unread} new` : 'You are all caught up.'}>
        <Button variant="secondary" onClick={markAllAlertsRead} disabled={!unread}>
          Mark all read
        </Button>
      </PageHeading>

      <Card className="p-2">
        <ul>
          {alerts.map((alert) => (
            <li key={alert.id}>
              <button
                type="button"
                onClick={() => {
                  markAlertRead(alert.id);
                  navigate(target[alert.type]);
                }}
                className="flex w-full items-center gap-4 rounded-xl p-3 text-left transition hover:bg-brand-50"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                    alert.type === 'scamWarning' ? 'bg-danger-50 text-danger-600' : 'bg-brand-100 text-brand-600'
                  }`}
                >
                  {icon[alert.type]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {!alert.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-accent-500" aria-hidden />}
                    {alert.title}
                    {!alert.isRead && <span className="sr-only">(new)</span>}
                  </span>
                  <span className="block text-sm text-ink-soft">{alert.description}</span>
                  <span className="mt-0.5 block text-xs text-ink-soft">{when(alert.timestamp)}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-ink-soft" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </Page>
  );
}
