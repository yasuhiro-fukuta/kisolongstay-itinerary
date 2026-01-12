// src/lib/savedLists.ts
// public/data/left_menu.csv を読み込んで左メニューを生成する
//
// CSV列（ヘッダ想定）:
// menuid, カテゴリ, img, アイコン, タイトル, Map, HP, OTA
//
// 仕様:
// - 「全域」カテゴリは CSV に行がなくても必ず生成
// - 「全域」の中身は CSV 上でカテゴリ=全域の行だけ
// - カテゴリ順は「全域」を最後に固定
// - Map/HP/OTA は必須にしない（空でも行は有効）
// - img は「拡張子なし」の場合だけ .jpg を補完して /img/<name>.jpg を参照

export type CategoryKey = string;

export type SavedPlace = {
  id: string; // menuid
  category: CategoryKey; // カテゴリ
  name: string; // タイトル
  iconKey?: string; // アイコン（任意）
  imageUrl?: string; // /img/xxx.jpg など（任意）
  mapUrl?: string; // Map（任意）
  hpUrl?: string; // HP（任意）
  otaUrl?: string; // OTA（任意）
};

export type LeftMenuCategory = { key: CategoryKey; label: string };

export type LeftMenuData = {
  categories: LeftMenuCategory[];
  placesByCategory: Record<CategoryKey, SavedPlace[]>;
};

function stripBom(s: string) {
  return String(s ?? "").replace(/^\uFEFF/, "");
}

function normCell(v: unknown) {
  return String(v ?? "").trim();
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const s = String(text ?? "");

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = s[i + 1];
        if (next === '"') {
          // escaped quote
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (ch === "\r") {
      continue;
    }

    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  // last line (no trailing \n)
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  // 空行除去
  return rows.filter((r) => r.some((c) => normCell(c) !== ""));
}

function headerIndex(header: string[], candidates: string[]): number {
  const h = header.map((x) => stripBom(normCell(x)));
  const lower = h.map((x) => x.toLowerCase());

  for (const c of candidates) {
    const key = c.toLowerCase();
    const idx = lower.indexOf(key);
    if (idx >= 0) return idx;
  }
  // Japanese exact match (case insensitive doesn't matter)
  for (const c of candidates) {
    const idx = h.indexOf(c);
    if (idx >= 0) return idx;
  }
  return -1;
}

function normalizeImgToPublicUrl(raw: string): string | undefined {
  const v = normCell(raw);
  if (!v) return undefined;

  // すでに / から始まるならそのまま（例: /img/foo.jpg）
  if (v.startsWith("/")) return v;

  // http(s) URL ならそのまま
  if (/^https?:\/\//i.test(v)) return v;

  // 拡張子があればそのまま /img/<file>
  if (v.includes(".")) return `/img/${v}`;

  // 拡張子が無ければ .jpg を補完（これだけやる。余計な判定はしない）
  return `/img/${v}.jpg`;
}

export async function loadLeftMenuData(): Promise<LeftMenuData> {
  // public/data/left_menu.csv -> /data/left_menu.csv
  const res = await fetch("/data/left_menu.csv", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`left_menu.csv の読み込みに失敗しました (HTTP ${res.status})`);
  }

  const text = await res.text();
  const rows = parseCsv(text);

  // CSV空でも「全域」は必ず出す
  if (rows.length === 0) {
    return {
      categories: [{ key: "全域", label: "全域" }],
      placesByCategory: { 全域: [] },
    };
  }

  const header = rows[0].map((x) => stripBom(normCell(x)));

  const idxMenuId = headerIndex(header, ["menuid", "id"]);
  const idxCategory = headerIndex(header, ["カテゴリ", "category"]);
  const idxImg = headerIndex(header, ["img", "image"]);
  const idxIcon = headerIndex(header, ["アイコン", "icon"]);
  const idxTitle = headerIndex(header, ["タイトル", "title", "name"]);
  const idxMap = headerIndex(header, ["map", "Map", "MAP"]);
  const idxHp = headerIndex(header, ["hp", "HP"]);
  const idxOta = headerIndex(header, ["ota", "OTA"]);

  const places: SavedPlace[] = [];
  const seenCategory = new Set<string>();
  const orderedCategories: string[] = []; // 「全域」以外を CSV 出現順で積む

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? [];

    const col = (i: number) => (i >= 0 && i < row.length ? normCell(row[i]) : "");

    const id = col(idxMenuId) || String(r); // menuid が無ければ行番号で代替
    const category = col(idxCategory);
    const title = col(idxTitle);

    // 必須にするのは「カテゴリ」と「タイトル」だけ（Map/HP/OTA/img は必須にしない）
    if (!category || !title) continue;

    if (category !== "全域" && !seenCategory.has(category)) {
      seenCategory.add(category);
      orderedCategories.push(category);
    }

    const iconKey = col(idxIcon) || undefined;

    const imageUrl = normalizeImgToPublicUrl(col(idxImg));

    const mapUrl = col(idxMap) || undefined;
    const hpUrl = col(idxHp) || undefined;
    const otaUrl = col(idxOta) || undefined;

    places.push({
      id,
      category,
      name: title,
      iconKey,
      imageUrl,
      mapUrl,
      hpUrl,
      otaUrl,
    });
  }

  // 「全域」は CSV にあってもなくても必ず最後
  const categoriesFinal = [...orderedCategories, "全域"];

  const placesByCategory: Record<string, SavedPlace[]> = {};
  for (const c of categoriesFinal) placesByCategory[c] = [];

  for (const p of places) {
    if (!placesByCategory[p.category]) {
      // 想定外カテゴリが来ても「全域の前」に割り込ませない（ここは触らない）
      // ただし表示はできるように追加はする
      placesByCategory[p.category] = [];
    }
    placesByCategory[p.category].push(p);
  }

  // 「全域」カテゴリが空でもキーだけは必ず存在させる
  if (!placesByCategory["全域"]) placesByCategory["全域"] = [];

  // categoriesFinal に無いカテゴリ（想定外カテゴリ）があれば「全域の前」に追加しない方針なので、
  // 表示上は categoriesFinal のみを返す（＝全域最後固定を絶対守る）
  return {
    categories: categoriesFinal.map((c) => ({ key: c, label: c })),
    placesByCategory,
  };
}
