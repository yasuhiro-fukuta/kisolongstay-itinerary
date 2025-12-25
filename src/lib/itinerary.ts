// src/lib/itinerary.ts

export type EntryType = "spot";
export type ItemId = string;

export type ItineraryItem = {
  id: ItemId;
  day: number; // 1..N（可変）

  type: EntryType;

  // ★自由記述は UI では禁止（ただし表示・外部入力で入る）
  name: string;

  // ★Map/HP/OTA は必須ではない（空でも有効）
  mapUrl: string;
  hpUrl: string;
  otaUrl: string;

  // ★金額メモ（円想定・自由入力）
  costMemo: string;

  /**
   * ソーシャルプロフィール（Instagram / TikTok など）。
   * - Mapクリック時に Place の website から抽出する（できる範囲で）
   * - メニュー（CSV）では基本空
   */
  socialLinks?: { platform: string; url: string }[];

  // 参照用（Mapクリック時など）
  placeId: string;

  // ルート描画用（Mapが無い場合は undefined のままでもOK）
  lat?: number;
  lng?: number;
};

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `spot:${crypto.randomUUID()}`
    : `spot:${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function makeEmptySpot(day: number): ItineraryItem {
  return {
    id: makeId(),
    day: Math.max(1, Math.trunc(day || 1)),
    type: "spot",
    name: "",
    mapUrl: "",
    hpUrl: "",
    otaUrl: "",
    costMemo: "",
    socialLinks: [],
    placeId: "",
    lat: undefined,
    lng: undefined,
  };
}

/**
 * 初期は 5 Day × 各 1 行（v2互換の感覚）
 * v3では + / - で増減できる。
 */
export function makeInitialItems(dayCount = 5, rowsPerDay = 1): ItineraryItem[] {
  const d = Math.max(1, Math.trunc(dayCount || 1));
  const r = Math.max(1, Math.trunc(rowsPerDay || 1));
  const out: ItineraryItem[] = [];

  for (let day = 1; day <= d; day++) {
    for (let i = 0; i < r; i++) {
      out.push(makeEmptySpot(day));
    }
  }
  return out;
}
