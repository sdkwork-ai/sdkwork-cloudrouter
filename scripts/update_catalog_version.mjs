import { readFileSync, writeFileSync } from "node:fs";

const file = "e:/sdkwork-space/sdkwork-models/sdkwork-models.json";
const doc = JSON.parse(readFileSync(file, "utf8"));
doc.catalogVersion = "2026.08.30.1";
doc.generatedAt = "2026-08-30T00:00:00Z";
writeFileSync(file, JSON.stringify(doc, null, 2) + "\n", "utf8");
console.log("updated catalogVersion=" + doc.catalogVersion + " generatedAt=" + doc.generatedAt);