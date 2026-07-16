import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const origin = process.env.SHARED_API_ORIGIN;
const bypassToken = process.env.SITES_BYPASS_TOKEN;
const publicDirectory = path.resolve("pages/public");
const snapshotPath = path.join(publicDirectory, "shared-state.json");
const assetsDirectory = path.join(publicDirectory, "shared-assets");
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "product-launch-sop";

if (!origin || !bypassToken) {
  console.log("Shared snapshot credentials are unavailable; keeping the bundled snapshot.");
  process.exit(0);
}

const authorizationHeaders = {
  "OAI-Sites-Authorization": `Bearer ${bypassToken}`,
};

try {
  const response = await fetch(`${origin}/api/state`, {
    headers: authorizationHeaders,
  });
  if (!response.ok) throw new Error(`state request failed with ${response.status}`);

  const snapshot = await response.json();
  if (!snapshot.state) {
    console.log("No shared state has been saved yet; keeping the bundled snapshot.");
    process.exit(0);
  }

  await mkdir(assetsDirectory, { recursive: true });
  const modules = Array.isArray(snapshot.state.modules) ? snapshot.state.modules : [];

  for (const module of modules) {
    if (typeof module.markdown !== "string") continue;
    const imageUrls = [...module.markdown.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)]+\/api\/images\?id=[^)]+)\)/g)]
      .map((match) => match[1]);

    for (const imageUrl of new Set(imageUrls)) {
      const imageResponse = await fetch(imageUrl, { headers: authorizationHeaders });
      if (!imageResponse.ok) {
        console.warn(`Skipping unavailable image: ${imageUrl}`);
        continue;
      }

      const contentType = imageResponse.headers.get("content-type") ?? "image/webp";
      const extension = contentType.includes("avif") ? "avif" : contentType.includes("png") ? "png" : contentType.includes("jpeg") ? "jpg" : contentType.includes("gif") ? "gif" : contentType.includes("svg") ? "svg" : "webp";
      const fileName = `${createHash("sha256").update(imageUrl).digest("hex").slice(0, 20)}.${extension}`;
      const imageBytes = Buffer.from(await imageResponse.arrayBuffer());
      await writeFile(path.join(assetsDirectory, fileName), imageBytes);
      module.markdown = module.markdown.split(imageUrl).join(`/${repositoryName}/shared-assets/${fileName}`);
    }
  }

  await writeFile(snapshotPath, `${JSON.stringify({ ...snapshot, canEdit: false }, null, 2)}\n`, "utf8");
  console.log(`Published shared snapshot from ${snapshot.updatedAt ?? "an unknown time"}.`);
} catch (error) {
  try {
    await readFile(snapshotPath, "utf8");
  } catch {
    await mkdir(publicDirectory, { recursive: true });
    await writeFile(snapshotPath, '{"state":null,"updatedAt":null,"canEdit":false}\n', "utf8");
  }
  console.warn(`Shared snapshot sync was skipped: ${error instanceof Error ? error.message : String(error)}`);
}
