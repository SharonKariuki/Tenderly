// Voice input with the Web Speech recognition API (Chrome, Edge, Safari).
// Where it is missing, `message` explains that in plain words.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccessibility } from '../context/Accessibility';
import type { Lang } from '../lib/types';

interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type RecognitionConstructor = new () => Recognition;

function recognitionClass(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked. Allow the microphone in your browser settings, then try again.',
  'service-not-allowed': 'Voice input is turned off in this browser. You can type instead.',
  'no-speech': 'No speech was heard. Try again, a little closer to the microphone.',
  'audio-capture': 'No microphone was found. Check that one is connected.',
  network: 'Voice input needs an internet connection. You can type instead.',
};

export const UNSUPPORTED_MESSAGE =
  'Voice input does not work in this browser. Try Chrome or Edge, or use the microphone on your phone keyboard.';

export function useDictation(onText: (text: string) => void, lang: Lang = 'en') {
  const Ctor = recognitionClass();
  const supported = Ctor !== null;
  const { announce } = useAccessibility();
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const recognition = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => () => recognition.current?.abort(), []);

  const start = useCallback(() => {
    if (!Ctor) {
      setMessage(UNSUPPORTED_MESSAGE);
      announce(UNSUPPORTED_MESSAGE);
      return;
    }
    const rec = new Ctor();
    rec.lang = lang === 'sw' ? 'sw-KE' : 'en-KE';
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (event) => {
      let text = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) text += event.results[i][0].transcript;
      }
      if (text.trim()) {
        onTextRef.current(text.trim());
        announce(`Added: ${text.trim()}`);
      }
    };
    rec.onerror = (event) => {
      if (event.error === 'aborted') return;
      const text = ERRORS[event.error] ?? 'Voice input stopped. You can try again or type instead.';
      setMessage(text);
      announce(text, true);
    };
    rec.onend = () => setListening(false);
    recognition.current = rec;
    setMessage('Listening. Your browser sends your voice to its speech service to turn it into text.');
    setListening(true);
    announce('Listening.');
    rec.start();
  }, [Ctor, lang, announce]);

  const stop = useCallback(() => {
    recognition.current?.stop();
    setListening(false);
    setMessage('');
    announce('Stopped listening.');
  }, [announce]);

  return { supported, listening, message, start, stop };
}
