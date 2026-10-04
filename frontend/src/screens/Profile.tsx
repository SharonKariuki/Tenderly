import { useId } from 'react';
import { Card, Page, PageHeading } from '../components/ui';
import { AccessibilitySettings } from '../components/access/AccessibilitySettings';
import { initialsOf } from '../components/Header';
import { useApp } from '../context/AppState';
import { agpoCategories } from '../config/agpo';
import type { AgpoCategory } from '../lib/types';

export function Profile() {
  const { profile, updateProfile } = useApp();
  const groupId = useId();

  return (
    <Page className="max-w-3xl">
      <PageHeading title="Profile and settings" />

      <Card className="mb-6 flex items-center gap-4 p-6">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent-500 text-xl font-semibold text-white ring-4 ring-brand-100" aria-hidden>
          {initialsOf(profile.ownerName)}
        </span>
        <div>
          <p className="text-lg font-semibold text-ink">{profile.ownerName}</p>
          <p className="text-sm text-ink-soft">{profile.businessName}</p>
        </div>
      </Card>

      <Card className="mb-6 p-6">
        <label htmlFor={groupId} className="h2 mb-1 block">
          Your business is owned by
        </label>
        <p className="mb-3 text-sm text-ink-soft">
          Some tenders are kept for women, youth and people with disabilities. This shows you the ones you can bid for.
        </p>
        <select
          id={groupId}
          value={profile.agpoCategory}
          onChange={(e) => updateProfile({ agpoCategory: e.target.value as AgpoCategory })}
          className="input max-w-sm"
        >
          {agpoCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id === 'none' ? 'None of these groups' : c.label}
            </option>
          ))}
        </select>
      </Card>

      <Card className="p-6">
        <h2 className="h2 mb-4">Accessibility</h2>
        <AccessibilitySettings />
      </Card>
    </Page>
  );
}
