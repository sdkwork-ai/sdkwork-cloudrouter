/**
 * Smart Hardware Center service layer.
 *
 * One method per operator action, each of which maps exactly one AIoT backend
 * admin operation. Responsibilities kept here (and nowhere else):
 *
 * - resolving the host-injected AIoT backend client;
 * - attaching the idempotency key that `POST`/`PUT` device and firmware
 *   operations require;
 * - normalizing a wire payload into the domain model from `./hardware.ts`;
 * - classifying backend failures into stable reason identifiers so pages can
 *   localize them and react to optimistic-concurrency conflicts.
 */

import {
  createIdempotencyParams,
} from '@sdkwork/cloudroutes-pc-commons/idempotency';
import type {
  AiotCapabilityModelCreateRequest,
  AiotCapabilityModelUpdateRequest,
  AiotCredentialCreateRequest,
  AiotDeviceCreateRequest,
  AiotDeviceSettingsBulkUpdateRequest,
  AiotDeviceSettingDefinition,
  AiotDeviceSettingMap,
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
  SdkworkAiotBackendClient,
} from '@sdkwork/cloudrouter-pc-admin-core/sdk';

import {
  mapBulkResult,
  mapCapabilityModel,
  mapDevice,
  mapDeviceCommand,
  mapDeviceCredential,
  mapDeviceSession,
  mapDeviceSettings,
  mapDeviceTwin,
  mapEvent,
  mapFirmwareArtifact,
  mapFirmwareRollout,
  mapHardwareProfile,
  mapPage,
  mapProduct,
  mapProtocolAdapter,
  mapProtocolProfile,
  mapRuntimeCapacity,
  mapSettingsHistoryEntry,
  toSettingsWireMap,
  type HardwareBulkResult,
  type HardwareCapabilityModel,
  type HardwareDevice,
  type HardwareDeviceCommand,
  type HardwareDeviceCredential,
  type HardwareDeviceSession,
  type HardwareDeviceSettings,
  type HardwareDeviceTwin,
  type HardwareEvent,
  type HardwareFirmwareArtifact,
  type HardwareFirmwareRollout,
  type HardwarePage,
  type HardwareProduct,
  type HardwareProfile,
  type HardwareProtocolAdapter,
  type HardwareProtocolProfile,
  type HardwareRuntimeCapacity,
  type HardwareSettingsHistoryEntry,
} from './hardware.ts';
import { aiotAdminBackendClient } from '@sdkwork/cloudrouter-pc-admin-core/sdk';

export const HARDWARE_DEFAULT_PAGE_SIZE = 20;
export const HARDWARE_SETTINGS_HISTORY_PAGE_SIZE = 20;

const HARDWARE_SETTINGS_REVISION_CONFLICT = 40901;

export interface HardwareListInput {
  page?: number;
  pageSize?: number;
}

export type HardwareMessageKey =
  | 'conflict'
  | 'forbidden'
  | 'notFound'
  | 'revisionConflict'
  | 'unauthorized'
  | 'unavailable'
  | 'validation';

export interface HardwareErrorDescription {
  /** Stable reason identifier the caller resolves through i18n. */
  key: HardwareMessageKey;
  /** Server-provided detail, already human-readable; shown as a secondary line. */
  detail: string;
  /** HTTP status when the failure carried one. */
  status?: number;
}

function readProblem(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const record = value as Record<string, unknown>;
  const problem = record.problem;
  return problem && typeof problem === 'object' ? (problem as Record<string, unknown>) : {};
}

function readStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  const record = error as Record<string, unknown>;
  const problem = readProblem(error);
  for (const candidate of [problem.status, record.status, record.httpStatus]) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

/** True when a settings write lost the optimistic-concurrency race. */
export function isHardwareRevisionConflict(error: unknown): boolean {
  const problem = readProblem(error);
  if (problem.code === HARDWARE_SETTINGS_REVISION_CONFLICT) {
    return true;
  }
  if (readStatus(error) === 409) {
    return true;
  }
  return Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 'CONFLICT');
}

/**
 * Classifies a backend failure. Everything except the conflict cases is derived
 * from the HTTP status so the UI can pick a tone and a retry affordance.
 */
export function describeHardwareError(error: unknown): HardwareErrorDescription {
  const status = readStatus(error);
  const detail = error instanceof Error ? error.message.trim() : '';
  if (isHardwareRevisionConflict(error)) {
    return { detail, key: 'revisionConflict', ...(status === undefined ? {} : { status }) };
  }
  if (status === 401) {
    return { detail, key: 'unauthorized', status };
  }
  if (status === 403) {
    return { detail, key: 'forbidden', status };
  }
  if (status === 404) {
    return { detail, key: 'notFound', status };
  }
  if (status === 400 || status === 422) {
    return { detail, key: 'validation', status };
  }
  if (status !== undefined && status >= 500) {
    return { detail, key: 'unavailable', status };
  }
  return { detail, key: 'conflict', ...(status === undefined ? {} : { status }) };
}

/**
 * Converts an operator-provided value into a wire-safe JSON value. The JSON
 * round-trip is the guard: values that cannot be encoded are dropped instead of
 * reaching the typed SDK request.
 */
function toJsonValue(value: unknown): JsonValue | undefined {
  if (
    value === undefined
    || typeof value === 'function'
    || typeof value === 'symbol'
    || (typeof value === 'number' && !Number.isFinite(value))
  ) {
    return undefined;
  }
  try {
    const encoded = JSON.stringify(value);
    return encoded === undefined ? undefined : (JSON.parse(encoded) as JsonValue);
  } catch {
    return undefined;
  }
}

function toJsonSettingMap(overrides: Readonly<Record<string, unknown>>): AiotDeviceSettingMap {
  const wire = toSettingsWireMap(overrides);
  const map: Record<string, JsonValue> = {};
  for (const [settingKey, value] of Object.entries(wire)) {
    const jsonValue = toJsonValue(value);
    if (jsonValue !== undefined) {
      map[settingKey] = jsonValue;
    }
  }
  return map;
}

function pageInput(input: HardwareListInput | undefined, fallbackSize = HARDWARE_DEFAULT_PAGE_SIZE): { page: number; pageSize: number } {
  return {
    page: input?.page ?? 1,
    pageSize: input?.pageSize ?? fallbackSize,
  };
}

export interface HardwareCreateProductInput {
  defaultCapabilityModelId: string;
  defaultHardwareProfileId: string;
  defaultProtocolProfileId: string;
  displayName: string;
  productId: string;
}

export interface HardwareUpdateProductInput {
  defaultCapabilityModelId?: string;
  defaultHardwareProfileId?: string;
  defaultProtocolProfileId?: string;
  displayName?: string;
  status?: string;
}

export interface HardwareCreateDeviceInput {
  chipFamily?: string;
  clientId?: string;
  deviceId: string;
  displayName: string;
  productId: string;
}

export interface HardwareUpdateDeviceInput {
  displayName?: string;
  status?: string;
}

export interface HardwareCreateCredentialInput {
  credentialType: AiotCredentialCreateRequest['credentialType'];
  expiresAt?: string;
}

/**
 * Thing-model input. `capabilities`/`settings` arrive from the JSON editor, so
 * they are validated structurally before they reach the typed request: every
 * capability must declare the two discriminators (`capabilityName`,
 * `capabilityKind`) and every setting must declare (`settingKey`,
 * `displayName`, `kind`). Entries that fail the guard are reported to the
 * operator instead of being silently dropped.
 */
export interface HardwareCapabilityModelInput {
  capabilityModelId?: string;
  capabilities?: readonly Record<string, unknown>[];
  displayName?: string;
  settings?: readonly Record<string, unknown>[];
  status?: string;
  version?: string;
}

export interface HardwareTwinUpdateInput {
  desired?: Record<string, unknown>;
  reported?: Record<string, unknown>;
}

export type HardwareCapabilityModelValidation =
  | { ok: true; capabilities: CapabilityDefinition[]; settings: AiotDeviceSettingDefinition[] }
  | { ok: false; field: 'capabilities' | 'settings' };

export interface HardwareBulkSettingsItemInput {
  deviceId: string;
  expectedRevision?: string;
  overrides: Record<string, unknown>;
}

export interface HardwareBulkApplyInput {
  allOrNothing?: boolean;
  items: HardwareBulkSettingsItemInput[];
}

export interface HardwareFirmwareRolloutInput {
  artifactId?: string;
  status?: string;
  targetPolicy?: unknown;
}

export interface HardwareService {
  applyDeviceSettingsBulk(input: HardwareBulkApplyInput): Promise<HardwareBulkResult>;
  cancelDeviceCommand(deviceId: string, commandId: string): Promise<void>;
  createCapabilityModel(input: HardwareCapabilityModelInput): Promise<void>;
  createDevice(input: HardwareCreateDeviceInput): Promise<void>;
  createDeviceCredential(
    deviceId: string,
    input: HardwareCreateCredentialInput,
  ): Promise<HardwareDeviceCredential | null>;
  createFirmwareArtifact(input: AiotFirmwareArtifactCreateRequest): Promise<void>;
  createFirmwareRollout(input: HardwareFirmwareRolloutInput): Promise<void>;
  createHardwareProfile(input: AiotHardwareProfileCreateRequest): Promise<void>;
  createProduct(input: HardwareCreateProductInput): Promise<void>;
  createProtocolProfile(input: AiotProtocolProfileCreateRequest): Promise<void>;
  deleteCapabilityModel(capabilityModelId: string): Promise<void>;
  deleteDevice(deviceId: string): Promise<void>;
  deleteFirmwareArtifact(artifactId: string): Promise<void>;
  deleteFirmwareRollout(rolloutId: string): Promise<void>;
  deleteHardwareProfile(hardwareProfileId: string): Promise<void>;
  deleteProduct(productId: string): Promise<void>;
  deleteProtocolProfile(protocolProfileId: string): Promise<void>;
  disconnectDeviceSession(deviceId: string, sessionId: string): Promise<void>;
  getDeviceSettings(deviceId: string): Promise<HardwareDeviceSettings>;
  getDeviceTwin(deviceId: string): Promise<HardwareDeviceTwin>;
  listCapabilities(deviceId: string): Promise<HardwarePage<Record<string, unknown>>>;
  listCapabilityModels(input?: HardwareListInput): Promise<HardwarePage<HardwareCapabilityModel>>;
  listDeviceCommands(deviceId: string, input?: HardwareListInput): Promise<HardwarePage<HardwareDeviceCommand>>;
  listDeviceCredentials(deviceId: string, input?: HardwareListInput): Promise<HardwarePage<HardwareDeviceCredential>>;
  listDevices(input?: HardwareListInput): Promise<HardwarePage<HardwareDevice>>;
  listDeviceSessions(deviceId: string, input?: HardwareListInput): Promise<HardwarePage<HardwareDeviceSession>>;
  listEvents(input?: HardwareListInput): Promise<HardwarePage<HardwareEvent>>;
  listFirmwareArtifacts(input?: HardwareListInput): Promise<HardwarePage<HardwareFirmwareArtifact>>;
  listFirmwareRollouts(input?: HardwareListInput): Promise<HardwarePage<HardwareFirmwareRollout>>;
  listHardwareProfiles(input?: HardwareListInput): Promise<HardwarePage<HardwareProfile>>;
  listProducts(input?: HardwareListInput): Promise<HardwarePage<HardwareProduct>>;
  listProtocolAdapters(input?: HardwareListInput): Promise<HardwarePage<HardwareProtocolAdapter>>;
  listProtocolProfiles(input?: HardwareListInput): Promise<HardwarePage<HardwareProtocolProfile>>;
  listSettingsHistory(
    deviceId: string,
    input?: HardwareListInput,
  ): Promise<HardwarePage<HardwareSettingsHistoryEntry>>;
  resetDeviceSettings(deviceId: string): Promise<void>;
  retrieveDevice(deviceId: string): Promise<HardwareDevice | null>;
  retrieveRuntimeCapacity(): Promise<HardwareRuntimeCapacity | null>;
  revokeDeviceCredential(deviceId: string, credentialId: string): Promise<void>;
  rollbackDeviceSettings(
    deviceId: string,
    input: { expectedRevision?: string; targetRevision: string },
  ): Promise<HardwareDeviceSettings>;
  saveDeviceSettings(
    deviceId: string,
    input: { expectedRevision: string; overrides: Record<string, unknown> },
  ): Promise<HardwareDeviceSettings>;
  updateCapabilityModel(capabilityModelId: string, input: HardwareCapabilityModelInput): Promise<void>;
  updateDevice(deviceId: string, input: HardwareUpdateDeviceInput): Promise<void>;
  updateDeviceTwin(deviceId: string, input: HardwareTwinUpdateInput): Promise<HardwareDeviceTwin>;
  updateFirmwareArtifact(artifactId: string, input: AiotFirmwareArtifactUpdateRequest): Promise<void>;
  updateFirmwareRollout(rolloutId: string, input: HardwareFirmwareRolloutInput): Promise<void>;
  updateHardwareProfile(hardwareProfileId: string, input: AiotHardwareProfileUpdateRequest): Promise<void>;
  updateProduct(productId: string, input: HardwareUpdateProductInput): Promise<void>;
  updateProtocolProfile(protocolProfileId: string, input: AiotProtocolProfileUpdateRequest): Promise<void>;
}

export interface CreateHardwareServiceOptions {
  /** Test seam: supply a client instead of the host-injected singleton. */
  backendClient?: SdkworkAiotBackendClient;
}

/**
 * Raised when operator JSON does not satisfy the thing-model contract. The
 * message carries the failing field name so the page can point at the editor
 * instead of showing a generic backend error.
 */
export type HardwareValidationField = 'artifactId' | 'capabilities' | 'settings' | 'targetPolicy';

export class HardwareValidationError extends Error {
  readonly field: HardwareValidationField;

  constructor(field: HardwareValidationField) {
    super(`Invalid ${field}`);
    this.name = 'HardwareValidationError';
    this.field = field;
  }
}

function readRequiredStrings(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return keys.every((key) => typeof value[key] === 'string' && (value[key] as string).length > 0);
}

function validateCapabilityModelInput(
  input: HardwareCapabilityModelInput,
): HardwareCapabilityModelValidation {
  const capabilities: CapabilityDefinition[] = [];
  for (const entry of input.capabilities ?? []) {
    if (!entry || typeof entry !== 'object' || !readRequiredStrings(entry, ['capabilityName', 'capabilityKind'])) {
      return { ok: false, field: 'capabilities' };
    }
    // The guard above enforces the two required discriminators; every remaining
    // member (commands, events, protocolMappings) is contract-defined free JSON
    // and must reach the backend verbatim instead of being re-shaped here.
    capabilities.push(entry as unknown as CapabilityDefinition);
  }
  const settings: AiotDeviceSettingDefinition[] = [];
  for (const entry of input.settings ?? []) {
    if (!entry || typeof entry !== 'object' || !readRequiredStrings(entry, ['settingKey', 'displayName', 'kind'])) {
      return { ok: false, field: 'settings' };
    }
    settings.push(entry as unknown as AiotDeviceSettingDefinition);
  }
  return { capabilities, ok: true, settings };
}

export function createHardwareService(options: CreateHardwareServiceOptions = {}): HardwareService {
  const resolveClient = (): SdkworkAiotBackendClient =>
    options.backendClient ?? aiotAdminBackendClient();

  return {
    async listProducts(input) {
      const response = await resolveClient().iot.products.list(pageInput(input));
      return mapPage(response, mapProduct);
    },

    async createProduct(input) {
      await resolveClient().iot.products.create({
        defaultCapabilityModelId: input.defaultCapabilityModelId,
        defaultHardwareProfileId: input.defaultHardwareProfileId,
        defaultProtocolProfileId: input.defaultProtocolProfileId,
        displayName: input.displayName,
        productId: input.productId,
      } satisfies AiotProductCreateRequest);
    },

    async updateProduct(productId, input) {
      await resolveClient().iot.products.update(productId, input satisfies AiotProductUpdateRequest);
    },

    async deleteProduct(productId) {
      await resolveClient().iot.products.delete(productId);
    },

    async listHardwareProfiles(input) {
      const response = await resolveClient().iot.hardwareProfiles.list(pageInput(input));
      return mapPage(response, mapHardwareProfile);
    },

    async createHardwareProfile(input) {
      await resolveClient().iot.hardwareProfiles.create(input satisfies AiotHardwareProfileCreateRequest);
    },

    async updateHardwareProfile(hardwareProfileId, input) {
      await resolveClient().iot.hardwareProfiles.update(
        hardwareProfileId,
        input satisfies AiotHardwareProfileUpdateRequest,
      );
    },

    async deleteHardwareProfile(hardwareProfileId) {
      await resolveClient().iot.hardwareProfiles.delete(hardwareProfileId);
    },

    async listProtocolProfiles(input) {
      const response = await resolveClient().iot.protocolProfiles.list(pageInput(input));
      return mapPage(response, mapProtocolProfile);
    },

    async createProtocolProfile(input) {
      await resolveClient().iot.protocolProfiles.create(input satisfies AiotProtocolProfileCreateRequest);
    },

    async updateProtocolProfile(protocolProfileId, input) {
      await resolveClient().iot.protocolProfiles.update(
        protocolProfileId,
        input satisfies AiotProtocolProfileUpdateRequest,
      );
    },

    async deleteProtocolProfile(protocolProfileId) {
      await resolveClient().iot.protocolProfiles.delete(protocolProfileId);
    },

    async listCapabilityModels(input) {
      const response = await resolveClient().iot.capabilityModels.list(pageInput(input));
      return mapPage(response, mapCapabilityModel);
    },

    async createCapabilityModel(input) {
      const validated = validateCapabilityModelInput(input);
      if (!validated.ok) {
        throw new HardwareValidationError(validated.field);
      }
      await resolveClient().iot.capabilityModels.create({
        capabilityModelId: input.capabilityModelId ?? '',
        displayName: input.displayName ?? '',
        version: input.version ?? '',
        capabilities: validated.capabilities,
        settings: validated.settings,
      } satisfies AiotCapabilityModelCreateRequest);
    },

    async updateCapabilityModel(capabilityModelId, input) {
      const validated = validateCapabilityModelInput(input);
      if (!validated.ok) {
        throw new HardwareValidationError(validated.field);
      }
      await resolveClient().iot.capabilityModels.update(capabilityModelId, {
        ...(input.displayName === undefined ? {} : { displayName: input.displayName }),
        ...(input.version === undefined ? {} : { version: input.version }),
        ...(input.status === undefined ? {} : { status: input.status }),
        capabilities: validated.capabilities,
        settings: validated.settings,
      } satisfies AiotCapabilityModelUpdateRequest);
    },

    async deleteCapabilityModel(capabilityModelId) {
      await resolveClient().iot.capabilityModels.delete(capabilityModelId);
    },

    async listDevices(input) {
      const response = await resolveClient().iot.devices.list(pageInput(input));
      return mapPage(response, mapDevice);
    },

    async retrieveDevice(deviceId) {
      const response = await resolveClient().iot.devices.retrieve(deviceId);
      return mapDevice(response);
    },

    async createDevice(input) {
      await resolveClient().iot.devices.create(
        {
          deviceId: input.deviceId,
          displayName: input.displayName,
          productId: input.productId,
          ...(input.clientId ? { clientId: input.clientId } : {}),
          ...(input.chipFamily ? { chipFamily: input.chipFamily } : {}),
        } satisfies AiotDeviceCreateRequest,
        createIdempotencyParams('iot-device-create'),
      );
    },

    async updateDevice(deviceId, input) {
      await resolveClient().iot.devices.update(
        deviceId,
        input satisfies AiotDeviceUpdateRequest,
        createIdempotencyParams('iot-device-update'),
      );
    },

    async deleteDevice(deviceId) {
      await resolveClient().iot.devices.delete(deviceId);
    },

    async listDeviceCredentials(deviceId, input) {
      const response = await resolveClient().iot.devices.credentials.list(deviceId, pageInput(input));
      return mapPage(response, mapDeviceCredential);
    },

    async createDeviceCredential(deviceId, input) {
      const response = await resolveClient().iot.devices.credentials.create(
        deviceId,
        {
          credentialType: input.credentialType,
          ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
        },
        createIdempotencyParams('iot-credential-create'),
      );
      return mapDeviceCredential(response);
    },

    async revokeDeviceCredential(deviceId, credentialId) {
      await resolveClient().iot.devices.credentials.delete(deviceId, credentialId);
    },

    async listDeviceSessions(deviceId, input) {
      const response = await resolveClient().iot.devices.sessions.list(deviceId, pageInput(input));
      return mapPage(response, mapDeviceSession);
    },

    async disconnectDeviceSession(deviceId, sessionId) {
      await resolveClient().iot.devices.sessions.delete(deviceId, sessionId);
    },

    async listCapabilities(deviceId) {
      const response = await resolveClient().iot.devices.capabilities.list(deviceId, pageInput(undefined, 50));
      return mapPage(response, (entry) => {
        const record = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
        return Object.keys(record).length > 0 ? record : null;
      });
    },

    async listDeviceCommands(deviceId, input) {
      const response = await resolveClient().iot.devices.commands.list(deviceId, pageInput(input));
      return mapPage(response, mapDeviceCommand);
    },

    async cancelDeviceCommand(deviceId, commandId) {
      await resolveClient().iot.devices.commands.cancel(deviceId, commandId);
    },

    async getDeviceTwin(deviceId) {
      const response = await resolveClient().iot.devices.twin.retrieve(deviceId);
      return mapDeviceTwin(response);
    },

    async updateDeviceTwin(deviceId, input) {
      const body = {
        ...(input.desired === undefined ? {} : { desired: toJsonSettingMap(input.desired) }),
        ...(input.reported === undefined ? {} : { reported: toJsonSettingMap(input.reported) }),
      };
      const response = await resolveClient().iot.devices.twin.update(deviceId, body);
      return mapDeviceTwin(response);
    },

    async getDeviceSettings(deviceId) {
      const response = await resolveClient().iot.devices.settings.retrieve(deviceId);
      return mapDeviceSettings(response, deviceId);
    },

    async saveDeviceSettings(deviceId, input) {
      const response = await resolveClient().iot.devices.settings.update(deviceId, {
        expectedRevision: input.expectedRevision,
        overrides: toJsonSettingMap(input.overrides),
      });
      return mapDeviceSettings(response, deviceId);
    },

    async resetDeviceSettings(deviceId) {
      await resolveClient().iot.devices.settings.delete(deviceId);
    },

    async listSettingsHistory(deviceId, input) {
      const response = await resolveClient().iot.devices.settings.history.list(
        deviceId,
        pageInput(input, HARDWARE_SETTINGS_HISTORY_PAGE_SIZE),
      );
      return mapPage(response, mapSettingsHistoryEntry);
    },

    async rollbackDeviceSettings(deviceId, input) {
      const response = await resolveClient().iot.devices.settings.rollback(deviceId, {
        targetRevision: input.targetRevision,
        ...(input.expectedRevision === undefined ? {} : { expectedRevision: input.expectedRevision }),
      });
      return mapDeviceSettings(response, deviceId);
    },

    async applyDeviceSettingsBulk(input) {
      const body: AiotDeviceSettingsBulkUpdateRequest = {
        allOrNothing: input.allOrNothing ?? false,
        items: input.items.map((item) => ({
          deviceId: item.deviceId,
          overrides: toJsonSettingMap(item.overrides),
          ...(item.expectedRevision === undefined ? {} : { expectedRevision: item.expectedRevision }),
        })),
      };
      const response = await resolveClient().iot.deviceSettings.bulkUpdate(body);
      return mapBulkResult(response);
    },

    async listFirmwareArtifacts(input) {
      const response = await resolveClient().iot.firmwareArtifacts.list(pageInput(input));
      return mapPage(response, mapFirmwareArtifact);
    },

    async createFirmwareArtifact(input) {
      await resolveClient().iot.firmwareArtifacts.create(
        input satisfies AiotFirmwareArtifactCreateRequest,
        createIdempotencyParams('iot-firmware-artifact-create'),
      );
    },

    async updateFirmwareArtifact(artifactId, input) {
      await resolveClient().iot.firmwareArtifacts.update(
        artifactId,
        input satisfies AiotFirmwareArtifactUpdateRequest,
      );
    },

    async deleteFirmwareArtifact(artifactId) {
      await resolveClient().iot.firmwareArtifacts.delete(artifactId);
    },

    async listFirmwareRollouts(input) {
      const response = await resolveClient().iot.firmwareRollouts.list(pageInput(input));
      return mapPage(response, mapFirmwareRollout);
    },

    async createFirmwareRollout(input) {
      if (!input.artifactId) {
        throw new HardwareValidationError('artifactId');
      }
      const targetPolicy = input.targetPolicy === undefined ? undefined : toJsonValue(input.targetPolicy);
      if (targetPolicy === undefined) {
        throw new HardwareValidationError('targetPolicy');
      }
      await resolveClient().iot.firmwareRollouts.create(
        {
          artifactId: input.artifactId,
          targetPolicy,
        } satisfies AiotFirmwareRolloutCreateRequest,
        createIdempotencyParams('iot-firmware-rollout-create'),
      );
    },

    async updateFirmwareRollout(rolloutId, input) {
      const targetPolicy = input.targetPolicy === undefined ? undefined : toJsonValue(input.targetPolicy);
      await resolveClient().iot.firmwareRollouts.update(rolloutId, {
        ...(targetPolicy === undefined ? {} : { targetPolicy }),
        ...(input.status === undefined ? {} : { status: input.status }),
      } satisfies AiotFirmwareRolloutUpdateRequest);
    },

    async deleteFirmwareRollout(rolloutId) {
      await resolveClient().iot.firmwareRollouts.delete(rolloutId);
    },

    async listEvents(input) {
      const response = await resolveClient().iot.events.list(pageInput(input));
      return mapPage(response, mapEvent);
    },

    async listProtocolAdapters(input) {
      const response = await resolveClient().iot.protocolAdapters.list(pageInput(input));
      return mapPage(response, mapProtocolAdapter);
    },

    async retrieveRuntimeCapacity() {
      const response = await resolveClient().iot.runtime.capacity.retrieve();
      return mapRuntimeCapacity(response);
    },
  };
}

let defaultHardwareService: HardwareService | undefined;

/** Lazily binds the host-injected client on first use. */
export function getHardwareService(): HardwareService {
  if (!defaultHardwareService) {
    defaultHardwareService = createHardwareService();
  }
  return defaultHardwareService;
}

export function resetHardwareServiceForTests(): void {
  defaultHardwareService = undefined;
}




