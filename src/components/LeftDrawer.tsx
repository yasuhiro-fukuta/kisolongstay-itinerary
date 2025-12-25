// src/components/LeftDrawer.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { MenuRow } from "@/lib/menuData";
import { publicImageUrlFromImgCell } from "@/lib/menuData";
import type { SavedItineraryMeta } from "@/lib/itineraryStore";

function emojiForIconKey(iconKey: string): string {
  const k = (iconKey || "").toLowerCase().trim();
  if (!k) return "📍";
  if (k.includes("cafe") || k.includes("coffee")) return "☕";
  if (k.includes("trail") || k.includes("mount") || k.includes("hike")) return "⛰️";
  if (k.includes("gorge") || k.includes("river")) return "🏞️";
  if (k.includes("brew") || k.includes("beer")) return "🍺";
  if (k.includes("onsen") || k.includes("spa")) return "♨️";
  if (k.includes("hotel") || k.includes("inn")) return "🏨";
  if (k.includes("train") || k.includes("station")) return "🚉";
  if (k.includes("restaurant") || k.includes("lunch") || k.includes("dinner")) return "🍽️";
  if (k.includes("camp")) return "🏕️";
  if (k.includes("cycle") || k.includes("bike")) return "🚴";
  if (k.includes("museum")) return "🏛️";
  if (k.includes("goods") || k.includes("shop")) return "🛍️";
  if (k.includes("taxi")) return "🚕";
  if (k.includes("bus") || k.includes("shuttle")) return "🚌";
  if (k.includes("tour")) return "🧭";
  if (k.includes("baggage")) return "🧳";
  return "📍";
}

export default function LeftDrawer({
  open,
  onOpenChange,

  categories,
  byCategory,

  onCategoryPicked,
  onSelectPlace,

  sampleTours,
  onLoadSampleTour,

  savedItineraries,
  onLoadItinerary,
  userLabel,
  onRequestLogin,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  categories: string[];
  byCategory: Map<string, MenuRow[]>;

  onCategoryPicked: (category: string) => void;
  onSelectPlace: (p: MenuRow) => void;

  sampleTours: string[];
  onLoadSampleTour: (tour: string) => void;

  savedItineraries: SavedItineraryMeta[];
  onLoadItinerary: (id: string) => void;
  userLabel: string | null;
  onRequestLogin: () => void;
}) {
  const [active, setActive] = useState<string>(categories[0] ?? "全域");
  const [loadOpen, setLoadOpen] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(true);

  // categoriesが後から来た時の初期化
  useEffect(() => {
    if (!categories.length) return;
    if (!categories.includes(active)) setActive(categories[0]);
  }, [categories, active]);

  const places = useMemo(() => byCategory.get(active) ?? [], [byCategory, active]);

  return (
    <div
      className={[
        "absolute inset-x-0 top-0 z-[70]",
        "h-[33vh]",
        "transition-transform duration-300 ease-out",
        open ? "translate-y-0 pointer-events-auto" : "-translate-y-full pointer-events-none",
      ].join(" ")}
    >
      <div className="h-full rounded-b-2xl bg-neutral-950/95 backdrop-blur shadow-2xl border border-neutral-800 overflow-hidden text-neutral-100 flex flex-col">
        {/*
          仕様（スマホ強化）
          - メニューは上から出る
          - 表示順：サンプルツアー → カテゴリ（横並び） → サービスメニュー → 旅程ロード
        */}

        {/* スクロール領域 */}
        <div className="flex-1 overflow-auto p-2 space-y-4">
          {/* ① サンプルツアー */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-neutral-100">サンプルツアー</div>
              <button
                onClick={() => setSampleOpen((v) => !v)}
                className="text-xs px-2 py-1 rounded-lg border border-neutral-800 text-neutral-100"
              >
                {sampleOpen ? "閉じる" : "開く"}
              </button>
            </div>

            {sampleOpen && (
              <div className="mt-2 space-y-2">
                {sampleTours.map((t) => (
                  <button
                    key={t}
                    onClick={() => onLoadSampleTour(t)}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-left hover:bg-neutral-900/60 text-sm text-neutral-100"
                    title={t}
                  >
                    {t}
                  </button>
                ))}
                {sampleTours.length === 0 ? (
                  <div className="text-xs text-neutral-400">sampletour.csv が空、または読み込み失敗しています。</div>
                ) : null}
              </div>
            )}
          </div>

          {/* ② カテゴリ（横並び） */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-2">
            <div className="text-xs text-neutral-400 mb-2">カテゴリ</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((c) => {
                const on = c === active;
                return (
                  <button
                    key={c}
                    onClick={() => {
                      setActive(c);
                      onCategoryPicked(c);
                    }}
                    className={[
                      "shrink-0 rounded-full px-3 py-1 text-sm border",
                      on ? "bg-neutral-100 text-neutral-900 border-neutral-200" : "bg-neutral-950 border-neutral-800",
                    ].join(" ")}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-neutral-400">選択中：{active}</div>
          </div>

          {/* ③ サービスメニュー（スポット一覧） */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-neutral-100">サービスメニュー</div>
              <div className="text-xs text-neutral-400 shrink-0">{active}</div>
            </div>

            {places.length === 0 ? (
              <div className="mt-2 text-sm text-neutral-400">まだこのカテゴリにスポットがありません</div>
            ) : (
              <div className="mt-2 space-y-2">
                {places.map((p) => {
                  const imgSrc = publicImageUrlFromImgCell(p.img);
                  const emoji = emojiForIconKey(p.icon);

                  return (
                    <button
                      key={p.menuid}
                      onClick={() => onSelectPlace(p)}
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950/60 p-2 flex gap-3 items-center text-left hover:bg-neutral-900/60"
                      title={p.title}
                    >
                      <div className="h-12 w-12 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900 shrink-0 relative">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={p.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] text-neutral-400 truncate">{p.icon ? p.icon : "spot"}</div>
                        <div className="text-sm font-medium truncate text-neutral-100 flex items-center gap-2">
                          <span className="shrink-0">{emoji}</span>
                          <span className="truncate">{p.title}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ④ 旅程ロード */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-neutral-100">旅程ロード</div>
              {!userLabel ? (
                <button
                  onClick={onRequestLogin}
                  className="text-xs px-3 py-1 rounded-lg border border-neutral-800 text-neutral-100"
                >
                  ログイン
                </button>
              ) : null}
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
                  <div className="text-xs text-neutral-400">旅程のロードはログイン後に利用できます。</div>
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

        {/* 下段：閉じる */}
        <div className="p-2 border-t border-neutral-800 flex justify-end">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg px-3 py-1 text-sm border border-neutral-800 text-neutral-100"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}