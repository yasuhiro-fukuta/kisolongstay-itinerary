"use client";

import { useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatCorner() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: "右下チャット（ガワ）。旅程づくりの相談に使う想定です。",
    },
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
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.text ?? "(no text)",
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "エラー：APIに接続できませんでした。\n" +
            String(err?.message ?? err ?? ""),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full rounded-2xl bg-white/90 backdrop-blur shadow-lg border border-neutral-200 flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-neutral-200 text-sm font-semibold">
        Chat（OpenAI API）
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-auto p-3 space-y-2 text-sm">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <span
              className={
                "inline-block max-w-[90%] rounded-xl px-3 py-2 whitespace-pre-wrap " +
                (m.role === "user"
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-900")
              }
            >
              {m.content}
            </span>
          </div>
        ))}
      </div>

      {/* 入力欄 */}
      <div className="p-2 border-t border-neutral-200 flex gap-2">
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
          className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm resize-none leading-relaxed"
        />
        <button
          onClick={send}
          disabled={busy}
          className="rounded-xl bg-neutral-900 text-white px-4 text-sm disabled:opacity-50"
        >
          送信
        </button>
      </div>
    </div>
  );
}
