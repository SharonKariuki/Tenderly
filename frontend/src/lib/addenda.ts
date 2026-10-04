import { mockAddenda } from '../data/mock';
import type { Tender } from './types';

/** The tender as it reads once its addendum is applied: new closing date, added documents
 * and the status after the re-check. Unchanged when no addendum has been picked up. */
export function withAddendum(tender: Tender, applied: number[]): Tender {
  const addendum = mockAddenda[tender.id];
  if (!addendum || !applied.includes(tender.id)) return tender;
  return {
    ...tender,
    closingDate: addendum.newClosingDate,
    requiredDocs: [...tender.requiredDocs, ...addendum.addedDocs],
    missingDocs: [...tender.missingDocs, ...addendum.addedDocs],
    expiringDocs: addendum.flips.filter((f) => f.to === 'expiring').map((f) => f.document),
    status: addendum.statusAfter,
  };
}

export const CHANGE_LABEL = {
  deadline: 'Closing date',
  required_documents: 'Documents they ask for',
  specifications_quantities: 'Quantities',
} as const;
