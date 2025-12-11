"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup, type User } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";

export default function AuthModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const signInGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      onSuccess(res.user);
    } catch (e: any) {
      setError(String(e?.message ?? e ?? "ログインに失敗しました"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] pointer-events-auto">
      <div className="absolute inset-0 bg-black/60" onClick={busy ? undefined : onClose} />

      <div className="absolute left-1/2 top-1/2 w-[420px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-neutral-950/95 backdrop-blur shadow-xl border border-neutral-800 overflow-hidden text-neutral-100">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="font-semibold">会員登録 / ログイン</div>
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg px-2 py-1 text-sm border border-neutral-800 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-3">
          <button
            onClick={signInGoogle}
            disabled={busy}
            className="w-full rounded-xl bg-neutral-100 text-neutral-900 py-2 text-sm disabled:opacity-50"
          >
            Googleでログイン
          </button>

          {error && (
            <div className="text-xs text-red-300 whitespace-pre-wrap border border-red-900/60 bg-red-950/40 rounded-xl p-2">
              {error}
            </div>
          )}

          <div className="text-xs text-neutral-300">
            ログイン後、この旅程を自分のアカウントに保存できます。
          </div>
        </div>
      </div>
    </div>
  );
}
