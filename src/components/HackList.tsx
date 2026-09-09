import { useState } from 'react';
import { CATEGORY, FORMAT, FRIENDLY, MONTHS, REGION } from '../data';
import type { Hackathon } from '../types';
import { ArrowUpRight, Globe, Pin, Users } from './Icons';
import WinnerExpand from './WinnerExpand';

function MonthStrip({ months }: { months: number[] }) {
  return (
    <div className="row__months" aria-hidden>
      {MONTHS.map((_, i) => (
        <i key={i} className="row__m" data-on={months.includes(i + 1)} title={MONTHS[i]} />
      ))}
    </div>
  );
}

function Detail({ h }: { h: Hackathon }) {
  return (
    <div className="detail__pad">
      <div>
        <dl className="dl">
          <div className="dl__r">
            <dt className="dl__k">是什么</dt>
            <dd className="dl__v">{h.description}</dd>
          </div>
          <div className="dl__r">
            <dt className="dl__k">要求</dt>
            <dd className="dl__v">{h.requirements}</dd>
          </div>
          <div className="dl__r">
            <dt className="dl__k">主题</dt>
            <dd className="dl__v">{h.theme}</dd>
          </div>
          <div className="dl__r">
            <dt className="dl__k">奖金</dt>
            <dd className="dl__v">{h.prize}</dd>
          </div>
          <div className="dl__r">
            <dt className="dl__k">形式</dt>
            <dd className="dl__v">
              {FORMAT[h.format].label}
              {h.location && h.location !== '—' ? ` · ${h.location}` : ''}
            </dd>
          </div>
          <div className="dl__r">
            <dt className="dl__k">周期</dt>
            <dd className="dl__v">
              {{ annual: '每年一届', biannual: '每年两届', quarterly: '每季一场', monthly: '每月滚动', oneoff: '单届 / 不定期' }[h.frequency]}
              {h.typicalMonths.length ? ` · 通常在 ${h.typicalMonths.map((m) => MONTHS[m - 1]).join('、')}` : ''}
            </dd>
          </div>
          <div className="dl__r">
            <dt className="dl__k">单人</dt>
            <dd className="dl__v">
              {h.soloAllowed ? '允许个人或小队' : '须组队'} · 对华资格：{FRIENDLY[h.cnFriendly].label}
            </dd>
          </div>
        </dl>

        {h.editions.length > 0 && (
          <>
            <div className="winners__h" style={{ marginTop: 24 }}>
              <span>举办记录</span>
              <span className="num">{h.editions.length} 届</span>
            </div>
            {h.editions.map((e, i) => (
              <div className="win" key={i}>
                <div className="win__top">
                  <span className="win__y num">{e.year}</span>
                  <span className="win__p" style={{ fontFamily: 'var(--font-body)', fontSize: 13.5 }}>
                    {e.dates || '日期待公布'}
                  </span>
                </div>
                {e.note && <div className="win__what">{e.note}</div>}
              </div>
            ))}
          </>
        )}

        <div className="detail__links">
          <a className="linkout" href={h.url} target="_blank" rel="noreferrer noopener">
            官方网站 <ArrowUpRight />
          </a>
          {h.editions[0]?.url && h.editions[0].url !== h.url && (
            <a className="linkout" href={h.editions[0].url} target="_blank" rel="noreferrer noopener">
              最近一届页面 <ArrowUpRight />
            </a>
          )}
          <span className="conf" data-c={h._confidence}>
            <i />
            信息可信度：{{ high: '高（官方页核实）', medium: '中（二手但多源一致）', low: '低（孤证，需复核）' }[h._confidence]}
          </span>
        </div>
      </div>

      <div>
        <div className="winners__h">
          <span>获奖项目</span>
          <span className="num">{h.winners.length}</span>
        </div>
        {h.winners.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
            公开渠道未检索到获奖公示。这类赛事通常只在现场公布名次，或公示页未做索引。
          </p>
        ) : (
          h.winners.map((w, i) => <WinnerExpand key={i} w={w} h={h} idx={i} />)
        )}
      </div>
    </div>
  );
}

export default function HackList({ items }: { items: Hackathon[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="empty">
        <h3 className="empty__h">没有匹配的赛事</h3>
        <p className="empty__p">试试放宽筛选条件，或者清空搜索关键词。</p>
      </div>
    );
  }

  return (
    <div className="list">
      {items.map((h, i) => {
        const isOpen = open === h.id;
        return (
          <article className="row" key={h.id} data-open={isOpen}>
            <button
              className="row__btn"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : h.id)}
            >
              <span className="row__idx num">{String(i + 1).padStart(2, '0')}</span>

              <span className="row__main">
                <span className="row__name">
                  {h.nameCn !== h.name ? h.nameCn : h.name}
                  {h.nameCn !== h.name && <span className="row__cn">{h.name}</span>}
                </span>
                <span className="row__org">
                  <b>{h.org}</b> · {REGION[h.region]}
                </span>
                <span className="row__desc">{h.description}</span>
                <span className="row__meta">
                  <span className="tag tag--cat" style={{ ['--dot' as string]: CATEGORY[h.category].color }}>
                    {CATEGORY[h.category].label}
                  </span>
                  <span className="tag">{FORMAT[h.format].short}</span>
                  {h.soloAllowed && <span className="tag">可 solo</span>}
                  {h.cnFriendly === 'yes' && <span className="tag tag--accent">对华开放</span>}
                  {h.cnFriendly === 'no' && <span className="tag">对华受限</span>}
                </span>
              </span>

              <span className="row__col row__c-prize">
                <b>奖金</b>
                {h.prize.length > 60 ? h.prize.slice(0, 58) + '…' : h.prize}
              </span>

              <span className="row__col row__c-months">
                <b>档期</b>
                <MonthStrip months={h.typicalMonths} />
              </span>

              <span className="row__col">
                <b>近年</b>
                <span className="num">{h.years.length ? h.years.join(' · ') : '—'}</span>
              </span>
            </button>

            <div className="detail">
              <div className="detail__in">
                <Detail h={h} />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export { Globe, Pin, Users };
