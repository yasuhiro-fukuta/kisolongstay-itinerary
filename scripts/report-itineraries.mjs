import admin from "firebase-admin";
import fs from "fs";

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"))
  ),
});

const db = admin.firestore();

function toIso(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Date(n).toISOString();
}

const snap = await db.collection("itineraries").get();

const rows = [];
snap.forEach((doc) => {
  const d = doc.data();
  rows.push({
    docId: doc.id,
    uid: d.uid ?? "",
    title: d.title ?? "",
    savedAt: toIso(d.savedAtMs),
    dayCount: Array.isArray(d.dates) ? d.dates.length : 0,
    startDate: Array.isArray(d.dates) ? (d.dates[0] ?? "") : "",
    itemCount: Array.isArray(d.items) ? d.items.length : 0,
  });
});

// CSV出力（簡易）
const header = ["docId", "uid", "title", "savedAt", "dayCount", "startDate", "itemCount"];
const lines = [header.join(",")];
for (const r of rows) {
  const line = header.map((k) => `"${String(r[k] ?? "").replaceAll('"', '""')}"`).join(",");
  lines.push(line);
}
fs.writeFileSync("./itineraries.csv", lines.join("\n"), "utf8");

console.log("Wrote itineraries.csv", rows.length);
