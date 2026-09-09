import { useMemo, useState } from 'react';
import { WINNER_YEARS, allWinners } from '../data';
import WinnerExpand from './WinnerExpand';

export default function WinnersArchive() {
  const [q, setQ] = useState('');
  const [year, setYear] = useState<number | 'all'>('all');

  const grouped = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const filtered = allWinners.filter((w) => {
      if (year !== 'all' && w.year !== year) return false;
      if (!kw) return true;
      return `${w.project} ${w.what} ${w.why} ${w.parent.name} ${w.parent.nameCn} ${w.parent.org} ${w.team ?? ''}`
        .toLowerCase()
        .includes(kw);
    });
    const map = new Map<number, typeof filtered>();
    for (const w of filtered) {
      if (!map.has(w.year)) map.set(w.year, []);
      map.get(w.year)!.push(w);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [q, year]);

  const orgCount = new Set(allWinners.map((w) => w.parent.id)).size;

  return (
    <div>
      <div className="cal__bar" style={{ borderTop: 'none' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="search"
            style={{ width: 260 }}
            type="search"
            value={q}
            placeholder="搜索项目 / 团队 / 技术关键词"
            aria-label="搜索获奖项目"
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="rail__opts" style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
            <button className="opt" aria-pressed={year === 'all'} onClick={() => setYear('all')}>
              全部年份
            </button>
            {WINNER_YEARS.map((y) => (
              <button key={y} className="opt" aria-pressed={year === y} onClick={() => setYear(y)}>
                <span className="num">{y}</span>
              </button>
            ))}
          </div>
        </div>
        <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }} className="num">
          覆盖 {orgCount} 场已完结赛事 · {allWinners.length} 条记录
        </span>
      </div>

      <p className="note" style={{ maxWidth: '62ch', marginBottom: 28 }}>
        点任意项目可展开查看它<b>做了什么、为什么获奖</b>，以及所属赛事与奖金；带链接的条目会给出原介绍出处。
        想按赛事类型浏览，切到「全年档案」逐场查看。
      </p>

      {grouped.length === 0 && (
        <div className="empty">
          <h3 className="empty__h">没有匹配的获奖项目</h3>
          <p className="empty__p">换个关键词试试，比如「Agent」「医疗」「语音」。</p>
        </div>
      )}

      {grouped.map(([y, list]) => (
        <section className="wy" key={y}>
          <div className="wy__h">
            <span className="wy__y num">{y}</span>
            <span className="wy__c num">{list.length} 条获奖记录</span>
          </div>
          <div className="list">
            {list.map((w, i) => (
              <WinnerExpand key={`${w.parent.id}-${i}`} w={w} h={w.parent} idx={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
