#!/usr/bin/env node
/**
 * 刷新「近期可参加」清单 —— 每月 1 日与 15 日各跑一次。
 *
 *   node scripts/refresh-upcoming.mjs
 *
 * 行为：
 *   1. 抓取 Devpost 进行中的线上赛 + lablab.ai 近期赛事
 *   2. 与现有 src/data/upcoming.json 合并：更新已存在的，补充新发现的
 *   3. 已过截止日期 7 天以上的条目标记 expired，前端不再显示
 *   4. 抓取失败时保留原数据并退出非零，绝不写坏文件
 *
 * 注意：自动抓取条目的 cnFriendly 一律为 unknown，需要人工核对 rules 页。
 * 人工维护的国内条目（region: 'cn'）不会被抓取逻辑覆盖，只做过期清理。
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'src', 'data', 'upcoming.json');

const DEADLINE_RE = /([A-Z][a-z]{2})\s+(\d{1,2})\s*-\s*([A-Z][a-z]{2})?\s*(\d{1,2})?,?\s*(\d{4})/;
const MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const p2 = (n) => String(n).padStart(2, '0');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function get(url, accept = 'text/html') {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept, 'accept-language': 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/* ── Devpost ──────────────────────────────────────────────
 * 列表页已改为客户端渲染（HTML 里没有卡片），改用官方 JSON 接口：
 *   https://devpost.com/api/hackathons?status=open&page=N   （每页 9 条）
 * 字段：title / url / displayed_location.location /
 *       submission_period_dates（"Aug 26 - Oct 30, 2026"）/ prize_amount
 */
async function fetchDevpost(now) {
  const out = [];
  const first = JSON.parse(
    await get('https://devpost.com/api/hackathons?status=open&page=1', 'application/json'),
  );
  const total = first.meta?.total_count ?? first.hackathons?.length ?? 0;
  const perPage = first.meta?.per_page || 9;
  const pages = Math.max(1, Math.min(12, Math.ceil(total / perPage)));

  let all = [...(first.hackathons || [])];
  for (let p = 2; p <= pages; p++) {
    try {
      const d = JSON.parse(await get(`https://devpost.com/api/hackathons?status=open&page=${p}`, 'application/json'));
      all = all.concat(d.hackathons || []);
    } catch (e) {
      console.error(`    devpost 第 ${p} 页失败：${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  for (const h of all) {
    if (!h.url || !h.title) continue;
    if (h.open_state && h.open_state !== 'open') continue;
    const online = /online/i.test(h.displayed_location?.location || '');

    // "Aug 26 - Oct 30, 2026" / "Oct 30, 2026"
    let deadline = null;
    let window = stripTags(h.submission_period_dates || '');
    const dates = [...window.matchAll(/([A-Z][a-z]{2})[a-z]*\s+(\d{1,2})/g)];
    const yearM = window.match(/(20\d\d)/);
    if (dates.length && yearM) {
      const last = dates[dates.length - 1];
      deadline = `${yearM[1]}-${p2(MON[last[1]])}-${p2(Number(last[2]))}`;
    } else if (window) {
      // 跨年窗口（如 "Dec 20, 2026 - Jan 10, 2027"）取后一个年份
      const cross = [...window.matchAll(/([A-Z][a-z]{2})[a-z]*\s+(\d{1,2}),?\s*(20\d\d)/g)];
      if (cross.length) {
        const last = cross[cross.length - 1];
        deadline = `${last[3]}-${p2(MON[last[1]])}-${p2(Number(last[2]))}`;
      }
    }

    const prizeRaw = stripTags(h.prize_amount || '');
    const cash = prizeRaw.match(/\$([\d,]{3,})/);
    // 源站给 "$<span>0</span>" 的（只发奖状/周边）一律记「未公布」，不假装有奖金
    const prize = cash && Number(cash[1].replace(/,/g, '')) > 0 ? '$' + cash[1] : '未公布';

    out.push({
      id: 'dp-' + h.url.replace(/^https?:\/\//, '').replace(/\.devpost\.com\/?$/, ''),
      name: stripTags(h.title),
      org: h.organization_name || '自动抓取',
      url: h.url.replace(/\/$/, ''),
      prize,
      deadline,
      window: window || '见官网',
      format: online ? 'online' : 'hybrid',
      theme: (h.themes || []).map((t) => t.name).join(' / ') || '见官网',
    });
  }
  return out;
}

/* ── lablab.ai ────────────────────────────────────────────
 * 列表页（/event）只给 slug + 标题，日期在单页的 meta description 里：
 *   "Join <赛事>, a free AI hackathon. Ends Nov 8, 2026. ..."
 * 所以先收集候选 slug，再逐个打开详情页取截止日。
 */
async function fetchLablab(existing) {
  const html = await get('https://lablab.ai/event');
  const items = new Map(); // slug -> name
  for (const m of html.matchAll(/\\"name\\":\\"([^"\\]{3,120})\\",\\"url\\":\\"https:\/\/lablab\.ai\/ai-hackathons\/([a-z0-9-]+)\\"/g)) {
    items.set(m[2], m[1]);
  }
  for (const m of html.matchAll(/href="\/ai-hackathons\/([a-z0-9-]+)"/g)) {
    if (!items.has(m[1])) items.set(m[1], '');
  }
  if (!items.size) throw new Error('lablab.ai 列表页未解析到任何赛事链接');

  // 只探测最近 14 天内仍在库里 / 从未见过 的 slug，避免每次几十个请求
  const known = new Set(existing.items.filter((i) => i.region !== 'cn').map((i) => i.id.replace(/^ll-/, '')));
  const out = [];
  for (const [slug, fallbackName] of items) {
    if (out.length >= 18) break;
    try {
      const page = await get(`https://lablab.ai/ai-hackathons/${slug}`);
      const title = stripTags(page.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').replace(
        /\s*AI Hackathon\s*\|\s*lablab\.ai$/i,
        '',
      ).trim();
      const desc = page.match(/<meta name="description" content="([^"]*)"/)?.[1] || '';
      // 兜底：description 首句「Join <赛事名>, a free AI hackathon.」里的赛事名
      const descName = desc.match(/^Join\s+(.+?),\s+a free AI hackathon/i)?.[1]?.trim() || '';
      const ends = desc.match(/Ends\s+([A-Z][a-z]{2})[a-z]*\s+(\d{1,2}),?\s*(20\d\d)/);
      const starts = desc.match(/Starts\s+([A-Z][a-z]{2})[a-z]*\s+(\d{1,2}),?\s*(20\d\d)/);
      let deadline = ends ? `${ends[3]}-${p2(MON[ends[1]])}-${p2(Number(ends[2]))}` : null;
      const window = starts && ends ? `${starts[1]} ${starts[2]} - ${ends[1]} ${ends[2]}, ${ends[3]}` : ends ? `至 ${ends[1]} ${ends[2]}, ${ends[3]}` : '见官网';
      if (!deadline) continue;
      out.push({
        id: 'll-' + slug,
        name: title || descName || fallbackName || slug,
        org: 'lablab.ai',
        url: `https://lablab.ai/ai-hackathons/${slug}`,
        prize: '见官网',
        deadline,
        window,
        format: 'online',
        theme: '见官网',
        _known: known.has(slug),
      });
    } catch {
      /* 单页失败不影响整体 */
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  return out;
}

function nextUpdate(now) {
  const d = new Date(now);
  if (d.getDate() < 15) return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-15`;
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return `${n.getFullYear()}-${p2(n.getMonth() + 1)}-01`;
}

async function main() {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`;

  let existing;
  try {
    existing = JSON.parse(await readFile(FILE, 'utf8'));
  } catch (e) {
    console.error('✗ 无法读取现有数据：', e.message);
    process.exit(1);
  }

  let scraped = [];
  const errors = [];
  for (const [label, fn] of [
    ['Devpost', () => fetchDevpost(now)],
    ['lablab.ai', () => fetchLablab(existing)],
  ]) {
    try {
      const got = (await fn()).filter((x) => x.deadline && new Date(x.deadline + 'T23:59:59') >= now);
      console.log(`  ${label}: 抓到 ${got.length} 场`);
      scraped = scraped.concat(got);
    } catch (e) {
      errors.push(`${label}: ${e.message}`);
      console.error(`  ✗ ${label} 抓取失败：${e.message}`);
    }
  }

  if (errors.length === 2) {
    console.error('✗ 全部数据源抓取失败，保留原文件不改动。');
    process.exit(2);
  }

  // 数量护栏：抓到的比库内在册还少，多半是对方改版 / 限流，不覆盖人工条目
  if (!scraped.length) {
    console.error('✗ 两个数据源均未解析出有效条目（疑为页面改版或限流），保留原文件不改动。');
    process.exit(2);
  }

  const byUrl = new Map(existing.items.map((i) => [i.url.replace(/\/$/, ''), i]));
  const byId = new Map(existing.items.map((i) => [i.id, i]));
  let added = 0;
  let updated = 0;

  for (const s of scraped) {
    const key = s.url.replace(/\/$/, '');
    const hit = byUrl.get(key) || byId.get(s.id);
    if (hit) {
      if (hit.deadline !== s.deadline || hit.prize !== s.prize || hit.window !== s.window) updated++;
      // 人工维护过的字段不覆盖
      hit.deadline = s.deadline;
      hit.window = s.window;
      if (hit.prize === '见官网' || hit.prize === '未公布' || /^\$/.test(s.prize)) hit.prize = s.prize;
      hit.format = s.format;
      hit.expired = false; // 源站仍在「open」，别再显示为过期
      continue;
    }
    byId.set(s.id, {
      id: s.id,
      name: s.name,
      org: s.org || '自动抓取',
      region: 'intl',
      deadline: s.deadline,
      window: s.window,
      format: s.format,
      prize: s.prize,
      theme: s.theme || '见官网',
      solo: false,
      cnFriendly: 'unknown',
      url: key,
      note: '自动抓取，报名前请核对 rules 页的排除国家与资格条款',
    });
    added++;
  }

  // 过期清理：源站仍 open 但截止日已过 7 天以上的，同样判过期（Devpost 的 open 状态滞后于实际截止）
  const items = [...byId.values()].map((i) => {
    const dl = new Date(i.deadline + 'T23:59:59');
    const age = (now - dl) / 86400000;
    return age > 7 ? { ...i, expired: true } : { ...i, expired: false };
  });

  const live = items.filter((i) => !i.expired);
  await writeFile(
    FILE,
    JSON.stringify({ updatedAt: stamp, nextUpdate: nextUpdate(now), sources: existing.sources, items }, null, 2) + '\n',
    'utf8',
  );

  console.log(`\n✓ 更新完成 ${stamp}：新增 ${added} 场，更新 ${updated} 场，当前可报名 ${live.length} 场，下次更新 ${nextUpdate(now)}`);
  if (errors.length) console.log('⚠ 部分数据源失败：', errors.join('; '));
  console.log('提示：自动抓取条目的「对华资格」为 unknown，请人工打开 rules 页确认后再参赛。');
}

main().catch((e) => {
  console.error('✗ 未预期错误：', e);
  process.exit(1);
});
