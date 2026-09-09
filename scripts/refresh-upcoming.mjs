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

async function get(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) hackathon-hub/1.0' },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

/* ── Devpost ──────────────────────────────────────────── */
function parseDevpost(html) {
  const out = [];
  const re = /href="(https:\/\/[a-z0-9-]+\.devpost\.com\/)\?ref_feature=challenge/g;
  let m;
  while ((m = re.exec(html))) {
    const chunk = html.slice(m.index, m.index + 2600);
    const nameM = chunk.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || chunk.match(/>([A-Za-z0-9][^<>]{3,90})<\/a>/);
    const name = (nameM?.[1] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!name || name.length > 90) continue;

    const prizeM = chunk.match(/\$([\d,]+)\s+in prizes/);
    const dateM = chunk.match(DEADLINE_RE);
    const online = /Online/.test(chunk.slice(0, 1200));

    let deadline = null;
    let window = '';
    if (dateM) {
      const [, m1, d1, m2, d2, y] = dateM;
      window = dateM[0].trim();
      const endM = m2 ? MON[m2] : MON[m1];
      const endD = d2 ? Number(d2) : Number(d1);
      deadline = `${y}-${p2(endM)}-${p2(endD)}`;
    }
    out.push({
      id: 'dp-' + m[1].replace(/^https:\/\//, '').replace(/\.devpost\.com\/$/, ''),
      name,
      url: m[1],
      prize: prizeM ? '$' + prizeM[1] : '未公布',
      deadline,
      window: window || '见官网',
      format: online ? 'online' : 'hybrid',
    });
  }
  return out;
}

/* ── lablab.ai ────────────────────────────────────────── */
function parseLablab(html) {
  const out = [];
  const re = /href="(\/ai-hackathons\/[a-z0-9-]+)"/g;
  const seen = new Set();
  let m;
  while ((m = re.exec(html))) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    const chunk = html.slice(Math.max(0, m.index - 700), m.index + 900);
    const nameM = chunk.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || chunk.match(/<p[^>]*>([^<>]{4,90})<\/p>/);
    const name = (nameM?.[1] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const dateM = chunk.match(/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{1,2})\s*-\s*(?:([A-Z]{3})\s*)?(\d{1,2})/i);
    const MON3 = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
    let deadline = null;
    if (dateM) {
      const y = new Date().getFullYear();
      const endM = dateM[3] ? MON3[dateM[3].toUpperCase()] : MON3[dateM[1].toUpperCase()];
      deadline = `${y}-${p2(endM)}-${p2(Number(dateM[4]))}`;
    }
    out.push({
      id: 'll-' + m[1].split('/').pop(),
      name: name || m[1].split('/').pop(),
      url: 'https://lablab.ai' + m[1],
      prize: '见官网',
      deadline,
      window: dateM ? dateM[0] : '见官网',
      format: /On-site|Onsite|Hybrid/i.test(chunk) ? 'hybrid' : 'online',
    });
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
  for (const [label, url, fn] of [
    ['Devpost', 'https://devpost.com/hackathons?status=open&challenge_type=online', parseDevpost],
    ['lablab.ai', 'https://lablab.ai/', parseLablab],
  ]) {
    try {
      const html = await get(url);
      const got = fn(html).filter((x) => x.deadline && new Date(x.deadline) >= now);
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
      continue;
    }
    byId.set(s.id, {
      id: s.id,
      name: s.name,
      org: '自动抓取',
      region: 'intl',
      deadline: s.deadline,
      window: s.window,
      format: s.format,
      prize: s.prize,
      theme: '见官网',
      solo: false,
      cnFriendly: 'unknown',
      url: key,
      note: '自动抓取，报名前请核对 rules 页的排除国家与资格条款',
    });
    added++;
  }

  // 过期清理
  const items = [...byId.values()].map((i) => {
    const dl = new Date(i.deadline + 'T00:00:00');
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
