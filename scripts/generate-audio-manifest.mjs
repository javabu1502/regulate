// Generates public/audio-manifest.json — the list of audio files the
// service worker precaches for offline use. Runs automatically before
// `next build` (see the prebuild script in package.json).
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const audioDir = join(root, "public", "audio");

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(mp3|ogg|wav|m4a)$/.test(name)) {
      files.push("/" + relative(join(root, "public"), full).split(/[\\/]/).join("/"));
    }
  }
  return files;
}

const manifest = walk(audioDir).sort();
writeFileSync(join(root, "public", "audio-manifest.json"), JSON.stringify(manifest, null, 1) + "\n");
console.log(`audio-manifest.json: ${manifest.length} files`);

// Stamp a build id into sw.js so browsers see a changed worker on each
// deploy and re-run the install-time precache (otherwise offline copies
// of unvisited pages would go stale forever).
import { readFileSync } from "node:fs";
const swPath = join(root, "public", "sw.js");
const buildId = process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now());

// Keep the SW's meditation page list in sync with src/lib/meditations.ts
const meditationsSrc = readFileSync(join(root, "src", "lib", "meditations.ts"), "utf8");
const meditationIds = [...meditationsSrc.matchAll(/^\s*id: "([^"]+)",/gm)].map((m) => m[1]);
const meditationPages = JSON.stringify(meditationIds.map((id) => `/meditations/${id}`));

const sw = readFileSync(swPath, "utf8")
  .replace(/const BUILD_ID = "[^"]*";/, `const BUILD_ID = "${buildId}";`)
  .replace(/const MEDITATION_PAGES = \[[^\]]*\];/, `const MEDITATION_PAGES = ${meditationPages};`);
writeFileSync(swPath, sw);
console.log(`sw.js build id: ${buildId}, ${meditationIds.length} meditation pages`);
