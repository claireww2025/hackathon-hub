import { useEffect, useMemo, useState } from 'react';
import Masthead from './components/Masthead';
import Rail, { EMPTY, applyFilters, type Filters } from './components/Rail';
import HackList from './components/HackList';
import YearMap from './components/YearMap';
import Calendar from './components/Calendar';
import UpcomingList from './components/UpcomingList';
import WinnersArchive from './components/WinnersArchive';
import WorldMap, { SPOTS } from './components/WorldMap';
import { allWinners, hackathons, upcoming, upcomingLive } from './data';

type Tab = 'upcoming' | 'archive' | 'world' | 'map' | 'calendar' | 'winners';

const TABS: { id: Tab; label: string; n: number }[] = [
  { id: 'upcoming', label: '近期可参加', n: upcomingLive.length },
  { id: 'archive', label: '全年档案', n: hackathons.length },
  { id: 'world', label: '世界地图', n: SPOTS.length },
  { id: 'map', label: '参与地图', n: 12 },
  { id: 'calendar', label: '日历视图', n: 0 },
  { id: 'winners', label: '获奖档案', n: allWinners.length },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('upcoming');
  const [f, setF] = useState<Filters>(EMPTY);

  useEffect(() => {
    const t = (window.location.hash.replace('#', '') || 'upcoming') as Tab;
    if (TABS.some((x) => x.id === t)) setTab(t);
    const onHash = () => {
      const v = (window.location.hash.replace('#', '') || 'upcoming') as Tab;
      if (TABS.some((x) => x.id === v)) setTab(v);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const switchTab = (id: Tab) => {
    setTab(id);
    if (window.location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
  };

  const set = (p: Partial<Filters>) => setF((s) => ({ ...s, ...p }));

  const items = useMemo(() => applyFilters(f), [f]);

  return (
    <>
      <Masthead />

      <nav className="tabs">
        <div className="shell tabs__inner" role="tablist" aria-label="视图切换">
          {TABS.map((t) => (
            <button
              key={t.id}
              className="tab"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => switchTab(t.id)}
            >
              {t.label}
              {t.n > 0 && <span className="tab__n num">{t.n}</span>}
            </button>
          ))}
        </div>
      </nav>

      <main className="shell">
        {tab === 'upcoming' && (
          <section key={tab} className="sect view">
            <div className="sect__head">
              <div className="sect__kicker">Now open</div>
              <h2 className="sect__h">现在还能报名的</h2>
              <p className="sect__p">
                按截止日期升序。实色标记为纯线上可完成，混合标记表示线上做、线下展示（评分不受影响，少的是曝光与投资人对话）。
              </p>
            </div>
            <UpcomingList />
          </section>
        )}

        {tab === 'archive' && (
          <section key={tab} className="sect view">
            <div className="sect__head">
              <div className="sect__kicker">The archive</div>
              <h2 className="sect__h">近三年赛事档案</h2>
              <p className="sect__p">
                {hackathons.length} 场赛事，按类型分七档。点开任意一条可以看到它是什么、要什么人、办过哪几届，
                以及拿奖的项目具体做了什么。所有条目都保留原站链接。
              </p>
            </div>
            <div className="layout">
              <Rail f={f} set={set} reset={() => setF(EMPTY)} />
              <HackList items={items} />
            </div>
          </section>
        )}

        {tab === 'world' && (
          <section key={tab} className="sect view">
            <div className="sect__head">
              <div className="sect__kicker">Where it happens</div>
              <h2 className="sect__h">世界地图 · 赛事分布</h2>
              <p className="sect__p">
                {SPOTS.length} 个主办城市 / 会场，圆点越大代表同城赛事越多，颜色是主办方类型。
                点圆点查看该地赛事；多城巡回赛（如 Mistral Worldwide 七城）会拆成多个分站点。
              </p>
            </div>
            <WorldMap />
          </section>
        )}

        {tab === 'map' && (
          <section key={tab} className="sect view">
            <div className="sect__head">
              <div className="sect__kicker">Year at a glance</div>
              <h2 className="sect__h">全年参与地图</h2>
              <p className="sect__p">
                把有固定档期的赛事按月份铺开。每月的方块高度代表该月赛事密度，点任意一个可以看它的简介与获奖项目。
                颜色是主办方类型，实色代表线上可参加、淡化代表需到场。
              </p>
            </div>
            <YearMap />
          </section>
        )}

        {tab === 'calendar' && (
          <section key={tab} className="sect view">
            <div className="sect__head">
              <div className="sect__kicker">Deadlines</div>
              <h2 className="sect__h">日历视图</h2>
              <p className="sect__p">
                实线条目是已核实的近期截止与开赛日期，点开会跳到官方页面。勾选后可叠加往年固定档期（虚线），
                那部分是按其惯常月份落在 15 号的<b>预估</b>，用来规划时间，不作为报名依据。
              </p>
            </div>
            <Calendar />
          </section>
        )}

        {tab === 'winners' && (
          <section key={tab} className="sect view">
            <div className="sect__head">
              <div className="sect__kicker">What actually wins</div>
              <h2 className="sect__h">获奖档案</h2>
              <p className="sect__p">
                {allWinners.length} 条获奖记录，按年份倒排。这里最值得看的是「为什么能获奖」那一栏——
                翻完会发现规律高度一致：可跑的 demo、未剪辑的视频、窄而深的场景，以及敢在截止前推倒重来。
              </p>
            </div>
            <WinnersArchive />
          </section>
        )}
      </main>

      <footer className="foot">
        <div className="shell foot__grid">
          <div>
            <h4>数据来源</h4>
            <ul>
              {upcoming.sources.map((s) => (
                <li key={s}>
                  <a href={s} target="_blank" rel="noreferrer noopener">
                    {s.replace(/^https?:\/\//, '').slice(0, 46)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>怎么用</h4>
            <ul>
              <li>近期可参加 = 已核实截止日期，可直接报名</li>
              <li>参与地图 = 规划全年节奏，找档期空档</li>
              <li>获奖档案 = 决定做什么项目之前先看一遍</li>
            </ul>
          </div>
          <div>
            <h4>可信度</h4>
            <ul>
              <li>高：官方页面逐条核实</li>
              <li>中：二手来源但多源一致</li>
              <li>低：单一来源，务必自行复核</li>
            </ul>
          </div>
          <div>
            <h4>提醒</h4>
            <ul>
              <li>赛事信息变动频繁，报名前请以官网为准</li>
              <li>奖金相关税务与收款问题需自行确认</li>
              <li>部分赛事对中国大陆居民有附加条款</li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}
