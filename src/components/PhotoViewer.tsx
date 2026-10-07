import { useState, useRef, useEffect } from 'react';
import { savePhotoToDevice } from '../lib/savePhoto';

// Full-screen photo viewer with pinch-to-zoom + pan, used by job photos,
// receipts and tools. Gestures are hand-rolled (no library): two-finger pinch
// scales 1–4×, one-finger drag pans while zoomed, double-tap toggles zoom.
// Desktop (the phone-frame preview) gets double-click + wheel zoom. The image
// area swallows taps so only the X button / backdrop margin close the viewer —
// that stops a stray single tap from closing it mid-zoom.

const MAX_SCALE = 4;
const ZOOM_TO = 2.5;

export function PhotoViewer({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const g = useRef({
    mode: 'none' as 'none' | 'pan' | 'pinch',
    startDist: 0, startScale: 1,
    startX: 0, startY: 0, startTx: 0, startTy: 0,
    lastTap: 0,
  });

  // Reset zoom whenever a different photo is shown.
  useEffect(() => { setScale(1); setTx(0); setTy(0); }, [src]);

  function touchDist(t: React.TouchList): number {
    return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  }

  function handleTouchStart(e: React.TouchEvent) {
    const s = g.current;
    if (e.touches.length === 2) {
      s.mode = 'pinch';
      s.startDist = touchDist(e.touches);
      s.startScale = scale;
      s.startTx = tx; s.startTy = ty;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - s.lastTap < 280) {
        // Double tap → toggle zoom.
        s.lastTap = 0;
        s.mode = 'none';
        if (scale > 1) { setScale(1); setTx(0); setTy(0); }
        else setScale(ZOOM_TO);
        return;
      }
      s.lastTap = now;
      s.mode = scale > 1 ? 'pan' : 'none';
      s.startX = e.touches[0].clientX;
      s.startY = e.touches[0].clientY;
      s.startTx = tx; s.startTy = ty;
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    const s = g.current;
    if (s.mode === 'pinch' && e.touches.length === 2) {
      const next = Math.min(MAX_SCALE, Math.max(1, s.startScale * (touchDist(e.touches) / s.startDist)));
      setScale(next);
      if (next <= 1) { setTx(0); setTy(0); }
    } else if (s.mode === 'pan' && e.touches.length === 1) {
      setTx(s.startTx + (e.touches[0].clientX - s.startX));
      setTy(s.startTy + (e.touches[0].clientY - s.startY));
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const s = g.current;
    if (e.touches.length === 0) {
      if (scale <= 1) { setTx(0); setTy(0); }
      s.mode = 'none';
    } else if (e.touches.length === 1) {
      // Lifting one finger of a pinch → continue as a pan if still zoomed.
      s.mode = scale > 1 ? 'pan' : 'none';
      s.startX = e.touches[0].clientX;
      s.startY = e.touches[0].clientY;
      s.startTx = tx; s.startTy = ty;
    }
  }

  function toggleZoom() {
    if (scale > 1) { setScale(1); setTx(0); setTy(0); }
    else setScale(ZOOM_TO);
  }

  function handleWheel(e: React.WheelEvent) {
    const next = Math.min(MAX_SCALE, Math.max(1, scale - e.deltaY * 0.003));
    setScale(next);
    if (next <= 1) { setTx(0); setTy(0); }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column',
        padding: 'calc(env(safe-area-inset-top) + 12px) 12px calc(env(safe-area-inset-bottom) + 16px)',
      }}
    >
      {/* Close */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
        <button
          onClick={e => { e.stopPropagation(); onClose(); }}
          aria-label="Close"
          style={{
            width: 36, height: 36, borderRadius: 999, border: 'none',
            background: 'rgba(255,255,255,0.14)', color: '#fff',
            fontSize: 22, lineHeight: 1, cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >×</button>
      </div>

      {/* Image + Save/share grouped and centred, so the button sits right below
          the image rather than stranded at the bottom of the screen. */}
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 14,
      }}>
        <div
          onClick={e => e.stopPropagation()}
          onDoubleClick={toggleZoom}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            flexShrink: 1, minHeight: 0, maxWidth: '100%',
            display: 'flex', overflow: 'hidden', touchAction: 'none',
          }}
        >
          <img
            src={src}
            alt=""
            draggable={false}
            style={{
              maxWidth: '100%', maxHeight: 'calc(100vh - 200px)', objectFit: 'contain',
              borderRadius: 6, display: 'block',
              transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
              transition: g.current.mode === 'none' ? 'transform 0.18s ease' : 'none',
              cursor: scale > 1 ? 'grab' : 'zoom-in',
              willChange: 'transform',
            }}
          />
        </div>
        <button
          onClick={e => { e.stopPropagation(); savePhotoToDevice(src).catch(() => {}); }}
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
            padding: '11px 18px', borderRadius: 999,
            background: 'rgba(255,255,255,0.14)', color: '#fff',
            border: '0.5px solid rgba(255,255,255,0.3)',
            fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Save / share
        </button>
      </div>
    </div>
  );
}
