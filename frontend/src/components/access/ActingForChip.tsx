import { useState } from 'react';
import { X } from 'lucide-react';
import { ACTING_FOR_KEY } from '../../api/client';
import { readStoredString, writeStored } from '../../lib/storage';

export function ActingForChip() {
  const [actingFor, setActingFor] = useState(() => readStoredString(ACTING_FOR_KEY));

  if (!actingFor) return null;

  const stopActingFor = () => {
    writeStored(ACTING_FOR_KEY, null);
    setActingFor(null);
  };

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-pill border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-plum-ink">
      <span className="truncate">Acting for owner {actingFor}</span>
      <button
        type="button"
        onClick={stopActingFor}
        aria-label="Stop acting for this owner"
        title="Stop acting for this owner"
        className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-coral/20"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}