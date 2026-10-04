import { useState } from 'react';
import { BackLink, Card, Button, Page, PageHeading } from '../components/ui';

// Quick warning signs in pasted text. Guidance only; the full check runs on an uploaded PDF.
const TEXT_FLAGS: { test: RegExp; flag: string }[] = [
  { test: /m-?pesa|till\s*(no|number)|paybill/i, flag: 'Asks you to pay by M-Pesa, till or paybill' },
  { test: /@(gmail|yahoo|outlook|hotmail)\./i, flag: 'Uses a personal email address' },
  { test: /(fee|pay|deposit).{0,30}(confirm|secure|process|register)/i, flag: 'Asks for money to confirm or hold your bid' },
  { test: /urgent|today only|within 24 ?h/i, flag: 'Rushes you to act today' },
];

export function CheckMessage() {
  const [pasted, setPasted] = useState('');
  const [textFlags, setTextFlags] = useState<string[] | null>(null);

  return (
    <Page className="max-w-3xl">
      <BackLink to="/check">Back to Check a tender</BackLink>
      <PageHeading title="Check a message" subtitle="Got a tender on WhatsApp, SMS or email? Paste it here." />
      <Card className="p-6">
        <p className="text-sm text-ink-soft mb-4">Paste the message and we will look for common scam signs.</p>
        <form
          className="flex flex-col sm:flex-row gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setTextFlags(TEXT_FLAGS.filter((f) => f.test.test(pasted)).map((f) => f.flag));
          }}
        >
          <label htmlFor="pasted-tender" className="sr-only">
            Tender message
          </label>
          <textarea
            id="pasted-tender"
            rows={3}
            placeholder="Paste the tender details or link here"
            value={pasted}
            onChange={(e) => {
              setPasted(e.target.value);
              setTextFlags(null);
            }}
            className="input flex-1 min-w-0 resize-y"
          />
          <Button type="submit" variant="primary" disabled={!pasted.trim()} className="sm:self-start">
            Check it
          </Button>
        </form>
        {textFlags && (
          <div className={`mt-4 rounded-tile p-4 text-sm ${textFlags.length ? 'bg-danger-50' : 'bg-ok-50'}`} role="status">
            {textFlags.length ? (
              <>
                <p className="font-semibold text-ink mb-1">Be careful. We found {textFlags.length} warning sign{textFlags.length > 1 ? 's' : ''}:</p>
                <ul className="list-disc pl-5 text-ink">
                  {textFlags.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-ink">No common scam signs found. Still find it on the government tenders website before you pay or send anything.</p>
            )}
          </div>
        )}
      </Card>
    </Page>
  );
}
