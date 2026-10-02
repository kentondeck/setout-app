import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { hapticLight } from '../lib/haptics';
import { useNavigate } from 'react-router-dom';
import { CalculatorTile } from './CalculatorTile';
import type { CalcMeta } from '../lib/calculators';
import type { CalculatorId } from '../types';

const LONG_PRESS_MS = 450;
const MOVE_CANCEL_PX = 8;

interface ReorderableCalcGridProps {
  calcs: CalcMeta[];
  highlightedId: string;
  onPinToggle?: (id: string) => void;
  pinnedIds: Set<CalculatorId>;
  onReorder: (newOrder: CalculatorId[]) => void;
}

// Hold a tile to pick it up, drag it over another tile to swap places, release to drop.
// Tap (no hold, no movement) still navigates to the calculator as normal.
export function ReorderableCalcGrid({ calcs, highlightedId, onPinToggle, pinnedIds, onReorder }: ReorderableCalcGridProps) {
  const navigate = useNavigate();
  const [order, setOrder] = useState<CalculatorId[]>(calcs.map(c => c.id));
  const [dragId, setDragId] = useState<CalculatorId | null>(null);
  const [dragSize, setDragSize] = useState({ w: 0, h: 0 });

  const tileRefs = useRef<Map<CalculatorId, HTMLDivElement>>(new Map());
  const startPos = useRef({ x: 0, y: 0 });
  const moved = useRef(false);
  const longPressTimer = useRef<number | null>(null);
  const activePointerId = useRef<number | null>(null);
  const dragIdRef = useRef<CalculatorId | null>(null);
  // The floating tile is moved by writing its transform directly. Routing every
  // pointermove through React state re-rendered all 19 tiles per finger move.
  const floatRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragPointer = useRef({ x: 0, y: 0 });
  const pressedEl = useRef<HTMLDivElement | null>(null);

  // Resync local order with the incoming calc list (e.g. pin toggled) whenever not actively dragging.
  useEffect(() => {
    if (!dragId) setOrder(calcs.map(c => c.id));
  }, [calcs, dragId]);

  function placeFloat(x: number, y: number) {
    dragPointer.current = { x, y };
    const el = floatRef.current;
    if (el) el.style.transform = `translate3d(${x - dragOffset.current.x}px, ${y - dragOffset.current.y}px, 0)`;
  }

  // Immediate press feedback, applied straight to the element (no re-render) so
  // it lands on the very next frame after touch-down.
  function press(id: CalculatorId) {
    release();
    const el = tileRefs.current.get(id);
    if (!el) return;
    el.style.transform = 'scale(0.96)';
    pressedEl.current = el;
  }

  function release() {
    if (pressedEl.current) pressedEl.current.style.transform = '';
    pressedEl.current = null;
  }

  useLayoutEffect(() => {
    if (dragId) placeFloat(dragPointer.current.x, dragPointer.current.y);
  }, [dragId]);

  function clearLongPressTimer() {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  // iOS honours `touch-action` at touch-start, so once a vertical pan is allowed
  // the browser scrolls the page under the drag and preventDefault on a pointer
  // event won't stop it — only a non-passive touchmove listener will. Lock
  // scrolling for the life of the drag so the tile tracks the finger cleanly.
  const scrollLock = useRef<((e: TouchEvent) => void) | null>(null);
  function lockScroll() {
    if (scrollLock.current) return;
    const fn = (e: TouchEvent) => e.preventDefault();
    scrollLock.current = fn;
    document.addEventListener('touchmove', fn, { passive: false });
  }
  function unlockScroll() {
    if (scrollLock.current) {
      document.removeEventListener('touchmove', scrollLock.current);
      scrollLock.current = null;
    }
  }
  useEffect(() => () => unlockScroll(), []);

  function beginDrag(id: CalculatorId, clientX: number, clientY: number) {
    const el = tileRefs.current.get(id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    release();
    dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
    dragPointer.current = { x: clientX, y: clientY };
    setDragSize({ w: rect.width, h: rect.height });
    dragIdRef.current = id;
    setDragId(id);
    lockScroll();
    hapticLight();
  }

  function handlePointerDown(e: React.PointerEvent, id: CalculatorId) {
    if (e.button !== undefined && e.button !== 0) return;
    startPos.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    activePointerId.current = e.pointerId;
    press(id);
    clearLongPressTimer();
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      beginDrag(id, e.clientX, e.clientY);
      const el = tileRefs.current.get(id);
      el?.setPointerCapture(e.pointerId);
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
      moved.current = true;
      if (longPressTimer.current !== null) clearLongPressTimer();
      if (!dragIdRef.current) release();
    }

    if (!dragIdRef.current) return;
    e.preventDefault();
    placeFloat(e.clientX, e.clientY);

    let hoveredId: CalculatorId | null = null;
    for (const [id, el] of tileRefs.current) {
      if (id === dragIdRef.current) continue;
      const r = el.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        hoveredId = id;
        break;
      }
    }
    if (hoveredId) {
      setOrder(prev => {
        const from = prev.indexOf(dragIdRef.current!);
        const to = prev.indexOf(hoveredId!);
        if (from === -1 || to === -1 || from === to) return prev;
        const next = [...prev];
        next.splice(from, 1);
        next.splice(to, 0, dragIdRef.current!);
        return next;
      });
    }
  }

  function endInteraction(id: CalculatorId) {
    clearLongPressTimer();
    unlockScroll();
    release();
    if (dragIdRef.current) {
      onReorder(order);
      dragIdRef.current = null;
      setDragId(null);
    } else if (!moved.current) {
      hapticLight();
      navigate(`/calc/${id}`);
    }
  }

  function handlePointerUp(e: React.PointerEvent, id: CalculatorId) {
    const el = tileRefs.current.get(id);
    if (el) {
      try { el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    }
    activePointerId.current = null;
    endInteraction(id);
  }

  function handlePointerCancel() {
    clearLongPressTimer();
    unlockScroll();
    release();
    dragIdRef.current = null;
    setDragId(null);
    setOrder(calcs.map(c => c.id));
    activePointerId.current = null;
  }

  const orderedCalcs = order
    .map(id => calcs.find(c => c.id === id))
    .filter((c): c is CalcMeta => !!c);

  const draggedCalc = dragId ? calcs.find(c => c.id === dragId) : null;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {orderedCalcs.map(calc => (
          <div
            key={calc.id}
            ref={el => { if (el) tileRefs.current.set(calc.id, el); else tileRefs.current.delete(calc.id); }}
            role="button"
            tabIndex={0}
            aria-label={calc.label}
            onPointerDown={e => handlePointerDown(e, calc.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={e => handlePointerUp(e, calc.id)}
            onPointerCancel={handlePointerCancel}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/calc/${calc.id}`); }}
            style={{
              touchAction: 'pan-y',
              opacity: dragId === calc.id ? 0 : 1,
              transition: 'transform 120ms ease',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <CalculatorTile
              calc={calc}
              highlighted={calc.id === highlightedId}
              pinned={pinnedIds.has(calc.id)}
              onPinToggle={onPinToggle}
            />
          </div>
        ))}
      </div>

      {draggedCalc && (
        <div
          ref={floatRef}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            willChange: 'transform',
            width: dragSize.w,
            height: dragSize.h,
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <CalculatorTile
            calc={draggedCalc}
            highlighted={draggedCalc.id === highlightedId}
            pinned={pinnedIds.has(draggedCalc.id)}
            dragging
          />
        </div>
      )}
    </>
  );
}
