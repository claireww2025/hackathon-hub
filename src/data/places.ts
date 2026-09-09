/**
 * 主办城市坐标表 —— 人工核定，避免同名城市歧义。
 * 仅收录「有线下/决赛场地」的赛事；纯线上赛事不在地图上占点。
 * label 同时作为聚类键：同城多场赛事汇聚成一个点。
 */
export interface Place {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export const PLACES: Place[] = [
  // ── 中国 · 政府 / 产业 / 创业 ──
  { id: 'ccf-bdci', label: '中国·北京', lat: 39.9, lng: 116.4 },
  { id: 'miracleplus', label: '中国·北京', lat: 39.9, lng: 116.4 },
  { id: 'data-element-x', label: '中国·上海', lat: 31.23, lng: 121.47 },
  { id: 'gdps', label: '中国·上海', lat: 31.23, lng: 121.47 },
  { id: 'waic-bpaa', label: '中国·上海', lat: 31.23, lng: 121.47 },
  { id: 'world-ai4s', label: '中国·上海', lat: 31.23, lng: 121.47 },
  { id: 'waic-opc-challenge', label: '中国·上海', lat: 31.23, lng: 121.47 },
  { id: 'xiaohongshu-hackathon', label: '中国·上海', lat: 31.23, lng: 121.47 },
  { id: 'xingzhi-cup', label: '中国·深圳', lat: 22.55, lng: 114.06 },
  { id: 'tencent-cloud-hackathon', label: '中国·深圳', lat: 22.55, lng: 114.06 },
  { id: 'iflytek-xinghuobei', label: '中国·合肥', lat: 31.82, lng: 117.23 },
  { id: 'iflytek-ai-developer', label: '中国·合肥', lat: 31.82, lng: 117.23 },
  { id: 'zhipu-agent-master', label: '中国·珠海', lat: 22.27, lng: 113.58 },
  { id: 'volcengine-coze-vibe', label: '中国·北京', lat: 39.9, lng: 116.4 },

  // ── 国际 · 高校学生赛 ──
  { id: 'hackmit', label: 'Cambridge（美）', lat: 42.36, lng: -71.09 },
  { id: 'treehacks', label: 'Stanford（美）', lat: 37.42, lng: -122.16 },
  { id: 'hack-the-north', label: 'Waterloo（加）', lat: 43.47, lng: -80.54 },
  { id: 'cal-hacks', label: 'San Francisco（美）', lat: 37.77, lng: -122.42 },
  { id: 'la-hacks', label: 'Los Angeles（美）', lat: 34.05, lng: -118.24 },
  { id: 'hacksc', label: 'Los Angeles（美）', lat: 34.05, lng: -118.24 },
  { id: 'hackprinceton', label: 'Princeton（美）', lat: 40.35, lng: -74.66 },
  { id: 'pennapps', label: 'Philadelphia（美）', lat: 39.95, lng: -75.17 },
  { id: 'mhacks', label: 'Ann Arbor（美）', lat: 42.28, lng: -83.74 },
  { id: 'hackupc', label: 'Barcelona（西班牙）', lat: 41.39, lng: 2.17 },
  { id: 'hackzurich', label: 'Zurich（瑞士）', lat: 47.37, lng: 8.54 },
  { id: 'junction', label: 'Espoo（芬兰）', lat: 60.21, lng: 24.66 },

  // ── 国际 · 垂直行业 / 创业 ──
  { id: 'boc-fintech-hackathon', label: 'Nicosia（塞浦路斯）', lat: 35.19, lng: 33.38 },
  { id: 'mit-hacking-medicine', label: 'Boston（美）', lat: 42.36, lng: -71.06 },
  { id: 'xprize-build-with-gemini', label: 'Los Angeles（美）', lat: 34.05, lng: -118.24 },
  { id: 'angelhack-hackglobal', label: 'Singapore（新加坡）', lat: 1.35, lng: 103.82 },
  { id: 'lablab-ai', label: 'Dubai（阿联酋）', lat: 25.2, lng: 55.27 },
  { id: 'devfolio', label: 'Bengaluru（印度）', lat: 12.97, lng: 77.59 },

  // ── Web3 ──
  { id: 'ethdenver', label: 'Denver（美）', lat: 39.74, lng: -104.99 },
  { id: 'ethglobal-nyc', label: 'New York（美）', lat: 40.71, lng: -74.01 },
  { id: 'ethindia', label: 'Bengaluru（印度）', lat: 12.97, lng: 77.59 },
  { id: 'aptos-hackathon', label: 'San Francisco（美）', lat: 37.77, lng: -122.42 },
  { id: 'base-onchain-buildathon', label: 'Singapore（新加坡）', lat: 1.35, lng: 103.82 },
  { id: 'dorahacks-bnb-chain-hack', label: 'Singapore（新加坡）', lat: 1.35, lng: 103.82 },
  { id: 'encode-club-hack', label: 'London（英）', lat: 51.51, lng: -0.13 },

  // ── 国际 · 厂商（多城巡回赛拆成多站）──
  { id: 'mistral-worldwide-hackathon', label: 'Paris（法）', lat: 48.86, lng: 2.35 },
  { id: 'mistral-worldwide-hackathon', label: 'London（英）', lat: 51.51, lng: -0.13 },
  { id: 'mistral-worldwide-hackathon', label: 'New York（美）', lat: 40.71, lng: -74.01 },
  { id: 'mistral-worldwide-hackathon', label: 'San Francisco（美）', lat: 37.77, lng: -122.42 },
  { id: 'mistral-worldwide-hackathon', label: 'Tokyo（日）', lat: 35.68, lng: 139.69 },
  { id: 'mistral-worldwide-hackathon', label: 'Singapore（新加坡）', lat: 1.35, lng: 103.82 },
  { id: 'mistral-worldwide-hackathon', label: 'Sydney（澳）', lat: -33.87, lng: 151.21 },
];
