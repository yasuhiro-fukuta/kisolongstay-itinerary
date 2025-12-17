// src/lib/leftMenu.ts
import { parseCsv, csvToObjects } from "@/lib/csv";

export type LeftMenuItem = {
  menuid: string;
  category: string; // 「カテゴリ」
  img: string; // 画像ファイル名（拡張子なしも許容）
  icon: string; // 「アイコン」
  title: string; // 「タイトル」
  mapUrl: string; // 「Map」(空OK)
  hpUrl: string; // 「HP」(空OK)
  otaUrl: string; // 「OTA」(空OK)
  imageUrl?: string; // 表示用（/img/xxx.jpg 等）
};

export function iconEmoji(icon: string): string {
  const k = String(icon ?? "").trim().toLowerCase();

  if (k.includes("cafe") || k.includes("coffee")) return "☕";
  if (k.includes("trail") || k.includes("hike") || k.includes("mount")) return "⛰️";
  if (k.includes("gorge") || k.includes("river") || k.includes("water")) return "🏞️";
  if (k.includes("brew") || k.includes("beer")) return "🍺";
  if (k.includes("onsen") || k.includes("spa")) return "♨️";
  if (k.includes("hotel") || k.includes("inn")) return "🏨";
  if (k.includes("train") || k.includes("station")) return "🚉";
  if (k.includes("restaurant") || k.includes("lunch") || k.includes("dinner") || k.includes("food"))
    return "🍽️";
  if (k.includes("camp")) return "🏕️";
  if (k.includes("cycle") || k.includes("bike")) return "🚴";
  if (k.includes("museum")) return "🏛️";
  if (k.includes("goods") || k.includes("shop")) return "🛍️";

  // 全域系
  if (k.includes("tourguide")) return "🧑‍💼";
  if (k.includes("taxi")) return "🚕";
  if (k.includes("baggage")) return "🧳";

  return "📍";
}

export function resolveImageUrl(img: string): string | undefined {
  const s = String(img ?? "").trim();
  if (!s) return undefined;

  // すでにURLや絶対パスならそのまま
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/")) return s;

  // 拡張子が無ければ .jpg を補う（これが今回の「画像が出ない」原因の一つ）
  const hasExt = /\.[a-z0-9]+$/i.test(s);
  const file = hasExt ? s : `${s}.jpg`;

  return `/img/${file}`;
}

export async function fetchLeftMenuItems(): Promise<LeftMenuItem[]> {
  const res = await fetch("/data/left_menu.csv", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`left_menu.csv fetch failed: HTTP ${res.status}`);
  }

  const text = await res.text();
  const rows = parseCsv(text);
  const objs = csvToObjects(rows);

  const items: LeftMenuItem[] = objs
    .map((o) => {
      const menuid = String(o["menuid"] ?? "").trim();
      const category = String(o["カテゴリ"] ?? "").trim();
      const img = String(o["img"] ?? "").trim();
      const icon = String(o["アイコン"] ?? "").trim();
      const title = String(o["タイトル"] ?? "").trim();

      // ★Map/HP/OTA は「空でも有効」。勝手に無効扱いしない。
      const mapUrl = String(o["Map"] ?? "").trim();
      const hpUrl = String(o["HP"] ?? "").trim();
      const otaUrl = String(o["OTA"] ?? "").trim();

      return {
        menuid,
        category,
        img,
        icon,
        title,
        mapUrl,
        hpUrl,
        otaUrl,
        imageUrl: resolveImageUrl(img),
      } satisfies LeftMenuItem;
    })
    // menuid/category/title が空のゴミ行だけ除外（Map/HP/OTA空はOK）
    .filter((x) => !!x.menuid && !!x.category && !!x.title);

  return items;
}

/**
 * カテゴリ順：
 * - CSVに出現した順（全域以外）
 * - 「全域」は CSVにあってもなくても必ず最後に追加（中身はCSVで読めた分だけ）
 */
export function buildCategoryOrder(items: LeftMenuItem[]): string[] {
  const order: string[] = [];
  const seen = new Set<string>();

  for (const it of items) {
    const c = String(it.category ?? "").trim();
    if (!c) continue;

    // ★全域は最後固定
    if (c === "全域") continue;

    if (!seen.has(c)) {
      seen.add(c);
      order.push(c);
    }
  }

  // ★CSVに無くても強制生成、あっても最後固定
  order.push("全域");
  return order;
}

export function groupLeftMenuByCategory(
  items: LeftMenuItem[],
  categoryOrder: string[]
): Record<string, LeftMenuItem[]> {
  const map: Record<string, LeftMenuItem[]> = {};

  for (const c of categoryOrder) map[c] = [];

  for (const it of items) {
    const c = String(it.category ?? "").trim();
    if (!c) continue;
    if (!map[c]) map[c] = [];
    map[c].push(it);
  }

  // 念のため（CSVが空でも全域キーは存在させる）
  if (!map["全域"]) map["全域"] = [];
  return map;
}
