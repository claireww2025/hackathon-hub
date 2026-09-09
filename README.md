# 黑客松档案 · Hackathon Hub

一个**自包含、离线可开箱即用**的国内外黑客松档案站点：分类、获奖项目详情、全年参与地图、日历、可交互世界地图与「当前仍可报名」清单。

**开箱即用**：克隆后直接双击 `dist/index.html`（单文件，无服务器、无依赖、纯 `file://` 可用）。也可部署到 GitHub Pages（见下）。

## 快速开始

```bash
npm install          # 装依赖（仅开发/构建需要）
npm run dev          # 本地开发（Vite + HMR，http://localhost:5173）
npm run build        # 产出 dist/index.html（单文件 IIFE）
node scripts/smoke.cjs  # jsdom 冒烟测试（需要 NODE_PATH 指到带 jsdom 的目录，见下）
```

冒烟测试依赖全局目录里的 jsdom：

```bash
NODE_PATH=<你机器上装过 jsdom 的 node_modules 路径> node scripts/smoke.cjs
```

## 内容与视图

| 视图 | 说明 |
|---|---|
| 近期可参加 | 已核实截止日期的赛事，按截止倒计时排序（14 天内高亮） |
| 全年档案 | 78 场赛事，7 维筛选 + 点开看详情（含获奖项目、可再点开） |
| 世界地图 | 自绘无国界示意图 + 主办城市点；按类型筛选、缩放平移、点城市看赛事与获奖项目 |
| 参与地图 | 12 个月 × 赛事密度，规划全年节奏 |
| 日历视图 | 42 格月历；实线=已核实截止，虚线=往年档期预估 |
| 获奖档案 | 按年份分组展示 200+ 条获奖项目，每条可展开详情与原链接 |

数据规模（随每月自动更新变化）：**78 场赛事 / 200+ 条获奖记录 / 61+ 场已完结赛事有结果 / 18 场当前仍可报名**。

## 每半月自动更新（两套机制）

### 1) 本机 WorkBuddy 自动化（主要）
每月 **1 日与 15 日**自动执行：
1. `node scripts/refresh-upcoming.mjs` —— 抓取 Devpost + lablab.ai 当前进行中的线上赛，合并进 `src/data/upcoming.json`，过期条目自动隐藏；
2. **核对新完结赛事的获奖结果** —— 找出最近 45 天内结束、且尚未收录获奖的赛事，检索官方获奖公示，把结果追加到 `src/data/winners-add.json`；
3. `python3 scripts/merge.py` → `npm run build` —— 重建数据与站点；
4. 有变更时 `git add -A && git commit`（不自动 push，由你审阅后推送）。

> 手动跑一次：`node scripts/refresh-upcoming.mjs`（仅第一步）。

### 2) GitHub Actions（云端兜底）
`.github/workflows/build-pages.yml` 每月 1/15 日 02:30 UTC 自动 `npm ci && npm run build` 并把 `dist/` 发布到 GitHub Pages（也支持 push / 手动触发）。在仓库 Settings → Pages → Source 选 **GitHub Actions** 即可启用。

## 数据文件与格式

```
src/data/
├── raw-intl-student.json    学生/平台类原始数据
├── raw-intl-vendor.json     厂商生态原始数据
├── raw-web3-vertical.json   Web3/垂直/创业原始数据
├── raw-cn.json              国内赛事原始数据
├── winners-add.json         增量获奖记录（自动更新写入这里）
├── hackathons.json          合并产物（勿手改）
├── upcoming.json            当前可报名（自动更新）
├── world-coast.json         世界陆地轮廓（自动生成）
└── places.ts                主办城市坐标（人工核定，label 即聚类键）
```

单条赛事 schema（`raw-*.json` 中）：
`id / name / nameCn / org / region(intl|cn) / category(student|vendor|platform|startup|gov|web3|vertical) / theme / description / requirements / format(online|hybrid|onsite) / location / prize / frequency(annual|biannual|quarterly|monthly|oneoff) / typicalMonths[1-12] / url / soloAllowed / cnFriendly(yes|no|unknown) / editions[{year,dates,url,note}] / winners[{year,project,team,what,why,url}] / _confidence(high|medium|low)`

### 加/改数据流程（永远走这条）
1. 编辑 `src/data/raw-*.json` 或 `src/data/winners-add.json`
2. `python3 scripts/merge.py`（自动去重、归一化）
3. `npm run build`
4. `node scripts/smoke.cjs` 回归
5. `git commit`

### 重新生成陆地轮廓（一般不用）
`node scripts/gen-coast.mjs`（原料 `scripts/vendor-countries-110m.json` 来自 Natural Earth 110m）。

## 设计说明

- 科技蓝调冷色系统（OKLCH）；Space Grotesk + Instrument Sans；尊重 `prefers-reduced-motion`
- 列表行/获奖详情展开统一用 `grid-template-rows 0fr→1fr`（无 layout reflow）
- 折叠模式通用规则：`.row[data-open] .detail` 与 `.wxp.is-open .detail` 必须成对维护（新增复用折叠动画的组件时别漏）

## 地图合规说明

世界地图为**自绘无国界示意图**：不使用任何第三方在线底图（无 OSM/Google/Leaflet 等），陆地统一色块、不画国界、不标国家；仅用于呈现主办城市/会场，**不表示国界与主权主张**。中国行政疆域、南海诸岛等以国家测绘部门发布的官方地图为准。纯线上赛事无固定会场，不计入地图。

## 数据可信度

每条赛事带 `_confidence`：
- **high**：官方页（devpost / tianchi / lablab / hiascend 等）逐条核实
- **medium**：二手来源但多源一致
- **low**：单一来源，务必自行复核

报名前请自行打开赛事页 `/rules` 核对 excluded countries 与资格条款（标准排除名单通常不含中国大陆，但「能不能参加」永远逐赛确认）。

## 目录结构

```
.
├── dist/index.html            # 交付产物（单文件，双击即用）
├── src/                       # React + TS 源码与数据
│   ├── components/            # 视图组件（WorldMap/WinnerExpand 等）
│   ├── data/                  # 全部数据（见上）
│   └── ...
├── scripts/                   # merge.py / gen-coast.mjs / refresh-upcoming.mjs / smoke.cjs
├── .github/workflows/         # GitHub Pages 每半月发布
├── index.html / package.json / tsconfig.json / vite.config.ts
└── README.md
```

## License

MIT（本仓库仅聚合公开信息，各赛事名称、Logo 与内容版权归其主办方所有）。
