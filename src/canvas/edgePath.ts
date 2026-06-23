import type { Edge, Table } from '../model/types';
import { TABLE_WIDTH, columnCenterY, tableHeight } from '../model/geometry';

export interface Anchor {
  x: number;
  y: number;
  side: 'left' | 'right';
}

export interface EdgeGeometry {
  path: string;
  from: Anchor;
  to: Anchor;
}

interface Rect {
  x: number;
  y: number;
}

export function computeEdgeGeometry(
  edge: Edge,
  fromTable: Table,
  toTable: Table,
  fromPos: Rect,
  toPos: Rect,
): EdgeGeometry {
  const fromCx = fromPos.x + TABLE_WIDTH / 2;
  const toCx = toPos.x + TABLE_WIDTH / 2;

  const fromY = fromPos.y + columnCenterY(fromTable, edge.fromColumn);
  const toY = toPos.y + columnCenterY(toTable, edge.toColumn);

  const fromRight = fromCx <= toCx;
  const fromX = fromRight ? fromPos.x + TABLE_WIDTH : fromPos.x;
  const toX = fromRight ? toPos.x : toPos.x + TABLE_WIDTH;

  const dx = Math.abs(toX - fromX);
  const k = Math.max(36, dx * 0.5);
  const cp1x = fromX + (fromRight ? k : -k);
  const cp2x = toX + (fromRight ? -k : k);

  const path = `M ${fromX} ${fromY} C ${cp1x} ${fromY}, ${cp2x} ${toY}, ${toX} ${toY}`;

  return {
    path,
    from: { x: fromX, y: fromY, side: fromRight ? 'right' : 'left' },
    to: { x: toX, y: toY, side: fromRight ? 'left' : 'right' },
  };
}

/** total content bounds for all placed tables (for fit-to-screen) */
export function modelBounds(
  tables: Table[],
  positions: Record<string, { x: number; y: number }>,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const t of tables) {
    const p = positions[t.id];
    if (!p) continue;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + TABLE_WIDTH);
    maxY = Math.max(maxY, p.y + tableHeight(t));
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}
