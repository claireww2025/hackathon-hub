import { useEffect, useRef } from 'react';
import { CATEGORY, MONTHS, hackathons, REGION } from '../data';

const mapped = hackathons
  .filter((h) => h.typicalMonths.length > 0 && h.typicalMonths.length < 12)
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name));

export default function YearMap({ onOpen }: { onOpen: (id: string) => void }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const perMonth = MONTHS.map((_, i) => mapped.filter((h) => h.typicalMonths.includes(i + 1)));
  const max = Math.max(...perMonth.map((m) => m.length));

  useEffect(() => {
    const host = gridRef.current;
    if (!host || typeof IntersectionObserver === 'undefined') {
      host?.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -24px 0px' },
    );
    host.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div>
      <div className="ymap__legend">
        {(Object.keys(CATEGORY) as (keyof typeof CATEGORY)[]).map((k) => (
          <span key={k}>
            <i className="dsw" style={{ background: CATEGORY[k].color }} />
            {CATEGORY[k].label}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', color: 'var(--ink-3)' }}>
          实色 = 线上可参加 ｜ 淡化 = 需到场 ｜ 悬停看全名，点击直达赛事详情
        </span>
      </div>

      <div className="ymap" ref={gridRef}>
        {perMonth.map((list, i) => (
          <div className="ym reveal" key={i} style={{ ['--i' as string]: Math.min(i, 11) }}>
            <div className="ym__h">
              <span className="ym__n">{MONTHS[i]}</span>
              <span className="ym__c num">{list.length}</span>
            </div>
            <div className="ym__bar">
              <i style={{ width: `${max ? (list.length / max) * 100 : 0}%` }} />
            </div>
            <div className="ym__items">
              {list.map((h) => (
                <button
                  key={h.id}
                  className="ymi"
                  data-f={h.format}
                  style={{ ['--dot' as string]: CATEGORY[h.category].color }}
                  onClick={() => onOpen(h.id)}
                  title={`${h.nameCn !== h.name ? h.nameCn : h.name}（${h.org}）· ${REGION[h.region]} · 点击查看详情`}
                  aria-label={`查看 ${h.nameCn !== h.name ? h.nameCn : h.name} 详情`}
                >
                  <span className="ymi__t">{h.nameCn !== h.name ? h.nameCn : h.name}</span>
                  <span className="ymi__o">{h.org}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="note" style={{ marginTop: 16, maxWidth: '70ch' }}>
        提示：地图里点击任意赛事会跳到「全年档案」并展开该赛事的详情（含奖金、要求、获奖项目与官网链接）；想快速回地图，点顶栏 tab 即可。
      </p>
    </div>
  );
}
