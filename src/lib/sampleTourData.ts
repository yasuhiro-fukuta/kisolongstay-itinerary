// src/lib/sampleTourData.ts
import { parseCsv, csvToObjects } from "@/lib/csv";

export type SampleTourEntry = {
  tour: string;      // 例: 春の中山道北上ツアー
  day: number;       // 1,2,3...
  rownum: number;    // 1-based
  menuid: string;    // left_menu.csv の主キー
};

export type SampleTourData = {
  tours: string[]; // ボタン表示順（CSV登場順）
  byTour: Map<string, SampleTourEntry[]>; // ★必ずMap
  entries: SampleTourEntry[];
};

let cachePromise: Promise<SampleTourData> | null = null;

function s(v: unknown): string {
  return String(v ?? "").trim();
}

function parseDay(v: unknown): number | null {
  const t = s(v);
  if (!t) return null;
  // Day1 / day 1 / 1 を全部許容
  const m = t.match(/(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
}

function parsePosInt(v: unknown): number | null {
  const n = Number(s(v));
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
}

export async function loadSampleTourData(): Promise<SampleTourData> {
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    const res = await fetch("/data/sampletour.csv", { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch /data/sampletour.csv (HTTP ${res.status})`);

    const text = await res.text();

    // csvToObjects は rows でも text でもOK（csv.tsが吸収）
    const objects = csvToObjects(parseCsv(text));

    const entries: SampleTourEntry[] = [];

    for (const o of objects) {
      const tour = s(o["ツアー"] ?? o["tour"]);
      const day = parseDay(o["Day"] ?? o["day"]);
      const rownum = parsePosInt(o["rownum"] ?? o["rowNum"] ?? o["row"]);
      const menuid = s(o["menuid"] ?? o["menuId"] ?? o["id"]);

      if (!tour || !day || !rownum || !menuid) continue;
      entries.push({ tour, day, rownum, menuid });
    }

    // tours: CSV登場順
    const tours: string[] = [];
    const seen = new Set<string>();
    for (const e of entries) {
      if (!seen.has(e.tour)) {
        seen.add(e.tour);
        tours.push(e.tour);
      }
    }

    // byTour: Map
    const byTour = new Map<string, SampleTourEntry[]>();
    for (const t of tours) byTour.set(t, []);
    for (const e of entries) {
      if (!byTour.has(e.tour)) byTour.set(e.tour, []);
      byTour.get(e.tour)!.push(e);
    }

    // sort each
    for (const [t, arr] of byTour.entries()) {
      arr.sort((a, b) => (a.day - b.day) || (a.rownum - b.rownum));
      byTour.set(t, arr);
    }

    return { tours, byTour, entries };
  })();

  return cachePromise;
}
