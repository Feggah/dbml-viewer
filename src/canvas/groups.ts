import type { DbModel, Positions, Table } from '../model/types';
import { TABLE_WIDTH, tableHeight } from '../model/geometry';

export interface GroupBox {
  name: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const PAD = 20;
const LABEL_TOP = 18;

export function computeGroupBoxes(
  model: DbModel,
  positions: Positions,
  byId: Map<string, Table>,
): GroupBox[] {
  const boxes: GroupBox[] = [];
  for (const g of model.groups) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    let count = 0;
    for (const id of g.tableIds) {
      const t = byId.get(id);
      const p = positions[id];
      if (!t || !p) continue;
      count++;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + TABLE_WIDTH);
      maxY = Math.max(maxY, p.y + tableHeight(t));
    }
    if (!count) continue;
    boxes.push({
      name: g.name,
      color: g.color,
      x: minX - PAD,
      y: minY - PAD - LABEL_TOP,
      w: maxX - minX + PAD * 2,
      h: maxY - minY + PAD * 2 + LABEL_TOP,
    });
  }
  return boxes;
}
