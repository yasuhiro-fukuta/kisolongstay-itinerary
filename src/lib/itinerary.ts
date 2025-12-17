// src/lib/itinerary.ts

export const ENTRY_TYPES = [{ key: "spot", label: "スポット" }] as const;

export type EntryType = (typeof ENTRY_TYPES)[number]["key"];
export type DayIndex = 1 | 2 | 3 | 4 | 5;

export type ItemId = string;

export type ItineraryItem = {
  id: ItemId;
  day: DayIndex;
  type: EntryType;

  name: string;
  price: string;

  // 地図連携
  placeId?: string;
  mapUrl?: string;

  // 互換用（昔の保存データがあっても壊れにくくするため）
  detail?: string;
};

export function makeInitialItems(): ItineraryItem[] {
  const items: ItineraryItem[] = [];
  for (const day of [1, 2, 3, 4, 5] as const) {
    items.push({
      id: `${day}:spot:0`,
      day,
      type: "spot",
      name: "",
      price: "",
      placeId: "",
      mapUrl: "",
      detail: "",
    });
  }
  return items;
}
