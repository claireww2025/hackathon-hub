import { useState } from 'react';
import type { Hackathon, Winner } from '../types';
import { CATEGORY, FORMAT, REGION } from '../data';
import { ArrowUpRight } from './Icons';

/**
 * 全站统一的「获奖项目」可展开详情。
 * 点击项目名展开：做什么 / 为什么获奖 / 团队 / 原介绍链接 + 所属赛事小卡。
 */
export default function WinnerExpand({ w, h, idx }: { w: Winner; h: Hackathon; idx: number }) {
  const [open, setOpen] = useState(false);
  const award = (w.why || '').slice(0, 30) + ((w.why || '').length > 30 ? '…' : '');

  return (
    <article className={`wxp ${open ? 'is-open' : ''}`}>
      <button
        className="wxp__btn"
        aria-expanded={open}
        aria-controls={`wd-${h.id}-${idx}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="wxp__y num">{w.year}</span>
        <span className="wxp__main">
          <span className="wxp__p">{w.project}</span>
          <span className="wxp__awd">{award}</span>
        </span>
        {w.team && <span className="wxp__team">{w.team}</span>}
        <span className="wxp__go" aria-hidden>
          {open ? '收起' : '详情'}
        </span>
      </button>

      <div className="detail">
        <div className="detail__in">
          <div className="wxp__body" id={`wd-${h.id}-${idx}`}>
            <div className="wxp__cols">
              <div>
                {w.what && (
                  <p className="wxp__what">
                    <b>项目做了什么</b>
                    {w.what}
                  </p>
                )}
                {w.why && (
                  <p className="wxp__why">
                    <b>为什么获奖</b>
                    {w.why}
                  </p>
                )}
                {w.team && (
                  <p className="wxp__meta">
                    团队 / 作者：<span>{w.team}</span>
                  </p>
                )}
                <div className="detail__links">
                  {w.url && (
                    <a className="linkout" href={w.url} target="_blank" rel="noreferrer noopener">
                      原介绍链接 <ArrowUpRight />
                    </a>
                  )}
                  <a className="linkout" href={h.url} target="_blank" rel="noreferrer noopener">
                    {h.nameCn !== h.name ? h.nameCn : h.name} 官网 <ArrowUpRight />
                  </a>
                </div>
                {!w.url && (
                  <p className="wxp__note">该届官方公示未提供单独介绍页（以赛事官网/获奖公示为准）。</p>
                )}
              </div>

              <aside className="wxp__event">
                <span className="wxp__tag" style={{ background: CATEGORY[h.category].color }} />
                <div className="wxp__eorg">
                  {h.org} · {REGION[h.region]} · {FORMAT[h.format].label}
                </div>
                <div className="wxp__ename">{h.nameCn !== h.name ? h.nameCn : h.name}</div>
                <div className="wxp__eprize">奖金：{h.prize.length > 52 ? h.prize.slice(0, 50) + '…' : h.prize}</div>
                {h.theme && h.theme !== '—' && <div className="wxp__etheme">{h.theme}</div>}
              </aside>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
