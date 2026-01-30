"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; text: string };

const examples = [
  "how we spend 2 nights here",
  "Is any dinner place open today?",
  "what do you reccomend to visit around here out of Nakasendo",
];

export default function DesktopChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Hi there! Welcome to Nagiso Nakasendo. I'm here to support your discoveries. How can I help you?",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [imgOk, setImgOk] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    });
  }, [open, messages.length]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setErr(null);
    setSending(true);
    setMessages((m) => [...m, { role: "user", text }]);
    setDraft("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Request failed");
      }

      const reply = String(data?.text || "");
      setMessages((m) => [...m, { role: "assistant", text: reply || "(no response)" }]);
    } catch (e: any) {
      setErr(e?.message || String(e));
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Sorry — I couldn't reach OpenAI. (" + (e?.message || "error") + ")" },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="pointer-events-none">
      {/* Floating toggle button */}
      <button
        className="pointer-events-auto fixed bottom-6 right-6 z-[80] h-[92px] w-[92px] rounded-full bg-white shadow-2xl border border-black/10 flex items-center justify-center overflow-hidden"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle chat"
        title="Chat with 凪そね子"
      >
        {imgOk ? (
          <img
            src="/img/nagi_soneko.png"
            alt="凪そね子"
            className="h-[92px] w-[92px] object-cover"
            onError={() => setImgOk(false)}
          />
        ) : (
          <span className="text-4xl" aria-hidden>
            🐱
          </span>
        )}
      </button>

      {open && (
        <div className="pointer-events-auto fixed bottom-28 right-6 z-[80] w-[440px] max-w-[92vw] rounded-2xl bg-white shadow-2xl border border-black/10 overflow-hidden">
          <div ref={listRef} className="max-h-[52vh] overflow-auto p-4 space-y-3">
            {messages.map((m, idx) => (
              <div key={idx} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed " +
                    (m.role === "user" ? "bg-black text-white" : "bg-gray-100 text-black")
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-black/10 p-3 space-y-2">
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm"
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) setDraft(v);
                }}
              >
                <option value="">load example sentences..</option>
                {examples.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
              <button
                className="rounded-xl bg-black text-white px-4 py-2 text-sm disabled:opacity-50"
                onClick={send}
                disabled={sending}
              >
                send
              </button>
            </div>
            <input
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              placeholder="Ask anything about this area..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send();
              }}
            />
            {err && <div className="text-xs text-red-600">{err}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
