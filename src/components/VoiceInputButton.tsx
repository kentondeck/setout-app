import { useState, useContext } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { SettingsContext } from '../contexts';

interface VoiceInputButtonProps {
  /** Short prompt shown in the modal — e.g. "Say: length, width, board width" */
  prompt: string;
  /** Called with the parsed numbers and the raw transcript once recognition ends */
  onValues: (values: number[], transcript: string) => void;
}

export function VoiceInputButton({ prompt, onValues }: VoiceInputButtonProps) {
  const { settings } = useContext(SettingsContext);
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [parseError, setParseError] = useState('');

  const { listenState, transcript, start, stop, isSupported, isDenied } = useVoiceInput({
    onResult(numbers, raw) {
      if (numbers.length === 0) {
        setParseError(`Couldn't parse numbers from: "${raw}". Try tapping individual fields.`);
        setTimeout(() => { setIsOpen(false); setParseError(''); }, 3500);
        return;
      }
      onValues(numbers, raw);
      setIsOpen(false);
      showToast('Got it — review and tap Calculate');
    },
    onError(err) {
      if (err !== 'not-allowed') {
        setIsOpen(false);
        showToast('Mic error — try again');
      }
    },
  });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function handleOpen() {
    setParseError('');
    setIsOpen(true);
    start();
  }

  function handleClose() {
    stop();
    setIsOpen(false);
    setParseError('');
  }

  // Voice disabled in settings — render nothing
  if (!settings.voiceInput) return null;

  // Browser doesn't support voice at all — render nothing
  if (!isSupported && !isDenied) return null;

  // Microphone permission was denied — show greyed-out MicOff as feedback
  if (isDenied) {
    return (
      <button
        disabled
        title="Microphone access denied — re-enable in browser settings"
        style={{
          width: 48, height: 48, borderRadius: '50%', border: 'none',
          background: 'rgba(0,0,0,0.06)', color: 'var(--color-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'not-allowed', flexShrink: 0,
        }}
      >
        <MicOff size={20} strokeWidth={2} />
      </button>
    );
  }

  const isListening = listenState === 'listening';
  const isProcessing = listenState === 'processing';

  return (
    <>
      {/* Mic button — sits in the CalcHeader right slot */}
      <button
        onClick={handleOpen}
        aria-label="Voice input"
        className={isListening ? 'voice-pulse' : ''}
        style={{
          width: 48, height: 48, borderRadius: '50%', border: 'none',
          background: 'var(--color-orange)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        <Mic size={20} strokeWidth={2} />
      </button>

      {/* Listening modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 1000,
            display: 'flex', alignItems: 'flex-end',
            padding: '0 16px 32px',
          }}
          onClick={handleClose}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 390, margin: '0 auto',
              background: 'var(--color-card)',
              borderRadius: 24, padding: '28px 24px',
              display: 'flex', flexDirection: 'column', gap: 20,
            }}
          >
            {/* Prompt */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Voice input
              </p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>
                {prompt}
              </p>
            </div>

            {/* Animated mic circle */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0' }}>
              <div
                className={isListening ? 'voice-pulse' : ''}
                style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: isProcessing ? '#22c55e' : 'var(--color-orange)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.3s',
                }}
              >
                {isProcessing
                  ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <Mic size={28} color="#fff" strokeWidth={2} />
                }
              </div>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--color-muted)' }}>
                {isProcessing ? 'Processing…' : isListening ? 'Listening…' : 'Starting…'}
              </p>
            </div>

            {/* Live transcript */}
            {transcript && (
              <div style={{ background: 'var(--color-bg)', borderRadius: 12, padding: '12px 14px', minHeight: 44 }}>
                <p style={{ margin: 0, fontSize: 15, color: 'var(--color-text)', lineHeight: 1.4 }}>
                  "{transcript}"
                </p>
              </div>
            )}

            {/* Parse error */}
            {parseError && (
              <p style={{ margin: 0, fontSize: 13, color: '#e53e3e', lineHeight: 1.4 }}>{parseError}</p>
            )}

            {/* Cancel */}
            <button
              onClick={handleClose}
              style={{
                padding: '14px', borderRadius: 14,
                border: '0.5px solid var(--color-border)',
                background: 'var(--color-bg)',
                fontSize: 15, fontWeight: 500, fontFamily: 'inherit',
                color: 'var(--color-muted)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1001, background: '#0a0a0a', color: '#fff',
          borderRadius: 20, padding: '10px 20px',
          fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}
    </>
  );
}
