import admin from "firebase-admin";
import fs from "fs";
import path from "path";

/**
 * 出力仕様（ユーザーが提示したCSVに合わせる）
 * 1行 = 旅程の1スポット（Dayごとに並ぶ）
 * 列: アカウント, 名前, 旅程名, Day, 行目, 行タイトル
 */

// ====== 設定 ======
const SERVICE_ACCOUNT_PATH = "./serviceAccountKey.json"; // Firebaseサービスアカウントキー
const OUTPUT_CSV_PATH = "./user_itineraries.csv"; // 出力先
const ITINERARY_COLLECTION = "itineraries";

// 旅程の「空行」判定（名前もURLもない行はレポートから落とす）
function hasAnyValue(item) {
  const name = String(item?.name ?? "").trim();
  const mapUrl = String(item?.mapUrl ?? "").trim();
  const hpUrl = String(item?.hpUrl ?? "").trim();
  const otaUrl = String(item?.otaUrl ?? "").trim();
  const socialLinks = Array.isArray(item?.socialLinks) ? item.socialLinks : [];
  return !!(name || mapUrl || hpUrl || otaUrl || socialLinks.length);
}

// 行タイトルの組み立て（例： "WalkLite(荷物運び) HP:" みたいな形も許容）
function buildRowTitle(item) {
  const name = String(item?.name ?? "").trim() || "（未設定）";

  const hpUrl = String(item?.hpUrl ?? "").trim();
  const otaUrl = String(item?.otaUrl ?? "").trim();

  const parts = [name];

  if (hpUrl) parts.push(`HP: ${hpUrl}`);
  if (otaUrl) parts.push(`OTA: ${otaUrl}`);

  // SNS（媒体名が分かる形）
  const socialLinks = Array.isArray(item?.socialLinks) ? item.socialLinks : [];
  for (const s of socialLinks) {
    const label = String(s?.label ?? "").trim();
    const url = String(s?.url ?? "").trim();
    if (!label || !url) continue;
    parts.push(`${label}: ${url}`);
  }

  return parts.join(" ");
}

function dayLabel(dayZeroBased, dates) {
  const d = dates?.[dayZeroBased] ? String(dates[dayZeroBased]) : "";
  // 提示CSVが "Day1 (2025-12-25)" 形式なのでそれに寄せる
  return `Day${dayZeroBased + 1} (${d})`;
}

// CSVエスケープ（ダブルクォートで囲う）
function csvEscape(v) {
  const s = String(v ?? "");
  return `"${s.replaceAll('"', '""')}"`;
}

// ====== Admin初期化 ======
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`Service account key not found: ${SERVICE_ACCOUNT_PATH}`);
  console.error("Firebase Console → プロジェクト設定 → サービスアカウント → 秘密鍵を生成 で取得して置いてください。");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ====== Authユーザー一覧を取る（uid → email/displayName の辞書）=====
async function fetchAllUsersMap() {
  const map = new Map(); // uid -> {email, displayName}
  let nextPageToken = undefined;

  do {
    const res = await admin.auth().listUsers(1000, nextPageToken);
    for (const u of res.users) {
      map.set(u.uid, {
        email: u.email ?? "",
        displayName: u.displayName ?? "",
      });
    }
    nextPageToken = res.pageToken;
  } while (nextPageToken);

  return map;
}

// ====== Firestore itineraries を取って整形 ======
async function exportCsv() {
  const usersMap = await fetchAllUsersMap();

  const snap = await db.collection(ITINERARY_COLLECTION).get();
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // 出力行
  const rows = [];

  for (const doc of docs) {
    const uid = String(doc.uid ?? "");
    if (!uid) continue;

    const userInfo = usersMap.get(uid) ?? { email: "", displayName: "" };
    const account = userInfo.email || uid; // emailが無ければuid
    const name = userInfo.displayName || "";

    const title = String(doc.title ?? "").trim() || "（無題）";
    const dates = Array.isArray(doc.dates) ? doc.dates.map((x) => String(x)) : [];
    const items = Array.isArray(doc.items) ? doc.items : [];

    // day順 → 元の並び順（row順）でまとめる
    const byDay = new Map(); // day -> items[]
    for (const it of items) {
      const day = Number(it?.day);
      if (!Number.isFinite(day)) continue;
      if (!hasAnyValue(it)) continue;

      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(it);
    }

    const dayKeys = Array.from(byDay.keys()).sort((a, b) => a - b);

    for (const day of dayKeys) {
      const list = byDay.get(day) ?? [];
      // 行目（1..）
      for (let i = 0; i < list.length; i++) {
        const it = list[i];

        rows.push({
          アカウント: account,
          名前: name,
          旅程名: title,
          Day: dayLabel(day, dates),
          行目: i + 1,
          行タイトル: buildRowTitle(it),
        });
      }
    }
  }

  // ソート（見やすさ優先：アカウント→旅程名→Day→行目）
  rows.sort((a, b) => {
    const ka = `${a.アカウント}|||${a.旅程名}|||${a.Day}|||${String(a.行目).padStart(6, "0")}`;
    const kb = `${b.アカウント}|||${b.旅程名}|||${b.Day}|||${String(b.行目).padStart(6, "0")}`;
    return ka.localeCompare(kb, "ja");
  });

  // CSV書き出し（列名は提示CSVに合わせる）
  const header = ["アカウント", "名前", "旅程名", "Day1", "行目", "行タイトル"];
  const lines = [header.join(",")];

  for (const r of rows) {
    // 提示CSVの列名 "Day1" に合わせて Day を入れる
    const line = [
      csvEscape(r.アカウント),
      csvEscape(r.名前),
      csvEscape(r.旅程名),
      csvEscape(r.Day),
      csvEscape(r.行目),
      csvEscape(r.行タイトル),
    ].join(",");
    lines.push(line);
  }

  fs.writeFileSync(OUTPUT_CSV_PATH, lines.join("\n"), "utf8");
  console.log(`✅ Wrote: ${path.resolve(OUTPUT_CSV_PATH)} (rows=${rows.length})`);
}

exportCsv().catch((e) => {
  console.error(e);
  process.exit(1);
});
