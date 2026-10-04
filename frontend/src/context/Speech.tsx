// Reads easy read summaries aloud with the browser's Web Speech API.
// One player for the whole app. Sentences are spoken one at a time, so the sentence being
// read can be highlighted even with voices that do not report word boundaries.
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { Lang } from '../lib/types';
import { useAccessibility } from './Accessibility';

export const SPEEDS = [0.75, 1, 1.25, 1.5] as const;
export type Speed = (typeof SPEEDS)[number];
type Status = 'idle' | 'playing' | 'paused';

interface Track {
  id: string;
  title: string;
  sentences: string[];
  lang: Lang;
}

interface SpeechContextType {
  supported: boolean;
  status: Status;
  track: Track | null;
  index: number;
  speed: Speed;
  /** Why reading aloud is not possible right now, in plain words. Empty when it is. */
  notice: string;
  play: (track: Track) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setSpeed: (speed: Speed) => void;
}

const SpeechContext = createContext<SpeechContextType | undefined>(undefined);

const LANG_NAMES: Record<Lang, string> = { en: 'English', sw: 'Kiswahili' };

/** A Kenyan voice first (en-KE, sw-KE), then any voice in the language. */
export function pickVoice(voices: SpeechSynthesisVoice[], lang: Lang): SpeechSynthesisVoice | null {
  const norm = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase();
  return (
    voices.find((v) => norm(v) === `${lang}-ke`) ??
    voices.find((v) => norm(v).startsWith(`${lang}-`) || norm(v) === lang) ??
    null
  );
}

export function SpeechProvider({ children }: { children: ReactNode }) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const { announce } = useAccessibility();
  const [status, setStatus] = useState<Status>('idle');
  const [track, setTrack] = useState<Track | null>(null);
  const [index, setIndex] = useState(0);
  const [speed, setSpeedState] = useState<Speed>(1);
  const [notice, setNotice] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  // Each utterance carries the run it belongs to; callbacks from a stopped run are ignored.
  const run = useRef(0);

  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const speakFrom = useCallback(
    (t: Track, start: number, rate: Speed) => {
      const synth = window.speechSynthesis;
      const myRun = ++run.current;
      synth.cancel();
      const voice = pickVoice(voices.length ? voices : synth.getVoices(), t.lang);

      const say = (i: number) => {
        if (myRun !== run.current) return;
        if (i >= t.sentences.length) {
          setStatus('idle');
          setIndex(0);
          announce('Finished reading.');
          return;
        }
        setIndex(i);
        const utterance = new SpeechSynthesisUtterance(t.sentences[i]);
        utterance.lang = voice?.lang ?? (t.lang === 'sw' ? 'sw-KE' : 'en-KE');
        if (voice) utterance.voice = voice;
        utterance.rate = rate;
        utterance.onend = () => say(i + 1);
        utterance.onerror = (event) => {
          if (myRun !== run.current || event.error === 'interrupted' || event.error === 'canceled') return;
          setStatus('idle');
          setNotice('Reading aloud stopped because of a problem with the voice. The text is still shown.');
          announce('Reading aloud stopped. The text is still shown.', true);
        };
        synth.speak(utterance);
      };
      say(start);
    },
    [voices, announce],
  );

  const play = useCallback(
    (t: Track) => {
      setTrack(t);
      setIndex(0);
      if (!supported) {
        setNotice('This browser cannot read aloud. The easy read text is shown instead.');
        announce('This browser cannot read aloud. The easy read text is shown instead.');
        return;
      }
      const available = voices.length ? voices : window.speechSynthesis.getVoices();
      // A Kiswahili text in an English voice is hard to follow, so it is not attempted.
      if (t.lang === 'sw' && !pickVoice(available, 'sw')) {
        setStatus('idle');
        setNotice(
          'There is no Kiswahili voice on this device. The text is shown instead. Microsoft Edge has Kiswahili voices.',
        );
        announce('There is no Kiswahili voice on this device. The text is shown instead.');
        return;
      }
      setNotice('');
      setStatus('playing');
      announce(`Reading "${t.title}" in ${LANG_NAMES[t.lang]}.`);
      speakFrom(t, 0, speed);
    },
    [supported, voices, speed, speakFrom, announce],
  );

  // Pausing cancels and resumes from the start of the sentence: speechSynthesis.pause()
  // is unreliable in Chrome and on Android.
  const pause = useCallback(() => {
    if (status !== 'playing') return;
    run.current++;
    window.speechSynthesis.cancel();
    setStatus('paused');
    announce('Paused.');
  }, [status, announce]);

  const resume = useCallback(() => {
    if (!track || status !== 'paused') return;
    setStatus('playing');
    announce('Playing.');
    speakFrom(track, index, speed);
  }, [track, status, index, speed, speakFrom, announce]);

  const stop = useCallback(() => {
    run.current++;
    if (supported) window.speechSynthesis.cancel();
    setStatus('idle');
    setTrack(null);
    setIndex(0);
    setNotice('');
    announce('Stopped.');
  }, [supported, announce]);

  const setSpeed = useCallback(
    (next: Speed) => {
      setSpeedState(next);
      announce(`Speed ${next} times.`);
      if (track && status === 'playing') speakFrom(track, index, next);
    },
    [track, status, index, speakFrom, announce],
  );

  return (
    <SpeechContext.Provider
      value={{ supported, status, track, index, speed, notice, play, pause, resume, stop, setSpeed }}
    >
      {children}
    </SpeechContext.Provider>
  );
}

export function useSpeech() {
  const context = useContext(SpeechContext);
  if (!context) throw new Error('useSpeech must be used within SpeechProvider');
  return context;
}
