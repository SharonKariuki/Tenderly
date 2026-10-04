import { Accessibility, Banknote, Building2, FileCheck, FileText, Landmark, ShieldCheck, Users } from 'lucide-react';
import { mockTenders } from '../data/mock';
import type { BusinessDocument } from './types';

export const CATEGORY: Record<BusinessDocument['category'], { label: string; icon: typeof FileText; tile: string }> = {
  crb: { label: 'Shows you pay your debts', icon: FileText, tile: 'bg-ok-50 text-ok-700' },
  taxCompliance: { label: 'Shows your taxes are paid up', icon: FileCheck, tile: 'bg-accent-50 text-accent-700' },
  tin: { label: 'Your tax number from KRA', icon: Landmark, tile: 'bg-ok-50 text-ok-700' },
  businessRegistration: { label: 'Shows your business is registered', icon: Building2, tile: 'bg-ok-50 text-ok-700' },
  insurance: { label: 'Your business insurance cover', icon: ShieldCheck, tile: 'bg-danger-50 text-danger-600' },
  bank: { label: 'A letter from your bank', icon: Banknote, tile: 'bg-ok-50 text-ok-700' },
  ncpwd: { label: 'Proves a disability for reserved tenders', icon: Accessibility, tile: 'bg-brand-50 text-brand-600' },
  owners: { label: 'Who owns and runs your company', icon: Users, tile: 'bg-brand-50 text-brand-600' },
  other: { label: 'Lets you bid on tenders kept for these groups', icon: FileText, tile: 'bg-brand-50 text-brand-600' },
};

// The backend's DocType for each card (core/contracts.py).
export function docTypeFor(doc: BusinessDocument): string {
  if (doc.category === 'other' && /women|youth|disability/i.test(doc.name)) return 'agpo_certificate';
  return (
    {
      taxCompliance: 'kra_tax_compliance',
      businessRegistration: 'business_registration',
      bank: 'bank_statement',
      ncpwd: 'ncpwd_registration',
      owners: 'cr12',
    } as Record<string, string>
  )[doc.category] ?? 'other';
}

export const needsAction = (d: BusinessDocument) => d.status === 'actionNeeded' || d.status === 'missing';
export const tendersNeeding = (doc: BusinessDocument) =>
  mockTenders.filter((t) => t.requiredDocs.some((r) => r.toLowerCase() === doc.name.toLowerCase()));
