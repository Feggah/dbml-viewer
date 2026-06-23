import * as dbmlCore from '@dbml/core';
import type {
  Column,
  DbModel,
  Edge,
  EnumDef,
  ParseError,
  Table,
  TableGroup,
  Cardinality,
} from './types';
import { NEUTRAL_HEADER, PALETTE, hashColor } from './colors';

// @dbml/core is published as CJS. Node ESM exposes it on the default export,
// while Vite/esbuild exposes named exports — grab Parser from whichever works.
const core: any = (dbmlCore as any).Parser
  ? dbmlCore
  : (dbmlCore as any).default ?? dbmlCore;
const { Parser } = core;

const DEFAULT_SCHEMA = 'public';

function tableId(schema: string | null | undefined, name: string): string {
  return `${schema || DEFAULT_SCHEMA}.${name}`;
}

function noteToString(note: any): string | undefined {
  if (!note) return undefined;
  if (typeof note === 'string') return note;
  if (typeof note === 'object' && typeof note.value === 'string') return note.value;
  return undefined;
}

export function parseDbml(source: string): DbModel {
  if (!source.trim()) {
    return { tables: [], edges: [], groups: [], enums: [], errors: [] };
  }

  let database: any;
  try {
    database = new Parser().parse(source, 'dbmlv2');
  } catch (err: any) {
    const errors: ParseError[] = [];
    if (err && Array.isArray(err.diags)) {
      for (const d of err.diags) {
        errors.push({
          message: d.message,
          line: d.location?.start?.line,
          column: d.location?.start?.column,
        });
      }
    } else {
      errors.push({ message: err?.message || String(err) });
    }
    return { tables: [], edges: [], groups: [], enums: [], errors };
  }

  const tables: Table[] = [];
  const edges: Edge[] = [];
  const groups: TableGroup[] = [];
  const enums: EnumDef[] = [];
  const refColumns = new Set<string>(); // `${tableId}::${column}`

  // ---- Table groups (assign colors first so tables can inherit them) ----
  const groupColorByName = new Map<string, string>();
  let groupColorIdx = 0;
  for (const schema of database.schemas) {
    for (const g of schema.tableGroups || []) {
      if (groupColorByName.has(g.name)) continue;
      const color = PALETTE[groupColorIdx % PALETTE.length];
      groupColorIdx++;
      groupColorByName.set(g.name, color);
      const tableIds: string[] = [];
      for (const t of g.tables || []) {
        tableIds.push(tableId(t.schemaName ?? schema.name, t.name));
      }
      groups.push({ name: g.name, color, tableIds });
    }
  }

  // ---- Tables & columns ----
  for (const schema of database.schemas) {
    for (const t of schema.tables) {
      const id = tableId(t.schemaName ?? schema.name, t.name);
      const groupName: string | undefined = t.group?.name;
      const color = groupName
        ? groupColorByName.get(groupName) || NEUTRAL_HEADER
        : NEUTRAL_HEADER;

      const columns: Column[] = (t.fields || []).map((f: any) => ({
        name: f.name,
        type: f.type?.type_name || f.type?.schemaName
          ? `${f.type?.schemaName ? f.type.schemaName + '.' : ''}${f.type?.type_name ?? ''}`
          : '',
        pk: !!f.pk,
        notNull: !!f.not_null,
        unique: !!f.unique,
        increment: !!f.increment,
        note: noteToString(f.note),
        isRef: false,
      }));

      tables.push({
        id,
        name: t.name,
        schema: t.schemaName ?? schema.name ?? DEFAULT_SCHEMA,
        group: groupName,
        note: noteToString(t.note),
        color,
        columns,
      });
    }
  }

  // ---- Refs / edges ----
  let refIdx = 0;
  for (const schema of database.schemas) {
    for (const r of schema.refs || []) {
      const [a, b] = r.endpoints;
      if (!a || !b) continue;
      const fromTbl = tableId(a.schemaName ?? schema.name, a.tableName);
      const toTbl = tableId(b.schemaName ?? schema.name, b.tableName);
      const aFields: string[] = a.fieldNames || [];
      const bFields: string[] = b.fieldNames || [];
      const count = Math.max(aFields.length, bFields.length, 1);
      for (let i = 0; i < count; i++) {
        const fromColumn = aFields[Math.min(i, aFields.length - 1)] ?? aFields[0];
        const toColumn = bFields[Math.min(i, bFields.length - 1)] ?? bFields[0];
        if (!fromColumn || !toColumn) continue;
        refColumns.add(`${fromTbl}::${fromColumn}`);
        refColumns.add(`${toTbl}::${toColumn}`);
        edges.push({
          id: `ref-${refIdx++}`,
          fromTable: fromTbl,
          fromColumn,
          toTable: toTbl,
          toColumn,
          fromRel: (a.relation as Cardinality) || '1',
          toRel: (b.relation as Cardinality) || '*',
        });
      }
    }
  }

  // mark ref columns
  for (const t of tables) {
    for (const c of t.columns) {
      if (refColumns.has(`${t.id}::${c.name}`)) c.isRef = true;
    }
  }

  // ---- Enums ----
  for (const schema of database.schemas) {
    for (const e of schema.enums || []) {
      enums.push({
        name: e.name,
        schema: e.schemaName ?? schema.name ?? DEFAULT_SCHEMA,
        values: (e.values || []).map((v: any) => v.name),
      });
    }
  }

  // drop edges whose endpoints don't resolve to a known table
  const tableIds = new Set(tables.map((t) => t.id));
  const validEdges = edges.filter(
    (e) => tableIds.has(e.fromTable) && tableIds.has(e.toTable),
  );

  return { tables, edges: validEdges, groups, enums, errors: [] };
}

export { hashColor };
