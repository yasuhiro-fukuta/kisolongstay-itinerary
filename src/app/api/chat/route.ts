import { NextResponse } from "next/server";
import OpenAI from "openai";

type AnyBody = Record<string, any>;

type VSResult = {
  score?: number;
  content?: Array<{ type?: string; text?: string }>;
  metadata?: any;
};

function extractTextFromResult(r: any): string {
  const parts = (r?.content || []) as Array<any>;
  return parts
    .map((p) => (typeof p?.text === "string" ? p.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnyBody;

    const message: string =
      (typeof body?.message === "string" && body.message) ||
      (typeof body?.text === "string" && body.text) ||
      (typeof body?.prompt === "string" && body.prompt) ||
      (typeof body?.input === "string" && body.input) ||
      "";

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;

    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY is not set" }, { status: 500 });
    if (!vectorStoreId) return NextResponse.json({ error: "OPENAI_VECTOR_STORE_ID is not set" }, { status: 500 });
    if (!message) {
      return NextResponse.json({ error: "Missing `message`" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });

    // Retrieve from vector store explicitly.
    const searchResp: any = await client.vectorStores.search(vectorStoreId, {
      query: message,
      max_num_results: 6,
    });

    const results: VSResult[] = searchResp?.data || [];
    const texts = results
      .map((r) => ({ score: Number(r?.score ?? 0), text: extractTextFromResult(r) }))
      .filter((x) => x.text.length > 0);

    const topScore = texts.length ? Math.max(...texts.map((t) => t.score)) : 0;
    const THRESHOLD = 0.18;

    const localContext = texts
      .slice(0, 4)
      .map((t, i) => `【local-${i + 1} score=${t.score.toFixed(3)}】\n${t.text}`)
      .join("\n\n");

    const systemText = [
      "You are a helpful local guide for Nagiso / Kiso (Japan).",
      "Rules:",
      "1) Prefer the Local Knowledge when it is relevant.",
      "2) Do NOT invent specific local facts (store names, opening hours, prices, hidden spots) unless supported by Local Knowledge.",
      "3) If Local Knowledge is insufficient, say so briefly and then answer using general knowledge.",
      "4) When you use Local Knowledge, include short citations like (local-1), (local-2) referencing the snippets below.",
    ].join("\n");

    const userText = [
      `User question: ${message}`,
      "",
      topScore >= THRESHOLD
        ? "Local Knowledge snippets (use these first):\n" + localContext
        : "Local Knowledge snippets were not confident for this query. If you cannot answer from them, say so and answer generally.\n" +
          (localContext ? "\nSnippets (maybe relevant):\n" + localContext : ""),
    ].join("\n");

    const resp = await client.responses.create({
      model,
      input: [
        { role: "system", content: [{ type: "input_text", text: systemText }] },
        { role: "user", content: [{ type: "input_text", text: userText }] },
      ],
    });

    const text = resp.output_text || "";

    return NextResponse.json({
      text,
      debug: {
        vector_store_id: vectorStoreId,
        top_score: topScore,
        used_local_threshold: THRESHOLD,
        retrieved: texts.slice(0, 4).map((t, i) => ({
          id: `local-${i + 1}`,
          score: t.score,
          preview: t.text.slice(0, 200),
        })),
      },
    });
  } catch (err: any) {
    console.error("/api/chat error:", err);
    return NextResponse.json(
      { error: "Chat request failed", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
