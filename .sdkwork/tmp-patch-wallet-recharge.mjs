import fs from "node:fs";

const file = "E:/sdkwork-space/sdkwork-account/apps/sdkwork-account-pc/packages/sdkwork-account-pc-wallet/src/wallet-recharge-service.ts";
let src = fs.readFileSync(file, "utf8");

const oldSnippet = "const points = toSdkworkAccountNumber(item.points ?? item.grantAmount ?? item.grant_amount);";
const newSnippet = "const points = toSdkworkAccountPointsFromMicro(item.points ?? item.grantAmount ?? item.grant_amount);";

if (!src.includes(oldSnippet)) {
  console.error("SNIPPET NOT FOUND");
  process.exit(1);
}
src = src.replace(oldSnippet, newSnippet);
fs.writeFileSync(file, src, "utf8");
console.log("PATCHED wallet-recharge-service.ts (mapRechargePackage points -> micro)");