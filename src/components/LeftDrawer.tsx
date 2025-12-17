// src/components/LeftDrawer.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { LeftMenuItem } from "@/lib/leftMenu";
import { iconEmoji } from "@/lib/leftMenu";
import type { SavedItineraryMeta } from "@/lib/itineraryStore";

export default function LeftDrawer({
  menuCategories,
  menuByCategory,
  onSelectMenuItem,

  sampleTourNames,
  onLoadSampleTour,

  savedItineraries,
  onLoadItinerary,
  userLabel,
  onRequestLogin,
}: {
  menuCategories: string[];
  menuByCategory: Record<string, LeftMenuItem[]>;
  onSelectMenuItem: (p: LeftMenuItem) => void;

  sampleTourNames: string[];
  onLoadSampleTour: (tourName: string) => void;

  savedItineraries: SavedItineraryMeta[];
  onLoadItinerary: (id: string) => void;

  userLabel: string | null;
  onRequestLogin: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");

  const [loadOpen, setLoadOpen] = useState(false);

  useEffect(() => {
    // 初期カテゴリを「先頭」に合わせる（全域固定は menuCategories 側で担保済み）
    if (!menuCategories.length) return;

    if (!active || !menuCategories.includes(active)) {
      setActive(menuCategories[0]);
    }
  }, [menuCategories, active]);

  const activeLabel = useMemo(() => active || "", [active]);
  const places = menuByCategory[active] ?? [];

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
        <div className="absolute left-0 top-0 z-[70] h-full w-[320px] max-w-[64vw] pointer-events-auto">
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

            {/* Category buttons */}
            <div className="p-3 space-y-2">
              {menuCategories.map((c) => (
                <button
                  key={c}
                  onClick={() => setActive(c)}
                  className={
                    "w-full text-left rounded-xl px-3 py-2 border " +
                    (active === c
                      ? "bg-neutral-100 text-neutral-900 border-neutral-200"
                      : "bg-neutral-950 border-neutral-800 text-neutral-100")
                  }
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="px-3 pb-3">
              <div className="text-sm font-semibold mb-2 text-neutral-100 flex items-center justify-between">
                <span>{activeLabel}</span>
                <span className="text-xs text-neutral-400">{places.length}件</span>
              </div>

              {/* Places list */}
              {places.length === 0 ? (
                <div className="text-sm text-neutral-400">まだこのカテゴリにスポットがありません</div>
              ) : (
                <div className="space-y-2">
                  {places.map((p) => {
                    const icon = iconEmoji(p.icon);

                    const hasAnyLink =
                      !!String(p.mapUrl ?? "").trim() ||
                      !!String(p.hpUrl ?? "").trim() ||
                      !!String(p.otaUrl ?? "").trim();

                    return (
                      <button
                        key={p.menuid}
                        onClick={() => onSelectMenuItem(p)} // ★押しても閉じない
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-950/60 p-2 flex gap-3 items-center text-left hover:bg-neutral-900/60"
                      >
                        <div className="h-12 w-12 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900 shrink-0 relative">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.title}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                // 画像が無いなら無いでOK（勝手に行を無効扱いはしない）
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate text-neutral-100 flex items-center gap-2">
                            <span className="shrink-0">{icon}</span>
                            <span className="truncate">{p.title}</span>
                          </div>

                          {/* Links row (Map/HP/OTA) */}
                          {hasAnyLink && (
                            <div className="mt-1 flex items-center gap-3 text-xs text-neutral-300">
                              {String(p.mapUrl ?? "").trim() && (
                                <a
                                  className="underline"
                                  href={p.mapUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Map
                                </a>
                              )}
                              {String(p.hpUrl ?? "").trim() && (
                                <a
                                  className="underline"
                                  href={p.hpUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  HP
                                </a>
                              )}
                              {String(p.otaUrl ?? "").trim() && (
                                <a
                                  className="underline"
                                  href={p.otaUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  OTA
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Sample Tours */}
              <div className="mt-6 pt-4 border-t border-neutral-800">
                <div className="text-sm font-semibold text-neutral-100">サンプルツアー</div>

                <div className="mt-2 space-y-2">
                  {sampleTourNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => onLoadSampleTour(name)}
                      className="w-full text-left rounded-xl px-3 py-2 border border-neutral-800 bg-neutral-950/60 hover:bg-neutral-900/60 text-neutral-100"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Saved itineraries */}
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
