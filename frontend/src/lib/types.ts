export type Status = 'ready' | 'actionNeeded' | 'notEligible' | 'missing' | 'optional';

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
  bidProgress: number;
  topPick?: boolean;
}

export interface BusinessDocument {
  id: number;
  category: 'crb' | 'taxCompliance' | 'tin' | 'businessRegistration' | 'insurance' | 'bank' | 'other';
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
  agpoCategory: 'women' | 'youth' | 'pwd' | 'none';
  documentsReady: number;
}

export interface User {
  id: number;
  email: string;
  businessName?: string;
  isLoggedIn: boolean;
}
