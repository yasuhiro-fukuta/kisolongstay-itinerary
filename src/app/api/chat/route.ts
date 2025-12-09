// src/app/api/chat/route.ts
import OpenAI from "openai";

export const runtime = "nodejs";

// ここで openai クライアントをちゃんと定義する
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { text: "OPENAI_API_KEY が未設定です（.env.local を見てください）" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as { messages?: Msg[] };
    const messages = body.messages ?? [];
    if (messages.length === 0) {
      return Response.json({ text: "メッセージが空です" }, { status: 400 });
    }

    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    const resp = await openai.responses.create({
      model,
      input: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const text =
      // 新しい Responses API の構造
      // @ts-ignore
      resp.output?.[0]?.content?.[0]?.text?.value ??
      // 互換用フォールバック
      (resp as any).output_text ??
      "（OpenAIから返答が得られませんでした）";

    return Response.json({ text });
  } catch (err: any) {
    console.error("APIルート内部エラー:", err);
    return Response.json(
      { text: "APIルート内部エラー: " + (err?.message ?? String(err)) },
      { status: 500 }
    );
  }
}
