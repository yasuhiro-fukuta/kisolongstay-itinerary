// src/app/api/boundary/route.ts
// カテゴリ選択時に「Google Map の行政エリア表示っぽく」赤点線の囲みを出すための境界取得 API。
// Google Maps Platform から境界ポリゴンを取得する公開APIは（一般には）用意されていないため、
// ここでは OpenStreetMap(Nominatim) の polygon_geojson / boundingbox を利用して近似します。
//
// ポイント（駅・渓谷など）しか見つからない場合でも「変な場所に円」が出ないように、
// - 木曽南部周辺の viewbox で絞り込み
// - クエリ候補（日本語/英語/駅名/渓谷名 など）を複数試行
// - polygon が無い場合は boundingbox（矩形）
// - boundingbox も無い場合は中心点から近似円（ポリゴン）
// を返します。

import { NextResponse } from "next/server";

export const runtime = "nodejs";

type LatLngLiteral = { lat: number; lng: number };

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
  class?: string;
  type?: string;
  boundingbox?: [string, string, string, string]; // [south, north, west, east]
  geojson?: any;
};

// 木曽南部を少し広めに囲う viewbox
// Nominatim の viewbox は "left,top,right,bottom"
const VIEWBOX = {
  left: 137.05,
  right: 138.35,
  bottom: 35.15,
  top: 36.20,
};

const USER_AGENT = "kisolongstay-itinerary/1.0 (+https://kisolongstay-itinerary.vercel.app/)";

// 12時間キャッシュ（Nominatim へ過剰アクセスしない）
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const memCache = new Map<string, { at: number; data: any }>();

function inViewbox(lat: number, lng: number) {
  return (
    lat >= VIEWBOX.bottom &&
    lat <= VIEWBOX.top &&
    lng >= VIEWBOX.left &&
    lng <= VIEWBOX.right
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function decimateRing(ring: LatLngLiteral[], maxPoints = 300): LatLngLiteral[] {
  if (ring.length <= maxPoints) return ring;
  const step = Math.ceil(ring.length / maxPoints);
  const out: LatLngLiteral[] = [];
  for (let i = 0; i < ring.length; i += step) out.push(ring[i]);
  // close ring if needed
  if (out.length >= 2) {
    const a = out[0];
    const b = out[out.length - 1];
    if (a.lat !== b.lat || a.lng !== b.lng) out.push({ ...a });
  }
  return out;
}

function toRing(coords: any): LatLngLiteral[] {
  if (!Array.isArray(coords)) return [];
  const out: LatLngLiteral[] = [];
  for (const p of coords) {
    if (!Array.isArray(p) || p.length < 2) continue;
    const lng = Number(p[0]);
    const lat = Number(p[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({ lat, lng });
  }
  if (out.length >= 2) {
    const a = out[0];
    const b = out[out.length - 1];
    if (a.lat !== b.lat || a.lng !== b.lng) out.push({ ...a });
  }
  return out;
}

function extractRingsFromGeoJSON(geojson: any): LatLngLiteral[][] {
  if (!geojson || typeof geojson !== "object") return [];

  // Polygon: [ [ [lng,lat], ... ] , [hole], ...]
  if (geojson.type === "Polygon") {
    const outer = geojson.coordinates?.[0];
    const ring = decimateRing(toRing(outer));
    return ring.length ? [ring] : [];
  }

  // MultiPolygon: [ Polygon, Polygon, ... ]
  if (geojson.type === "MultiPolygon") {
    const polys = Array.isArray(geojson.coordinates) ? geojson.coordinates : [];
    const rings: LatLngLiteral[][] = [];
    for (const poly of polys) {
      const outer = poly?.[0];
      const ring = decimateRing(toRing(outer));
      if (ring.length) rings.push(ring);
    }
    return rings;
  }

  return [];
}

function bboxToRing(bbox?: [string, string, string, string]): LatLngLiteral[] {
  if (!bbox || bbox.length !== 4) return [];
  const south = Number(bbox[0]);
  const north = Number(bbox[1]);
  const west = Number(bbox[2]);
  const east = Number(bbox[3]);
  if (![south, north, west, east].every((n) => Number.isFinite(n))) return [];
  const s = clamp(south, -90, 90);
  const n = clamp(north, -90, 90);
  const w = clamp(west, -180, 180);
  const e = clamp(east, -180, 180);
  return [
    { lat: n, lng: w },
    { lat: n, lng: e },
    { lat: s, lng: e },
    { lat: s, lng: w },
    { lat: n, lng: w },
  ];
}

function makeCircleRing(center: LatLngLiteral, radiusMeters: number, points = 72): LatLngLiteral[] {
  const lat = center.lat;
  const lng = center.lng;
  const r = Math.max(200, radiusMeters);

  // ざっくり換算（十分近似）
  const metersPerDegLat = 111_320;
  const metersPerDegLng = metersPerDegLat * Math.cos((lat * Math.PI) / 180);

  const dLat = r / metersPerDegLat;
  const dLng = r / Math.max(1e-6, metersPerDegLng);

  const out: LatLngLiteral[] = [];
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * 2 * Math.PI;
    out.push({
      lat: lat + Math.sin(t) * dLat,
      lng: lng + Math.cos(t) * dLng,
    });
  }
  return out;
}

function buildUrl(q: string, bounded: boolean) {
  const u = new URL("https://nominatim.openstreetmap.org/search");
  u.searchParams.set("format", "jsonv2");
  u.searchParams.set("polygon_geojson", "1");
  u.searchParams.set("limit", "10");
  u.searchParams.set("countrycodes", "jp");
  u.searchParams.set("q", q);

  // viewbox でバイアス（bounded=1 のときは制限）
  u.searchParams.set("viewbox", `${VIEWBOX.left},${VIEWBOX.top},${VIEWBOX.right},${VIEWBOX.bottom}`);
  if (bounded) u.searchParams.set("bounded", "1");

  return u.toString();
}

async function fetchNominatim(q: string, bounded: boolean): Promise<NominatimResult[]> {
  const url = buildUrl(q, bounded);
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "ja",
    },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = (await res.json().catch(() => null)) as any;
  if (!Array.isArray(json)) return [];
  return json as NominatimResult[];
}

function scoreResult(q: string, r: NominatimResult): number {
  const name = String(r.display_name ?? "").toLowerCase();
  const cls = String(r.class ?? "").toLowerCase();
  const typ = String(r.type ?? "").toLowerCase();

  let s = 0;

  // viewbox 内を強く優先
  const lat = Number(r.lat);
  const lng = Number(r.lon);
  if (Number.isFinite(lat) && Number.isFinite(lng) && inViewbox(lat, lng)) s += 50;
  else s -= 20;

  // polygon がある方が望ましい
  const rings = extractRingsFromGeoJSON(r.geojson);
  if (rings.length) s += 40;

  // boundary系は優先
  if (cls === "boundary") s += 25;
  if (typ.includes("administrative")) s += 20;

  // クエリに近い（雑に）
  const qLower = q.toLowerCase();
  if (qLower && name.includes(qLower.split(",")[0]?.trim() ?? "")) s += 5;

  // 木曽っぽい単語を含むものを少し加点（遠方の同名を避ける）
  const kisoHints = ["木曽", "南木曽", "大桑", "nagiso", "okuwa", "kiso"];
  for (const h of kisoHints) {
    if (name.includes(h.toLowerCase())) s += 6;
  }

  return s;
}

function pickBest(q: string, results: NominatimResult[]): NominatimResult | null {
  if (!results.length) return null;

  // bounded=0 で取った場合は viewbox 内のみ残す（念のため）
  const filtered = results.filter((r) => {
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? inViewbox(lat, lng) : false;
  });

  const list = filtered.length ? filtered : results;

  let best: NominatimResult | null = null;
  let bestScore = -1e9;
  for (const r of list) {
    const s = scoreResult(q, r);
    if (s > bestScore) {
      bestScore = s;
      best = r;
    }
  }
  return best;
}

const CATEGORY_QUERY_CANDIDATES: Record<string, string[]> = {
  // 南木曽町（Nagiso）周辺
  "南木曽": [
    "南木曽町, 長野県, 日本",
    "読書, 南木曽町, 長野県, 日本",
    "Nagiso, Nagano, Japan",
  ],
  "妻籠": [
    "妻籠宿, 南木曽町, 長野県, 日本",
    "妻籠, 南木曽町, 長野県, 日本",
    "Tsumago, Nagiso, Nagano, Japan",
    "Tsumago-juku, Nagiso, Nagano, Japan",
  ],
  "蘭": [
    "蘭駅, 木曽郡, 長野県, 日本",
    "蘭（あららぎ）, 木曽郡, 長野県, 日本",
    "Araragi Station, Kiso, Nagano, Japan",
    "Araragi, Kiso, Nagano, Japan",
  ],
  "田立": [
    "田立, 木曽郡, 長野県, 日本",
    "田立駅, 木曽郡, 長野県, 日本",
    "Tadachi Station, Kiso, Nagano, Japan",
  ],
  "柿其": [
    "柿其渓谷, 木曽郡, 長野県, 日本",
    "柿其, 木曽郡, 長野県, 日本",
    "Kakizore Gorge, Kiso, Nagano, Japan",
  ],
  "与川": [
    "与川, 木曽郡, 長野県, 日本",
    "Yogawa, Kiso, Nagano, Japan",
  ],

  // 大桑村（Okuwa）周辺
  "阿寺": [
    "阿寺渓谷, 大桑村, 長野県, 日本",
    "阿寺渓谷, 木曽郡, 長野県, 日本",
    "Atera Gorge, Okuwa, Nagano, Japan",
    "Atera Gorge, Kiso, Nagano, Japan",
  ],
  "野尻": [
    "野尻駅, 大桑村, 長野県, 日本",
    "野尻, 大桑村, 長野県, 日本",
    "Nojiri Station, Okuwa, Nagano, Japan",
    "Nojiri, Okuwa, Nagano, Japan",
  ],
  "須原": [
    "須原駅, 大桑村, 長野県, 日本",
    "須原, 大桑村, 長野県, 日本",
    "Suhara Station, Okuwa, Nagano, Japan",
    "Suhara, Okuwa, Nagano, Japan",
  ],
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q0 = String(url.searchParams.get("q") ?? "").trim();

    if (!q0) {
      return NextResponse.json({ ok: false, error: "missing q" }, { status: 400 });
    }

    // 全域は viewbox をそのまま返す（外部API不要）
    if (q0 === "全域") {
      const ring = bboxToRing([String(VIEWBOX.bottom), String(VIEWBOX.top), String(VIEWBOX.left), String(VIEWBOX.right)]);
      const center = { lat: (VIEWBOX.bottom + VIEWBOX.top) / 2, lng: (VIEWBOX.left + VIEWBOX.right) / 2 };
      return NextResponse.json({ ok: true, center, paths: [ring] });
    }

    const cacheKey = `v7:${q0}`;
    const now = Date.now();
    const cached = memCache.get(cacheKey);
    if (cached && now - cached.at < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    const candidates = CATEGORY_QUERY_CANDIDATES[q0] ?? [
      q0,
      `${q0}, 長野県, 日本`,
      `${q0}, 木曽郡, 長野県, 日本`,
    ];

    for (const q of candidates) {
      // 1) bounded=1 でまず検索
      let results = await fetchNominatim(q, true);

      // 2) 無ければ bounded=0（viewboxバイアス）で拾って、viewbox内だけに絞る
      if (!results.length) results = await fetchNominatim(q, false);

      const best = pickBest(q, results);
      if (!best) continue;

      const lat = Number(best.lat);
      const lng = Number(best.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const center = { lat, lng };

      // 可能なら polygon → ダメなら bbox → さらにダメなら近似円
      let paths = extractRingsFromGeoJSON(best.geojson);
      if (!paths.length) {
        const ring = bboxToRing(best.boundingbox);
        if (ring.length) paths = [ring];
      }
      if (!paths.length) {
        paths = [makeCircleRing(center, 4500)];
      }

      const data = { ok: true, center, paths };
      memCache.set(cacheKey, { at: now, data });
      return NextResponse.json(data);
    }

    const data = { ok: false, error: "not found" };
    memCache.set(`v7:${q0}`, { at: now, data });
    return NextResponse.json(data, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
