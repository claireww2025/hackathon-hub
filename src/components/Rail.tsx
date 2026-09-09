import { CATEGORY, FORMAT, hackathons } from '../data';
import type { Hackathon, Category, Format, Region } from '../types';

export interface Filters {
  region: Region | 'all';
  category: Category | 'all';
  format: Format | 'all';
  solo: boolean;
  cnOk: boolean;
  year: number | 'all';
  q: string;
}

export const EMPTY: Filters = {
  region: 'all',
  category: 'all',
  format: 'all',
  solo: false,
  cnOk: false,
  year: 'all',
  q: '',
};

type Dim = 'region' | 'category' | 'format' | 'year';

function pass(h: Hackathon, f: Filters, except?: Dim | 'flags'): boolean {
  if (except !== 'region' && f.region !== 'all' && h.region !== f.region) return false;
  if (except !== 'category' && f.category !== 'all' && h.category !== f.category) return false;
  if (except !== 'format' && f.format !== 'all' && h.format !== f.format) return false;
  if (except !== 'flags' && f.solo && !h.soloAllowed) return false;
  if (except !== 'flags' && f.cnOk && h.cnFriendly !== 'yes') return false;
  if (except !== 'year' && f.year !== 'all' && !h.years.includes(f.year)) return false;
  const q = f.q.trim().toLowerCase();
  if (q) {
    const hay = `${h.name} ${h.nameCn} ${h.org} ${h.theme} ${h.description} ${h.prize} ${h.location}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function applyFilters(f: Filters): Hackathon[] {
  return hackathons.filter((h) => pass(h, f));
}

/** counts for a dimension, ignoring that dimension's own selection */
function counts(f: Filters, dim: Dim): Record<string, number> {
  const out: Record<string, number> = {};
  for (const h of hackathons) {
    if (!pass(h, f, dim)) continue;
    const vals =
      dim === 'year'
        ? h.years.map(String)
        : [dim === 'region' ? h.region : dim === 'category' ? h.category : h.format];
    for (const v of vals) out[v] = (out[v] || 0) + 1;
  }
  return out;
}

function flagCount(f: Filters, which: 'solo' | 'cnOk'): number {
  return hackathons.filter((h) => (which === 'solo' ? h.soloAllowed : h.cnFriendly === 'yes') && pass(h, f, 'flags'))
    .length;
}

interface Props {
  f: Filters;
  set: (patch: Partial<Filters>) => void;
  reset: () => void;
}

export default function Rail({ f, set, reset }: Props) {
  const filtered = applyFilters(f);
  const rc = counts(f, 'region');
  const cc = counts(f, 'category');
  const fc = counts(f, 'format');
  const yc = counts(f, 'year');
  const years = Array.from(new Set(hackathons.flatMap((h) => h.years))).sort((a, b) => b - a);

  const dirty =
    f.region !== 'all' ||
    f.category !== 'all' ||
    f.format !== 'all' ||
    f.solo ||
    f.cnOk ||
    f.year !== 'all' ||
    f.q.trim() !== '';

  const total = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0);

  return (
    <aside className="rail">
      <div className="rail__grp">
        <div className="rail__t">检索</div>
        <input
          className="search"
          type="search"
          value={f.q}
          placeholder="赛事 / 主办方 / 主题"
          aria-label="搜索赛事"
          onChange={(e) => set({ q: e.target.value })}
        />
      </div>

      <div className="rail__grp">
        <div className="rail__t">地域</div>
        <div className="rail__opts">
          <button className="opt" aria-pressed={f.region === 'all'} onClick={() => set({ region: 'all' })}>
            全部<span className="opt__n">{total(rc)}</span>
          </button>
          <button className="opt" aria-pressed={f.region === 'intl'} onClick={() => set({ region: 'intl' })}>
            国际<span className="opt__n">{rc.intl ?? 0}</span>
          </button>
          <button className="opt" aria-pressed={f.region === 'cn'} onClick={() => set({ region: 'cn' })}>
            国内<span className="opt__n">{rc.cn ?? 0}</span>
          </button>
        </div>
      </div>

      <div className="rail__grp">
        <div className="rail__t">类型</div>
        <div className="rail__opts">
          <button className="opt" aria-pressed={f.category === 'all'} onClick={() => set({ category: 'all' })}>
            全部<span className="opt__n">{total(cc)}</span>
          </button>
          {(Object.keys(CATEGORY) as Category[]).map((k) => (
            <button
              key={k}
              className="opt"
              aria-pressed={f.category === k}
              onClick={() => set({ category: k })}
              title={CATEGORY[k].blurb}
            >
              <i className="opt__dot" style={{ background: CATEGORY[k].color }} />
              {CATEGORY[k].label}
              <span className="opt__n">{cc[k] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rail__grp">
        <div className="rail__t">参赛形式</div>
        <div className="rail__opts">
          <button className="opt" aria-pressed={f.format === 'all'} onClick={() => set({ format: 'all' })}>
            全部<span className="opt__n">{total(fc)}</span>
          </button>
          {(Object.keys(FORMAT) as Format[]).map((k) => (
            <button key={k} className="opt" aria-pressed={f.format === k} onClick={() => set({ format: k })}>
              {FORMAT[k].label}
              <span className="opt__n">{fc[k] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rail__grp">
        <div className="rail__t">有举办记录的年份</div>
        <div className="rail__opts">
          <button className="opt" aria-pressed={f.year === 'all'} onClick={() => set({ year: 'all' })}>
            全部<span className="opt__n">{total(yc)}</span>
          </button>
          {years.map((y) => (
            <button key={y} className="opt" aria-pressed={f.year === y} onClick={() => set({ year: y })}>
              <span className="num">{y}</span>
              <span className="opt__n">{yc[String(y)] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rail__grp">
        <div className="rail__t">只看</div>
        <div className="rail__opts">
          <button className="opt" aria-pressed={f.solo} onClick={() => set({ solo: !f.solo })}>
            允许单人参赛<span className="opt__n">{flagCount(f, 'solo')}</span>
          </button>
          <button className="opt" aria-pressed={f.cnOk} onClick={() => set({ cnOk: !f.cnOk })}>
            不排除中国大陆<span className="opt__n">{flagCount(f, 'cnOk')}</span>
          </button>
        </div>
        {dirty && (
          <button className="rail__reset" onClick={reset}>
            清除全部筛选（当前 {filtered.length} 场）
          </button>
        )}
      </div>
    </aside>
  );
}
