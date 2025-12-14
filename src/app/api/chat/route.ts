// src/app/api/chat/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body?.messages;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { text: "", error: "OPENAI_API_KEY is missing on server" },
        { status: 500 }
      );
    }

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { text: "", error: "Invalid request: messages must be an array" },
        { status: 400 }
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
    });

    const text = completion.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ text });
  } catch (e: any) {
    // ★エラーを返す（UI側で表示する）
    return NextResponse.json(
      { text: "", error: String(e?.message ?? e ?? "unknown error") },
      { status: 500 }
    );
  }
}
