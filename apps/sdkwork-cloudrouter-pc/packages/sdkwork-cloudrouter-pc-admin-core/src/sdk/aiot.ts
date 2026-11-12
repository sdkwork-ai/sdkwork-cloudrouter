/**
 * AIoT backend admin SDK port.
 *
 * This module is the only place in the Cloud Router PC graph that names the
 * generated `@sdkwork/aiot-backend-sdk` module: feature packages must import
 * generated-SDK ports through a core package's public exports
 * (`verify-repo` layering rule). The Smart Hardware Center therefore reads both
 * the port types and the injected client from here.
 *
 * Transport ownership stays outside this package: the application host builds
 * the client from `@sdkwork/cloudroutes-pc-commons/sdk-clients` (portal backend
 * base-url chain, session-auth boundary, locale propagation, projection
 * sanitation) and injects it through {@link configureAiotAdminBackendClient}.
 */

import type { SdkworkAiotBackendClient } from '@sdkwork/aiot-backend-sdk';

export type {
  AiotCapabilityModelCreateRequest,
  AiotCapabilityModelUpdateRequest,
  AiotCredentialCreateRequest,
  AiotDeviceCreateRequest,
  AiotDeviceSettingDefinition,
  AiotDeviceSettingMap,
  AiotDeviceSettingsBulkUpdateRequest,
  AiotDeviceUpdateRequest,
  AiotFirmwareArtifactCreateRequest,
  AiotFirmwareArtifactUpdateRequest,
  AiotFirmwareRolloutCreateRequest,
  AiotFirmwareRolloutUpdateRequest,
  AiotHardwareProfileCreateRequest,
  AiotHardwareProfileUpdateRequest,
  AiotProductCreateRequest,
  AiotProductUpdateRequest,
  AiotProtocolProfileCreateRequest,
  AiotProtocolProfileUpdateRequest,
  CapabilityDefinition,
  JsonValue,
  MediaResource,
  SdkworkAiotBackendClient,
} from '@sdkwork/aiot-backend-sdk';

/**
 * The AIoT media reference type, kept as a derived alias so feature packages do
 * not need to name the generated schema separately. It is deliberately distinct
 * from the product-wide `MediaResource` alias exported by this package: the two
 * DTOs come from different contracts and are not interchangeable.
 */
export type AiotMediaResource = import('@sdkwork/aiot-backend-sdk').MediaResource;

let aiotAdminClientHolder: SdkworkAiotBackendClient | undefined;

/** Injects the host-built AIoT backend client. Must run before the first request. */
export function configureAiotAdminBackendClient(client: SdkworkAiotBackendClient): void {
  aiotAdminClientHolder = client;
}

/**
 * Returns the injected client.
 *
 * Throws instead of lazily constructing one: a silent fallback would bypass the
 * portal base-url chain and session-auth boundary, so a missing injection is a
 * composition bug that must surface instead of degrading into an anonymous call.
 */
export function aiotAdminBackendClient(): SdkworkAiotBackendClient {
  if (!aiotAdminClientHolder) {
    throw new Error(
      'AIoT backend SDK client is not configured; the application host must call configureAiotAdminBackendClient() before rendering Smart Hardware Center pages',
    );
  }
  return aiotAdminClientHolder;
}

export function isAiotAdminBackendClientConfigured(): boolean {
  return aiotAdminClientHolder !== undefined;
}

export function resetAiotAdminBackendClient(): void {
  aiotAdminClientHolder = undefined;
}

