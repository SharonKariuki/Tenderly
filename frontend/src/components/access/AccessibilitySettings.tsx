import { useId } from 'react';
import { TextSize, useAccessibility } from '../../context/Accessibility';
import { Toggle } from './Toggle';

const SIZES: { id: TextSize; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'large', label: 'Large' },
  { id: 'larger', label: 'Larger' },
];

/** Text size, high contrast, reduce motion and dyslexia friendly spacing. Saved to the
 * business profile and applied on every screen. */
export function AccessibilitySettings() {
  const { prefs, updatePrefs, announce } = useAccessibility();
  const ids = { size: useId(), contrast: useId(), motion: useId(), dyslexia: useId() };

  const toggle = (key: 'high_contrast' | 'reduce_motion' | 'dyslexia_spacing', label: string) => (on: boolean) => {
    updatePrefs({ [key]: on });
    announce(`${label} ${on ? 'on' : 'off'}.`);
  };

  return (
    <div className="space-y-4">
      <fieldset>
        <legend id={ids.size} className="mb-2 text-sm font-bold text-plum-ink">
          Text size
        </legend>
        <div className="flex gap-2" role="radiogroup" aria-labelledby={ids.size}>
          {SIZES.map((size) => (
            <label
              key={size.id}
              className={`focus-within-ring flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-pill border-2 px-3 text-sm font-semibold transition-colors ${
                prefs.text_size === size.id ? 'border-plum bg-plum text-white' : 'border-line bg-white text-plum hover:border-plum'
              }`}
            >
              <input
                type="radio"
                name="text-size"
                value={size.id}
                checked={prefs.text_size === size.id}
                onChange={() => {
                  updatePrefs({ text_size: size.id });
                  announce(`Text size ${size.label.toLowerCase()}.`);
                }}
                className="sr-only"
              />
              {size.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Toggle
        checked={prefs.high_contrast}
        onChange={toggle('high_contrast', 'High contrast')}
        description="Stronger colours and solid backgrounds."
        descriptionId={ids.contrast}
        className="w-full"
      >
        High contrast
      </Toggle>
      <Toggle
        checked={prefs.reduce_motion}
        onChange={toggle('reduce_motion', 'Reduce motion')}
        description="Stops animations and moving effects."
        descriptionId={ids.motion}
        className="w-full"
      >
        Reduce motion
      </Toggle>
      <Toggle
        checked={prefs.dyslexia_spacing}
        onChange={toggle('dyslexia_spacing', 'Dyslexia friendly spacing')}
        description="More space between letters and lines, text aligned left."
        descriptionId={ids.dyslexia}
        className="w-full"
      >
        Dyslexia friendly spacing
      </Toggle>
    </div>
  );
}
