// src/lib/menuData.ts
import { csvToObjects } from "@/lib/csv";

export type MenuRow = {
  menuid: string;
  category: string; // カテゴリ
  img: string;
  icon: string;
  title: string;
  mapUrl: string; // 任意
  hpUrl: string;  // 任意
  otaUrl: string; // 任意
};

export type LeftMenuData = {
  rows: MenuRow[];
  categories: string[]; // 全域は最後固定
  byCategory: Map<string, MenuRow[]>;
  byId: Map<string, MenuRow>;
};

function s(v: unknown): string {
  return String(v ?? "").trim();
}

function pick(o: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    if (k in o) return s(o[k]);
  }
  return "";
}

// public/img 配下想定。拡張子が無ければ .jpg 補完
export function publicImageUrlFromImgCell(img: string): string {
  const v = s(img);
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("/")) return v;
  const hasExt = /\.[a-z0-9]+$/i.test(v);
  return `/img/${hasExt ? v : `${v}.jpg`}`;
}

let cached: Promise<LeftMenuData> | null = null;

export async function loadLeftMenuData(): Promise<LeftMenuData> {
  if (cached) return cached;

  cached = (async () => {
    const res = await fetch("/data/left_menu.csv", { cache: "no-store" });
    if (!res.ok) throw new Error(`failed to load left_menu.csv (HTTP ${res.status})`);
    const text = await res.text();

    // ★ csvToObjects は text でもOK（csv.ts側が吸収）
    const records = csvToObjects(text);

    const rows: MenuRow[] = records
      .map((r) => {
        const menuid = pick(r, ["menuid", "MenuID", "id"]);
        const category = pick(r, ["カテゴリ", "category"]) || "未分類";
        const img = pick(r, ["img", "image"]);
        const icon = pick(r, ["アイコン", "icon"]);
        const title = pick(r, ["タイトル", "title", "name"]);

        const mapUrl = pick(r, ["Map", "MAP", "map"]);
        const hpUrl = pick(r, ["HP", "hp"]);
        const otaUrl = pick(r, ["OTA", "ota"]);

        if (!menuid || !category || !title) return null;

        return { menuid, category, img, icon, title, mapUrl, hpUrl, otaUrl } as MenuRow;
      })
      .filter(Boolean) as MenuRow[];

    const byCategory = new Map<string, MenuRow[]>();
    const byId = new Map<string, MenuRow>();

    const order: string[] = [];
    const seen = new Set<string>();

    for (const row of rows) {
      byId.set(row.menuid, row);

      if (!byCategory.has(row.category)) byCategory.set(row.category, []);
      byCategory.get(row.category)!.push(row);

      if (row.category !== "全域" && !seen.has(row.category)) {
        seen.add(row.category);
        order.push(row.category);
      }
    }

    // 全域は必ず最後・存在しなければ空で作る
    order.push("全域");
    if (!byCategory.has("全域")) byCategory.set("全域", []);

    return { rows, categories: order, byCategory, byId };
  })();

  return cached;
}
