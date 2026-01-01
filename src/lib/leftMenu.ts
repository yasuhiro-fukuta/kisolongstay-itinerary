import type { MenuRow } from "@/lib/menuData";

// NOTE: This file is currently unused by the UI, but it must compile on Vercel.
// Keep helpers here in case they become useful again.

export type LeftMenuRow = MenuRow;

/**
 * CSVに登場するカテゴリ順を保ちつつ、「全域」を先頭固定で返す。
 */
export function buildCategoryOrder(rows: LeftMenuRow[]): string[] {
  const orderNonAll: string[] = [];
  const seen = new Set<string>();

  for (const r of rows) {
    const cat = r.category;
    if (!cat) continue;
    if (cat === "全域") continue;
    if (seen.has(cat)) continue;
    seen.add(cat);
    orderNonAll.push(cat);
  }

  // 「全域」は常に先頭に
  return ["全域", ...orderNonAll];
}

export function groupLeftMenuByCategory(rows: LeftMenuRow[]): Map<string, LeftMenuRow[]> {
  const map = new Map<string, LeftMenuRow[]>();
  for (const r of rows) {
    const cat = r.category || "全域";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(r);
  }
  if (!map.has("全域")) map.set("全域", []);
  return map;
}
