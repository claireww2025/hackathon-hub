import { FORMAT, FRIENDLY, REGION, daysUntil, deadlineLabel, urgency, upcoming, upcomingLive } from '../data';
import { ArrowUpRight } from './Icons';

const ORDER: Record<'online' | 'hybrid' | 'onsite', number> = { online: 0, hybrid: 1, onsite: 2 };

export default function UpcomingList() {
  const items = upcomingLive
    .slice()
    .filter((u) => (daysUntil(u.deadline) ?? -1) >= 0)
    .sort(
      (a, b) =>
        (daysUntil(a.deadline) ?? 9e9) - (daysUntil(b.deadline) ?? 9e9) || ORDER[a.format] - ORDER[b.format],
    );

  return (
    <div>
      <div className="upd__bar">
        <span>
          数据更新于 <b className="num">{upcoming.updatedAt}</b> ｜ 下次更新{' '}
          <b className="num">{upcoming.nextUpdate}</b> ｜ 每月 1 日与 15 日自动刷新近期赛事，并核对已完结赛事的获奖结果
        </span>
        <span className="num">{items.length} 场仍可报名</span>
      </div>

      <div className="list">
        {items.map((u, i) => {
          const dl = daysUntil(u.deadline);
          const lvl = urgency(dl);
          return (
            <article className="row" key={u.id}>
              <div className="row__btn" style={{ gridTemplateColumns: '26px minmax(0,1fr) 128px 150px 132px' }}>
                <span className="row__idx num">{String(i + 1).padStart(2, '0')}</span>

                <span className="row__main">
                  <span className="row__name">{u.name}</span>
                  <span className="row__org">
                    <b>{u.org}</b> · {REGION[u.region]} · {u.theme}
                  </span>
                  {u.note && <span className="row__desc">{u.note}</span>}
                  <span className="row__meta">
                    <span
                      className="tag tag--cat"
                      style={{
                        ['--dot' as string]:
                          u.format === 'online'
                            ? 'var(--c-vendor)'
                            : u.format === 'hybrid'
                              ? 'var(--c-platform)'
                              : 'var(--c-startup)',
                      }}
                    >
                      {FORMAT[u.format].label}
                    </span>
                    {u.solo && <span className="tag">可 solo</span>}
                    <span className={u.cnFriendly === 'yes' ? 'tag tag--accent' : 'tag'}>
                      对华：{FRIENDLY[u.cnFriendly].label}
                    </span>
                  </span>
                </span>

                <span className="row__col row__c-prize">
                  <b>奖金</b>
                  {u.prize}
                </span>

                <span className="row__col">
                  <b>赛期</b>
                  <span className="num">{u.window}</span>
                </span>

                <span className="row__col row__c-months">
                  <b>截止</b>
                  <span className="num" style={{ fontSize: 13 }}>
                    {u.deadline}
                  </span>
                  <span className="urg num" data-l={lvl} style={{ display: 'block', fontWeight: 600 }}>
                    {deadlineLabel(dl)}
                  </span>
                  <a
                    className="linkout"
                    style={{ marginTop: 6, fontSize: 12.5 }}
                    href={u.url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    报名页 <ArrowUpRight />
                  </a>
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <p className="note" style={{ maxWidth: '62ch' }}>
        报名前请自行打开赛事页的规则（通常在 <code>/rules</code>）核对 excluded countries 与资格条款。
        标准排除名单一般是 Crimea、Cuba、Iran、Syria、North Korea、Sudan、Belarus、Russia + OFAC +
        Quebec，中国大陆不在其中——但「能不能参加」永远是逐赛问题。
      </p>
    </div>
  );
}
