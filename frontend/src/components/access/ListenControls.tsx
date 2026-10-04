import { useEffect, useId, useRef, useState } from 'react';
import { Volume2, Pause, Play } from 'lucide-react';
import { Button } from '../ui';
import { Toggle } from './Toggle';
import { useSpeech } from '../../context/Speech';
import { useAccessibility } from '../../context/Accessibility';
import { useApp } from '../../context/AppState';
import { buildEasyRead, EasyReadInput } from '../../lib/easyRead';
import type { Lang } from '../../lib/types';

interface ListenControlsProps {
  /** Unique per tender and place, so only this panel highlights while it is read. */
  id: string;
  title: string;
  tender: EasyReadInput;
  /** "dark" sits on a plum hero card. */
  tone?: 'light' | 'dark';
}

/** "Listen" button and "Easy read" switch, with the easy read text below them. */
export function ListenControls({ id, title, tender, tone = 'light' }: ListenControlsProps) {
  const { status, track, index, notice, play, pause, resume } = useSpeech();
  const { motionReduced } = useAccessibility();
  const { profile, updateProfile } = useApp();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const currentRef = useRef<HTMLSpanElement | null>(null);

  const lang = profile.listenLang;
  const easyRead = buildEasyRead(tender, profile.agpoCategory, lang);
  const isMine = track?.id === id;
  const playing = isMine && status === 'playing';
  const paused = isMine && status === 'paused';

  useEffect(() => {
    if (playing && currentRef.current) {
      currentRef.current.scrollIntoView({ block: 'nearest', behavior: motionReduced ? 'auto' : 'smooth' });
    }
  }, [playing, index, motionReduced]);

  const onListen = () => {
    if (playing) return pause();
    if (paused) return resume();
    setOpen(true);
    play({ id, title, sentences: easyRead.sentences, lang });
  };

  const onLang = (next: Lang) => {
    if (next === lang) return;
    updateProfile({ listenLang: next });
    if (isMine && status !== 'idle') {
      play({ id, title, sentences: buildEasyRead(tender, profile.agpoCategory, next).sentences, lang: next });
    }
  };

  const dark = tone === 'dark';
  let sentenceNo = -1;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={dark ? 'secondary' : 'outlined'}
          size="sm"
          onClick={onListen}
          aria-label={`${playing ? 'Pause' : paused ? 'Resume' : 'Listen to'} ${title}`}
          className={dark ? 'text-white border-white/40' : ''}
        >
          {playing ? <Pause size={16} aria-hidden /> : paused ? <Play size={16} aria-hidden /> : <Volume2 size={16} aria-hidden />}
          {playing ? 'Pause' : paused ? 'Resume' : 'Listen'}
        </Button>
        <EasyReadSwitch checked={open} onChange={setOpen} controls={panelId} dark={dark} />
      </div>

      {open && (
        <div
          id={panelId}
          className="easy-read mt-4 rounded-tile bg-white p-5 text-left text-plum-ink shadow-card"
          aria-label={`Easy read: ${title}`}
          role="region"
          lang={lang}
        >
          <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Language">
            {(['en', 'sw'] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                lang={l}
                aria-pressed={lang === l}
                onClick={() => onLang(l)}
                className={`focus-ring min-h-[44px] rounded-pill px-4 text-sm font-semibold transition-colors ${
                  lang === l ? 'bg-plum text-white' : 'bg-gray-100 text-plum hover:bg-gray-200'
                }`}
              >
                {l === 'en' ? 'English' : 'Kiswahili'}
              </button>
            ))}
          </div>

          {isMine && notice && <p className="mb-4 rounded-tile bg-lilac-light p-3 text-sm">{notice}</p>}

          {easyRead.sections.map((section) => (
            <div key={section.heading} className="mb-4 last:mb-0">
              <h4 className="mb-1 text-sm font-bold text-plum">{section.heading}</h4>
              <p className="easy-read-text text-base leading-relaxed">
                {section.sentences.map((sentence) => {
                  sentenceNo += 1;
                  const current = isMine && status !== 'idle' && sentenceNo === index;
                  return (
                    <span
                      key={sentenceNo}
                      ref={current ? currentRef : undefined}
                      aria-current={current ? 'true' : undefined}
                      className={current ? 'reading-now' : undefined}
                    >
                      {sentence}{' '}
                    </span>
                  );
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface EasyReadSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  controls: string;
  dark?: boolean;
}

export function EasyReadSwitch({ checked, onChange, controls, dark = false }: EasyReadSwitchProps) {
  return (
    <Toggle checked={checked} onChange={onChange} controls={controls} dark={dark}>
      Easy read
    </Toggle>
  );
}
