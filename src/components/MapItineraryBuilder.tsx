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
import type { SavedPlace } from "@/lib/savedLists";
import {
  saveItinerary,
  listItineraries,
  loadItinerary,
  type SavedItineraryMeta,
} from "@/lib/itineraryStore";

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

  const resolvingRef = useRef(0);

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
              placeId: place.placeId ?? it.placeId,
              lat: typeof place.lat === "number" ? place.lat : it.lat,
              lng: typeof place.lng === "number" ? place.lng : it.lng,
            }
          : it
      )
    );

    setSelectedItemId(targetId);
  };

  const onSelectFromDrawer = async (p: SavedPlace) => {
    const targetId = selectedItemId ?? fallbackTargetId();
    if (!targetId) return;

    // まず UI（右リスト）を即更新：最低限 name/mapUrl は確定で入れる
    setItems((prev) =>
      prev.map((it) =>
        it.id === targetId
          ? {
              ...it,
              name: p.name ?? it.name,
              mapUrl: p.mapUrl ?? it.mapUrl,
              placeId: "",
              lat: undefined,
              lng: undefined,
            }
          : it
      )
    );
    setSelectedItemId(targetId);

    // mapUrl を resolve して lat/lng を確定（これが “同名別ヒット” を防ぐ）
    const myReq = ++resolvingRef.current;
    const loc = await resolveMapUrlToLatLng(p.mapUrl);
    if (myReq !== resolvingRef.current) return; // stale

    if (!loc) {
      // 最終手段：名前検索（ただし mapUrl は正として残す）
      setFocus({ kind: "query", query: p.name, nonce: makeNonce() });
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

    // 地図は lat/lng に確実に寄せる（ピンも刺さる）
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
          ? { ...it, name: q, mapUrl: "", placeId: "", lat: undefined, lng: undefined }
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
        onSelectPlace={onSelectFromDrawer}
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
