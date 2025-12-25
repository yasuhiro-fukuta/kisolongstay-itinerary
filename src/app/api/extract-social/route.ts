// src/app/api/extract-social/route.ts
// Place の website から、Instagram / TikTok 等のリンクを「できる範囲で」抽出する。
//
// 目的:
// - Map上でスポットをクリックしたときに、Mapリンクだけでなく Webサイト・SNS も旅程に入れたい。
// - Google Places API だけでは SNS リンクが取れないため、公式サイト HTML から抽出する。
//
// 注意:
// - 取得はベストエフォート。サイト側の構造・ブロック・遅延ロード等で取れない場合がある。
// - SSRF 対策として localhost / IP っぽい宛先は弾く。

import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SocialLink = { platform: string; url: string };

type SocialResponse =
  | { ok: true; input: string; fetchedUrl: string; socialLinks: SocialLink[] }
  | { ok: false; error: string };

const MAX_HTML_CHARS = 700_000; // 念のため上限（巨大HTMLで落ちないように）
const TIMEOUT_MS = 8000;

// ベストエフォート抽出対象
const PLATFORM_RULES: Array<{ platform: string; test: (u: string) => boolean }> = [
  { platform: "Instagram", test: (u) => /(^|\/\/)(www\.)?instagram\.com\//i.test(u) },
  { platform: "TikTok", test: (u) => /(^|\/\/)(www\.)?tiktok\.com\//i.test(u) },
  { platform: "YouTube", test: (u) => /(^|\/\/)(www\.)?(youtube\.com|youtu\.be)\//i.test(u) },
  { platform: "Facebook", test: (u) => /(^|\/\/)(www\.)?facebook\.com\//i.test(u) },
  { platform: "X", test: (u) => /(^|\/\/)(www\.)?(x\.com|twitter\.com)\//i.test(u) },
  { platform: "LINE", test: (u) => /(^|\/\/)(www\.)?line\.me\//i.test(u) },
];

function looksLikeIp(host: string): boolean {
  // IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  // IPv6
  if (/^\[?[0-9a-f:]+\]?$/.test(host) && host.includes(":")) return true;
  return false;
}

function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true;
  if (looksLikeIp(h)) return true;
  return false;
}

function normalizeUrl(raw: string): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (isBlockedHost(u.hostname)) return null;
    return u.toString();
  } catch {
    // //example.com 形式は URL として扱う
    if (s.startsWith("//")) {
      try {
        const u = new URL(`https:${s}`);
        if (isBlockedHost(u.hostname)) return null;
        return u.toString();
      } catch {
        return null;
      }
    }
    return null;
  }
}

function detectPlatform(url: string): string | null {
  const u = url.toLowerCase();
  for (const r of PLATFORM_RULES) {
    if (r.test(u)) return r.platform;
  }
  return null;
}

function uniq<T>(arr: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of arr) {
    const key = JSON.stringify(it);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

// href 抽出（最小実装）
function extractHrefs(html: string): string[] {
  const out: string[] = [];
  const re = /href\s*=\s*("([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const v = (m[2] ?? m[3] ?? m[4] ?? "").trim();
    if (!v) continue;
    out.push(v);
  }
  return out;
}

// JSON-LD の sameAs 抽出（ある場合）
function extractSameAs(html: string): string[] {
  const out: string[] = [];
  const reScript = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = reScript.exec(html))) {
    const jsonText = (m[1] ?? "").trim();
    if (!jsonText) continue;
    try {
      const parsed = JSON.parse(jsonText);
      const stack = Array.isArray(parsed) ? parsed : [parsed];
      for (const obj of stack) {
        const sameAs = (obj as any)?.sameAs;
        if (Array.isArray(sameAs)) {
          for (const u of sameAs) {
            if (typeof u === "string") out.push(u);
          }
        }
      }
    } catch {
      // ignore
    }
  }
  return out;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const input = (searchParams.get("url") ?? "").trim();
  if (!input) {
    return NextResponse.json<SocialResponse>({ ok: false, error: "Missing url" }, { status: 400 });
  }

  const normalized = normalizeUrl(input);
  if (!normalized) {
    return NextResponse.json<SocialResponse>({ ok: false, error: "Invalid url" }, { status: 400 });
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(normalized, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "kisolongstay-itinerary/1.0 (+https://kisolongstay-itinerary.vercel.app/)",
        "Accept-Language": "ja,en",
      },
      cache: "no-store",
    });

    const fetchedUrl = res.url || normalized;

    if (!res.ok) {
      clearTimeout(t);
      return NextResponse.json<SocialResponse>(
        { ok: false, error: `Fetch failed: ${res.status}` },
        { status: 200 }
      );
    }

    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.includes("text/html") && !ct.includes("application/xhtml+xml")) {
      clearTimeout(t);
      // HTML以外でも sameAs が取れないのでここで終了
      return NextResponse.json<SocialResponse>(
        { ok: true, input, fetchedUrl, socialLinks: [] },
        { status: 200 }
      );
    }

    let html = await res.text();
    if (html.length > MAX_HTML_CHARS) html = html.slice(0, MAX_HTML_CHARS);

    const hrefs = extractHrefs(html);
    const sameAs = extractSameAs(html);

    const candidates = [...hrefs, ...sameAs]
      .map((u) => (u.startsWith("//") ? `https:${u}` : u))
      .filter((u) => /^https?:\/\//i.test(u));

    const socialLinks: SocialLink[] = [];
    for (const u of candidates) {
      const platform = detectPlatform(u);
      if (!platform) continue;
      // 正規化（ホストブロック等もチェック）
      const norm = normalizeUrl(u);
      if (!norm) continue;
      socialLinks.push({ platform, url: norm });
    }

    clearTimeout(t);

    // 同一ドメイン/同一URLが大量に出るのを避ける
    const deduped = uniq(socialLinks).slice(0, 12);

    return NextResponse.json<SocialResponse>(
      { ok: true, input, fetchedUrl, socialLinks: deduped },
      { status: 200 }
    );
  } catch (e: any) {
    clearTimeout(t);
    return NextResponse.json<SocialResponse>(
      { ok: false, error: e?.name === "AbortError" ? "Timeout" : String(e?.message ?? "Error") },
      { status: 200 }
    );
  }
}
