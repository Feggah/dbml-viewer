export interface Column {
  name: string;
  type: string;
  pk: boolean;
  notNull: boolean;
  unique: boolean;
  increment: boolean;
  note?: string;
  /** participates in at least one relationship */
  isRef: boolean;
}

export interface Table {
  /** unique id: `${schema}.${name}` */
  id: string;
  name: string;
  schema: string;
  group?: string;
  note?: string;
  color: string;
  columns: Column[];
}

export type Cardinality = '1' | '*';

export interface Edge {
  id: string;
  fromTable: string; // table id
  fromColumn: string;
  toTable: string; // table id
  toColumn: string;
  fromRel: Cardinality;
  toRel: Cardinality;
}

export interface TableGroup {
  name: string;
  color: string;
  tableIds: string[];
}

export interface EnumDef {
  name: string;
  schema: string;
  values: string[];
}

export interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

export interface DbModel {
  tables: Table[];
  edges: Edge[];
  groups: TableGroup[];
  enums: EnumDef[];
  errors: ParseError[];
}

export type Positions = Record<string, { x: number; y: number }>;
