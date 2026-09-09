#!/usr/bin/env node
/**
 * 把 vendored 的 Natural Earth 110m countries topojson 转成
 * 一张「无国界陆地轮廓」的轻量数据：src/data/world-coast.json
 *
 * 合规说明：只输出陆地形体（不含任何国界、不含国家标注），
 * 全部陆地统一填充，作为赛事分布示意图的底图使用。
 * 输出：{ rings: number[][][] } 每个 ring 是 [ [lon,lat], ... ]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { feature } from 'topojson-client';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const topo = JSON.parse(readFileSync(join(ROOT, 'scripts', 'vendor-countries-110m.json'), 'utf8'));
const world = feature(topo, topo.objects.countries);

const rings = [];
let totalPts = 0;
let kept = 0;

for (const f of world.features) {
  if (f.properties?.name === 'Antarctica') continue;
  const geom = f.geometry;
  const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
  for (const poly of polys) {
    for (const ring of poly) {
      // drop rings that are clearly noise (tiny islands / slivers)
      let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      for (const [x, y] of ring) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
      const w = maxX - minX, h = maxY - minY;
      // keep mainland & medium islands (bbox width/height >= ~1.6 deg) — remove specks
      if (Math.max(w, h) < 1.6 && w * h < 6) continue;

      // decimate long rings (still crisp enough up to ~8x zoom)
      const step = ring.length > 2600 ? 4 : ring.length > 1200 ? 3 : ring.length > 550 ? 2 : 1;
      const out = [];
      for (let i = 0; i < ring.length; i += step) {
        out.push([Math.round(ring[i][0] * 10) / 10, Math.round(ring[i][1] * 10) / 10]);
      }
      rings.push(out);
      totalPts += out.length;
      kept++;
    }
  }
}

const out = join(ROOT, 'src', 'data', 'world-coast.json');
writeFileSync(out, JSON.stringify({ rings }), 'utf8');
console.log(`rings=${kept} points=${totalPts} -> src/data/world-coast.json (${Math.round(Buffer.byteLength(JSON.stringify({ rings })) / 1024)} KB)`);
