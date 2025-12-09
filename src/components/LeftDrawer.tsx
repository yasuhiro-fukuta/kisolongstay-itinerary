"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, SAVED_PLACES, type CategoryKey, type SavedPlace } from "@/lib/savedLists";
import type { SavedItineraryMeta } from "@/lib/itineraryStore";

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
  const [active, setActive] = useState<CategoryKey>("stay");
  const [loadOpen, setLoadOpen] = useState(false);

  const activeLabel = useMemo(
    () => CATEGORIES.find((c) => c.key === active)?.label ?? "",
    [active]
  );

  const places = SAVED_PLACES[active] ?? [];

  return (
    <>
      {/* ハンバーガー */}
      <button
        onClick={() => setOpen(true)}
        className="absolute left-4 top-4 z-[60] rounded-full bg-white/95 shadow-lg border border-neutral-200 w-10 h-10 grid place-items-center"
        title="メニュー"
      >
        ≡
      </button>

      {open && (
        <div className="absolute inset-0 z-[70] pointer-events-auto">
          <div className="absolute inset-0 bg-black/25" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[380px] max-w-[92vw] bg-white shadow-xl border-r border-neutral-200 overflow-auto">
            <div className="p-3 border-b border-neutral-200 flex items-center justify-between">
              <div className="font-semibold">メニュー</div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm border border-neutral-300"
              >
                ×
              </button>
            </div>

            {/* カテゴリ */}
            <div className="p-3 space-y-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setActive(c.key)}
                  className={
                    "w-full text-left rounded-xl px-3 py-2 border " +
                    (active === c.key
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white border-neutral-200")
                  }
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* リスト */}
            <div className="px-3 pb-3">
              <div className="text-sm font-semibold mb-2">{activeLabel}</div>

              {places.length === 0 ? (
                <div className="text-sm text-neutral-600">まだこのカテゴリのスポットが登録されていません</div>
              ) : (
                <div className="space-y-2">
                  {places.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectPlace(p);
                        setOpen(false);
                      }}
                      className="w-full rounded-xl border border-neutral-200 bg-white p-2 flex gap-3 items-center text-left hover:bg-neutral-50"
                    >
                      <div className="h-12 w-12 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 shrink-0">
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
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        {p.mapUrl && (
                          <a
                            className="text-xs underline text-neutral-600"
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
                  ))}
                </div>
              )}

              {/* 旅程ロード */}
              <div className="mt-6 pt-4 border-t border-neutral-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">旅程</div>
                  {!userLabel && (
                    <button
                      onClick={onRequestLogin}
                      className="text-xs px-3 py-1 rounded-lg border border-neutral-300"
                    >
                      ログイン
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setLoadOpen((v) => !v)}
                  className="mt-2 w-full text-left rounded-xl px-3 py-2 border border-neutral-200 bg-white hover:bg-neutral-50"
                >
                  旅程をロードする
                </button>

                {loadOpen && (
                  <div className="mt-2 space-y-2">
                    {!userLabel ? (
                      <div className="text-xs text-neutral-600">
                        旅程のロードはログイン後に利用できます（右上の保存ボタンからでもOK）。
                      </div>
                    ) : savedItineraries.length === 0 ? (
                      <div className="text-xs text-neutral-600">保存した旅程がまだありません。</div>
                    ) : (
                      savedItineraries.map((it) => (
                        <button
                          key={it.id}
                          onClick={() => {
                            onLoadItinerary(it.id);
                            setOpen(false);
                          }}
                          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left hover:bg-neutral-50 text-sm"
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
