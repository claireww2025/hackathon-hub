import hackathonsRaw from './data/hackathons.json';
import upcomingRaw from './data/upcoming.json';
import type { Hackathon, UpcomingFile, UpcomingItem, Category, Format, Region } from './types';

export const hackathons = hackathonsRaw as unknown as Hackathon[];
export const upcoming = upcomingRaw as unknown as UpcomingFile;
/** 未被刷新脚本标记为过期的、仍可报名的条目 */
export const upcomingLive = upcoming.items.filter((i) => !(i as { expired?: boolean }).expired);
export const today = new Date();

export const CATEGORY: Record<Category, { label: string; color: string; blurb: string }> = {
  student: {
    label: '学生社区',
    color: 'var(--c-student)',
    blurb: '高校社团与 MLH 生态主办，图的是校园影响力与招聘漏斗。多限在校生、需到场。',
  },
  vendor: {
    label: '厂商生态',
    color: 'var(--c-vendor)',
    blurb: 'Google、AWS、华为、阿里等主办，核心目的是把开发者锁进自家技术栈。奖金实打实。',
  },
  platform: {
    label: '平台运营',
    color: 'var(--c-platform)',
    blurb: 'Devpost、lablab、Hugging Face 等平台，全年滚动开赛，是唯一「随时有得报」的一档。',
  },
  startup: {
    label: '创业投资',
    color: 'var(--c-startup)',
    blurb: '奖励是股权、加速器席位或政策包，而非现金。门槛最高，但天花板也最高。',
  },
  gov: {
    label: '政府产业',
    color: 'var(--c-gov)',
    blurb: '中国特有。主管部门出题，看场景落地与人才引进，多要求独立法人资格。',
  },
  web3: {
    label: 'Web3 / 加密',
    color: 'var(--c-web3)',
    blurb: '链上基金会主导，奖池通常是所有类型里最大的，但对大陆居民常有合规附加条款。',
  },
  vertical: {
    label: '垂直行业',
    color: 'var(--c-vertical)',
    blurb: '航天、气候、医疗、教育等具体行业命题，看的是领域理解而非纯技术炫技。',
  },
};

export const FORMAT: Record<Format, { label: string; short: string }> = {
  online: { label: '纯线上', short: '线上' },
  hybrid: { label: '线上 + 线下', short: '混合' },
  onsite: { label: '纯线下', short: '线下' },
};

export const REGION: Record<Region, string> = { intl: '国际', cn: '国内' };

export const FRIENDLY = {
  yes: { label: '可参加', color: 'var(--c-vendor)' },
  no: { label: '受限', color: 'var(--c-startup)' },
  unknown: { label: '待确认', color: 'var(--rule-3)' },
} as const;

export const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
export const MONTHS_FULL = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
];

/** Parse "2025-09-13 ~ 2025-09-15" | "2025-09" | "2025" -> {start,end} as Date|null */
export function parseDates(s: string): { start: Date | null; end: Date | null } {
  if (!s) return { start: null, end: null };
  const parts = s.split('~').map((x) => x.trim());
  const mk = (p: string): Date | null => {
    const m = p.match(/(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2] || 1) - 1, Number(m[3] || 1));
  };
  return { start: mk(parts[0]), end: parts[1] ? mk(parts[1]) : mk(parts[0]) };
}

export function daysUntil(dateStr: string): number | null {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

export function urgency(d: number | null): 'soon' | 'ok' | 'far' {
  if (d === null) return 'far';
  if (d < 0) return 'far';
  if (d <= 14) return 'soon';
  if (d <= 60) return 'ok';
  return 'far';
}

export function deadlineLabel(d: number | null): string {
  if (d === null) return '—';
  if (d < 0) return '已截止';
  if (d === 0) return '今天截止';
  if (d === 1) return '明天截止';
  return `${d} 天后`;
}

/** All winners flattened with their parent hackathon */
export interface FlatWinner {
  year: number;
  project: string;
  team: string | null;
  what: string;
  why: string;
  url: string | null;
  parent: Hackathon;
}
export const allWinners: FlatWinner[] = hackathons
  .flatMap((h) => h.winners.map((w) => ({ ...w, parent: h })))
  .sort((a, b) => b.year - a.year || a.project.localeCompare(b.project));

export const WINNER_YEARS = Array.from(new Set(allWinners.map((w) => w.year))).sort((a, b) => b - a);

/** Calendar events */
export type CalKind = 'deadline' | 'open' | 'est';
export interface CalEvent {
  date: Date;
  kind: CalKind;
  title: string;
  sub: string;
  url: string;
  color: string;
}
function d(y: number, m: number, day: number) {
  return new Date(y, m - 1, day);
}

export const calEvents: CalEvent[] = [
  ...upcoming.items.flatMap((u: UpcomingItem) => {
    const out: CalEvent[] = [];
    const dl = u.deadline.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dl) {
      out.push({
        date: d(+dl[1], +dl[2], +dl[3]),
        kind: 'deadline',
        title: u.name,
        sub: '截止 · ' + u.prize,
        url: u.url,
        color: 'var(--accent)',
      });
    }
    const st = u.window.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (st) {
      out.push({
        date: d(+st[1], +st[2], +st[3]),
        kind: 'open',
        title: u.name,
        sub: '开赛 · ' + u.theme,
        url: u.url,
        color: 'var(--c-vendor)',
      });
    }
    return out;
  }),
  ...hackathons
    .filter((h) => h.frequency === 'annual' || h.frequency === 'biannual' || h.frequency === 'quarterly')
    .flatMap((h) =>
      [today.getFullYear(), today.getFullYear() + 1].flatMap((y) =>
        h.typicalMonths.map((m) => ({
          date: d(y, m, 15),
          kind: 'est' as CalKind,
          title: h.nameCn || h.name,
          sub: '往年档期（预估）· ' + h.org,
          url: h.url,
          color: 'var(--rule-3)',
        })),
      ),
    ),
];

export const MONTH_NAMES_SHORT = MONTHS;
