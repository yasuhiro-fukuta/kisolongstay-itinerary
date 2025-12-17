// src/components/LeftDrawer.tsx
"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, SAVED_PLACES, type CategoryKey, type SavedPlace } from "@/lib/savedLists";
import type { SavedItineraryMeta } from "@/lib/itineraryStore";

function iconForPlace(p: SavedPlace): string {
  const id = p.id.toLowerCase();
  const name = (p.name || "").toLowerCase();

  if (id.includes("cafe") || name.includes("coffee") || name.includes("珈琲") || name.includes("カフェ")) return "☕";
  if (id.includes("trail") || name.includes("峠") || name.includes("岳") || name.includes("登山")) return "⛰️";
  if (id.includes("gorge") || name.includes("渓流") || name.includes("淵") || name.includes("橋")) return "🏞️";
  if (id.includes("brewery") || name.includes("brew") || name.includes("醸造")) return "🍺";
  if (id.includes("onsen") || name.includes("温泉")) return "♨️";
  if (id.includes("hotel") || name.includes("宿") || name.includes("inn") || name.includes("民宿")) return "🏨";
  if (id.includes("train") || name.includes("駅")) return "🚉";
  if (id.includes("restaurant") || id.includes("lunch") || id.includes("dinner") || name.includes("食")) return "🍽️";
  if (id.includes("camp")) return "🏕️";
  if (id.includes("cycle") || id.includes("bike")) return "🚴";
  if (id.includes("museum") || name.includes("歴史館")) return "🏛️";
  if (id.includes("goods") || name.includes("交叉点")) return "🛍️";
  return "📍";
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
        className="absolute left-4 top-4 z-[60] rounded-full bg-neutral-950/80 backdrop-blur shadow-lg border border-neutral-800 w-10 h-10 grid place-items-center text-neutral-100"
        title="メニュー"
      >
        ≡
      </button>

      {open && (
        <div className="absolute left-0 top-0 z-[70] h-full w-[360px] max-w-[70vw] pointer-events-auto">
          <div className="h-full bg-neutral-950/95 backdrop-blur shadow-xl border-r border-neutral-800 overflow-auto">
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

            <div className="px-3 pb-3">
              <div className="text-sm font-semibold mb-2 text-neutral-100">{activeLabel}</div>

              {places.length === 0 ? (
                <div className="text-sm text-neutral-400">まだこのエリアのスポットが登録されていません</div>
              ) : (
                <div className="space-y-2">
                  {places.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onSelectPlace(p)} // ★押しても勝手に閉じない
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950/60 p-2 flex gap-3 items-center text-left hover:bg-neutral-900/60"
                    >
                      <div className="h-12 w-12 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900 shrink-0 relative">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate text-neutral-100 flex items-center gap-2">
                          <span className="shrink-0">{iconForPlace(p)}</span>
                          <span className="truncate">{p.name}</span>
                        </div>

                        <a
                          className="text-xs underline text-neutral-300"
                          href={p.mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Googleマップで見る
                        </a>
                      </div>
                    </button>
                  ))}
                </div>
              )}

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
                          onClick={() => onLoadItinerary(it.id)}
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
        </div>
      )}
    </>
  );
}
