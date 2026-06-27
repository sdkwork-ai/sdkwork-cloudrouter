import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MAX_VENDOR_CHUNK_BYTES = 2 * 1024 * 1024;
const MAX_ROUTE_CHUNK_BYTES = 256 * 1024;
const MAX_CSS_BYTES = 256 * 1024;
const MIN_ROUTE_CHUNK_COUNT = 20;

const routeChunkPattern = /^(?!vendor-|index-|AdminLayout-).+\.js$/;

async function main() {
  const portalRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const assetsDir = path.join(portalRoot, "dist", "assets");
  const entries = await readdir(assetsDir);
  const files = await Promise.all(entries.map(async (name) => {
    const filePath = path.join(assetsDir, name);
    const metadata = await stat(filePath);
    return { name, bytes: metadata.size };
  }));

  const failures = [];
  const vendorChunks = files.filter(file => file.name.startsWith("vendor-") && file.name.endsWith(".js"));
  const routeChunks = files.filter(file => routeChunkPattern.test(file.name));
  const cssFiles = files.filter(file => file.name.endsWith(".css"));

  if (vendorChunks.length === 0) {
    failures.push("portal build must emit explicit vendor chunks");
  }
  if (routeChunks.length < MIN_ROUTE_CHUNK_COUNT) {
    failures.push(`portal build must emit at least ${MIN_ROUTE_CHUNK_COUNT} lazy route chunks; found ${routeChunks.length}`);
  }

  for (const chunk of vendorChunks) {
    if (chunk.bytes > MAX_VENDOR_CHUNK_BYTES) {
      failures.push(`${chunk.name} exceeds vendor budget: ${chunk.bytes} > ${MAX_VENDOR_CHUNK_BYTES}`);
    }
  }
  for (const chunk of routeChunks) {
    if (chunk.bytes > MAX_ROUTE_CHUNK_BYTES) {
      failures.push(`${chunk.name} exceeds route chunk budget: ${chunk.bytes} > ${MAX_ROUTE_CHUNK_BYTES}`);
    }
  }
  for (const file of cssFiles) {
    if (file.bytes > MAX_CSS_BYTES) {
      failures.push(`${file.name} exceeds CSS budget: ${file.bytes} > ${MAX_CSS_BYTES}`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(failure);
    }
    process.exitCode = 1;
    return;
  }

  const largestVendor = vendorChunks.reduce((largest, file) => file.bytes > largest.bytes ? file : largest, { name: "none", bytes: 0 });
  const largestRoute = routeChunks.reduce((largest, file) => file.bytes > largest.bytes ? file : largest, { name: "none", bytes: 0 });
  console.log(
    `Portal bundle budget passed: ${vendorChunks.length} vendor chunks, ${routeChunks.length} route chunks, `
      + `largest vendor ${largestVendor.name}=${largestVendor.bytes}, largest route ${largestRoute.name}=${largestRoute.bytes}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
