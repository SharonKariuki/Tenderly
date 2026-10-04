// AGPO rules. The rules themselves live in access/agpo_rules.json, shared with Django,
// with their source link and last checked date. Nothing here decides eligibility on its own.
import rules from '@agpo-rules';
import type { AgpoCategory, Reservation } from '../lib/types';

export interface AgpoDocument {
  id: string;
  doc_type: string | null;
  label: string;
  label_sw: string;
  applies_to: string;
  issuer?: string;
  how_to_get_url?: string;
}

interface AgpoCategoryRule {
  id: AgpoCategory;
  label: string;
  label_sw: string;
  age_min?: number;
  age_max?: number;
  extra_documents: AgpoDocument[];
}

export const agpoSource = rules.source;
export const agpoOwnership = rules.ownership;
export const agpoCategories = rules.categories as AgpoCategoryRule[];

export function categoryLabel(id: AgpoCategory, lang: 'en' | 'sw' = 'en'): string {
  const category = agpoCategories.find((c) => c.id === id);
  if (!category) return id;
  return lang === 'sw' ? category.label_sw : category.label;
}

/** Documents AGPO registration asks for in this category. No category, no documents. */
export function requiredDocuments(category: AgpoCategory, businessForm = 'all'): AgpoDocument[] {
  if (category === 'none') return [];
  const rule = agpoCategories.find((c) => c.id === category);
  const docs = [...(rules.common_documents as AgpoDocument[]), ...(rule?.extra_documents ?? [])];
  return docs.filter((d) => d.applies_to === 'all' || d.applies_to === businessForm);
}

/** Documents only this category asks for, such as the NCPWD document for PWD. */
export function categoryDocuments(category: AgpoCategory): AgpoDocument[] {
  return agpoCategories.find((c) => c.id === category)?.extra_documents ?? [];
}

/** Whether a business in this category may bid on a tender with this reservation. */
export function canBid(category: AgpoCategory, reservation: Reservation): boolean {
  const allowed = (rules.reservations as Record<string, unknown>)[reservation];
  return Array.isArray(allowed) && allowed.includes(category);
}
