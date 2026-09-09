import { useEffect, useRef, useState } from 'react';
import { CATEGORY, FORMAT, MONTHS, hackathons, FRIENDLY, REGION } from '../data';
import type { Hackathon } from '../types';
import { ArrowUpRight } from './Icons';

const mapped = hackathons
  .filter((h) => h.typicalMonths.length > 0 && h.typicalMonths.length < 12)
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name));

export default function YearMap() {
  const [sel, setSel] = useState<Hackathon | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const perMonth = MONTHS.map((_, i) => mapped.filter((h) => h.typicalMonths.includes(i + 1)));
  const max = Math.max(...perMonth.map((m) => m.length));

  // reveal month columns as they scroll into view
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
          实色 = 线上可参加 ｜ 淡化 = 需到场
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
                  onClick={() => setSel(h.id === sel?.id ? null : h)}
                  title={`${h.nameCn} · ${h.org}`}
                >
                  <span className="ymi__t">{h.nameCn !== h.name ? h.nameCn : h.name}</span>
                  <span className="ymi__o">{h.org}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {sel && (
        <div
          style={{
            marginTop: 24,
            borderTop: '2px solid var(--ink)',
            paddingTop: 16,
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)',
            gap: 32,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: 0, fontWeight: 500 }}>
                {sel.nameCn !== sel.name ? sel.nameCn : sel.name}
              </h3>
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{sel.name}</span>
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 6 }}>
              <b style={{ color: 'var(--ink)' }}>{sel.org}</b> · {REGION[sel.region]} ·{' '}
              {CATEGORY[sel.category].label} · {FORMAT[sel.format].label}
            </div>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 10 }}>{sel.description}</p>
            <div className="row__meta" style={{ marginTop: 10 }}>
              <span className="tag">{sel.prize.length > 48 ? sel.prize.slice(0, 46) + '…' : sel.prize}</span>
              <span className="tag">{sel.soloAllowed ? '可 solo' : '须组队'}</span>
              <span className="tag">对华：{FRIENDLY[sel.cnFriendly].label}</span>
              <span className="tag">档期：{sel.typicalMonths.map((m) => MONTHS[m - 1]).join('、')}</span>
            </div>
            <a className="linkout" style={{ marginTop: 14 }} href={sel.url} target="_blank" rel="noreferrer noopener">
              官方网站 <ArrowUpRight />
            </a>
          </div>
          <div>
            <div className="winners__h">
              <span>获奖项目</span>
              <span className="num">{sel.winners.length}</span>
            </div>
            {sel.winners.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>未检索到公开获奖公示。</p>
            ) : (
              sel.winners.slice(0, 4).map((w, i) => (
                <div className="win" key={i}>
                  <div className="win__top">
                    <span className="win__y num">{w.year}</span>
                    <span className="win__p">{w.project}</span>
                  </div>
                  <div className="win__what">{w.what}</div>
                  <div className="win__why">{w.why}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
