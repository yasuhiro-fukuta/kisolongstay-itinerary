import { LeftMenuRow } from "@/lib/csv";

/**
 * CSVに登場するカテゴリ順を保ちつつ、「全域」を先頭固定で返す。
 */
export function buildCategoryOrder(rows: LeftMenuRow[]): string[] {
  const orderNonAll: string[] = [];
  const seen = new Set<string>();

  for (const r of rows) {
    if (!r.カテゴリ) continue;
    if (r.カテゴリ === "全域") continue;
    if (seen.has(r.カテゴリ)) continue;
    seen.add(r.カテゴリ);
    orderNonAll.push(r.カテゴリ);
  }

  // 「全域」は常に先頭に
  return ["全域", ...orderNonAll];
}

export function groupLeftMenuByCategory(rows: LeftMenuRow[]): Map<string, LeftMenuRow[]> {
  const map = new Map<string, LeftMenuRow[]>();
  for (const r of rows) {
    const cat = r.カテゴリ || "全域";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(r);
  }
  if (!map.has("全域")) map.set("全域", []);
  return map;
}
