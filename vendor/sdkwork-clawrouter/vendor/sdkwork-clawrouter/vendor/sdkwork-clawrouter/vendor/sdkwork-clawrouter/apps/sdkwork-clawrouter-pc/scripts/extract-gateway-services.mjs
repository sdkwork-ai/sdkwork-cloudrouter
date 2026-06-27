#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const modelsServicePath = join(
  root,
  "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/modelService.ts",
);
const source = readFileSync(modelsServicePath, "utf8");
const lines = source.split("\n");

function slice(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

const sharedImport = `import {
  ensureSdkworkApiSuccess,
  getClawRouterBackendSdkClient,
  isRecord,
  readApiRecord,
  readBoolean,
  readNullableString,
  readNumber,
  readRequiredApiItems,
  readRequiredApiItem,
  requiredSafePathSegment,
  readRequiredString,
  readString,
  readStringArray,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import type {
  AdminAiResourceGroupCreateRequest,
  AdminAiResourceGroupUpdateRequest,
  AdminSiteCreateRequest,
  AdminSiteUpdateRequest,
  MediaResource,
} from '@sdkwork/clawrouter-backend-sdk';
`;

const sharedHelpers = slice(1039, 1165) + "\n\n" + slice(1609, 1614);

const siteTypes = slice(235, 321);
const siteService = slice(627, 685);
const siteHelpers =
  slice(1616, 1683) + "\n\n" + slice(1754, 1823) + "\n\n" + slice(1826, 1832);

writeFileSync(
  join(root, "packages/sdkwork-clawrouter-pc-admin-relay-site/src/siteService.ts"),
  `${sharedImport}\n${siteTypes}\n\n${siteService}\n\n${sharedHelpers}\n${siteHelpers}\n`,
  "utf8",
);

const resourceTypes = slice(380, 449);
const resourceService = slice(687, 755);
const resourceHelpers =
  slice(1225, 1362) + "\n\n" + slice(1834, 1840) + "\n\n" + slice(1874, 1884) + "\n\n" + slice(1958, 1968);

writeFileSync(
  join(root, "../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-resource/src/resourceGroupService.ts"),
  `${sharedImport}\n${resourceTypes}\n\n${resourceService}\n\n${sharedHelpers}\n${resourceHelpers}\n`,
  "utf8",
);

console.log("extracted siteService.ts and resourceGroupService.ts");
