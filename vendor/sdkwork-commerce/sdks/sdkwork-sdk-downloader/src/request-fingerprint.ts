import { createHash } from "node:crypto";

import { serializeCanonicalValue } from "./schema-fingerprint";
import type { CreateRequestFingerprintInput } from "./types";

const SDK_GENERATOR_IDENTITY = "@sdkwork/sdk-generator";

export function createRequestFingerprint(
  input: CreateRequestFingerprintInput,
): string {
  const payload = {
    schemaFingerprint: input.schemaFingerprint,
    language: input.language,
    sdkType: input.sdkType,
    name: input.name,
    packageName: input.packageName ?? null,
    namespace: input.namespace ?? null,
    commonPackage: input.commonPackage ?? null,
    baseUrl: input.baseUrl ?? null,
    apiPrefix: input.apiPrefix ?? null,
    sdkVersion: input.sdkVersion ?? null,
    fixedSdkVersion: input.fixedSdkVersion ?? null,
    sdkRoot: input.sdkRoot ?? null,
    sdkName: input.sdkName ?? null,
    npmPackageName: input.npmPackageName ?? null,
    npmRegistry: input.npmRegistry ?? null,
    syncPublishedVersion: input.syncPublishedVersion ?? null,
    generator: SDK_GENERATOR_IDENTITY,
  };

  return createHash("sha256")
    .update(serializeCanonicalValue(payload), "utf-8")
    .digest("hex");
}
