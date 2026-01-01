// src/components/MapItineraryBuilder.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";

import GoogleMapCanvas, {
  type AreaFocus,
  type MapFocus,
  type PickedPlace,
} from "@/components/GoogleMapCanvas";
import MapSearchBar from "@/components/MapSearchBar";
import { LeftDrawerBody } from "@/components/LeftDrawer";
import DesktopSidePanel from "@/components/DesktopSidePanel";
import SwipeSnapSheet from "@/components/SwipeSnapSheet";
import ItineraryPanel from "@/components/ItineraryPanel";
import AuthModal from "@/components/AuthModal";
import LanguageSwitch from "@/components/LanguageSwitch";

import { auth } from "@/lib/firebaseClient";
import { makeEmptySpot, makeInitialItems, type ItineraryItem } from "@/lib/itinerary";
import {
  saveItinerary,
  listItineraries,
  loadItinerary,
  type SavedItineraryMeta,
} from "@/lib/itineraryStore";

import {
  loadLeftMenuData,
  publicImageUrlFromImgCell,
  type LeftMenuData,
  type MenuRow,
} from "@/lib/menuData";
import { loadSampleTourData, type SampleTourData } from "@/lib/sampleTourData";
import { translateErrorMessage, translateTourName, translateSpotTitle, useI18n } from "@/lib/i18n";

function pickIconKeyFromTypes(types: unknown): string {
  const arr = Array.isArray(types)
    ? (types as any[])
        .map((x) => String(x ?? "").trim())
        .filter(Boolean)
    : [];
  if (!arr.length) return "";

  // Google Places types include generic entries; prefer more specific ones.
  const ignore = new Set([
    "point_of_interest",
    "establishment",
    "premise",
    "political",
    "geocode",
    "place_of_worship",
    "locality",
    "sublocality",
    "sublocality_level_1",
    "administrative_area_level_1",
    "administrative_area_level_2",
    "administrative_area_level_3",
    "administrative_area_level_4",
    "administrative_area_level_5",
    "country",
    "postal_code",
    "postal_code_prefix",
    "postal_code_suffix",
    "postal_town",
    "route",
    "street_address",
  ]);

  for (const t of arr) {
    const k = t.toLowerCase();
    if (!ignore.has(k)) return k;
  }
  return arr[0]!.toLowerCase();
}

function yyyyMmDd(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(base: string, plusDays: number): string {
  if (!base) return "";
  const [y, m, d] = base.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + plusDays);
  return yyyyMmDd(dt);
}

function makeNonce() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

async function resolveMapUrlToLatLng(
  mapUrl: string,
): Promise<{ lat: number; lng: number } | null> {
  const url = String(mapUrl ?? "").trim();
  if (!url) return null;

  const res = await fetch("/api/resolve-map", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) return null;

  if (data?.ok && typeof data.lat === "number" && typeof data.lng === "number") {
    return { lat: data.lat, lng: data.lng };
  }
  return null;
}

export default function MapItineraryBuilder() {
  // v3+: Menu (top) / Itinerary (bottom)
  // Mobile vs PC behaviour switch
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();

    if (mq.addEventListener) {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }

    // Safari < 14 fallback
    // eslint-disable-next-line deprecation/deprecation
    mq.addListener(update);
    // eslint-disable-next-line deprecation/deprecation
    return () => mq.removeListener(update);
  }, []);

  // Mobile snap states: 0=edge, 1=1/3, 2=2/3
  const [menuSnap, setMenuSnap] = useState<0 | 1 | 2>(0);
  const [itinerarySnap, setItinerarySnap] = useState<0 | 1 | 2>(0);

  const [menuOpen, setMenuOpen] = useState(false);
  const [itineraryOpen, setItineraryOpen] = useState(false);

  const { lang, t } = useI18n();

  // Itinerary title (saved list name / Google Calendar title)
  const [titleTouched, setTitleTouched] = useState(false);
  const [itineraryTitle, setItineraryTitle] = useState<string>(() => t("itinerary.defaultTitle"));

  // If title is still the default, update it when language changes.
  useEffect(() => {
    if (!titleTouched) setItineraryTitle(t("itinerary.defaultTitle"));
  }, [lang, t, titleTouched]);

  // Note: mobile uses snap sheets, desktop uses left/right panels.


  // Unified helpers (PC keeps existing behaviour, mobile uses snap sheets)
  const closeMenu = () => {
    if (isMobile) {
      setMenuSnap(0);
    } else {
      setMenuOpen(false);
    }
  };

  const toggleMenu = () => {
    if (isMobile) {
      setMenuSnap((s) => (s === 0 ? 1 : 0));
    } else {
      setMenuOpen((v) => !v);
    }
  };

  const ensureItineraryOpen = (minLevel: 1 | 2 = 1) => {
    if (isMobile) {
      setItinerarySnap((s) => ((s < minLevel ? minLevel : s) as 0 | 1 | 2));
    } else {
      setItineraryOpen(true);
    }
  };

  const toggleItinerary = () => {
    if (isMobile) {
      setItinerarySnap((s) => (s === 0 ? 1 : 0));
    } else {
      setItineraryOpen((v) => !v);
    }
  };

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(selectedItemId);
  useEffect(() => {
    selectedIdRef.current = selectedItemId;
  }, [selectedItemId]);

  const [items, setItems] = useState<ItineraryItem[]>(() => makeInitialItems());

  const [baseDate, setBaseDate] = useState<string>(() => yyyyMmDd(new Date()));
  const dayCount = useMemo(() => {
    const maxDay = Math.max(1, ...items.map((x) => Number(x.day) || 1));
    return maxDay;
  }, [items]);

  const dates = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => addDays(baseDate, i)),
    [baseDate, dayCount],
  );

  const [focus, setFocus] = useState<MapFocus>({ kind: "none" });
  const [area, setArea] = useState<AreaFocus>({ kind: "none" });

  // Auth + save
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const [savedList, setSavedList] = useState<SavedItineraryMeta[]>([]);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saveAfterLogin, setSaveAfterLogin] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // CSV data
  const [leftMenuData, setLeftMenuData] = useState<LeftMenuData | null>(null);
  const [sampleData, setSampleData] = useState<SampleTourData | null>(null);

  // Prevent resolve duplication
  const resolvingRef = useRef(0);

  const toastTimerRef = useRef<number | null>(null);
  const savedFlashTimerRef = useRef<number | null>(null);

  const showToast = (msg: string, autoHideMs?: number) => {
    setToastMessage(msg);

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    if (autoHideMs && autoHideMs > 0) {
      toastTimerRef.current = window.setTimeout(() => {
        setToastMessage(null);
        toastTimerRef.current = null;
      }, autoHideMs);
    }
  };

  const flashSaved = (ms = 1500) => {
    setSavedFlash(true);
    if (savedFlashTimerRef.current) {
      window.clearTimeout(savedFlashTimerRef.current);
      savedFlashTimerRef.current = null;
    }
    savedFlashTimerRef.current = window.setTimeout(() => {
      setSavedFlash(false);
      savedFlashTimerRef.current = null;
    }, ms);
  };

  const userLabel = useMemo(() => {
    if (!user) return null;
    return user.displayName || user.email || t("user.fallback");
  }, [user, t]);

  useEffect(() => {
    loadLeftMenuData()
      .then(setLeftMenuData)
      .catch((e) => console.error("left_menu.csv load failed:", e));

    loadSampleTourData()
      .then(setSampleData)
      .catch((e) => console.error("sampletour.csv load failed:", e));
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const list = await listItineraries(u.uid);
        setSavedList(list);
      } else {
        setSavedList([]);
      }
    });
  }, []);

  const refreshList = async (u: User) => {
    const list = await listItineraries(u.uid);
    setSavedList(list);
  };

  const doSave = async (u: User) => {
    if (saving) return;
    setSaving(true);
    setSavedFlash(false);

    try {
      await saveItinerary({ uid: u.uid, dates, items, title: itineraryTitle });
      await refreshList(u);
      flashSaved(1500);
      showToast(t("toast.saved"), 1500);
    } catch (e: any) {
      const msg = translateErrorMessage(String(e?.message ?? e ?? ""), lang);
      showToast(t("toast.saveFailed", { message: msg }));
    } finally {
      setSaving(false);
    }
  };

  const onSaveClick = async () => {
    if (!user) {
      setSaveAfterLogin(true);
      setAuthOpen(true);
      return;
    }
    await doSave(user);
  };

  // Request login (used by ItineraryPanel when an action requires auth)
  const onRequestLogin = () => {
    setSaveAfterLogin(false);
    setAuthOpen(true);
  };


  const fallbackTargetId = () => items[0]?.id ?? null;

  // Move to next row after filling a row (mobile UX)
  const nextIdAfter = (list: ItineraryItem[], currentId: string): string => {
    const idx = list.findIndex((x) => x.id === currentId);
    if (idx >= 0 && idx < list.length - 1) return list[idx + 1]!.id;
    return currentId;
  };

  // Extract social links from HP (best effort)
  const socialReqByItemRef = useRef<Record<string, number>>({});
  const enrichSocialLinks = async (itemId: string, website: string) => {
    const url = String(website ?? "").trim();
    if (!url) return;

    const next = (socialReqByItemRef.current[itemId] ?? 0) + 1;
    socialReqByItemRef.current[itemId] = next;
    const seq = next;

    try {
      const res = await fetch(`/api/extract-social?url=${encodeURIComponent(url)}`);
      const data = await res.json().catch(() => ({} as any));
      if (socialReqByItemRef.current[itemId] !== seq) return;
      if (data?.ok && Array.isArray(data.socialLinks)) {
        setItems((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, socialLinks: data.socialLinks } : it)),
        );
      }
    } catch {
      // ignore
    }
  };

  // Apply picked place (from map click)
  const onPickPlace = (itemId: string | null, place: any) => {
    const targetId = itemId ?? selectedItemId ?? fallbackTargetId();
    if (!targetId) return;

    const nextId = nextIdAfter(items, targetId);
    const website = String(place?.website ?? "").trim();

    setItems((prev) =>
      prev.map((it) =>
        it.id === targetId
          ? {
              ...it,
              name: String(place.name ?? it.name ?? ""),
              mapUrl: String(place.mapUrl ?? it.mapUrl ?? ""),
              placeId: String(place.placeId ?? it.placeId ?? ""),
              hpUrl: website,
              otaUrl: "",
              socialLinks: [],
              lat: typeof place.lat === "number" ? place.lat : it.lat,
              lng: typeof place.lng === "number" ? place.lng : it.lng,

              // From map: use Google pin icon; no thumbnail
              thumbUrl: "",
              iconKey: pickIconKeyFromTypes(place?.types) || "spot",
              iconUrl: String(place?.iconUrl ?? place?.icon ?? ""),
            }
          : it,
      ),
    );

    setSelectedItemId(nextId);
    closeMenu();

    if (website) void enrichSocialLinks(targetId, website);
  };

  // Select from menu list
  const onSelectFromMenu = async (p: MenuRow) => {
    const targetId = selectedItemId ?? fallbackTargetId();
    if (!targetId) return;

    const nextId = nextIdAfter(items, targetId);

    setItems((prev) =>
      prev.map((it) =>
        it.id === targetId
          ? {
              ...it,
              name: p.title ?? it.name,
              mapUrl: p.mapUrl ?? "",
              hpUrl: p.hpUrl ?? "",
              otaUrl: p.otaUrl ?? "",
              thumbUrl: publicImageUrlFromImgCell(p.img ?? ""),
              iconKey: String(p.icon ?? ""),
              iconUrl: "",
              socialLinks: [],
              placeId: "",
              lat: undefined,
              lng: undefined,
            }
          : it,
      ),
    );

    setSelectedItemId(nextId);

    const myReq = ++resolvingRef.current;
    const loc = p.mapUrl ? await resolveMapUrlToLatLng(p.mapUrl) : null;
    if (myReq !== resolvingRef.current) return;

    if (loc) {
      setItems((prev) => prev.map((it) => (it.id === targetId ? { ...it, lat: loc.lat, lng: loc.lng } : it)));
      setFocus({ kind: "latlng", lat: loc.lat, lng: loc.lng, nonce: makeNonce() });
    }
  };

  const onChangeCostMemo = (itemId: string, value: string) => {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, costMemo: value } : it)));
  };

  // Search bar: pick prediction → pin + itinerary
  const onPickFromSearch = (p: PickedPlace) => {
    const targetId = selectedItemId ?? fallbackTargetId();
    if (!targetId) return;

    const nextId = nextIdAfter(items, targetId);
    const website = String(p.website ?? "").trim();

    setItems((prev) =>
      prev.map((it) =>
        it.id === targetId
          ? {
              ...it,
              name: String(p.name ?? it.name ?? ""),
              mapUrl: String(p.mapUrl ?? it.mapUrl ?? ""),
              placeId: String(p.placeId ?? it.placeId ?? ""),
              hpUrl: website,
              otaUrl: "",
              socialLinks: [],
              thumbUrl: "",
              iconKey: pickIconKeyFromTypes((p as any)?.types) || "spot",
              iconUrl: String((p as any)?.iconUrl ?? ""),
              lat: typeof p.lat === "number" ? p.lat : it.lat,
              lng: typeof p.lng === "number" ? p.lng : it.lng,
            }
          : it,
      ),
    );

    setSelectedItemId(nextId);

    if (website) void enrichSocialLinks(targetId, website);

    if (typeof p.lat === "number" && typeof p.lng === "number") {
      setFocus({ kind: "latlng", lat: p.lat, lng: p.lng, nonce: makeNonce() });
    }
  };

  // Day +
  const insertDayAfter = (day: number) => {
    const d = Math.max(1, Math.trunc(day || 1));
    const newDay = d + 1;
    const newItem = makeEmptySpot(newDay);

    setItems((prev) => {
      const shifted = prev.map((it) => (it.day > d ? { ...it, day: it.day + 1 } : it));

      let insertAt = shifted.length;
      for (let i = shifted.length - 1; i >= 0; i--) {
        if (shifted[i].day === d) {
          insertAt = i + 1;
          break;
        }
      }

      const next = [...shifted];
      next.splice(insertAt, 0, newItem);
      return next;
    });

    setSelectedItemId(newItem.id);
    ensureItineraryOpen();
  };

  // Day -
  const removeDay = (day: number) => {
    const d = Math.max(1, Math.trunc(day || 1));

    setItems((prev) => {
      const removed = prev.filter((it) => it.day !== d);
      const shifted = removed.map((it) => (it.day > d ? { ...it, day: it.day - 1 } : it));

      if (!shifted.length) {
        const init = makeInitialItems(1, 1);
        setSelectedItemId(init[0]?.id ?? null);
        return init;
      }

      const sel = selectedIdRef.current;
      const exists = sel ? shifted.some((it) => it.id === sel) : false;
      if (!exists) setSelectedItemId(shifted[0]?.id ?? null);

      return shifted;
    });
  };

  // Row +
  const insertRowAfter = (itemId: string) => {
    const newId = makeEmptySpot(1).id; // id only
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === itemId);
      if (idx < 0) return prev;

      const day = prev[idx].day;
      const newItem = makeEmptySpot(day);
      (newItem as any).id = newId;

      const next = [...prev];
      next.splice(idx + 1, 0, newItem);
      setSelectedItemId(newItem.id);
      return next;
    });
    ensureItineraryOpen();
  };

  // Row - (keep last row, clear only)
  const removeRow = (itemId: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === itemId);
      if (idx < 0) return prev;

      const day = prev[idx].day;
      const dayItems = prev.filter((x) => x.day === day);

      if (dayItems.length <= 1) {
        const next = prev.map((it) =>
          it.id === itemId
            ? {
                ...it,
                name: "",
                mapUrl: "",
                hpUrl: "",
                otaUrl: "",
                costMemo: "",
                socialLinks: [],
                placeId: "",
                lat: undefined,
                lng: undefined,
                thumbUrl: "",
                iconKey: "",
                iconUrl: "",
              }
            : it,
        );
        return next;
      }

      const next = prev.filter((it) => it.id !== itemId);

      const sel = selectedIdRef.current;
      if (sel === itemId) {
        const fallback = next[Math.min(idx, next.length - 1)]?.id ?? next[0]?.id ?? null;
        setSelectedItemId(fallback);
      }

      return next;
    });
  };

  // Load saved itinerary
  const onLoadItinerary = async (id: string) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    try {
      const loaded = await loadItinerary({ uid: user.uid, id });
      if (loaded.title) {
        setItineraryTitle(String(loaded.title));
        setTitleTouched(true);
      }
      if (loaded.dates?.[0]) setBaseDate(String(loaded.dates[0]));
      setItems(loaded.items);
      showToast(t("toast.loadedItinerary"), 1500);
      ensureItineraryOpen();
    } catch (e: any) {
      const msg = translateErrorMessage(String(e?.message ?? e ?? ""), lang);
      showToast(t("toast.loadFailed", { message: msg }));
    }
  };

  // Load sample tour
  const onLoadSampleTour = async (tourName: string) => {
    if (!leftMenuData || !sampleData) return;

    const rows = sampleData.byTour.get(tourName) ?? [];
    if (!rows.length) return;

    const maxDay = Math.max(1, ...rows.map((r) => r.day));
    const maxRowByDay = new Map<number, number>();
    for (const r of rows) {
      maxRowByDay.set(r.day, Math.max(maxRowByDay.get(r.day) ?? 1, r.rownum));
    }

    const next: ItineraryItem[] = [];
    for (let d = 1; d <= maxDay; d++) {
      const need = Math.max(1, maxRowByDay.get(d) ?? 1);
      for (let i = 0; i < need; i++) next.push(makeEmptySpot(d));
    }

    const bucket = new Map<number, ItineraryItem[]>();
    for (const it of next) {
      if (!bucket.has(it.day)) bucket.set(it.day, []);
      bucket.get(it.day)!.push(it);
    }

    for (const r of rows) {
      const target = bucket.get(r.day)?.[r.rownum - 1];
      const menu = leftMenuData.byId.get(r.menuid);
      if (!target || !menu) continue;

      target.name = menu.title ?? "";
      target.mapUrl = menu.mapUrl ?? "";
      target.hpUrl = menu.hpUrl ?? "";
      target.otaUrl = menu.otaUrl ?? "";
      target.thumbUrl = publicImageUrlFromImgCell(menu.img ?? "");
      target.iconKey = String(menu.icon ?? "");
      target.iconUrl = "";
      target.placeId = "";
      target.lat = undefined;
      target.lng = undefined;
    }

    const cache = new Map<string, { lat: number; lng: number } | null>();
    await Promise.all(
      next.map(async (it) => {
        const u = String(it.mapUrl ?? "").trim();
        if (!u) return;
        if (!cache.has(u)) cache.set(u, await resolveMapUrlToLatLng(u));
        const loc = cache.get(u);
        if (loc) {
          it.lat = loc.lat;
          it.lng = loc.lng;
        }
      }),
    );

    setItems(next);
    setSelectedItemId(next[0]?.id ?? null);
    ensureItineraryOpen();
    closeMenu();

    const tourLabel = translateTourName(tourName, lang);
    showToast(t("toast.loadedSampleTour", { tour: tourLabel }), 1500);
  };

  // Category click → try polygon boundary
  const boundaryReqRef = useRef(0);
  const boundaryCacheRef = useRef<
    Record<string, { center: { lat: number; lng: number }; paths: { lat: number; lng: number }[][] }>
  >({});

  const onCategoryPicked = async (category: string) => {
    const key = String(category ?? "").trim();

    if (!key || key === "全域") {
      setArea({ kind: "none" });
      return;
    }

    const cached = boundaryCacheRef.current[key];
    if (cached?.paths?.length) {
      setFocus({ kind: "latlng", lat: cached.center.lat, lng: cached.center.lng, nonce: makeNonce() });
      setArea({ kind: "polygon", paths: cached.paths, nonce: makeNonce() });
      return;
    }

    const reqId = ++boundaryReqRef.current;

    try {
      const res = await fetch(`/api/boundary?q=${encodeURIComponent(key)}`);
      const data = (await res.json().catch(() => null)) as any;
      if (reqId !== boundaryReqRef.current) return;

      const center = data?.center;
      const paths = data?.paths;
      if (
        data?.ok &&
        center &&
        typeof center.lat === "number" &&
        typeof center.lng === "number" &&
        Array.isArray(paths) &&
        paths.length > 0
      ) {
        boundaryCacheRef.current[key] = { center, paths };
        setFocus({ kind: "latlng", lat: center.lat, lng: center.lng, nonce: makeNonce() });
        setArea({ kind: "polygon", paths, nonce: makeNonce() });
        return;
      }
    } catch {
      // ignore
    }

    if (reqId !== boundaryReqRef.current) return;
    setArea({ kind: "none" });
  };

  // Google Calendar export
  const hasAnyValue = (it: ItineraryItem) => {
    const name = String(it.name ?? "").trim();
    const mapUrl = String(it.mapUrl ?? "").trim();
    const hpUrl = String(it.hpUrl ?? "").trim();
    const otaUrl = String(it.otaUrl ?? "").trim();
    const hasSocial = Array.isArray(it.socialLinks)
      ? it.socialLinks.some((s) => String(s?.url ?? "").trim().length > 0)
      : false;
    return !!(name || mapUrl || hpUrl || otaUrl || hasSocial);
  };

  const lastFilledDay = () => {
    let maxDay = 1;
    for (const it of items) {
      if (!hasAnyValue(it)) continue;
      const d = Number(it.day) || 1;
      if (d > maxDay) maxDay = d;
    }
    return maxDay;
  };

  const startPointName = () => {
    const first = items.find((it) => hasAnyValue(it));
    if (!first) return "";
    const raw = String(first.name ?? "").trim();
    return raw ? translateSpotTitle(raw, lang) : "";
  };

  const buildBulletDetails = (startIso: string) => {
    const lines: string[] = [];

    // First line: app link
    lines.push("https://kisolongstay-itinerary.vercel.app/");
    lines.push("");

    let currentDay = 0;
    for (const it of items) {
      if (!hasAnyValue(it)) continue;
      const d = Number(it.day) || 1;

      if (d !== currentDay) {
        if (currentDay !== 0) lines.push("");
        currentDay = d;
        const date = addDays(startIso, d - 1);
        lines.push(`Day${d} (${date})`);
      }

      const rawName = String(it.name ?? "").trim();
      const name = rawName ? translateSpotTitle(rawName, lang) : t("common.unset");
      const mapUrl = String(it.mapUrl ?? "").trim();
      const hpUrl = String(it.hpUrl ?? "").trim();
      const otaUrl = String(it.otaUrl ?? "").trim();
      const socials = Array.isArray(it.socialLinks) ? it.socialLinks : [];

      lines.push(`- ${name}`);
      if (mapUrl) lines.push(`  ${t("common.links.map")}: ${mapUrl}`);
      if (hpUrl) lines.push(`  ${t("common.links.hp")}: ${hpUrl}`);
      if (otaUrl) lines.push(`  ${t("common.links.ota")}: ${otaUrl}`);
      for (const s of socials) {
        const url = String(s?.url ?? "").trim();
        if (!url) continue;
        const label = String(s?.platform ?? "").trim() || t("common.social");
        lines.push(`  ${label}: ${url}`);
      }
    }

    if (lines.length <= 2) {
      lines.push(t("calendar.noItems"));
    }

    return lines.join("\n");
  };

  const onAddToCalendar = () => {
    if (!user) return;

    const startIso = baseDate || yyyyMmDd(new Date());
    const maxDay = lastFilledDay();

    // all-day: end is exclusive (next day)
    const start = startIso.replaceAll("-", "");
    const endExclusiveIso = addDays(startIso, maxDay);
    const end = endExclusiveIso.replaceAll("-", "");

    const location = startPointName();
    const details = buildBulletDetails(startIso);

    const params = new URLSearchParams();
    params.set("action", "TEMPLATE");
    params.set("text", itineraryTitle.trim() || t("calendar.fallbackTitle"));
    params.set("dates", `${start}/${end}`);
    params.set("details", details);
    if (location) params.set("location", location);
    params.set("sf", "true");
    params.set("output", "xml");
    params.set("ctz", "Asia/Tokyo");

    const url = `https://calendar.google.com/calendar/render?${params.toString()}`;

    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) {
      window.location.href = url;
    }
  };

  const saveButtonText = user
    ? saving
      ? t("save.saving")
      : savedFlash
        ? t("save.saved")
        : t("save.save")
    : t("save.signInToSave");

  return (
    <div className="h-dvh w-dvw overflow-hidden relative bg-neutral-950">
      <GoogleMapCanvas
        selectedItemId={selectedItemId}
        onPickPlace={onPickPlace}
        onMapTap={() => {
          // On mobile, the menu covers the map so a tap should dismiss it.
          // On desktop, side panels don't block the map, so we keep them as-is.
          if (isMobile) closeMenu();
        }}
        focus={focus}
        area={area}
        items={items}
      />

      {/* JP/EN switch (top-right) */}
      <div className="absolute right-4 top-4 z-[95]">
        <LanguageSwitch />
      </div>

      {/* Search */}
      <MapSearchBar onPick={onPickFromSearch} />

      {/* Itinerary (bottom sheet) */}
      {isMobile ? (
        <SwipeSnapSheet
          anchor="bottom"
          snap={itinerarySnap}
          onSnapChange={setItinerarySnap}
          className="z-[65] bg-neutral-950/90 border border-neutral-800 shadow-xl rounded-t-2xl overflow-hidden"
          contentClassName="h-full w-full"
        >
          <ItineraryPanel
            itineraryTitle={itineraryTitle}
            onChangeItineraryTitle={(v) => {
              setItineraryTitle(v);
              setTitleTouched(true);
            }}
            items={items}
            baseDate={baseDate}
            onChangeBaseDate={setBaseDate}
            selectedItemId={selectedItemId}
            onSelectItem={(id) => setSelectedItemId(id)}
            onChangeCostMemo={onChangeCostMemo}
            onInsertDayAfter={insertDayAfter}
            onRemoveDay={removeDay}
            onInsertRowAfter={insertRowAfter}
            onRemoveRow={removeRow}
            onSave={onSaveClick}
            onAddToCalendar={onAddToCalendar}
            saveButtonText={saveButtonText}
            saveDisabled={saving}
            userLabel={userLabel}
            expanded={itinerarySnap === 2}
          />
        </SwipeSnapSheet>
      ) : (
        <DesktopSidePanel
          side="right"
          open={itineraryOpen}
          onOpenChange={setItineraryOpen}
          width={480}
          className="z-[65] w-[480px] max-w-[92vw]"
        >
          <div className="h-full p-2">
            {/* Give the right panel an opaque-ish background like the old bottom sheet.
                Without this, day sections look "skeleton" on top of the map. */}
            <div className="h-full bg-neutral-950/90 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
              <ItineraryPanel
                itineraryTitle={itineraryTitle}
                onChangeItineraryTitle={(v) => {
                  setItineraryTitle(v);
                  setTitleTouched(true);
                }}
                items={items}
                baseDate={baseDate}
                onChangeBaseDate={setBaseDate}
                selectedItemId={selectedItemId}
                onSelectItem={(id) => setSelectedItemId(id)}
                onChangeCostMemo={onChangeCostMemo}
                onInsertDayAfter={insertDayAfter}
                onRemoveDay={removeDay}
                onInsertRowAfter={insertRowAfter}
                onRemoveRow={removeRow}
                onSave={onSaveClick}
                onAddToCalendar={onAddToCalendar}
                saveButtonText={saveButtonText}
                saveDisabled={saving}
                userLabel={userLabel}
                expanded
              />
            </div>
          </div>
        </DesktopSidePanel>
      )}

      {/* Menu */}
      {isMobile ? (
        leftMenuData ? (
          <SwipeSnapSheet
            anchor="top"
            snap={menuSnap}
            onSnapChange={setMenuSnap}
            // The menu sheet should live at the very top edge.
            // We keep the search bar *below* the collapsed handle area instead.
            className="z-[70] bg-neutral-950/95 backdrop-blur shadow-2xl border border-neutral-800 rounded-b-2xl overflow-hidden text-neutral-100"
            contentClassName="h-full w-full"
          >
            <div className="h-full overflow-auto p-2 space-y-4">
              <LeftDrawerBody
                categories={leftMenuData.categories}
                byCategory={leftMenuData.byCategory}
                onCategoryPicked={onCategoryPicked}
                onSelectPlace={onSelectFromMenu}
                sampleTours={sampleData?.tours ?? []}
                onLoadSampleTour={onLoadSampleTour}
                savedItineraries={savedList}
                onLoadItinerary={onLoadItinerary}
                userLabel={userLabel}
                onRequestLogin={onRequestLogin}
              />
            </div>
          </SwipeSnapSheet>
        ) : null
      ) : (
        <DesktopSidePanel
          side="left"
          open={menuOpen}
          onOpenChange={setMenuOpen}
          width={360}
          className="z-[70] w-[360px] max-w-[92vw] text-neutral-100"
        >
          <div className="h-full p-2">
            <div className="h-full bg-neutral-950/95 backdrop-blur border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
              {leftMenuData ? (
                <div className="h-full overflow-auto p-2 space-y-4">
                  <LeftDrawerBody
                    categories={leftMenuData.categories}
                    byCategory={leftMenuData.byCategory}
                    onCategoryPicked={onCategoryPicked}
                    onSelectPlace={onSelectFromMenu}
                    sampleTours={sampleData?.tours ?? []}
                    onLoadSampleTour={onLoadSampleTour}
                    savedItineraries={savedList}
                    onLoadItinerary={onLoadItinerary}
                    userLabel={userLabel}
                    onRequestLogin={onRequestLogin}
                  />
                </div>
              ) : (
                <div className="p-4 text-neutral-300">{t("common.loading")}</div>
              )}
            </div>
          </div>
        </DesktopSidePanel>
      )}

      {/* Floating toggle buttons (mobile only) */}
      {isMobile ? (
        <>
          <button
            onClick={() => toggleMenu()}
            className="absolute right-4 z-[80] rounded-full bg-neutral-950/80 backdrop-blur shadow-lg border border-neutral-800 w-12 h-12 grid place-items-center text-neutral-100"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 152px)" }}
            title={t("app.menuButton")}
            aria-label={t("app.menuButton")}
          >
            ≡
          </button>

          <button
            onClick={() => toggleItinerary()}
            className="absolute right-4 z-[80] rounded-full bg-neutral-950/80 backdrop-blur shadow-lg border border-neutral-800 w-12 h-12 grid place-items-center text-neutral-100"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 92px)" }}
            title={t("app.itineraryButton")}
            aria-label={t("app.itineraryButton")}
          >
            📝
          </button>
        </>
      ) : null}

      {toastMessage ? (
        <div className="absolute left-1/2 top-24 -translate-x-1/2 z-[90] pointer-events-none">
          <div className="rounded-xl bg-neutral-950/80 border border-neutral-800 shadow px-3 py-2 text-xs whitespace-pre-wrap text-neutral-100 backdrop-blur pointer-events-auto">
            {toastMessage}
          </div>
        </div>
      ) : null}

      <AuthModal
        open={authOpen}
        onClose={() => {
          setAuthOpen(false);
          setSaveAfterLogin(false);
        }}
        onSuccess={(u) => {
          setAuthOpen(false);
          refreshList(u);
          if (saveAfterLogin) {
            setSaveAfterLogin(false);
            doSave(u);
          }
        }}
      />
    </div>
  );
}