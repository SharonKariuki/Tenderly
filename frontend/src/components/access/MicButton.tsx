import { Mic, MicOff } from 'lucide-react';

interface MicButtonProps {
  listening: boolean;
  supported: boolean;
  onStart: () => void;
  onStop: () => void;
  /** What the voice goes into, for the label: "your question", "the tender details". */
  target: string;
}

/** Voice input toggle. Stays visible where voice input is not supported, so pressing it
 * explains why, instead of the control silently missing. */
export function MicButton({ listening, supported, onStart, onStop, target }: MicButtonProps) {
  return (
    <button
      type="button"
      onClick={listening ? onStop : onStart}
      aria-pressed={listening}
      aria-label={listening ? `Stop voice input for ${target}` : `Speak ${target}`}
      title={supported ? undefined : 'Voice input is not supported in this browser'}
      className={`focus-ring flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        listening ? 'border-coral bg-coral text-white' : 'border-plum/30 bg-white/70 text-plum hover:border-plum'
      }`}
    >
      {listening ? <MicOff size={18} aria-hidden /> : <Mic size={18} aria-hidden />}
    </button>
  );
}
