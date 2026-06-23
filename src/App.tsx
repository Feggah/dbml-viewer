import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, MAX_K, MIN_K } from './canvas/Canvas';
import type { Transform } from './canvas/Canvas';
import { parseDbml } from './model/parse';
import { computeLayout } from './model/layout';
import type { LayoutKind } from './model/layout';
import { ensurePositions, prunePositions } from './model/positions';
import { modelBounds } from './canvas/edgePath';
import type { Positions } from './model/types';
import { SAMPLE_DBML } from './sample';
import { buildShareUrl, readHash, writeHash } from './state/url';

const LAYOUTS: { kind: LayoutKind; label: string; hint: string }[] = [
  { kind: 'grid', label: 'Grid', hint: 'Compact masonry packing' },
  { kind: 'group', label: 'By Group', hint: 'Cluster by table group' },
  { kind: 'layered', label: 'Hierarchical', hint: 'Follow relationship direction' },
];

const initial = readHash();

export default function App() {
  const [source, setSource] = useState<string>(initial?.dbml ?? SAMPLE_DBML);
  const [debounced, setDebounced] = useState<string>(source);
  const [positions, setPositions] = useState<Positions>(initial?.positions ?? {});
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lastLayout, setLastLayout] = useState<LayoutKind | null>(null);

  const areaRef = useRef<HTMLDivElement>(null);
  const didInitialFit = useRef(false);
  const hadUrlPositions = useRef(!!initial?.positions);

  // debounce parsing for smooth typing
  useEffect(() => {
    const id = setTimeout(() => setDebounced(source), 220);
    return () => clearTimeout(id);
  }, [source]);

  const model = useMemo(() => parseDbml(debounced), [debounced]);
  const byId = useMemo(
    () => new Map(model.tables.map((t) => [t.id, t])),
    [model],
  );

  // ensure every table has a position whenever the model changes
  useEffect(() => {
    setPositions((prev) => ensurePositions(model, prev));
  }, [model]);

  // ---- fit to view ----
  const fitView = useCallback(
    (pos: Positions) => {
      const el = areaRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const b = modelBounds(model.tables, pos);
      const w = b.maxX - b.minX;
      const h = b.maxY - b.minY;
      if (w <= 0 || h <= 0) {
        setTransform({ x: rect.width / 2, y: rect.height / 2, k: 1 });
        return;
      }
      const pad = 90;
      let k = Math.min((rect.width - pad * 2) / w, (rect.height - pad * 2) / h);
      k = Math.min(MAX_K, Math.max(MIN_K, k));
      const x = (rect.width - w * k) / 2 - b.minX * k;
      const y = (rect.height - h * k) / 2 - b.minY * k;
      setTransform({ x, y, k });
    },
    [model.tables],
  );

  // initial fit once positions exist
  useEffect(() => {
    if (didInitialFit.current) return;
    if (!model.tables.length) return;
    const ready = model.tables.every((t) => positions[t.id]);
    if (!ready) return;
    didInitialFit.current = true;
    // defer so the canvas has its measured size
    requestAnimationFrame(() => fitView(positions));
  }, [model.tables, positions, fitView]);

  // ---- persist to URL (debounced) ----
  useEffect(() => {
    const id = setTimeout(() => {
      writeHash({
        dbml: source,
        positions: prunePositions(positions, model.tables),
      });
    }, 400);
    return () => clearTimeout(id);
  }, [source, positions, model.tables]);

  const applyLayout = useCallback(
    (kind: LayoutKind) => {
      const pos = computeLayout(kind, model);
      setPositions(pos);
      setLastLayout(kind);
      hadUrlPositions.current = false;
      requestAnimationFrame(() => fitView(pos));
    },
    [model, fitView],
  );

  const zoomBy = useCallback((factor: number) => {
    const el = areaRef.current;
    setTransform((prev) => {
      const rect = el?.getBoundingClientRect();
      const cx = rect ? rect.width / 2 : 0;
      const cy = rect ? rect.height / 2 : 0;
      const k = Math.min(MAX_K, Math.max(MIN_K, prev.k * factor));
      const ratio = k / prev.k;
      return {
        x: cx - (cx - prev.x) * ratio,
        y: cy - (cy - prev.y) * ratio,
        k,
      };
    });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 1900);
  }, []);

  const share = useCallback(async () => {
    const url = buildShareUrl({
      dbml: source,
      positions: prunePositions(positions, model.tables),
    });
    try {
      await navigator.clipboard.writeText(url);
      showToast('Share link copied to clipboard');
    } catch {
      // fallback: at least update the address bar
      writeHash({ dbml: source, positions: prunePositions(positions, model.tables) });
      showToast('Link is in the address bar');
    }
  }, [source, positions, model.tables, showToast]);

  const loadSample = useCallback(() => {
    setSource(SAMPLE_DBML);
    didInitialFit.current = false;
    setPositions({});
  }, []);

  const hasErrors = model.errors.length > 0;

  return (
    <div className="app">
      <aside className={'sidebar' + (collapsed ? ' collapsed' : '')}>
        {!collapsed && (
          <>
            <div className="sidebar-head">
              <div className="brand">
                <span className="brand-mark">⌗</span>
                <span>
                  DBML Viewer
                  <br />
                  <small>render &amp; share database diagrams</small>
                </span>
              </div>
              <div className="spacer" />
              <button className="btn icon" title="Collapse panel" onClick={() => setCollapsed(true)}>
                ‹
              </button>
            </div>

            <div className="editor-wrap">
              <div className="editor-label">
                <span>DBML Source</span>
                <button className="btn sm" onClick={loadSample}>
                  Load sample
                </button>
              </div>
              <textarea
                className="editor"
                spellCheck={false}
                value={source}
                placeholder="Paste your DBML here…"
                onChange={(e) => setSource(e.target.value)}
              />
            </div>

            {hasErrors ? (
              <div className="errors">
                <h4>{model.errors.length} parse error{model.errors.length > 1 ? 's' : ''}</h4>
                {model.errors.slice(0, 12).map((e, i) => (
                  <div className="error-item" key={i}>
                    {e.line != null && <b>L{e.line}: </b>}
                    {e.message}
                  </div>
                ))}
              </div>
            ) : (
              <div className="status-ok">
                <span className="dot-ok" />
                {model.tables.length} table{model.tables.length === 1 ? '' : 's'} ·{' '}
                {model.edges.length} relationship{model.edges.length === 1 ? '' : 's'}
                {model.groups.length ? ` · ${model.groups.length} group${model.groups.length === 1 ? '' : 's'}` : ''}
              </div>
            )}
          </>
        )}
      </aside>

      <div style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex' }}>
        {collapsed && (
          <button
            className="btn icon sidebar-toggle"
            title="Show panel"
            onClick={() => setCollapsed(false)}
          >
            ›
          </button>
        )}

        <Canvas
          model={model}
          byId={byId}
          positions={positions}
          onPositionsChange={(updater) => setPositions(updater)}
          transform={transform}
          onTransform={(t) => setTransform(t)}
          areaRef={areaRef}
        />

        {/* layout controls */}
        <div className={'overlay ' + (collapsed ? 'overlay-tl' : 'overlay-tl')} style={collapsed ? { left: 56 } : undefined}>
          <span className="overlay-label">Reorder</span>
          <div className="seg">
            {LAYOUTS.map((l) => (
              <button
                key={l.kind}
                className={lastLayout === l.kind ? 'active' : ''}
                title={l.hint}
                onClick={() => applyLayout(l.kind)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* zoom controls */}
        <div className="overlay overlay-br">
          <div className="control-card">
            <button className="btn" title="Fit to screen" onClick={() => fitView(positions)}>
              Fit
            </button>
            <span className="divider" />
            <button className="btn icon" title="Zoom out" onClick={() => zoomBy(1 / 1.2)}>
              −
            </button>
            <span className="zoom-label">{Math.round(transform.k * 100)}%</span>
            <button className="btn icon" title="Zoom in" onClick={() => zoomBy(1.2)}>
              +
            </button>
          </div>
        </div>

        {/* share */}
        <div className="overlay overlay-tr">
          <button className="btn primary" onClick={share} title="Copy a shareable link (diagram encoded in URL)">
            🔗 Share link
          </button>
        </div>

        {!model.tables.length && !hasErrors && (
          <div className="empty-state">
            <div className="empty-inner">
              <h3>No tables yet</h3>
              <div>Paste DBML in the panel to render your diagram.</div>
            </div>
          </div>
        )}

        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  );
}
