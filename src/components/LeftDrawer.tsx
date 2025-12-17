// src/components/LeftDrawer.tsx
"use client";

import { useMemo, useState } from "react";
import {
  CATEGORIES,
  SAVED_PLACES,
  type CategoryKey,
  type SavedPlace,
  type PlaceKind,
} from "@/lib/savedLists";
import type { SavedItineraryMeta } from "@/lib/itineraryStore";

function iconForKind(kind: PlaceKind): string {
  switch (kind) {
    case "cafe":
      return "☕";
    case "brewery":
      return "🍺";
    case "trail":
      return "🏔️";
    case "gorge":
    case "river":
      return "🌊";
    case "restaurant":
    case "lunch":
    case "dinner":
      return "🍽️";
    case "hotel":
      return "🛏️";
    case "street":
      return "🏘️";
    case "train":
      return "🚃";
    case "bridge":
      return "🌉";
    case "camp":
      return "🏕️";
    case "museum":
      return "🏛️";
    case "cycle":
      return "🚲";
    case "onsen":
      return "♨️";
    case "goods":
      return "🛍️";
    case "fishing":
      return "🎣";
    default:
      return "📍";
  }
}

function guessKindFromId(id: string): PlaceKind {
  const s = id.toLowerCase();

  if (s.includes("cafe") || s.includes("coffee")) return "cafe";
  if (s.includes("brewery") || s.includes("brewer")) return "brewery";

  if (s.includes("trail") || s.includes("mountain") || s.includes("mtn") || s.includes("peak"))
    return "trail";

  if (s.includes("gorge")) return "gorge";
  if (s.includes("river")) return "river";

  if (s.includes("restaurant") || s.includes("rest")) return "restaurant";
  if (s.includes("lunch")) return "lunch";
  if (s.includes("dinner")) return "dinner";

  if (s.includes("hotel") || s.includes("inn") || s.includes("minshuku")) return "hotel";
  if (s.includes("street") || s.includes("juku")) return "street";
  if (s.includes("train") || s.includes("station")) return "train";
  if (s.includes("bridge")) return "bridge";

  if (s.includes("camp")) return "camp";
  if (s.includes("museum")) return "museum";
  if (s.includes("cycle") || s.includes("ebike") || s.includes("bike")) return "cycle";
  if (s.includes("onsen")) return "onsen";
  if (s.includes("goods") || s.includes("shop")) return "goods";
  if (s.includes("fishing")) return "fishing";

  return "other";
}

function iconForPlace(p: SavedPlace): string {
  const k = p.kind ?? guessKindFromId(p.id);
  return iconForKind(k);
}

export default function LeftDrawer({
  onSelectPlace,
  savedItineraries,
  onLoadItinerary,
  userLabel,
  onRequestLogin,
}: {
  onSelectPlace: (p: SavedPlace) => void;
  savedItineraries: SavedItineraryMeta[];
  onLoadItinerary: (id: string) => void;
  userLabel: string | null;
  onRequestLogin: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<CategoryKey>("tsumago");
  const [loadOpen, setLoadOpen] = useState(false);

  const activeLabel = useMemo(
    () => CATEGORIES.find((c) => c.key === active)?.label ?? "",
    [active]
  );

  const places = SAVED_PLACES[active] ?? [];

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="absolute left-4 top-4 z-[80] rounded-full bg-neutral-950/80 backdrop-blur shadow-lg border border-neutral-800 w-10 h-10 grid place-items-center text-neutral-100 pointer-events-auto"
        title="メニュー"
      >
        ≡
      </button>

      {open && (
        <div className="absolute left-0 top-0 z-[75] h-full w-[380px] max-w-[50vw] bg-neutral-950/95 backdrop-blur shadow-xl border-r border-neutral-800 overflow-auto pointer-events-auto">
          <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
            <div className="font-semibold text-neutral-100">メニュー</div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-sm border border-neutral-800 text-neutral-100"
              title="閉じる"
            >
              ×
            </button>
          </div>

          {/* 地域カテゴリ */}
          <div className="p-3 space-y-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setActive(c.key)}
                className={
                  "w-full text-left rounded-xl px-3 py-2 border " +
                  (active === c.key
                    ? "bg-neutral-100 text-neutral-900 border-neutral-200"
                    : "bg-neutral-950 border-neutral-800 text-neutral-100")
                }
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* スポット一覧 */}
          <div className="px-3 pb-3">
            <div className="text-sm font-semibold mb-2 text-neutral-100">
              {activeLabel}
            </div>

            {places.length === 0 ? (
              <div className="text-sm text-neutral-400">
                まだこのエリアのスポットが登録されていません
              </div>
            ) : (
              <div className="space-y-2">
                {places.map((p) => {
                  const icon = iconForPlace(p);

                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectPlace(p);
                        // ★ここで閉じない（ユーザー操作で閉じる）
                      }}
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950/60 p-2 flex gap-3 items-center text-left hover:bg-neutral-900/60"
                    >
                      {/* thumbnail + icon */}
                      <div className="h-12 w-12 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900 shrink-0 relative grid place-items-center">
                        <div className="text-xl opacity-90 select-none">{icon}</div>

                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="absolute inset-0 h-full w-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : null}

                        <div className="absolute bottom-1 right-1 z-10 text-xs rounded-md px-1 py-0.5 bg-neutral-950/80 border border-neutral-700/70 leading-none select-none">
                          {icon}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate text-neutral-100">
                          {p.name}
                        </div>

                        {p.mapUrl && (
                          <a
                            className="text-xs underline text-neutral-300"
                            href={p.mapUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Googleマップで見る
                          </a>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 旅程ロード */}
            <div className="mt-6 pt-4 border-t border-neutral-800">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-neutral-100">旅程</div>
                {!userLabel && (
                  <button
                    onClick={onRequestLogin}
                    className="text-xs px-3 py-1 rounded-lg border border-neutral-800 text-neutral-100"
                  >
                    ログイン
                  </button>
                )}
              </div>

              <button
                onClick={() => setLoadOpen((v) => !v)}
                className="mt-2 w-full text-left rounded-xl px-3 py-2 border border-neutral-800 bg-neutral-950/60 hover:bg-neutral-900/60 text-neutral-100"
              >
                旅程をロードする
              </button>

              {loadOpen && (
                <div className="mt-2 space-y-2">
                  {!userLabel ? (
                    <div className="text-xs text-neutral-400">
                      旅程のロードはログイン後に利用できます（保存ボタンからでもOK）。
                    </div>
                  ) : savedItineraries.length === 0 ? (
                    <div className="text-xs text-neutral-400">保存した旅程がまだありません。</div>
                  ) : (
                    savedItineraries.map((it) => (
                      <button
                        key={it.id}
                        onClick={() => {
                          onLoadItinerary(it.id);
                          // ★閉じない
                        }}
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-left hover:bg-neutral-900/60 text-sm text-neutral-100"
                      >
                        {it.title}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
