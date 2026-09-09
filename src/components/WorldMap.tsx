import { useEffect, useMemo, useRef, useState } from 'react';
import coastJson from '../data/world-coast.json';
import { CATEGORY, FORMAT, hackathons } from '../data';
import { PLACES } from '../data/places';
import type { Category, Hackathon } from '../types';
import { ArrowUpRight } from './Icons';
import WinnerExpand from './WinnerExpand';

/* ── geometry / projection ───────────────────────────── */
const W = 1000;
const H = 560;
const LAT_TOP = 84;
const LAT_SPAN = 142; // bottom ≈ -58
const px = (lon: number) => ((lon + 180) / 360) * W;
const py = (lat: number) => ((LAT_TOP - lat) / LAT_SPAN) * H;

type Ring = number[][];
const coast = coastJson as unknown as { rings: Ring[] };

function projectRings() {
  const parts: string[] = [];
  for (const ring of coast.rings) {
    let d = '';
    for (let i = 0; i < ring.length; i++) {
      const x = Math.round(px(ring[i][0]) * 10) / 10;
      const y = Math.round(py(ring[i][1]) * 10) / 10;
      d += (i === 0 ? `M${x} ${y}` : `L${x} ${y}`);
    }
    d += 'Z';
    if (d.length > 10) parts.push(d);
  }
  return parts.join('');
}
const LAND_D = projectRings();

/* ── cluster places into city groups ─────────────────── */
interface Spot {
  label: string;
  x: number;
  y: number;
  ids: string[];
}
function buildSpots(): Spot[] {
  const byLabel = new Map<string, Spot>();
  for (const p of PLACES) {
    let s = byLabel.get(p.label);
    if (!s) {
      s = { label: p.label, x: px(p.lng), y: py(p.lat), ids: [] };
      byLabel.set(p.label, s);
    }
    if (!s.ids.includes(p.id)) s.ids.push(p.id);
  }
  return [...byLabel.values()];
}
const SPOTS = buildSpots();
const byId = new Map(hackathons.map((h) => [h.id, h]));

export default function WorldMap({ onOpen }: { onOpen: (id: string) => void }) {
  const [sel, setSel] = useState<Spot | null>(null);
  const [tip, setTip] = useState<{ s: Spot; x: number; y: number } | null>(null);
  const [cat, setCat] = useState<Category | 'all'>('all');

  // pan / zoom
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ ox: number; oy: number; px: number; py: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const evOf = (id: string) => byId.get(id) as Hackathon | undefined;
  const catsOf = (ids: string[]) => Array.from(new Set(ids.map((id) => evOf(id)?.category).filter(Boolean))) as Category[];

  const spotMatches = (s: Spot) => (cat === 'all' ? true : catsOf(s.ids).includes(cat));
  const spots = useMemo(() => SPOTS.filter(spotMatches), [cat]);
  const maxN = Math.max(...SPOTS.map((s) => s.ids.length), 1);

  const zoomBy = (f: number) =>
    setView((v) => {
      const k = Math.min(10, Math.max(1, v.k * f));
      const cx = W / 2;
      const cy = H / 2;
      return { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k };
    });

  const onWheel = (e: React.WheelEvent) => {
    if (drag.current) return;
    zoomBy(e.deltaY < 0 ? 1.18 : 1 / 1.18);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('.wmdot')) return;
    drag.current = { ox: e.clientX, oy: e.clientY, px: view.x, py: view.y, moved: false };
    setDragging(true);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.ox;
    const dy = e.clientY - d.oy;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    setView((v) => ({ ...v, x: d.px + dx, y: d.py + dy }));
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  useEffect(() => {
    const el = wrapRef.current;
    const ignore = (e: WheelEvent) => e.preventDefault();
    el?.addEventListener('wheel', ignore, { passive: false });
    return () => el?.removeEventListener('wheel', ignore);
  }, []);

  const selEvents = useMemo<Hackathon[]>(() => {
    if (!sel) return [];
    return sel.ids
      .filter((id) => cat === 'all' || evOf(id)?.category === cat)
      .map((id) => byId.get(id))
      .filter((h): h is Hackathon => !!h)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sel, cat]);

  const selWinners = useMemo(() => {
    const out: { w: (typeof selEvents)[number]['winners'][number]; e: Hackathon }[] = [];
    for (const e of selEvents) {
      for (const w of e.winners) out.push({ w, e });
    }
    return out.sort((a, b) => b.w.year - a.w.year);
  }, [selEvents]);

  // pick chip counts by category over visible spots
  const chipCount = (c: Category | 'all') =>
    c === 'all' ? SPOTS.length : SPOTS.filter((s) => catsOf(s.ids).includes(c)).length;

  return (
    <div>
      {/* type filter */}
      <div className="mchips" role="group" aria-label="按类型筛选圆点">
        <button className={`mchip ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>
          全部 <span className="num">{chipCount('all')}</span>
        </button>
        {(Object.keys(CATEGORY) as Category[]).map((c) => (
          <button key={c} className={`mchip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>
            <i className="dsw" style={{ background: CATEGORY[c].color }} />
            {CATEGORY[c].label}
            <span className="num">{chipCount(c)}</span>
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-3)' }} className="num">
          {spots.length} / {SPOTS.length} 个城市
        </span>
      </div>

      <div className="wmap">
        <div className="wmap__tools">
          <button className="navb" aria-label="放大" onClick={() => zoomBy(1.35)}>
            +
          </button>
          <button className="navb" aria-label="缩小" onClick={() => zoomBy(1 / 1.35)}>
            −
          </button>
          <button className="navb" aria-label="复位视图" onClick={() => setView({ x: 0, y: 0, k: 1 })}>
            ⟲
          </button>
        </div>
        <div
          ref={wrapRef}
          className={`wmap__stage ${dragging ? 'is-dragging' : ''}`}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          role="application"
          aria-label="赛事世界分布图，按类型筛选圆点，拖动平移、滚轮缩放"
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
            <rect x={0} y={0} width={W} height={H} fill="var(--ocean)" />
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              <path d={LAND_D} className="wmap__land" />

              {spots.map((s) => {
                const n = s.ids.length;
                const r = Math.max(4.5, Math.min(9, 4 + (n / maxN) * 6));
                const isSel = sel?.label === s.label;
                const anyHover = tip?.s.label === s.label;
                const h = byId.get(s.ids[0]);
                const toStage = (svg: SVGSVGElement, x: number, y: number) => {
                  const rect = svg.getBoundingClientRect();
                  if (typeof svg.getScreenCTM === 'function' && typeof svg.createSVGPoint === 'function') {
                    const pt = svg.createSVGPoint();
                    pt.x = x;
                    pt.y = y;
                    const m = svg.getScreenCTM();
                    if (m) {
                      const c = pt.matrixTransform(m);
                      return { x: c.x - rect.left, y: c.y - rect.top };
                    }
                  }
                  return { x: (rect.width / W) * x, y: (rect.height / H) * y };
                };
                return (
                  <g
                    key={s.label}
                    className="wmdot"
                    tabIndex={0}
                    style={{ cursor: 'pointer' }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setSel(isSel ? null : s)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSel(isSel ? null : s);
                      }
                    }}
                    onPointerEnter={(e) => {
                      const svg = (e.currentTarget as Element).closest('svg');
                      if (!svg) return;
                      const p = toStage(svg as SVGSVGElement, s.x, s.y);
                      setTip({ s, x: p.x, y: p.y });
                    }}
                    onPointerMove={(e) => {
                      const svg = (e.currentTarget as Element).closest('svg');
                      if (!svg) return;
                      const p = toStage(svg as SVGSVGElement, s.x, s.y);
                      setTip({ s, x: p.x, y: p.y });
                    }}
                    onPointerLeave={() => setTip(null)}
                    onBlur={() => setTip(null)}
                  >
                    {isSel && <circle cx={s.x} cy={s.y} r={r + 5} className="wmdot__halo" />}
                    <circle
                      cx={s.x}
                      cy={s.y}
                      r={r}
                      fill={h ? CATEGORY[h.category].color : 'var(--accent)'}
                      stroke="var(--paper-2)"
                      strokeWidth={anyHover || isSel ? 2.5 : 1.4}
                    />
                  </g>
                );
              })}
            </g>
          </svg>

          {tip && (
            <div className="wmap__tip" style={{ left: tip.x, top: tip.y }}>
              <b>{tip.s.label}</b>
              <span className="num">
                {tip.s.ids.filter((id) => cat === 'all' || evOf(id)?.category === cat).length} 场赛事
              </span>
              <ul>
                {tip.s.ids
                  .filter((id) => cat === 'all' || evOf(id)?.category === cat)
                  .slice(0, 4)
                  .map((id) => {
                    const e = byId.get(id);
                    return e ? <li key={id}>{e.name}</li> : null;
                  })}
              </ul>
            </div>
          )}
        </div>
        <div className="wmap__hint">点击类型筛选圆点 · 拖动平移 · 滚轮缩放 · 点击圆点查看该城</div>
      </div>

      <div className="wmap__meta">
        <div className="row__meta">
          <span className="tag">{SPOTS.length} 个城市 / 会场</span>
          <span className="tag">{PLACES.length} 条城市记录</span>
          <span className="tag">纯线上赛事不计入</span>
        </div>
        <p className="note" style={{ marginTop: 8 }}>
          本图为<b>赛事分布示意图</b>，仅呈现主办城市/会场，不表示国界与主权主张；中国行政疆域、南海诸岛等以国家测绘部门发布的官方地图为准。
          圆点大小 = 同城赛事数量，颜色 = 主办方类型。
        </p>
      </div>

      {sel && (selEvents.length > 0 || selWinners.length > 0) && (
        <div className="wm-panel view">
          <div className="winners__h">
            <span>
              {sel.label} · {selEvents.length} 场赛事 · {selWinners.length} 条获奖
            </span>
            <button className="rail__reset" style={{ marginTop: 0 }} onClick={() => setSel(null)}>
              关闭
            </button>
          </div>

          <div className="list">
            {selEvents.map((h, i) => (
              <article className="row" key={h.id}>
                <button
                  className="row__btn"
                  style={{ gridTemplateColumns: '26px minmax(0,1fr) 150px 96px' }}
                  onClick={() => onOpen(h.id)}
                  title={`查看 ${h.nameCn !== h.name ? h.nameCn : h.name} 详情`}
                  aria-label={`查看 ${h.nameCn !== h.name ? h.nameCn : h.name} 详情`}
                >
                  <span className="row__idx num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="row__main">
                    <span className="row__name">{h.nameCn !== h.name ? h.nameCn : h.name}</span>
                    <span className="row__org">
                      <b>{h.org}</b> · {h.theme}
                    </span>
                    <span className="row__meta">
                      <span className="tag tag--cat" style={{ ['--dot' as string]: CATEGORY[h.category].color }}>
                        {CATEGORY[h.category].label}
                      </span>
                      <span className="tag">{FORMAT[h.format].label}</span>
                      <span className="tag num">{h.winners.length} 条获奖</span>
                    </span>
                  </span>
                  <span className="row__col row__c-prize">
                    <b>奖金</b>
                    {h.prize.length > 46 ? h.prize.slice(0, 44) + '…' : h.prize}
                  </span>
                  <span className="row__col wm-go">
                    <b>详情</b>
                    <span className="wm-go-link">
                      查看 <ArrowUpRight size={12} />
                    </span>
                  </span>
                </button>
              </article>
            ))}
          </div>

          {selWinners.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <div className="winners__h">
                <span>该城获奖项目（可点开看详情）</span>
              </div>
              <div className="list">
                {selWinners.map(({ w, e }, i) => (
                  <WinnerExpand key={`${e.id}-${i}`} w={w} h={e} idx={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { SPOTS };
