export type Status = 'ready' | 'actionNeeded' | 'notEligible' | 'missing' | 'optional';

export type AgpoCategory = 'women' | 'youth' | 'pwd' | 'none';
// Who may bid, as in access/agpo_rules.json "reservations".
export type Reservation = 'open' | 'agpo' | 'women' | 'youth' | 'pwd';
export type Lang = 'en' | 'sw';

export interface Tender {
  id: number;
  title: string;
  entity: string;
  reference: string;
  value: string;
  closingDate: string;
  matchScore: number;
  status: Status;
  reservedFor: string;
  reservation: Reservation;
  bidProgress: number;
  topPick?: boolean;
  // Plain words for the easy read summary.
  purpose: string;
  purposeSw: string;
  requiredDocs: string[];
  missingDocs: string[];
}

export type EventKind = 'briefing' | 'site_visit';

export interface TenderEvent {
  // Also the event_key of an access support request.
  id: string;
  kind: EventKind;
  tenderId: number;
  title: string;
  entity: string;
  reference: string;
  startsAt: string;
  venue: string;
}

export interface BusinessDocument {
  id: number;
  category: 'crb' | 'taxCompliance' | 'tin' | 'businessRegistration' | 'insurance' | 'bank' | 'ncpwd' | 'other';
  name: string;
  status: Status;
  issueDate: string | null;
  expiryDate: string | null;
  requiredByCount: number;
  isOptional: boolean;
  displayStatus: 'ready' | 'expiring' | 'expired' | 'missing' | 'optional';
}

export interface Alert {
  id: number;
  type: 'scamWarning' | 'newMatch' | 'expiringDoc' | 'briefing';
  title: string;
  description: string;
  isRead: boolean;
  timestamp: string;
}

export interface TenderCheckResult {
  genuine: boolean;
  signals: {
    listedOnPortal: { status: 'ok' | 'flag'; detail: string };
    officialContact: { status: 'ok' | 'flag'; detail: string };
    noFeeToPersonal: { status: 'ok' | 'flag'; detail: string };
    bidSecurityToInstitution: { status: 'ok' | 'flag'; detail: string };
    reasonableTimeline: { status: 'ok' | 'flag'; detail: string };
  };
  eligibility?: {
    eligible: boolean;
    totalRequirements: number;
    metRequirements: number;
    requirements: EligibilityRequirement[];
  };
}

export interface EligibilityRequirement {
  name: string;
  status: Status;
  sourceQuote: string;
  docType?: string;
}

export interface AssistantResponse {
  answer: string;
  cta: string;
  to: string;
}

export interface BusinessProfile {
  businessName: string;
  sector: string;
  county: string;
  agpoCategory: AgpoCategory;
  documentsReady: number;
}

export interface User {
  id: number;
  email: string;
  businessName?: string;
  isLoggedIn: boolean;
}
