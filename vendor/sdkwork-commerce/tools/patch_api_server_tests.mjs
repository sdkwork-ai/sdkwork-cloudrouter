#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const testsDir = path.resolve(scriptDir, "../crates/sdkwork-commerce-api-server/tests");
const importBlock = `use sdkwork_commerce_api_server::test_http::{
    commerce_migrated_sqlite_pool, commerce_standard_test_context, commerce_test_json_request,
    commerce_test_request,
};
`;

for (const fileName of readdirSync(testsDir).filter((name) => name.endsWith(".rs"))) {
  const filePath = path.join(testsDir, fileName);
  let source = readFileSync(filePath, "utf8");
  const original = source;

  source = source.replace(
    /async fn commerce_migrated_sqlite_pool\(\) -> SqlitePool \{[\s\S]*?\n\}\n\n/g,
    "",
  );
  source = source.replace(
    /fn commerce_standard_test_context\(\) -> IamAppContext \{[\s\S]*?\n\}\n\n/g,
    "",
  );

  if (
    (source.includes("commerce_migrated_sqlite_pool") ||
      source.includes("commerce_test_request") ||
      source.includes("commerce_test_json_request")) &&
    !source.includes("sdkwork_commerce_api_server::test_http")
  ) {
    source = source.replace(/^use /m, `${importBlock}use `);
  }

  if (source !== original) {
    writeFileSync(filePath, source, "utf8");
    process.stdout.write(`cleaned ${fileName}\n`);
  }
}
