import { ReactNode } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  /** Shown under the label and read as the switch's description. */
  description?: string;
  descriptionId?: string;
  controls?: string;
  dark?: boolean;
  className?: string;
}

/** An on or off switch (role="switch"), with the coral focus ring and a 44px target. */
export function Toggle({
  checked,
  onChange,
  children,
  description,
  descriptionId,
  controls,
  dark = false,
  className = '',
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-controls={checked ? controls : undefined}
      aria-describedby={description ? descriptionId : undefined}
      onClick={() => onChange(!checked)}
      className={`focus-ring inline-flex min-h-[44px] items-center gap-3 rounded-pill px-2 text-left text-sm font-semibold ${
        dark ? 'text-white' : 'text-plum'
      } ${className}`}
    >
      <span
        aria-hidden
        className={`toggle-track relative inline-block h-6 w-11 flex-shrink-0 rounded-pill transition-colors ${
          checked ? 'bg-coral' : dark ? 'bg-white/30' : 'bg-plum-muted'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span>
        <span className="block">{children}</span>
        {description && (
          <span id={descriptionId} className={`block text-xs font-normal ${dark ? 'text-white/80' : 'text-plum-muted'}`}>
            {description}
          </span>
        )}
      </span>
    </button>
  );
}
