import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const commercePcPackagesRoot = path.join(workspaceRoot, "apps", "sdkwork-commerce-pc", "packages");
const mallPcPackagesRoot = path.join(workspaceRoot, "apps", "sdkwork-mall-pc", "packages");

const replacements = [
  ["@sdkwork/commerce-pc-", "@sdkwork/mall-pc-"],
  ["sdkwork-commerce-pc-", "sdkwork-mall-pc-"],
  ["SdkworkCommercePc", "SdkworkMallPc"],
];

function transformSource(source) {
  let next = source;
  for (const [from, to] of replacements) {
    next = next.replaceAll(from, to);
  }
  return next;
}

function syncPackageTests(commerceDirName) {
  const mallDirName = commerceDirName.replace(/^sdkwork-commerce-pc-/, "sdkwork-mall-pc-");
  const commerceTests = path.join(commercePcPackagesRoot, commerceDirName, "tests");
  const mallTests = path.join(mallPcPackagesRoot, mallDirName, "tests");

  if (!existsSync(commerceTests) || !existsSync(mallTests)) {
    return [];
  }

  const synced = [];
  for (const file of readdirSync(commerceTests)) {
    const source = readFileSync(path.join(commerceTests, file), "utf8");
    const targetPath = path.join(mallTests, file);
    writeFileSync(targetPath, transformSource(source), "utf8");
    synced.push(`${mallDirName}/tests/${file}`);
  }

  return synced;
}

const syncedFiles = [];
for (const directory of readdirSync(commercePcPackagesRoot)) {
  if (!directory.startsWith("sdkwork-commerce-pc-")) {
    continue;
  }
  syncedFiles.push(...syncPackageTests(directory));
}

console.log(`[sync_mall_pc_tests] synced ${syncedFiles.length} files`);
