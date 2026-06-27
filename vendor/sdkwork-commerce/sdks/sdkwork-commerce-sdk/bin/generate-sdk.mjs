#!/usr/bin/env node
import {
  resolveFamilySdkRoot,
  runCommerceSdkGenerator,
} from "../../../tools/commerce_sdk_generator_runner.mjs";

runCommerceSdkGenerator(
  {
    sdkName: "sdkwork-commerce-sdk",
    sdkOwner: "sdkwork-commerce",
    apiAuthority: "sdkwork-commerce-open-api",
    dependencyApiExports: [],
    sdkRoot: resolveFamilySdkRoot(import.meta.url),
    sdkType: "custom",
    apiPrefix: "/open/v3/api",
    defaultBaseUrl: "http://127.0.0.1:18082",
    defaultOpenapiFile: "commerce-open-api.openapi.json",
    standardProfileArgs: [],
    manifestStandardProfile: "sdkwork-commerce-open-v3",
  },
  process.argv.slice(2),
);

