"use client";

import { useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatCorner() {
  const [messages, setMessages] = useState<Msg[]>([
<<<<<<< HEAD
    {
      role: "assistant",
      content: "右下チャット（v2）。旅程づくりの相談に使う想定です。",
    },
=======
    { role: "assistant", content: "右下チャット（v2）。旅程づくりの相談に使う想定です。" },
>>>>>>> df076ec (stabilized version secrets removed)
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;

    setText("");
    setBusy(true);

    const next = [...messages, { role: "user", content: t } as const];
    setMessages(next);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
<<<<<<< HEAD
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.text ?? "(no text)" }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "エラー：APIに接続できませんでした。\n" + String(err?.message ?? err ?? ""),
        },
=======

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const msg =
          (data?.error ? `APIエラー：${data.error}` : `APIエラー：HTTP ${res.status}`) +
          (data?.text ? `\n${data.text}` : "");
        setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
        return;
      }

      const reply = data?.text ?? "";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply || "(empty response)" },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "通信エラー：\n" + String(err?.message ?? err) },
>>>>>>> df076ec (stabilized version secrets removed)
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full rounded-2xl bg-neutral-950/60 backdrop-blur border border-neutral-800 flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-neutral-800 text-sm font-semibold text-neutral-100">
        Chat（OpenAI API）
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-2 text-sm">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <span
              className={
                "inline-block max-w-[90%] rounded-xl px-3 py-2 whitespace-pre-wrap border " +
                (m.role === "user"
                  ? "bg-neutral-100 text-neutral-900 border-neutral-200"
                  : "bg-neutral-900/60 text-neutral-100 border-neutral-800")
              }
            >
              {m.content}
            </span>
          </div>
        ))}
      </div>

      <div className="p-2 border-t border-neutral-800 flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="旅程の相談を入力…（Shift+Enterで改行）"
          rows={1}
          className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm resize-none leading-relaxed text-neutral-100 placeholder:text-neutral-500"
        />
        <button
          onClick={send}
          disabled={busy}
          className="rounded-xl bg-neutral-100 text-neutral-900 px-4 text-sm disabled:opacity-50"
        >
          送信
        </button>
      </div>
    </div>
  );
}
