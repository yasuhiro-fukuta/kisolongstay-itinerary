// src/components/LeftDrawer.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { MenuRow } from "@/lib/menuData";
import { publicImageUrlFromImgCell } from "@/lib/menuData";
import type { SavedItineraryMeta } from "@/lib/itineraryStore";
import { translateCategory, translateTourName, translateSpotTitle, useI18n } from "@/lib/i18n";

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

export type LeftDrawerBodyProps = {
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
};

/**
 * Inner contents of the top “Itinerary menu” panel.
 *
 * NOTE:
 * - This is exported separately so mobile “swipe sheet” can reuse the same UI.
 */
export function LeftDrawerBody({
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
}: LeftDrawerBodyProps) {
  const { lang, t } = useI18n();

  const [active, setActive] = useState<string>(categories[0] ?? "全域");
  const [loadOpen, setLoadOpen] = useState(false);

  // if categories arrive later, ensure active is valid
  useEffect(() => {
    if (!categories.length) return;
    if (!categories.includes(active)) setActive(categories[0]);
  }, [categories, active]);

  const activeLabel = translateCategory(active, lang);
  const places = useMemo(() => byCategory.get(active) ?? [], [byCategory, active]);

  return (
    <>
      {/* 1) Sample tours */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-2">
        <div className="text-sm font-semibold text-neutral-100">{t("menu.sampleTours")}</div>

        <div className="mt-2 space-y-2">
          {sampleTours.map((tourKey) => {
            const label = translateTourName(tourKey, lang);
            return (
              <button
                key={tourKey}
                onClick={() => onLoadSampleTour(tourKey)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-left hover:bg-neutral-900/60 text-sm text-neutral-100"
                title={label}
              >
                {label}
              </button>
            );
          })}
          {sampleTours.length === 0 ? (
            <div className="text-xs text-neutral-400">{t("menu.sampleToursEmpty")}</div>
          ) : null}
        </div>
      </div>

      {/* 2) Categories (horizontal) */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-2">
        <div className="text-xs text-neutral-400 mb-2">{t("menu.categories")}</div>
        <div className="flex flex-wrap gap-2 pb-1">
          {categories.map((c) => {
            const on = c === active;
            const label = translateCategory(c, lang);
            return (
              <button
                key={c}
                onClick={() => {
                  setActive(c);
                  onCategoryPicked(c);
                }}
                className={[
                  "shrink-0 rounded-full px-3 py-1 text-sm border",
                  on
                    ? "bg-neutral-100 text-neutral-900 border-neutral-200"
                    : "bg-neutral-950 border-neutral-800",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="mt-2 text-xs text-neutral-400">{t("menu.selected", { active: activeLabel })}</div>
      </div>

      {/* 3) Service menu (spots) */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-neutral-100">{t("menu.serviceMenu")}</div>
          <div className="text-xs text-neutral-400 shrink-0">{activeLabel}</div>
        </div>

        {places.length === 0 ? (
          <div className="mt-2 text-sm text-neutral-400">{t("menu.noSpots")}</div>
        ) : (
          <div className="mt-2 space-y-2">
            {places.map((p) => {
              const imgSrc = publicImageUrlFromImgCell(p.img);
              const emoji = emojiForIconKey(p.icon);
              const titleLabel = translateSpotTitle(p.title, lang);

              return (
                <div
                  key={p.menuid}
                  onClick={() => onSelectPlace(p)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectPlace(p);
                    }
                  }}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950/60 p-2 flex gap-3 items-start text-left hover:bg-neutral-900/60 cursor-pointer"
                  title={titleLabel}
                >
                  <div className="h-12 w-12 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900 shrink-0 relative">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={titleLabel}
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
                      <span className="truncate">{titleLabel}</span>
                    </div>
                  </div>

                  {/*
                    bottom-right: links
                    NOTE: keep this column width bounded so links won't squeeze the title.
                  */}
                  <div className="w-28 shrink-0 flex flex-col items-end self-stretch">
                    <div className="w-full mt-auto flex flex-wrap justify-end gap-2 text-xs text-neutral-300">
                      {p.mapUrl ? (
                        <a
                          href={p.mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t("common.links.map")}
                        </a>
                      ) : null}
                      {p.hpUrl ? (
                        <a
                          href={p.hpUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t("common.links.hp")}
                        </a>
                      ) : null}
                      {p.otaUrl ? (
                        <a
                          href={p.otaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t("common.links.ota")}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4) Load itinerary */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-neutral-100">{t("menu.itineraryLoad")}</div>
          {!userLabel ? (
            <button
              onClick={onRequestLogin}
              className="text-xs px-3 py-1 rounded-lg border border-neutral-800 text-neutral-100"
            >
              {t("menu.login")}
            </button>
          ) : null}
        </div>

        <button
          onClick={() => setLoadOpen((v) => !v)}
          className="mt-2 w-full text-left rounded-xl px-3 py-2 border border-neutral-800 bg-neutral-950/60 hover:bg-neutral-900/60 text-neutral-100"
        >
          {t("menu.loadButton")}
        </button>

        {loadOpen && (
          <div className="mt-2 space-y-2">
            {!userLabel ? (
              <div className="text-xs text-neutral-400">{t("menu.loadRequiresLogin")}</div>
            ) : savedItineraries.length === 0 ? (
              <div className="text-xs text-neutral-400">{t("menu.noSaved")}</div>
            ) : (
              savedItineraries.map((it) => (
                <button
                  key={it.id}
                  onClick={() => onLoadItinerary(it.id)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-left hover:bg-neutral-900/60 text-sm text-neutral-100"
                  title={it.title}
                >
                  {it.title}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function LeftDrawer({
  open,
  onOpenChange,
  expanded,
  onToggleExpand,
  ...bodyProps
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  // top 1/3 ↔ top 2/3 (pull down / roll up)
  expanded: boolean;
  onToggleExpand: () => void;
} & LeftDrawerBodyProps) {
  const { t } = useI18n();

  return (
    <div
      className={[
        "absolute inset-x-0 top-0 z-[70]",
        expanded ? "h-[66vh]" : "h-[33vh]",
        "transition-transform duration-300 ease-out",
        open ? "translate-y-0 pointer-events-auto" : "-translate-y-full pointer-events-none",
      ].join(" ")}
    >
      <div className="h-full rounded-b-2xl bg-neutral-950/95 backdrop-blur shadow-2xl border border-neutral-800 overflow-hidden text-neutral-100 flex flex-col">
        {/* scroll area */}
        <div className="flex-1 overflow-auto p-2 space-y-4">
          <LeftDrawerBody {...bodyProps} />
        </div>

        {/* bottom: height toggle */}
        <div className="p-2 border-t border-neutral-800 flex justify-center">
          <button
            onClick={onToggleExpand}
            className="rounded-full w-8 h-8 border border-neutral-800 bg-neutral-950/60 text-neutral-100 grid place-items-center"
            title={expanded ? t("menu.collapseTitle") : t("menu.expandTitle")}
          >
            {expanded ? "△" : "▽"}
          </button>
        </div>
      </div>
    </div>
  );
}
