import React from 'react';
import type { Table } from '../model/types';

interface Props {
  table: Table;
  x: number;
  y: number;
  state: 'normal' | 'hovered' | 'connected' | 'dim';
  dragging: boolean;
  highlightedColumns: Set<string>;
  onHeaderPointerDown: (e: React.PointerEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function TableCardImpl({
  table,
  x,
  y,
  state,
  dragging,
  highlightedColumns,
  onHeaderPointerDown,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  const cls = ['table-card'];
  if (state === 'hovered') cls.push('hovered');
  else if (state === 'connected') cls.push('connected');
  else if (state === 'dim') cls.push('dim');
  if (dragging) cls.push('dragging');

  return (
    <div
      className={cls.join(' ')}
      style={{ transform: `translate(${x}px, ${y}px)` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={'table-header' + (dragging ? ' dragging' : '')}
        style={{ background: table.color }}
        onPointerDown={onHeaderPointerDown}
      >
        <span className="tname" title={table.name}>
          {table.name}
        </span>
        {table.schema && table.schema !== 'public' && (
          <span className="tschema">{table.schema}</span>
        )}
      </div>

      {table.columns.map((c) => {
        const hi = highlightedColumns.has(c.name);
        return (
          <div className={'col-row' + (hi ? ' col-hi' : '')} key={c.name}>
            <span className={'col-key' + (c.isRef && !c.pk ? ' fk' : '')}>
              {c.pk ? '🔑' : c.isRef ? '↗' : ''}
            </span>
            <span className={'col-name' + (c.pk ? ' pk' : '')} title={c.name}>
              {c.name}
            </span>
            <span className="col-flags">
              {c.notNull && !c.pk && <span className="col-badge">NN</span>}
              {c.unique && !c.pk && <span className="col-badge">UQ</span>}
            </span>
            {c.type && (
              <span className="col-type" title={c.type}>
                {c.type}
              </span>
            )}
          </div>
        );
      })}

      {table.note && (
        <div className="table-note" title={table.note}>
          {table.note}
        </div>
      )}
    </div>
  );
}

export const TableCard = React.memo(TableCardImpl);
