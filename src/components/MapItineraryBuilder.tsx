// src/components/MapItineraryBuilder.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";

import GoogleMapCanvas, { type MapFocus } from "@/components/GoogleMapCanvas";
import MapSearchBar from "@/components/MapSearchBar";
import LeftDrawer from "@/components/LeftDrawer";
import ItineraryPanel from "@/components/ItineraryPanel";
import ChatCorner from "@/components/ChatCorner";
import AuthModal from "@/components/AuthModal";

import { auth } from "@/lib/firebaseClient";
import { makeInitialItems, type DayIndex, type ItineraryItem } from "@/lib/itinerary";
import {
  saveItinerary,
  listItineraries,
  loadItinerary,
  type SavedItineraryMeta,
} from "@/lib/itineraryStore";

import {
  fetchLeftMenuItems,
  buildCategoryOrder,
  groupLeftMenuByCategory,
  type LeftMenuItem,
} from "@/lib/leftMenu";

import { fetchSampleTourRows } from "@/lib/sampleTour";

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

function makeItemId(day: DayIndex) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${day}:spot:${suffix}`;
}

async function resolveMapUrlToLatLng(mapUrl: string): Promise<{ lat: number; lng: number } | null> {
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

const SAMPLE_TOUR_NAMES = [
  "春の中山道北上ツアー",
  "夏の渓谷ずぶ濡れツアー",
  "秋の中山道南下ツアー",
  "冬の温泉ぬくぬくツアー",
] as const;

export default function MapItineraryBuilder() {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [items, setItems] = useState<ItineraryItem[]>(() => makeInitialItems());

  const [baseDate, setBaseDate] = useState<string>(() => yyyyMmDd(new Date()));
  const dates = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => addDays(baseDate, i));
  }, [baseDate]);

  const [focus, setFocus] = useState<MapFocus>({ kind: "none" });

  const [itineraryOpen, setItineraryOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const [savedList, setSavedList] = useState<SavedItineraryMeta[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [saveAfterLogin, setSaveAfterLogin] = useState(false);

  // left_menu.csv
  const [menuItems, setMenuItems] = useState<LeftMenuItem[]>([]);
  const menuLoadedRef = useRef(false);

  // request guards
  const resolvingRef = useRef(0);
  const sampleLoadRef = useRef(0);

  const userLabel = useMemo(() => {
    if (!user) return null;
    return user.displayName || user.email || "ログインユーザー";
  }, [user]);

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

  // Load left_menu.csv once
  useEffect(() => {
    if (menuLoadedRef.current) return;
    menuLoadedRef.current = true;

    fetchLeftMenuItems()
      .then((list) => setMenuItems(list))
      .catch((e: any) => {
        console.error("[left_menu.csv] load failed:", e);
        setSaveToast("left_menu.csv の読み込みに失敗しました\n" + String(e?.message ?? e ?? ""));
        setTimeout(() => setSaveToast(null), 2500);
      });
  }, []);

  const menuCategories = useMemo(() => buildCategoryOrder(menuItems), [menuItems]);
  const menuByCategory = useMemo(
    () => groupLeftMenuByCategory(menuItems, menuCategories),
    [menuItems, menuCategories]
  );
  const menuById = useMemo(() => {
    const m = new Map<string, LeftMenuItem>();
    for (const it of menuItems) m.set(String(it.menuid), it);
    return m;
  }, [menuItems]);

  const refreshList = async (u: User) => {
    const list = await listItineraries(u.uid);
    setSavedList(list);
  };

  const doSave = async (u: User) => {
    if (saving) return;
    setSaving(true);
    setSaveToast(null);
    try {
      await saveItinerary(u.uid, dates, items);
      await refreshList(u);
      setSaveToast("保存しました");
      setTimeout(() => setSaveToast(null), 1500);
    } catch (e: any) {
      setSaveToast("保存に失敗しました\n" + String(e?.message ?? e ?? ""));
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

  const fallbackTargetId = () => items.find((i) => i.day === 1)?.id ?? null;

  const onPickPlace = (itemId: string | null, place: any) => {
    const targetId = itemId ?? selectedItemId ?? fallbackTargetId();
    if (!targetId) return;

    setItems((prev) =>
      prev.map((it) =>
        it.id === targetId
          ? {
              ...it,
              name: place.name ?? it.name,
              mapUrl: place.mapUrl ?? it.mapUrl,
              // 地図から拾った場合、HP/OTAは不明なのでクリア（残すと事故る）
              hpUrl: "",
              otaUrl: "",
              placeId: place.placeId ?? it.placeId,
              lat: typeof place.lat === "number" ? place.lat : it.lat,
              lng: typeof place.lng === "number" ? place.lng : it.lng,
            }
          : it
      )
    );

    setSelectedItemId(targetId);
  };

  // ★左メニュー（CSV）からの選択
  const onSelectFromDrawer = async (p: LeftMenuItem) => {
    const targetId = selectedItemId ?? fallbackTargetId();
    if (!targetId) return;

    // 先にUI反映（Map/HP/OTA が空でもOK。無効扱いしない）
    setItems((prev) =>
      prev.map((it) =>
        it.id === targetId
          ? {
              ...it,
              name: p.title ?? it.name,
              mapUrl: p.mapUrl ?? "",
              hpUrl: p.hpUrl ?? "",
              otaUrl: p.otaUrl ?? "",
              placeId: "",
              lat: undefined,
              lng: undefined,
            }
          : it
      )
    );
    setSelectedItemId(targetId);

    const mapUrl = String(p.mapUrl ?? "").trim();
    if (!mapUrl) {
      // Mapが無いサービスは「文字が入ればOK」なので、地図を勝手に動かさない
      return;
    }

    const myReq = ++resolvingRef.current;
    const loc = await resolveMapUrlToLatLng(mapUrl);
    if (myReq !== resolvingRef.current) return;

    if (!loc) {
      // ここで名前検索フォールバックをしない（同名別ヒット事故を増やす）
      return;
    }

    setItems((prev) =>
      prev.map((it) =>
        it.id === targetId
          ? {
              ...it,
              lat: loc.lat,
              lng: loc.lng,
            }
          : it
      )
    );

    setFocus({ kind: "latlng", lat: loc.lat, lng: loc.lng, nonce: makeNonce() });
  };

  const onSearch = (query: string) => {
    const q = query.trim();
    if (!q) return;

    const targetId = selectedItemId ?? fallbackTargetId();
    if (!targetId) return;

    setItems((prev) =>
      prev.map((it) =>
        it.id === targetId
          ? {
              ...it,
              name: q,
              mapUrl: "",
              hpUrl: "",
              otaUrl: "",
              placeId: "",
              lat: undefined,
              lng: undefined,
            }
          : it
      )
    );

    setSelectedItemId(targetId);
    setFocus({ kind: "query", query: q, nonce: makeNonce() });
  };

  const onLoadItinerary = async (id: string) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    try {
      const loaded = await loadItinerary(user.uid, id);

      // baseDate は dates[0] を採用（なければ維持）
      if (loaded.dates?.[0]) setBaseDate(String(loaded.dates[0]));

      setItems(loaded.items);
      setSaveToast("旅程をロードしました");
      setTimeout(() => setSaveToast(null), 1500);
    } catch (e: any) {
      setSaveToast("ロードに失敗しました\n" + String(e?.message ?? e ?? ""));
    }
  };

  const onAddItem = (day: DayIndex) => {
    const newId = makeItemId(day);

    setItems((prev) => {
      const newItem: ItineraryItem = {
        id: newId,
        day,
        type: "spot",
        name: "",
        price: "",
        mapUrl: "",
        hpUrl: "",
        otaUrl: "",
        placeId: "",
        lat: undefined,
        lng: undefined,
      };

      // insert after last item in same day
      let insertAt = prev.length;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].day === day) {
          insertAt = i + 1;
          break;
        }
      }
      const next = [...prev];
      next.splice(insertAt, 0, newItem);
      return next;
    });

    setSelectedItemId(newId);
    setItineraryOpen(true);
  };

  // ★サンプルツアーロード（sampletour.csv → menuid → left_menu.csv）
  const onLoadSampleTour = async (tourName: string) => {
    if (menuItems.length === 0) {
      setSaveToast("left_menu.csv が未読み込みです（/public/data/left_menu.csv を確認）");
      setTimeout(() => setSaveToast(null), 2500);
      return;
    }

    const myReq = ++sampleLoadRef.current;
    setItineraryOpen(true);
    setSaveToast(null);

    try {
      const rows = await fetchSampleTourRows();
      if (myReq !== sampleLoadRef.current) return;

      const plan = rows.filter((r) => r.tour === tourName);
      if (plan.length === 0) {
        setSaveToast(`sampletour.csv に「${tourName}」の行がありません`);
        setTimeout(() => setSaveToast(null), 2500);
        return;
      }

      // 1) dayごとの必要行数（rownum最大）を計算（足りなければ補う）
      const need: Record<DayIndex, number> = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 };
      for (const r of plan) {
        need[r.day] = Math.max(need[r.day], r.rownum);
      }

      // 2) 空の旅程を dayごとに必要数作る
      const byDay: Record<DayIndex, ItineraryItem[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
      for (const day of [1, 2, 3, 4, 5] as const) {
        for (let i = 0; i < need[day]; i++) {
          byDay[day].push({
            id: makeItemId(day),
            day,
            type: "spot",
            name: "",
            price: "",
            mapUrl: "",
            hpUrl: "",
            otaUrl: "",
            placeId: "",
            lat: undefined,
            lng: undefined,
          });
        }
      }

      // 3) planを menuid で left_menu.csv から引いて埋める（Map/HP/OTA空でもOK）
      for (const r of plan) {
        const idx = r.rownum - 1;
        if (idx < 0) continue;

        while (byDay[r.day].length <= idx) {
          // 念のため（need計算済みだが、変なデータでも落ちないように）
          byDay[r.day].push({
            id: makeItemId(r.day),
            day: r.day,
            type: "spot",
            name: "",
            price: "",
            mapUrl: "",
            hpUrl: "",
            otaUrl: "",
            placeId: "",
            lat: undefined,
            lng: undefined,
          });
        }

        const src = menuById.get(String(r.menuid));
        if (!src) {
          // 見つからない menuid は空のまま（落とさない）
          continue;
        }

        byDay[r.day][idx] = {
          ...byDay[r.day][idx],
          name: src.title ?? "",
          mapUrl: src.mapUrl ?? "",
          hpUrl: src.hpUrl ?? "",
          otaUrl: src.otaUrl ?? "",
          placeId: "",
          lat: undefined,
          lng: undefined,
        };
      }

      const nextItems = [...byDay[1], ...byDay[2], ...byDay[3], ...byDay[4], ...byDay[5]];
      setItems(nextItems);

      const firstNonEmpty = nextItems.find((x) => String(x.name ?? "").trim())?.id ?? nextItems[0]?.id ?? null;
      setSelectedItemId(firstNonEmpty);

      // 4) mapUrlがある行だけ lat/lng を resolve（並列は控えめに）
      const urls = Array.from(
        new Set(nextItems.map((x) => String(x.mapUrl ?? "").trim()).filter(Boolean))
      );

      if (urls.length) {
        const resolved = new Map<string, { lat: number; lng: number }>();

        const concurrency = 5;
        let cursor = 0;

        const worker = async () => {
          while (cursor < urls.length) {
            const u = urls[cursor++];
            const loc = await resolveMapUrlToLatLng(u);
            if (myReq !== sampleLoadRef.current) return;
            if (loc) resolved.set(u, loc);
          }
        };

        await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
        if (myReq !== sampleLoadRef.current) return;

        setItems((prev) =>
          prev.map((it) => {
            const u = String(it.mapUrl ?? "").trim();
            if (!u) return it;
            const loc = resolved.get(u);
            return loc ? { ...it, lat: loc.lat, lng: loc.lng } : it;
          })
        );

        const firstLoc = urls.map((u) => resolved.get(u)).find(Boolean);
        if (firstLoc) {
          setFocus({ kind: "latlng", lat: firstLoc.lat, lng: firstLoc.lng, nonce: makeNonce() });
        }
      }

      setSaveToast(`サンプルツアーをロードしました\n${tourName}`);
      setTimeout(() => setSaveToast(null), 1500);
    } catch (e: any) {
      setSaveToast("サンプルツアーのロードに失敗しました\n" + String(e?.message ?? e ?? ""));
    }
  };

  const saveButtonText = user
    ? saving
      ? "保存中..."
      : saveToast === "保存しました"
        ? "保存しました"
        : "保存"
    : "会員登録して保存";

  return (
    <div className="h-dvh w-dvw overflow-hidden relative bg-neutral-950">
      <GoogleMapCanvas
        selectedItemId={selectedItemId}
        onPickPlace={onPickPlace}
        focus={focus}
        items={items}
      />

      <LeftDrawer
        menuCategories={menuCategories}
        menuByCategory={menuByCategory}
        onSelectMenuItem={onSelectFromDrawer}
        sampleTourNames={[...SAMPLE_TOUR_NAMES]}
        onLoadSampleTour={onLoadSampleTour}
        savedItineraries={savedList}
        onLoadItinerary={onLoadItinerary}
        userLabel={userLabel}
        onRequestLogin={() => setAuthOpen(true)}
      />

      <MapSearchBar onSearch={onSearch} />

      <button
        onClick={() => setItineraryOpen((v) => !v)}
        className="absolute right-4 top-4 z-[70] rounded-full bg-neutral-950/80 backdrop-blur shadow-lg border border-neutral-800 w-10 h-10 grid place-items-center text-neutral-100"
        title="旅程"
      >
        📝
      </button>

      {itineraryOpen && (
        <div className="absolute right-4 top-16 z-[65] w-[520px] max-w-[92vw] h-[76vh] pointer-events-auto">
          <div className="h-full rounded-2xl bg-neutral-950/90 border border-neutral-800 shadow-xl overflow-hidden">
            <ItineraryPanel
              items={items}
              dates={dates}
              baseDate={baseDate}
              onChangeBaseDate={setBaseDate}
              selectedItemId={selectedItemId}
              onSelectItem={(id) => setSelectedItemId(id)}
              onChangeItem={(id, patch) =>
                setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
              }
              onAddItem={onAddItem}
              onSave={onSaveClick}
              saveButtonText={saveButtonText}
              saveDisabled={saving}
              userLabel={userLabel}
            />
          </div>
        </div>
      )}

      <button
        onClick={() => setChatOpen((v) => !v)}
        className="absolute right-4 bottom-4 z-[70] rounded-full bg-neutral-950/80 backdrop-blur shadow-lg border border-neutral-800 w-10 h-10 grid place-items-center text-neutral-100"
        title="チャット"
      >
        💬
      </button>

      {chatOpen && (
        <div className="absolute right-4 bottom-16 z-[65] w-[420px] max-w-[92vw] h-[280px] pointer-events-auto">
          <div className="h-full rounded-2xl bg-neutral-950/90 border border-neutral-800 shadow-xl overflow-hidden">
            <ChatCorner />
          </div>
        </div>
      )}

      {saveToast && (
        <div className="absolute left-1/2 top-20 -translate-x-1/2 z-[80] pointer-events-none">
          <div className="rounded-xl bg-neutral-950/80 border border-neutral-800 shadow px-3 py-2 text-xs whitespace-pre-wrap text-neutral-100 backdrop-blur pointer-events-auto">
            {saveToast}
          </div>
        </div>
      )}

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
