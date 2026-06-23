import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DbModel, Positions, Table } from '../model/types';
import { TableCard } from './TableCard';
import { Edges } from './Edges';
import { computeGroupBoxes } from './groups';

export interface Transform {
  x: number;
  y: number;
  k: number;
}

export const MIN_K = 0.1;
export const MAX_K = 2.5;

interface Props {
  model: DbModel;
  byId: Map<string, Table>;
  positions: Positions;
  onPositionsChange: (updater: (prev: Positions) => Positions) => void;
  transform: Transform;
  onTransform: (t: Transform | ((prev: Transform) => Transform)) => void;
  areaRef: React.RefObject<HTMLDivElement>;
}

export function Canvas({
  model,
  byId,
  positions,
  onPositionsChange,
  transform,
  onTransform,
  areaRef,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);

  // pan/drag mutable state
  const pan = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const drag = useRef<{
    id: string;
    startX: number;
    startY: number;
    px: number;
    py: number;
  } | null>(null);

  // -------- connectivity for hover highlight --------
  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const cols = new Map<string, Set<string>>(); // tableId -> highlighted columns
    for (const e of model.edges) {
      if (!map.has(e.fromTable)) map.set(e.fromTable, new Set());
      if (!map.has(e.toTable)) map.set(e.toTable, new Set());
      map.get(e.fromTable)!.add(e.toTable);
      map.get(e.toTable)!.add(e.fromTable);
    }
    return { map, cols };
  }, [model]);

  const connected = useMemo(() => {
    if (!hovered) return null;
    const set = adjacency.map.get(hovered) ?? new Set<string>();
    return set;
  }, [hovered, adjacency]);

  // columns to highlight per table when hovering
  const highlightCols = useMemo(() => {
    const result = new Map<string, Set<string>>();
    if (!hovered) return result;
    for (const e of model.edges) {
      if (e.fromTable === hovered || e.toTable === hovered) {
        if (!result.has(e.fromTable)) result.set(e.fromTable, new Set());
        if (!result.has(e.toTable)) result.set(e.toTable, new Set());
        result.get(e.fromTable)!.add(e.fromColumn);
        result.get(e.toTable)!.add(e.toColumn);
      }
    }
    return result;
  }, [hovered, model]);

  const groupBoxes = useMemo(
    () => computeGroupBoxes(model, positions, byId),
    [model, positions, byId],
  );

  // -------- wheel zoom (native, non-passive) --------
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      onTransform((prev) => {
        const factor = Math.exp(-e.deltaY * 0.0015);
        let k = prev.k * factor;
        k = Math.min(MAX_K, Math.max(MIN_K, k));
        const ratio = k / prev.k;
        // keep the point under the cursor fixed
        const x = mx - (mx - prev.x) * ratio;
        const y = my - (my - prev.y) * ratio;
        return { x, y, k };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onTransform, areaRef]);

  // -------- background pan --------
  const onAreaPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 && e.button !== 1) return;
      pan.current = {
        startX: e.clientX,
        startY: e.clientY,
        ox: transform.x,
        oy: transform.y,
      };
      setPanning(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [transform],
  );

  const onAreaPointerMove = useCallback(
    (e: React.PointerEvent) => {
      // table drag takes priority
      if (drag.current) {
        const d = drag.current;
        const dx = (e.clientX - d.startX) / transform.k;
        const dy = (e.clientY - d.startY) / transform.k;
        const id = d.id;
        const nx = d.px + dx;
        const ny = d.py + dy;
        onPositionsChange((prev) => ({ ...prev, [id]: { x: nx, y: ny } }));
        return;
      }
      if (pan.current) {
        const p = pan.current;
        onTransform({
          x: p.ox + (e.clientX - p.startX),
          y: p.oy + (e.clientY - p.startY),
          k: transform.k,
        });
      }
    },
    [transform.k, onTransform, onPositionsChange],
  );

  const endInteraction = useCallback((e: React.PointerEvent) => {
    pan.current = null;
    drag.current = null;
    setPanning(false);
    setDragId(null);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }, []);

  // -------- table drag (started from header) --------
  const startDrag = useCallback(
    (id: string) => (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const p = positions[id] ?? { x: 0, y: 0 };
      drag.current = { id, startX: e.clientX, startY: e.clientY, px: p.x, py: p.y };
      setDragId(id);
      // capture on the area so movement is tracked even off the card
      areaRef.current?.setPointerCapture(e.pointerId);
    },
    [positions, areaRef],
  );

  const stateFor = (id: string): 'normal' | 'hovered' | 'connected' | 'dim' => {
    if (!hovered) return 'normal';
    if (id === hovered) return 'hovered';
    if (connected?.has(id)) return 'connected';
    return 'dim';
  };

  const EMPTY = useMemo(() => new Set<string>(), []);

  return (
    <div
      ref={areaRef}
      className={'canvas-area' + (panning ? ' panning' : '')}
      onPointerDown={onAreaPointerDown}
      onPointerMove={onAreaPointerMove}
      onPointerUp={endInteraction}
      onPointerCancel={endInteraction}
    >
      <div
        className="world"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
        }}
      >
        {groupBoxes.map((b) => (
          <div
            key={b.name}
            className="group-box"
            style={{
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              borderColor: b.color,
              background: b.color + '0d',
            }}
          >
            <span className="group-label" style={{ background: b.color }}>
              {b.name}
            </span>
          </div>
        ))}

        <Edges model={model} positions={positions} byId={byId} hovered={hovered} />

        {model.tables.map((t) => {
          const p = positions[t.id];
          if (!p) return null;
          return (
            <TableCard
              key={t.id}
              table={t}
              x={p.x}
              y={p.y}
              state={stateFor(t.id)}
              dragging={dragId === t.id}
              highlightedColumns={highlightCols.get(t.id) ?? EMPTY}
              onHeaderPointerDown={startDrag(t.id)}
              onMouseEnter={() => !drag.current && !pan.current && setHovered(t.id)}
              onMouseLeave={() => setHovered((h) => (h === t.id ? null : h))}
            />
          );
        })}
      </div>
    </div>
  );
}
