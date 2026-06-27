import {
  createClient as createGeneratedCommerceAppClient,
  SdkworkAppClient,
} from "../generated/server-openapi/src/index";
import type { SdkworkAppConfig } from "../generated/server-openapi/src/types/common";
import { operations, sdkMetadata } from "../composed/operations";

export { SdkworkAppClient, createGeneratedCommerceAppClient, operations, sdkMetadata };
export * from "../generated/server-openapi/src/types";
export * from "../generated/server-openapi/src/api";
export * from "../generated/server-openapi/src/http";
export * from "../generated/server-openapi/src/auth";

export type CommerceAppSdkClient = SdkworkAppClient;

export function createCommerceAppSdkClient(config: SdkworkAppConfig): CommerceAppSdkClient {
  return createGeneratedCommerceAppClient(config);
}
