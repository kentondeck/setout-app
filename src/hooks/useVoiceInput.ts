import { useState, useRef, useCallback, useEffect } from 'react';
import { parseVoiceInput, isVoiceSupported, getVoiceDenied, setVoiceDenied } from '../lib/voice-input';

export type ListenState = 'idle' | 'listening' | 'processing';

interface UseVoiceInputOptions {
  onResult: (numbers: number[], transcript: string) => void;
  onError?: (error: string) => void;
}

interface UseVoiceInputReturn {
  listenState: ListenState;
  transcript: string;
  start: () => void;
  stop: () => void;
  isSupported: boolean;
  isDenied: boolean;
}

// TypeScript 6 removed `SpeechRecognition` as a global constructor declaration.
// Define the shape we need locally and access it through the window object.
type SRInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};
type SRCtor = new () => SRInstance;

function getSRCtor(): SRCtor | null {
  const w = window as unknown as Record<string, unknown>;
  const SR = (w['SpeechRecognition'] ?? w['webkitSpeechRecognition']) as SRCtor | undefined;
  return SR ?? null;
}

export function useVoiceInput({ onResult, onError }: UseVoiceInputOptions): UseVoiceInputReturn {
  const [listenState, setListenState] = useState<ListenState>('idle');
  const [transcript, setTranscript] = useState('');
  const [isDenied, setIsDenied] = useState<boolean>(getVoiceDenied);

  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const recognitionRef = useRef<SRInstance | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTranscriptRef = useRef('');

  const stop = useCallback(() => {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  const start = useCallback(() => {
    if (!isVoiceSupported() || isDenied) return;
    if (recognitionRef.current) return;

    const SR = getSRCtor();
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = 'en-AU';
    recognition.continuous = false;
    recognition.interimResults = true;

    latestTranscriptRef.current = '';
    setTranscript('');
    setListenState('listening');
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let full = '';
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript;
      }
      latestTranscriptRef.current = full;
      setTranscript(full);

      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = setTimeout(() => recognition.stop(), 1500);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (event.error === 'not-allowed') {
        setIsDenied(true);
        setVoiceDenied(true);
      }
      onErrorRef.current?.(event.error);
      setListenState('idle');
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      recognitionRef.current = null;
      const final = latestTranscriptRef.current.trim();
      if (final) {
        setListenState('processing');
        const numbers = parseVoiceInput(final);
        onResultRef.current(numbers, final);
        setTimeout(() => setListenState('idle'), 800);
      } else {
        setListenState('idle');
      }
    };

    recognition.start();
  }, [isDenied]);

  return {
    listenState,
    transcript,
    start,
    stop,
    isSupported: isVoiceSupported() && !isDenied,
    isDenied,
  };
}
