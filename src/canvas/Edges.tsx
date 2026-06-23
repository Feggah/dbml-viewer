import React from 'react';
import type { DbModel, Table } from '../model/types';
import type { Positions } from '../model/types';
import { computeEdgeGeometry } from './edgePath';

interface Props {
  model: DbModel;
  positions: Positions;
  byId: Map<string, Table>;
  hovered: string | null;
}

function EdgesImpl({ model, positions, byId, hovered }: Props) {
  return (
    <svg className="edges-svg" width={1} height={1}>
      {model.edges.map((e) => {
        const ft = byId.get(e.fromTable);
        const tt = byId.get(e.toTable);
        const fp = positions[e.fromTable];
        const tp = positions[e.toTable];
        if (!ft || !tt || !fp || !tp) return null;

        const g = computeEdgeGeometry(e, ft, tt, fp, tp);
        const touches =
          hovered === e.fromTable || hovered === e.toTable;
        const cls = hovered ? (touches ? 'hi' : 'dim') : '';

        const fromGlyph = e.fromRel === '*' ? '∗' : '1';
        const toGlyph = e.toRel === '*' ? '∗' : '1';
        const fromLx = g.from.x + (g.from.side === 'right' ? 11 : -11);
        const toLx = g.to.x + (g.to.side === 'right' ? 11 : -11);

        return (
          <g key={e.id}>
            <path className={`edge-path ${cls}`} d={g.path} />
            <circle className={`edge-dot ${cls}`} cx={g.from.x} cy={g.from.y} r={3.4} />
            <circle className={`edge-dot ${cls}`} cx={g.to.x} cy={g.to.y} r={3.4} />
            <text
              className={`edge-card ${cls}`}
              x={fromLx}
              y={g.from.y}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {fromGlyph}
            </text>
            <text
              className={`edge-card ${cls}`}
              x={toLx}
              y={g.to.y}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {toGlyph}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export const Edges = React.memo(EdgesImpl);
