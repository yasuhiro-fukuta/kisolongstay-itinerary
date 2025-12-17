// src/lib/sampleTour.ts
import type { DayIndex } from "@/lib/itinerary";
import { parseCsv, csvToObjects } from "@/lib/csv";

export type SampleTourRow = {
  tour: string;      // 「ツアー」
  day: DayIndex;     // 「Day」(Day1..Day5)
  rownum: number;    // 「rownum」(1-based)
  menuid: string;    // 「menuid」(left_menu.csv の menuid)
};

function parseDayToIndex(v: string): DayIndex | null {
  const s = String(v ?? "").trim();
  const m = s.match(/^Day\s*([1-5])$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return null;
}

export async function fetchSampleTourRows(): Promise<SampleTourRow[]> {
  const res = await fetch("/data/sampletour.csv", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`sampletour.csv fetch failed: HTTP ${res.status}`);
  }

  const text = await res.text();
  const rows = parseCsv(text);
  const objs = csvToObjects(rows);

  const out: SampleTourRow[] = objs
    .map((o) => {
      const tour = String(o["ツアー"] ?? "").trim();
      const day = parseDayToIndex(String(o["Day"] ?? ""));
      const rownum = Number(String(o["rownum"] ?? "").trim());
      const menuid = String(o["menuid"] ?? "").trim();

      if (!tour || !day || !Number.isFinite(rownum) || rownum < 1 || !menuid) return null;

      return { tour, day, rownum, menuid } satisfies SampleTourRow;
    })
    .filter(Boolean) as SampleTourRow[];

  return out;
}
