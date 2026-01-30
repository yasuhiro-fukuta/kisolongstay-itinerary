import fs from "fs";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("OPENAI_API_KEY is not set");
  process.exit(1);
}

const client = new OpenAI({ apiKey });

const filePath = process.argv[2] || "C:\\Users\\user\\Downloads\\nagiso_knowledge.txt";
const storeName = "nagiso-knowledge";

async function main() {
  console.log("Uploading:", filePath);

  const file = await client.files.create({
    file: fs.createReadStream(filePath),
    purpose: "assistants",
  });

  console.log("file_id:", file.id);

  const vectorStore = await client.vectorStores.create({
    name: storeName,
  });

  console.log("vector_store_id:", vectorStore.id);

  const batch = await client.vectorStores.fileBatches.uploadAndPoll(
    vectorStore.id,
    [fs.createReadStream(filePath)]
  );

  console.log("batch_status:", batch.status);
  console.log("file_counts:", batch.file_counts);
  console.log("\nSAVE THIS VECTOR_STORE_ID:\n", vectorStore.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
