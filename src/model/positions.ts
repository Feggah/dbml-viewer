import type { DbModel, Positions, Table } from './types';
import { computeLayout } from './layout';
import { tableHeight } from './geometry';

const GAP_Y = 48;

/** Make sure every table in the model has a position. Existing positions are
 * preserved; brand-new tables are stacked below the current content. If there
 * are no existing positions at all, a fresh grid layout is produced. */
export function ensurePositions(model: DbModel, prev: Positions): Positions {
  const ids = model.tables.map((t) => t.id);
  const hasAny = ids.some((id) => prev[id]);
  if (!hasAny) {
    return computeLayout('grid', model);
  }

  const missing = model.tables.filter((t) => !prev[t.id]);
  if (!missing.length) return prev;

  // find current bottom
  let maxY = 0;
  const byId = new Map(model.tables.map((t) => [t.id, t]));
  for (const id of ids) {
    const p = prev[id];
    const t = byId.get(id);
    if (p && t) maxY = Math.max(maxY, p.y + tableHeight(t));
  }

  const next: Positions = { ...prev };
  let y = maxY + 60;
  for (const t of missing) {
    next[t.id] = { x: 0, y };
    y += tableHeight(t) + GAP_Y;
  }
  return next;
}

/** Keep only positions for tables that currently exist. */
export function prunePositions(positions: Positions, tables: Table[]): Positions {
  const ids = new Set(tables.map((t) => t.id));
  const out: Positions = {};
  for (const id of Object.keys(positions)) {
    if (ids.has(id)) out[id] = positions[id];
  }
  return out;
}
