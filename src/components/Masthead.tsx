import { useEffect, useState } from 'react';
import { hackathons, upcoming, allWinners } from '../data';

const onlineCount = hackathons.filter((h) => h.format === 'online').length;

const STATS = [
  { v: hackathons.length, l: '收录赛事 · 2024—2026' },
  { v: allWinners.length, l: '获奖项目记录' },
  { v: onlineCount, l: '可纯线上参加' },
  { v: upcoming.items.length, l: '当前仍可报名' },
];

/** ease-out-quart count up, honours prefers-reduced-motion */
function useCountUp(target: number, started: boolean, dur = 950): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!started) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setV(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, target, dur]);
  return v;
}

function Stat({ v, l, i, started }: { v: number; l: string; i: number; started: boolean }) {
  const n = useCountUp(v, started);
  return (
    <div className="stat" style={{ animationDelay: `${320 + i * 90}ms` }}>
      <div className="stat__v num">{n}</div>
      <div className="stat__l">{l}</div>
    </div>
  );
}

export default function Masthead() {
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <header className="masthead shell">
      <div className="masthead__top">
        <span>黑客松档案 · Hackathon Hub</span>
        <span className="live">每半月自动更新 · 数据更新于 {upcoming.updatedAt}</span>
      </div>

      <h1 className="masthead__title">
        黑客松<em>档案</em>
      </h1>

      <div className="masthead__deck">
        <p className="masthead__lede">
          独立开发者没团队、没名气，黑客松还值得冲吗？这份档案翻完{' '}
          <b>{allWinners.length} 条真实获奖记录</b>：能。从学生赛到政府揭榜，
          近三年 <b>{hackathons.length} 场</b>赛事要什么人、给什么，官网原链随你核。
        </p>
        <div className="masthead__stats">
          {STATS.map((s, i) => (
            <Stat key={s.l} v={s.v} l={s.l} i={i} started={started} />
          ))}
        </div>
      </div>
    </header>
  );
}
