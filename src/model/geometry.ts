import type { Table } from './types';

export const TABLE_WIDTH = 248;
export const HEADER_H = 40;
export const ROW_H = 30;
export const NOTE_H = 30;

export function tableHeight(t: Table): number {
  return HEADER_H + t.columns.length * ROW_H + (t.note ? NOTE_H : 0);
}

/** vertical center (relative to table top) of a column row */
export function columnCenterY(t: Table, columnName: string): number {
  const idx = t.columns.findIndex((c) => c.name === columnName);
  const i = idx < 0 ? 0 : idx;
  return HEADER_H + i * ROW_H + ROW_H / 2;
}
