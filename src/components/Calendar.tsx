import { useMemo, useState } from 'react';
import { calEvents, today, MONTHS_FULL, deadlineLabel, daysUntil, urgency } from '../data';
import { ChevronLeft, ChevronRight } from './Icons';

const DOW = ['一', '二', '三', '四', '五', '六', '日'];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function Calendar() {
  const [cur, setCur] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [showEst, setShowEst] = useState(false);

  const eventsByDay = useMemo(() => {
    const m: Record<string, typeof calEvents> = {};
    for (const e of calEvents) {
      if (e.kind === 'est' && !showEst) continue;
      const k = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}-${String(
        e.date.getDate(),
      ).padStart(2, '0')}`;
      (m[k] ||= []).push(e);
    }
    return m;
  }, [showEst]);

  const cells = useMemo(() => {
    const first = new Date(cur.getFullYear(), cur.getMonth(), 1);
    // monday-first
    const lead = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - lead);
    const out: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push(d);
    }
    return out;
  }, [cur]);

  const shift = (n: number) => setCur(new Date(cur.getFullYear(), cur.getMonth() + n, 1));
  const atFloor = cur.getFullYear() === today.getFullYear() - 1 && cur.getMonth() === 0;
  const atCeil = cur.getFullYear() === today.getFullYear() + 2 && cur.getMonth() === 11;

  const monthCount = useMemo(() => {
    const k = monthKey(cur);
    return calEvents.filter((e) => monthKey(e.date) === k);
  }, [cur]);

  return (
    <div>
      <div className="cal__bar">
        <div className="cal__nav">
          <button className="navb" onClick={() => shift(-1)} disabled={atFloor} aria-label="上个月">
            <ChevronLeft />
          </button>
          <div className="cal__m num">
            {cur.getFullYear()} · {MONTHS_FULL[cur.getMonth()]}
          </div>
          <button className="navb" onClick={() => shift(1)} disabled={atCeil} aria-label="下个月">
            <ChevronRight />
          </button>
          <button
            className="navb"
            style={{ width: 'auto', padding: '0 10px', fontSize: 12.5 }}
            onClick={() => setCur(new Date(today.getFullYear(), today.getMonth(), 1))}
          >
            回到本月
          </button>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="cal__toggle">
            <input type="checkbox" checked={showEst} onChange={(e) => setShowEst(e.target.checked)} />
            显示往年档期（虚线为预估，需自行核对）
          </label>
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }} className="num">
            本月 {monthCount.length} 条
          </span>
        </div>
      </div>

      <div className="cal__grid cal__anim" key={monthKey(cur)} role="grid">
        {DOW.map((d) => (
          <div className="cal__dow" key={d}>
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          const out = d.getMonth() !== cur.getMonth();
          const isToday =
            d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const evs = eventsByDay[k] || [];
          return (
            <div className="cal__cell" key={i} data-out={out} data-today={isToday}>
              <div className="cal__dn num">{d.getDate()}</div>
              {evs.slice(0, 3).map((e, j) => {
                const dl = e.kind === 'deadline' ? daysUntil(k) : null;
                return (
                  <a
                    className="cal__ev"
                    key={j}
                    data-k={e.kind}
                    href={e.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    title={`${e.title} · ${e.sub}`}
                  >
                    <span>
                      {e.kind === 'deadline' ? '截止 ' : e.kind === 'open' ? '开赛 ' : ''}
                      {e.title}
                    </span>
                    {e.kind === 'deadline' && (
                      <span className="urg num" data-l={urgency(dl)}>
                        {deadlineLabel(dl)}
                      </span>
                    )}
                  </a>
                );
              })}
              {evs.length > 3 && (
                <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 3 }}>+{evs.length - 3}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
