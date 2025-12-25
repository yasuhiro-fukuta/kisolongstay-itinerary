import admin from "firebase-admin";
import fs from "fs";

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"))
  ),
});

const db = admin.firestore();

async function listAllUsers() {
  const users = [];
  let nextPageToken = undefined;
  do {
    const res = await admin.auth().listUsers(1000, nextPageToken);
    users.push(...res.users);
    nextPageToken = res.pageToken;
  } while (nextPageToken);
  return users;
}

// 1) itineraries を全部取って uid別にカウント
const itSnap = await db.collection("itineraries").get();
const countByUid = new Map();
itSnap.forEach((doc) => {
  const d = doc.data();
  const uid = String(d.uid ?? "");
  if (!uid) return;
  countByUid.set(uid, (countByUid.get(uid) ?? 0) + 1);
});

// 2) Auth users を取得して突合
const users = await listAllUsers();

const header = ["uid", "email", "displayName", "createdAt", "lastSignInAt", "itineraryCount"];
const lines = [header.join(",")];

for (const u of users) {
  const r = {
    uid: u.uid,
    email: u.email ?? "",
    displayName: u.displayName ?? "",
    createdAt: u.metadata?.creationTime ?? "",
    lastSignInAt: u.metadata?.lastSignInTime ?? "",
    itineraryCount: countByUid.get(u.uid) ?? 0,
  };
  const line = header.map((k) => `"${String(r[k] ?? "").replaceAll('"', '""')}"`).join(",");
  lines.push(line);
}

fs.writeFileSync("./users_report.csv", lines.join("\n"), "utf8");
console.log("Wrote users_report.csv", users.length);
