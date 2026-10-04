import { useId } from 'react';
import { Pause, Play, Square } from 'lucide-react';
import { SPEEDS, Speed, useSpeech } from '../../context/Speech';

/** Small plum player shown while a summary is read aloud: play or pause, speed, stop. */
export function PlayerPill() {
  const { status, track, index, speed, pause, resume, stop, setSpeed } = useSpeech();
  const speedId = useId();
  if (!track || status === 'idle') return null;

  const playing = status === 'playing';

  return (
    <div
      role="region"
      aria-label="Audio player"
      className="player-pill fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-pill bg-plum py-2 pl-5 pr-2 text-white shadow-hero"
    >
      <div className="min-w-0 mr-2">
        <p className="truncate text-sm font-semibold max-w-[14rem]">{track.title}</p>
        <p className="text-xs text-white/80">
          Sentence {index + 1} of {track.sentences.length}
        </p>
      </div>

      <button
        type="button"
        onClick={playing ? pause : resume}
        aria-label={playing ? 'Pause' : 'Play'}
        className="focus-ring flex h-11 w-11 items-center justify-center rounded-full bg-white text-plum hover:bg-lilac-light"
      >
        {playing ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
      </button>

      <label htmlFor={speedId} className="sr-only">
        Speed
      </label>
      <select
        id={speedId}
        value={speed}
        onChange={(e) => setSpeed(Number(e.target.value) as Speed)}
        className="focus-ring h-11 rounded-pill bg-plum-soft px-3 text-sm font-semibold text-white"
      >
        {SPEEDS.map((s) => (
          <option key={s} value={s} className="text-plum-ink bg-white">
            {s}x
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={stop}
        aria-label="Stop"
        className="focus-ring flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/15"
      >
        <Square size={16} aria-hidden />
      </button>
    </div>
  );
}
