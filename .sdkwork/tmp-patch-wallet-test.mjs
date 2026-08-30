import fs from "node:fs";

const file = "E:/sdkwork-space/sdkwork-account/apps/sdkwork-account-pc/packages/sdkwork-account-pc-wallet/tests/wallet.service.test.ts";
let src = fs.readFileSync(file, "utf8");

const oldSnippet = 'points: "1000",';
const newSnippet = 'points: "1000000000", // 1000 points as integer micro-points (1 point = 1e6 micro)';

if (!src.includes(oldSnippet)) {
  console.error("SNIPPET NOT FOUND");
  process.exit(1);
}
src = src.replace(oldSnippet, newSnippet);
fs.writeFileSync(file, src, "utf8");
console.log("PATCHED wallet.service.test.ts recharge package mock to micro");