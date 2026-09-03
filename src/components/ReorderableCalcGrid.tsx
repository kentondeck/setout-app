import { useEffect, useRef, useState } from 'react';
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
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragSize, setDragSize] = useState({ w: 0, h: 0 });

  const tileRefs = useRef<Map<CalculatorId, HTMLDivElement>>(new Map());
  const startPos = useRef({ x: 0, y: 0 });
  const moved = useRef(false);
  const longPressTimer = useRef<number | null>(null);
  const activePointerId = useRef<number | null>(null);
  const dragIdRef = useRef<CalculatorId | null>(null);

  // Resync local order with the incoming calc list (e.g. pin toggled) whenever not actively dragging.
  useEffect(() => {
    if (!dragId) setOrder(calcs.map(c => c.id));
  }, [calcs, dragId]);

  function clearLongPressTimer() {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function beginDrag(id: CalculatorId, clientX: number, clientY: number) {
    const el = tileRefs.current.get(id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDragOffset({ x: clientX - rect.left, y: clientY - rect.top });
    setDragSize({ w: rect.width, h: rect.height });
    dragIdRef.current = id;
    setDragId(id);
    setDragPos({ x: clientX, y: clientY });
    if (navigator.vibrate) navigator.vibrate(12);
  }

  function handlePointerDown(e: React.PointerEvent, id: CalculatorId) {
    if (e.button !== undefined && e.button !== 0) return;
    startPos.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    activePointerId.current = e.pointerId;
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
    }

    if (!dragIdRef.current) return;
    e.preventDefault();
    setDragPos({ x: e.clientX, y: e.clientY });

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
    if (dragIdRef.current) {
      onReorder(order);
      dragIdRef.current = null;
      setDragId(null);
      setDragPos(null);
    } else if (!moved.current) {
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
    dragIdRef.current = null;
    setDragId(null);
    setDragPos(null);
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

      {draggedCalc && dragPos && (
        <div
          style={{
            position: 'fixed',
            left: dragPos.x - dragOffset.x,
            top: dragPos.y - dragOffset.y,
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
