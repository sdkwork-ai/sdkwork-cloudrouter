/**
 * Smart Hardware Center domain model.
 *
 * Every value here is the *rendered* shape the operator screens consume. The
 * AIoT backend answers several admin collections as open JSON
 * (`AiotProductResponse` and friends are `Record<string, unknown>`), so each
 * wire payload has to pass through one of the `map*` functions below before a
 * component is allowed to read it. Keeping the mapping in one module means:
 *
 * - an unknown or hostile payload degrades to an empty record instead of
 *   throwing inside render;
 * - int64 identifiers stay `string` (API_SPEC §13.6) and are never converted to
 *   `number`;
 * - the pages never depend on generated transport types, so a contract
 *   regeneration cannot silently change a screen.
 */

export type HardwareHealth = 'critical' | 'healthy' | 'offline' | 'warning';

export interface HardwareProduct {
  capabilityModelId: string;
  displayName: string;
  hardwareProfileId: string;
  productId: string;
  protocolProfileId: string;
  status: string;
}

export interface HardwareProfile {
  chipFamily: string;
  connectivityProfiles: string[];
  hardwareClasses: string[];
  hardwareProfileId: string;
  otaProfiles: string[];
  runtimeProfiles: string[];
  securityProfiles: string[];
  status: string;
}

export interface HardwareProtocolProfile {
  allowedMessageClasses: string[];
  allowedTransports: string[];
  capabilityBridges: string[];
  defaultProtocolId: string;
  protocolProfileId: string;
  scope: string;
  status: string;
}

export interface HardwareCapabilityDefinition {
  capabilityKind: string;
  capabilityName: string;
  commandCount: number;
  eventCount: number;
  protocolMappingCount: number;
}

export interface HardwareCapabilityModel {
  capabilityModelId: string;
  capabilities: HardwareCapabilityDefinition[];
  displayName: string;
  settingCount: number;
  status: string;
  version: string;
}

export interface HardwareDevice {
  chipFamily: string;
  clientId: string;
  deviceId: string;
  displayName: string;
  health: HardwareHealth;
  lastSeenAt: string;
  productId: string;
  status: string;
}

export interface HardwareDeviceSession {
  connectedAt: string;
  deviceId: string;
  lastSeenAt: string;
  sessionId: string;
  status: string;
  transport: string;
}

export interface HardwareDeviceCredential {
  createdAt: string;
  credentialId: string;
  credentialType: string;
  deviceId: string;
  expiresAt: string;
  revokedAt: string;
  status: string;
}

export interface HardwareDeviceCommand {
  commandId: string;
  deviceId: string;
  issuedAt: string;
  status: string;
  updatedAt: string;
}

export interface HardwareDeviceTwin {
  desired: Record<string, unknown>;
  reported: Record<string, unknown>;
}

export interface HardwareFirmwareArtifact {
  artifactId: string;
  artifactKey: string;
  mediaResourceId: string;
  sha256: string;
  signature: string;
  status: string;
  targetChipFamily: string;
  targetRuntimeProfile: string;
  version: string;
}

export interface HardwareFirmwareRollout {
  artifactId: string;
  rolloutId: string;
  status: string;
  targetCount: number;
  targetSummary: string;
  updatedAt: string;
}

export interface HardwareEvent {
  adapterId: string;
  deviceId: string;
  direction: string;
  eventId: string;
  eventType: string;
  messageClass: string;
  occurredAt: string;
  protocolId: string;
  semanticType: string;
  transport: string;
}

export interface HardwareProtocolAdapter {
  codecs: string[];
  hardwareFamilies: string[];
  kind: string;
  path: string;
  pluginId: string;
  protocolId: string;
  runtimeProfiles: string[];
  scope: string;
  transportSummary: string;
}

export interface HardwareRuntimeCapacity {
  backpressureSummary: string;
  deadLetterAfterAttempts: number;
  idempotentIngest: boolean;
  maxConnectionsPerNode: string;
  maxInflightPerDevice: number;
  maxSessionsPerTenant: string;
  nodeId: string;
  orderedDeviceCommands: boolean;
  outboxMaxAttempts: number;
  sessionLeaseRenewSeconds: number;
  sessionLeaseTtlSeconds: number;
}

export type HardwareSettingKind = 'boolean' | 'enum' | 'integer' | 'json' | 'number' | 'string';

export interface HardwareSettingOption {
  label: string;
  value: string;
}

export interface HardwareSettingDefinition {
  defaultValue?: unknown;
  description?: string;
  displayName: string;
  group: string;
  kind: HardwareSettingKind;
  maxLength?: number;
  maximum?: number;
  minimum?: number;
  options: HardwareSettingOption[];
  required: boolean;
  sensitive: boolean;
  settingKey: string;
  unit?: string;
  writable: boolean;
}

export interface HardwareDeviceSettings {
  capabilityModelId: string;
  defaults: Record<string, unknown>;
  definitions: HardwareSettingDefinition[];
  deviceId: string;
  effective: Record<string, unknown>;
  overrides: Record<string, unknown>;
  productId: string;
  revision: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface HardwareSettingGroup {
  definitions: HardwareSettingDefinition[];
  group: string;
}

export type HardwareSettingsChangeAction = 'reset' | 'rollback' | 'update';

export interface HardwareSettingsHistoryEntry {
  action: HardwareSettingsChangeAction;
  changedKeys: string[];
  overrides: Record<string, unknown>;
  revision: string;
  updatedAt: string;
  updatedBy?: string;
}

export type HardwareBulkItemStatus =
  | 'conflict'
  | 'failed'
  | 'invalid'
  | 'not_found'
  | 'skipped'
  | 'updated';

export interface HardwareBulkItemError {
  code?: number;
  field?: string;
  message: string;
}

export interface HardwareBulkItemResult {
  deviceId: string;
  errors: HardwareBulkItemError[];
  revision?: string;
  status: HardwareBulkItemStatus;
}

export interface HardwareBulkResult {
  allOrNothing: boolean;
  items: HardwareBulkItemResult[];
}

export interface HardwarePage<T> {
  hasMore: boolean;
  items: T[];
  page: number;
  pageSize: number;
  total?: number;
}

export const HARDWARE_SETTINGS_UNGROUPED = 'general';

export const HARDWARE_SETTING_KINDS: readonly HardwareSettingKind[] = [
  'boolean',
  'integer',
  'number',
  'string',
  'enum',
  'json',
];

const CLEARED_SETTING = Symbol('cleared');

export function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

export function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry): string[] => {
    if (typeof entry === 'string') {
      return entry.trim() ? [entry.trim()] : [];
    }
    if (typeof entry === 'number' || typeof entry === 'boolean') {
      return [String(entry)];
    }
    const record = readRecord(entry);
    const identifier = readText(record.id) || readText(record.key) || readText(record.name);
    return identifier ? [identifier] : [];
  });
}

export function readJsonValue(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }
  try {
    const encoded = JSON.stringify(value);
    return encoded === undefined ? undefined : (JSON.parse(encoded) as unknown);
  } catch {
    return undefined;
  }
}

export function normalizeHealth(status: string): HardwareHealth {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'online' || normalized === 'healthy' || normalized === 'active') {
    return 'healthy';
  }
  if (normalized === 'warning' || normalized === 'degraded' || normalized === 'pending') {
    return 'warning';
  }
  if (normalized === 'offline' || normalized === 'inactive' || normalized === 'disabled') {
    return 'offline';
  }
  return normalized ? 'critical' : 'offline';
}

export function mapProduct(value: unknown): HardwareProduct | null {
  const record = readRecord(value);
  const productId = readText(record.productId);
  if (!productId) {
    return null;
  }
  return {
    capabilityModelId: readText(record.defaultCapabilityModelId),
    displayName: readText(record.displayName) || productId,
    hardwareProfileId: readText(record.defaultHardwareProfileId),
    productId,
    protocolProfileId: readText(record.defaultProtocolProfileId),
    status: readText(record.status, 'active'),
  };
}

export function mapHardwareProfile(value: unknown): HardwareProfile | null {
  const record = readRecord(value);
  const hardwareProfileId = readText(record.hardwareProfileId);
  if (!hardwareProfileId) {
    return null;
  }
  return {
    chipFamily: readText(record.chipFamily),
    connectivityProfiles: readStringArray(record.connectivityProfiles),
    hardwareClasses: readStringArray(record.hardwareClasses),
    hardwareProfileId,
    otaProfiles: readStringArray(record.otaProfiles),
    runtimeProfiles: readStringArray(record.runtimeProfiles),
    securityProfiles: readStringArray(record.securityProfiles),
    status: readText(record.status, 'active'),
  };
}

export function mapProtocolProfile(value: unknown): HardwareProtocolProfile | null {
  const record = readRecord(value);
  const protocolProfileId = readText(record.protocolProfileId);
  if (!protocolProfileId) {
    return null;
  }
  return {
    allowedMessageClasses: readStringArray(record.allowedMessageClasses),
    allowedTransports: readStringArray(record.allowedTransports),
    capabilityBridges: readStringArray(record.capabilityBridges),
    defaultProtocolId: readText(record.defaultProtocolId),
    protocolProfileId,
    scope: readText(record.scope, 'product'),
    status: readText(record.status, 'active'),
  };
}

export function mapCapabilityDefinition(value: unknown): HardwareCapabilityDefinition | null {
  const record = readRecord(value);
  const capabilityName = readText(record.capabilityName);
  if (!capabilityName) {
    return null;
  }
  return {
    capabilityKind: readText(record.capabilityKind, 'property'),
    capabilityName,
    commandCount: Array.isArray(record.commands) ? record.commands.length : 0,
    eventCount: Array.isArray(record.events) ? record.events.length : 0,
    protocolMappingCount: Array.isArray(record.protocolMappings) ? record.protocolMappings.length : 0,
  };
}

export function mapCapabilityModel(value: unknown): HardwareCapabilityModel | null {
  const record = readRecord(value);
  const capabilityModelId = readText(record.capabilityModelId);
  if (!capabilityModelId) {
    return null;
  }
  const capabilities = Array.isArray(record.capabilities)
    ? record.capabilities.flatMap((entry): HardwareCapabilityDefinition[] => {
        const mapped = mapCapabilityDefinition(entry);
        return mapped ? [mapped] : [];
      })
    : [];
  return {
    capabilityModelId,
    capabilities,
    displayName: readText(record.displayName) || capabilityModelId,
    settingCount: Array.isArray(record.settings) ? record.settings.length : 0,
    status: readText(record.status, 'active'),
    version: readText(record.version),
  };
}

export function mapDevice(value: unknown): HardwareDevice | null {
  const record = readRecord(value);
  const deviceId = readText(record.deviceId) || readText(record.id);
  if (!deviceId) {
    return null;
  }
  const status = readText(record.status, 'unknown');
  return {
    chipFamily: readText(record.chipFamily),
    clientId: readText(record.clientId),
    deviceId,
    displayName: readText(record.displayName) || deviceId,
    health: normalizeHealth(status),
    lastSeenAt: readText(record.lastSeenAt),
    productId: readText(record.productId),
    status,
  };
}

export function mapDeviceSession(value: unknown): HardwareDeviceSession | null {
  const record = readRecord(value);
  const sessionId = readText(record.sessionId) || readText(record.id);
  if (!sessionId) {
    return null;
  }
  return {
    connectedAt: readText(record.connectedAt) || readText(record.createdAt),
    deviceId: readText(record.deviceId),
    lastSeenAt: readText(record.lastSeenAt),
    sessionId,
    status: readText(record.status, 'connected'),
    transport: readText(record.transport) || readText(record.transportId),
  };
}

export function mapDeviceCredential(value: unknown): HardwareDeviceCredential | null {
  const record = readRecord(value);
  const credentialId = readText(record.credentialId);
  if (!credentialId) {
    return null;
  }
  return {
    createdAt: readText(record.createdAt),
    credentialId,
    credentialType: readText(record.credentialType, 'bearer_token'),
    deviceId: readText(record.deviceId),
    expiresAt: readText(record.expiresAt),
    revokedAt: readText(record.revokedAt),
    status: readText(record.status, 'active'),
  };
}

export function mapDeviceCommand(value: unknown): HardwareDeviceCommand | null {
  const record = readRecord(value);
  const commandId = readText(record.commandId) || readText(record.id);
  if (!commandId) {
    return null;
  }
  return {
    commandId,
    deviceId: readText(record.deviceId),
    issuedAt: readText(record.issuedAt) || readText(record.createdAt),
    status: readText(record.status, 'queued'),
    updatedAt: readText(record.updatedAt),
  };
}

export function mapDeviceTwin(value: unknown): HardwareDeviceTwin {
  const record = readRecord(value);
  const nested = readRecord(record.twin);
  const source = Object.keys(nested).length > 0 ? nested : record;
  return {
    desired: readRecord(source.desired),
    reported: readRecord(source.reported),
  };
}

export function mapFirmwareArtifact(value: unknown): HardwareFirmwareArtifact | null {
  const record = readRecord(value);
  const artifactId = readText(record.artifactId);
  if (!artifactId) {
    return null;
  }
  const resource = readRecord(record.resource);
  return {
    artifactId,
    artifactKey: readText(record.artifactKey),
    mediaResourceId: readText(record.mediaResourceId) || readText(resource.id),
    sha256: readText(record.sha256),
    signature: readText(record.signature),
    status: readText(record.status, 'draft'),
    targetChipFamily: readText(record.targetChipFamily),
    targetRuntimeProfile: readText(record.targetRuntimeProfile),
    version: readText(record.version),
  };
}

export function mapFirmwareRollout(value: unknown): HardwareFirmwareRollout | null {
  const record = readRecord(value);
  const rolloutId = readText(record.rolloutId);
  if (!rolloutId) {
    return null;
  }
  const targetPolicy = record.targetPolicy;
  const target = readRecord(targetPolicy);
  const explicitCount = readNumber(target.deviceCount) ?? readNumber(target.count);
  const deviceIds = Array.isArray(target.deviceIds) ? target.deviceIds.length : 0;
  return {
    artifactId: readText(record.artifactId),
    rolloutId,
    status: readText(record.status, 'draft'),
    targetCount: explicitCount ?? deviceIds,
    targetSummary: summarizeTargetPolicy(targetPolicy),
    updatedAt: readText(record.updatedAt) || readText(record.createdAt),
  };
}

export function summarizeTargetPolicy(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  const record = readRecord(value);
  const parts: string[] = [];
  const productId = readText(record.productId);
  if (productId) {
    parts.push(productId);
  }
  const chipFamily = readText(record.chipFamily);
  if (chipFamily) {
    parts.push(chipFamily);
  }
  const deviceIds = Array.isArray(record.deviceIds) ? record.deviceIds.length : 0;
  if (deviceIds > 0) {
    parts.push(`${deviceIds}`);
  }
  if (parts.length > 0) {
    return parts.join(' / ');
  }
  try {
    return JSON.stringify(value).slice(0, 120);
  } catch {
    return '';
  }
}

export function mapEvent(value: unknown): HardwareEvent | null {
  const record = readRecord(value);
  const eventId = readText(record.eventId) || readText(record.id);
  if (!eventId) {
    return null;
  }
  return {
    adapterId: readText(record.adapterId),
    deviceId: readText(record.deviceId),
    direction: readText(record.direction),
    eventId,
    eventType: readText(record.eventType),
    messageClass: readText(record.messageClass),
    occurredAt: readText(record.occurredAt) || readText(record.createdAt),
    protocolId: readText(record.protocolId),
    semanticType: readText(record.semanticType),
    transport: readText(record.transport),
  };
}

export function mapProtocolAdapter(value: unknown): HardwareProtocolAdapter | null {
  const record = readRecord(value);
  const protocolId = readText(record.protocolId);
  if (!protocolId) {
    return null;
  }
  const transport = readRecord(record.transport);
  return {
    codecs: readStringArray(record.codecs),
    hardwareFamilies: readStringArray(record.hardwareFamilies),
    kind: readText(record.kind, 'deviceSession'),
    path: readText(record.path),
    pluginId: readText(record.pluginId),
    protocolId,
    runtimeProfiles: readStringArray(record.runtimeProfiles),
    scope: readText(record.scope, 'StandardAdapter'),
    transportSummary:
      readText(transport.kind) || readText(transport.name) || readStringArray(record.transports).join(' / '),
  };
}

export function mapRuntimeCapacity(value: unknown): HardwareRuntimeCapacity | null {
  const record = readRecord(value);
  const nodeId = readText(record.nodeId);
  if (!nodeId) {
    return null;
  }
  const backpressure = readRecord(record.backpressure);
  const backpressureSummary = Object.entries(backpressure)
    .flatMap(([key, entry]) => {
      if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
        return [`${key}=${String(entry)}`];
      }
      return [];
    })
    .join(', ');
  return {
    backpressureSummary,
    deadLetterAfterAttempts: readNumber(record.deadLetterAfterAttempts) ?? 0,
    idempotentIngest: readBoolean(record.idempotentIngest),
    maxConnectionsPerNode: readText(record.maxConnectionsPerNode, '0'),
    maxInflightPerDevice: readNumber(record.maxInflightPerDevice) ?? 0,
    maxSessionsPerTenant: readText(record.maxSessionsPerTenant, '0'),
    nodeId,
    orderedDeviceCommands: readBoolean(record.orderedDeviceCommands),
    outboxMaxAttempts: readNumber(record.outboxMaxAttempts) ?? 0,
    sessionLeaseRenewSeconds: readNumber(record.sessionLeaseRenewSeconds) ?? 0,
    sessionLeaseTtlSeconds: readNumber(record.sessionLeaseTtlSeconds) ?? 0,
  };
}

export function normalizeSettingKind(value: unknown): HardwareSettingKind {
  return typeof value === 'string' && (HARDWARE_SETTING_KINDS as readonly string[]).includes(value)
    ? (value as HardwareSettingKind)
    : 'json';
}

export function mapSettingDefinition(value: unknown): HardwareSettingDefinition | null {
  const record = readRecord(value);
  const settingKey = readText(record.settingKey);
  if (!settingKey) {
    return null;
  }
  const options = Array.isArray(record.options)
    ? record.options.flatMap((option): HardwareSettingOption[] => {
        const optionRecord = readRecord(option);
        const optionValue = readText(optionRecord.value);
        if (!optionValue) {
          return [];
        }
        return [{ label: readText(optionRecord.label, optionValue), value: optionValue }];
      })
    : [];
  const minimum = readNumber(record.minimum);
  const maximum = readNumber(record.maximum);
  const maxLength = readNumber(record.maxLength);
  return {
    ...(record.defaultValue === undefined ? {} : { defaultValue: record.defaultValue }),
    ...(typeof record.description === 'string' ? { description: record.description } : {}),
    displayName: readText(record.displayName, settingKey),
    group: readText(record.group) || HARDWARE_SETTINGS_UNGROUPED,
    kind: normalizeSettingKind(record.kind),
    ...(maxLength === undefined ? {} : { maxLength }),
    ...(maximum === undefined ? {} : { maximum }),
    ...(minimum === undefined ? {} : { minimum }),
    options,
    required: record.required === true,
    sensitive: record.sensitive === true,
    settingKey,
    ...(typeof record.unit === 'string' ? { unit: record.unit } : {}),
    writable: record.writable !== false,
  };
}

export function mapDeviceSettings(value: unknown, fallbackDeviceId = ''): HardwareDeviceSettings {
  const record = readRecord(value);
  const definitions = Array.isArray(record.definitions)
    ? record.definitions.flatMap((definition): HardwareSettingDefinition[] => {
        const mapped = mapSettingDefinition(definition);
        return mapped ? [mapped] : [];
      })
    : [];
  return {
    capabilityModelId: readText(record.capabilityModelId),
    defaults: readRecord(record.defaults),
    definitions,
    deviceId: readText(record.deviceId) || fallbackDeviceId,
    effective: readRecord(record.effective),
    overrides: readRecord(record.overrides),
    productId: readText(record.productId),
    revision: readText(record.revision, '0'),
    ...(typeof record.updatedAt === 'string' ? { updatedAt: record.updatedAt } : {}),
    ...(typeof record.updatedBy === 'string' ? { updatedBy: record.updatedBy } : {}),
  };
}

/** Groups definitions by their declared group, preserving first-seen order. */
export function groupSettingDefinitions(
  definitions: readonly HardwareSettingDefinition[],
): HardwareSettingGroup[] {
  const groups = new Map<string, HardwareSettingDefinition[]>();
  for (const definition of definitions) {
    const group = definition.group || HARDWARE_SETTINGS_UNGROUPED;
    const current = groups.get(group);
    if (current) {
      current.push(definition);
    } else {
      groups.set(group, [definition]);
    }
  }
  return Array.from(groups, ([group, groupDefinitions]) => ({ definitions: groupDefinitions, group }));
}

export function isSettingOverridden(
  settings: Pick<HardwareDeviceSettings, 'overrides'>,
  settingKey: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(settings.overrides, settingKey);
}

export function effectiveSettingValue(
  settings: Pick<HardwareDeviceSettings, 'effective' | 'overrides'>,
  settingKey: string,
): unknown {
  return Object.prototype.hasOwnProperty.call(settings.overrides, settingKey)
    ? settings.overrides[settingKey]
    : settings.effective[settingKey];
}

export function countOverrides(overrides: Readonly<Record<string, unknown>>): number {
  return Object.keys(overrides).length;
}

function formatScalar(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return '';
  }
}

/** Renders a setting value for a read-only cell; never returns localized copy. */
export function formatSettingValue(definition: HardwareSettingDefinition, value: unknown): string {
  if (value === undefined) {
    return '';
  }
  if (definition.kind === 'enum') {
    const option = definition.options.find((candidate) => candidate.value === value);
    return option?.label ?? formatScalar(value);
  }
  if (definition.kind === 'json') {
    try {
      return JSON.stringify(value ?? null, null, 2);
    } catch {
      return '';
    }
  }
  return formatScalar(value);
}

export interface HardwareSettingParseResult {
  message?: string;
  ok: boolean;
  value?: unknown;
  /** Parsed identifier of the failure reason, resolved to copy by the caller. */
  reason?: 'notWritable' | 'invalidBoolean' | 'invalidInteger' | 'invalidNumber' | 'tooLong' | 'invalidEnum' | 'invalidJson' | 'belowMinimum' | 'aboveMaximum';
  limit?: number;
}

function validateNumericRange(
  definition: HardwareSettingDefinition,
  value: number,
): HardwareSettingParseResult {
  if (definition.minimum !== undefined && value < definition.minimum) {
    return { ok: false, reason: 'belowMinimum', limit: definition.minimum };
  }
  if (definition.maximum !== undefined && value > definition.maximum) {
    return { ok: false, reason: 'aboveMaximum', limit: definition.maximum };
  }
  return { ok: true, value };
}

/**
 * Parses an operator input string into the JSON value the AIoT admin API expects
 * for the declared setting kind. Failures carry a `reason` identifier instead of
 * a sentence so the caller can resolve copy through i18n.
 */
export function parseSettingInput(
  definition: HardwareSettingDefinition,
  raw: string | boolean,
): HardwareSettingParseResult {
  if (!definition.writable) {
    return { ok: false, reason: 'notWritable' };
  }

  switch (definition.kind) {
    case 'boolean': {
      if (typeof raw === 'boolean') {
        return { ok: true, value: raw };
      }
      const normalized = raw.trim().toLowerCase();
      if (['true', '1', 'on', 'yes'].includes(normalized)) {
        return { ok: true, value: true };
      }
      if (['false', '0', 'off', 'no'].includes(normalized)) {
        return { ok: true, value: false };
      }
      return { ok: false, reason: 'invalidBoolean' };
    }
    case 'integer': {
      if (typeof raw === 'boolean' || raw.trim().length === 0) {
        return { ok: false, reason: 'invalidInteger' };
      }
      const parsed = Number(raw);
      if (!Number.isInteger(parsed)) {
        return { ok: false, reason: 'invalidInteger' };
      }
      return validateNumericRange(definition, parsed);
    }
    case 'number': {
      if (typeof raw === 'boolean' || raw.trim().length === 0) {
        return { ok: false, reason: 'invalidNumber' };
      }
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        return { ok: false, reason: 'invalidNumber' };
      }
      return validateNumericRange(definition, parsed);
    }
    case 'string': {
      const text = typeof raw === 'boolean' ? String(raw) : raw;
      if (definition.maxLength !== undefined && text.length > definition.maxLength) {
        return { ok: false, reason: 'tooLong', limit: definition.maxLength };
      }
      return { ok: true, value: text };
    }
    case 'enum': {
      const text = typeof raw === 'boolean' ? String(raw) : raw;
      if (!definition.options.some((option) => option.value === text)) {
        return { ok: false, reason: 'invalidEnum' };
      }
      return { ok: true, value: text };
    }
    case 'json': {
      if (typeof raw === 'boolean') {
        return { ok: true, value: raw };
      }
      const trimmed = raw.trim();
      if (trimmed.length === 0) {
        return { ok: false, reason: 'invalidJson' };
      }
      try {
        return { ok: true, value: JSON.parse(trimmed) as unknown };
      } catch {
        return { ok: false, reason: 'invalidJson' };
      }
    }
    default:
      return { ok: false, reason: 'invalidJson' };
  }
}

/**
 * Validates a whole draft. Required settings are satisfied by the inherited
 * default, so only keys with an explicit draft value are type-checked here.
 * Returns `{ settingKey: reason }` so the caller localizes each message.
 */
export function validateSettingsDraft(
  definitions: readonly HardwareSettingDefinition[],
  overrides: Readonly<Record<string, unknown>>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const definitionsByKey = new Map(definitions.map((definition) => [definition.settingKey, definition]));
  for (const [settingKey, value] of Object.entries(overrides)) {
    const definition = definitionsByKey.get(settingKey);
    if (!definition) {
      errors[settingKey] = 'undefinedSetting';
      continue;
    }
    if (!definition.writable) {
      errors[settingKey] = 'notWritable';
      continue;
    }
    const reason = validateValueAgainstDefinition(definition, value);
    if (reason) {
      errors[settingKey] = reason;
    }
  }
  for (const definition of definitions) {
    if (
      definition.required
      && definition.defaultValue === undefined
      && !Object.prototype.hasOwnProperty.call(overrides, definition.settingKey)
    ) {
      errors[definition.settingKey] = 'required';
    }
  }
  return errors;
}

function validateValueAgainstDefinition(
  definition: HardwareSettingDefinition,
  value: unknown,
): string | undefined {
  const numericResult = (candidate: number) => {
    if (definition.minimum !== undefined && candidate < definition.minimum) {
      return 'belowMinimum';
    }
    if (definition.maximum !== undefined && candidate > definition.maximum) {
      return 'aboveMaximum';
    }
    return undefined;
  };
  switch (definition.kind) {
    case 'boolean':
      return typeof value === 'boolean' ? undefined : 'invalidBoolean';
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value)
        ? numericResult(value)
        : 'invalidInteger';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        ? numericResult(value)
        : 'invalidNumber';
    case 'string':
      return typeof value === 'string'
        && (definition.maxLength === undefined || value.length <= definition.maxLength)
        ? undefined
        : 'tooLong';
    case 'enum':
      return typeof value === 'string'
        && definition.options.some((option) => option.value === value)
        ? undefined
        : 'invalidEnum';
    case 'json':
      return undefined;
    default:
      return 'invalidJson';
  }
}

export function normalizeSettingsChangeAction(value: unknown): HardwareSettingsChangeAction {
  return value === 'reset' || value === 'rollback' ? value : 'update';
}

export function mapSettingsHistoryEntry(value: unknown): HardwareSettingsHistoryEntry | null {
  const record = readRecord(value);
  const revision = readText(record.revision);
  if (!revision) {
    return null;
  }
  return {
    action: normalizeSettingsChangeAction(record.action),
    changedKeys: readStringArray(record.changedKeys),
    overrides: readRecord(record.overrides),
    revision,
    updatedAt: readText(record.updatedAt),
    ...(typeof record.updatedBy === 'string' ? { updatedBy: record.updatedBy } : {}),
  };
}

function normalizeBulkStatus(value: unknown): HardwareBulkItemStatus {
  switch (value) {
    case 'updated':
    case 'skipped':
    case 'invalid':
    case 'not_found':
    case 'conflict':
    case 'failed':
      return value;
    default:
      return 'failed';
  }
}

export function mapBulkResult(value: unknown): HardwareBulkResult {
  const record = readRecord(value);
  const items = Array.isArray(record.items)
    ? record.items.map((item): HardwareBulkItemResult => {
        const itemRecord = readRecord(item);
        const errors = Array.isArray(itemRecord.errors)
          ? itemRecord.errors.map((error): HardwareBulkItemError => {
              const errorRecord = readRecord(error);
              const code = readNumber(errorRecord.code);
              return {
                ...(code === undefined ? {} : { code }),
                ...(typeof errorRecord.field === 'string' ? { field: errorRecord.field } : {}),
                message: readText(errorRecord.message),
              };
            })
          : [];
        const revision = readText(itemRecord.revision);
        return {
          deviceId: readText(itemRecord.deviceId),
          errors,
          ...(revision ? { revision } : {}),
          status: normalizeBulkStatus(itemRecord.status),
        };
      })
    : [];
  return { allOrNothing: record.allOrNothing === true, items };
}

export interface HardwareBulkSummary {
  counts: { status: HardwareBulkItemStatus; count: number }[];
  succeeded: number;
  failed: number;
  total: number;
}

/** Aggregates a bulk result without producing copy; the caller localizes statuses. */
export function summarizeBulkResult(result: HardwareBulkResult): HardwareBulkSummary {
  const counts = new Map<HardwareBulkItemStatus, number>();
  for (const item of result.items) {
    counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
  }
  const succeeded = counts.get('updated') ?? 0;
  return {
    counts: Array.from(counts, ([status, count]) => ({ status, count })),
    failed: result.items.length - succeeded,
    succeeded,
    total: result.items.length,
  };
}

export function mapPage<T>(value: unknown, mapper: (entry: unknown) => T | null): HardwarePage<T> {
  const record = readRecord(value);
  const pageInfo = readRecord(record.pageInfo);
  const items = Array.isArray(record.items)
    ? record.items.flatMap((item): T[] => {
        const mapped = mapper(item);
        return mapped === null ? [] : [mapped];
      })
    : Array.isArray(value)
      ? value.flatMap((item): T[] => {
          const mapped = mapper(item);
          return mapped === null ? [] : [mapped];
        })
      : [];
  return {
    hasMore: readBoolean(pageInfo.hasMore),
    items,
    page: readNumber(pageInfo.page) ?? 1,
    pageSize: readNumber(pageInfo.pageSize) ?? items.length,
    ...(readNumber(pageInfo.total) === undefined ? {} : { total: readNumber(pageInfo.total) }),
  };
}

/** Splits a delimiter-separated operator input into a trimmed string list. */
export function splitListInput(value: string): string[] {
  return value
    .split(/[\n,]/u)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function joinListInput(values: readonly string[]): string {
  return values.join('\n');
}

export function formatTimestamp(value: string): string {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString().replace('T', ' ').slice(0, 19);
}

export function jsonText(value: unknown): string {
  if (value === undefined) {
    return '';
  }
  try {
    return JSON.stringify(value, null, 2) ?? '';
  } catch {
    return '';
  }
}

export function parseJsonObjectInput(value: string): { ok: boolean; value?: Record<string, unknown> } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, value: {} };
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false };
  }
}

export function parseJsonInput(value: string): { ok: boolean; value?: unknown } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) as unknown };
  } catch {
    return { ok: false };
  }
}

/**
 * Marks a setting for removal from the override set. The API contract treats a
 * `null` value as "clear this override and inherit the default again", so the
 * caller passes this sentinel and the service converts it to `null`.
 */
export function clearedSetting(): unknown {
  return CLEARED_SETTING;
}

export function isClearedSetting(value: unknown): boolean {
  return value === CLEARED_SETTING;
}

/** Converts an override map into the wire map, turning cleared sentinels into `null`. */
export function toSettingsWireMap(
  overrides: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const wire: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(overrides)) {
    wire[key] = isClearedSetting(value) ? null : readJsonValue(value);
  }
  return wire;
}

export function countHealth(devices: readonly HardwareDevice[]): Record<HardwareHealth, number> {
  const counts: Record<HardwareHealth, number> = { critical: 0, healthy: 0, offline: 0, warning: 0 };
  for (const device of devices) {
    counts[device.health] += 1;
  }
  return counts;
}

/** Operator input strings for every declared setting, seeded from the effective value. */
export function buildSettingsInputs(
  settings: HardwareDeviceSettings,
): Record<string, string> {
  const inputs: Record<string, string> = {};
  for (const definition of settings.definitions) {
    inputs[definition.settingKey] = formatSettingValue(
      definition,
      effectiveSettingValue(settings, definition.settingKey),
    );
  }
  return inputs;
}

export interface HardwareSettingsDraftResult {
  clearedKeys: string[];
  errors: Record<string, string>;
  overrides: Record<string, unknown>;
}

/**
 * Compares operator inputs with the loaded effective values and produces the
 * override set to submit.
 *
 * Only changed settings are submitted, so an unrelated field can never be
 * silently pinned by a save. `cleared` carries the keys the operator explicitly
 * reset to the inherited default; those are submitted as cleared sentinels that
 * the service turns into `null` (API contract: `null` drops the override).
 */
export function buildSettingsOverrides(
  settings: HardwareDeviceSettings,
  inputs: Readonly<Record<string, string>>,
  cleared: readonly string[] = [],
): HardwareSettingsDraftResult {
  const overrides: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  const clearedKeys: string[] = [];
  const clearedSet = new Set(cleared);

  for (const definition of settings.definitions) {
    const key = definition.settingKey;
    if (clearedSet.has(key)) {
      overrides[key] = clearedSetting();
      clearedKeys.push(key);
      continue;
    }
    if (!definition.writable) {
      continue;
    }
    const original = formatSettingValue(definition, effectiveSettingValue(settings, key));
    const next = inputs[key] ?? '';
    if (next === original) {
      continue;
    }
    const parsed = parseSettingInput(definition, next);
    if (!parsed.ok) {
      errors[key] = parsed.reason ?? 'invalidJson';
      continue;
    }
    overrides[key] = parsed.value;
  }

  return { clearedKeys, errors, overrides };
}

export function matchesQuery(values: readonly string[], query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return values.some((value) => value.toLowerCase().includes(normalized));
}
