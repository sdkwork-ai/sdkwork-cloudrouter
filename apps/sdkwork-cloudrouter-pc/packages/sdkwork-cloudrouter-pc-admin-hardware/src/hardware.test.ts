import { describe, expect, test } from 'vitest';

import {
  buildSettingsInputs,
  buildSettingsOverrides,
  clearedSetting,
  countHealth,
  formatSettingValue,
  groupSettingDefinitions,
  isClearedSetting,
  mapBulkResult,
  mapCapabilityModel,
  mapDevice,
  mapDeviceSettings,
  mapEvent,
  mapFirmwareArtifact,
  mapFirmwareRollout,
  mapPage,
  mapProduct,
  mapRuntimeCapacity,
  normalizeHealth,
  parseSettingInput,
  splitListInput,
  summarizeBulkResult,
  toSettingsWireMap,
  validateSettingsDraft,
  type HardwareDeviceSettings,
  type HardwareSettingDefinition,
} from './hardware.ts';

function setting(overrides: Partial<HardwareSettingDefinition> = {}): HardwareSettingDefinition {
  return {
    displayName: 'Volume',
    group: 'audio',
    kind: 'integer',
    options: [],
    required: false,
    sensitive: false,
    settingKey: 'audio.volume',
    writable: true,
    ...overrides,
  };
}

function settingsFixture(): HardwareDeviceSettings {
  return {
    capabilityModelId: 'cm-1',
    defaults: { 'audio.volume': 30, 'audio.muted': false },
    definitions: [
      setting({ defaultValue: 30, maximum: 100, minimum: 0 }),
      setting({ defaultValue: false, kind: 'boolean', settingKey: 'audio.muted' }),
      setting({ kind: 'enum', options: [{ label: 'Auto', value: 'auto' }], settingKey: 'power.mode' }),
    ],
    deviceId: 'dev-1',
    effective: { 'audio.muted': false, 'audio.volume': 42, 'power.mode': 'auto' },
    overrides: { 'audio.volume': 42 },
    productId: 'prod-1',
    revision: '7',
  };
}

describe('wire mappers', () => {
  test('device mapping keeps int64 identifiers as strings and normalizes health', () => {
    const device = mapDevice({
      deviceId: '1234567890123456789',
      displayName: 'Lobby lock',
      productId: 'prod-1',
      chipFamily: 'esp32',
      status: 'online',
      lastSeenAt: '2026-01-02T03:04:05Z',
    });
    expect(device?.deviceId).toBe('1234567890123456789');
    expect(device?.health).toBe('healthy');
    expect(device?.lastSeenAt).toBe('2026-01-02T03:04:05Z');
  });

  test('device mapping rejects a payload without an identifier', () => {
    expect(mapDevice({ displayName: 'orphan' })).toBeNull();
    expect(mapDevice('not-an-object')).toBeNull();
  });

  test('health normalization covers the documented status families', () => {
    expect(normalizeHealth('active')).toBe('healthy');
    expect(normalizeHealth('degraded')).toBe('warning');
    expect(normalizeHealth('inactive')).toBe('offline');
    expect(normalizeHealth('failed')).toBe('critical');
  });

  test('product mapping falls back to the identifier for a missing display name', () => {
    const product = mapProduct({
      productId: 'smart-lock',
      defaultHardwareProfileId: 'hw-1',
      defaultProtocolProfileId: 'proto-1',
      defaultCapabilityModelId: 'cm-1',
    });
    expect(product).toMatchObject({
      productId: 'smart-lock',
      displayName: 'smart-lock',
      hardwareProfileId: 'hw-1',
      protocolProfileId: 'proto-1',
      capabilityModelId: 'cm-1',
      status: 'active',
    });
  });

  test('capability model mapping counts capabilities and declared settings', () => {
    const model = mapCapabilityModel({
      capabilityModelId: 'cm-1',
      displayName: 'Door lock',
      version: '1.2.0',
      capabilities: [
        { capabilityName: 'lock', capabilityKind: 'command', commands: [{}, {}], events: [{}] },
        { capabilityName: 'battery', capabilityKind: 'telemetry' },
        { capabilityKind: 'property' },
      ],
      settings: [{ settingKey: 'audio.volume' }],
    });
    expect(model?.capabilities).toHaveLength(2);
    expect(model?.capabilities[0]?.commandCount).toBe(2);
    expect(model?.capabilities[0]?.eventCount).toBe(1);
    expect(model?.settingCount).toBe(1);
  });

  test('firmware artifact mapping resolves the managed resource id', () => {
    const artifact = mapFirmwareArtifact({
      artifactId: 'art-1',
      artifactKey: 'lock-fw',
      version: '3.1.0',
      sha256: 'abc',
      status: 'published',
      resource: { id: 'media-9', kind: 'archive', source: 'object_storage' },
    });
    expect(artifact?.mediaResourceId).toBe('media-9');
    expect(artifact?.status).toBe('published');
  });

  test('firmware rollout summarizes its target policy', () => {
    const rollout = mapFirmwareRollout({
      rolloutId: 'ro-1',
      artifactId: 'art-1',
      status: 'running',
      targetPolicy: { productId: 'smart-lock', deviceIds: ['a', 'b'] },
    });
    expect(rollout?.targetCount).toBe(2);
    expect(rollout?.targetSummary).toContain('smart-lock');
  });

  test('event and runtime capacity mapping tolerate missing optional fields', () => {
    const event = mapEvent({ eventId: 'evt-1', eventType: 'telemetry', direction: 'device_to_cloud' });
    expect(event?.direction).toBe('device_to_cloud');
    expect(event?.deviceId).toBe('');

    const capacity = mapRuntimeCapacity({
      nodeId: 'node-1',
      maxConnectionsPerNode: '1000',
      maxSessionsPerTenant: '500',
      maxInflightPerDevice: 4,
      sessionLeaseTtlSeconds: 60,
      sessionLeaseRenewSeconds: 20,
      outboxMaxAttempts: 5,
      deadLetterAfterAttempts: 5,
      orderedDeviceCommands: true,
      idempotentIngest: true,
    });
    expect(capacity?.maxConnectionsPerNode).toBe('1000');
    expect(capacity?.orderedDeviceCommands).toBe(true);
  });

  test('page mapping drops unmappable rows instead of failing the page', () => {
    const page = mapPage(
      {
        items: [{ deviceId: 'a' }, { displayName: 'invalid' }, { deviceId: 'b' }],
        pageInfo: { mode: 'offset', page: 2, pageSize: 2, total: 6, hasMore: true },
      },
      mapDevice,
    );
    expect(page.items.map((item) => item.deviceId)).toEqual(['a', 'b']);
    expect(page.page).toBe(2);
    expect(page.hasMore).toBe(true);
    expect(page.total).toBe(6);
  });
});

describe('device settings model', () => {
  test('definitions are grouped in first-seen order', () => {
    const groups = groupSettingDefinitions([
      setting({ group: 'audio', settingKey: 'a' }),
      setting({ group: 'power', settingKey: 'b' }),
      setting({ group: 'audio', settingKey: 'c' }),
    ]);
    expect(groups.map((group) => group.group)).toEqual(['audio', 'power']);
    expect(groups[0]?.definitions.map((definition) => definition.settingKey)).toEqual(['a', 'c']);
  });

  test('setting input parsing enforces kind, range, and enumeration', () => {
    expect(parseSettingInput(setting({ maximum: 100, minimum: 0 }), '120')).toMatchObject({
      ok: false,
      reason: 'aboveMaximum',
    });
    expect(parseSettingInput(setting(), '4.5')).toMatchObject({ ok: false, reason: 'invalidInteger' });
    expect(parseSettingInput(setting(), '42')).toMatchObject({ ok: true, value: 42 });
    expect(
      parseSettingInput(setting({ kind: 'enum', options: [{ label: 'Auto', value: 'auto' }] }), 'manual'),
    ).toMatchObject({ ok: false, reason: 'invalidEnum' });
    expect(parseSettingInput(setting({ kind: 'json' }), '{"a":1}')).toMatchObject({ ok: true });
    expect(parseSettingInput(setting({ writable: false }), '1')).toMatchObject({
      ok: false,
      reason: 'notWritable',
    });
  });

  test('draft validation reports stable reason identifiers', () => {
    const errors = validateSettingsDraft(
      [setting({ required: true, settingKey: 'required.key' }), setting({ settingKey: 'audio.volume' })],
      { 'audio.volume': 'not-a-number', 'unknown.key': 1 },
    );
    expect(errors['audio.volume']).toBe('invalidInteger');
    expect(errors['unknown.key']).toBe('undefinedSetting');
    expect(errors['required.key']).toBe('required');
  });

  test('overrides submit only changed keys and mark cleared ones', () => {
    const fixture = settingsFixture();
    const inputs = buildSettingsInputs(fixture);
    expect(inputs['audio.volume']).toBe('42');
    expect(inputs['audio.muted']).toBe('false');

    const unchanged = buildSettingsOverrides(fixture, inputs, []);
    expect(unchanged.overrides).toEqual({});
    expect(unchanged.errors).toEqual({});

    const changed = buildSettingsOverrides(fixture, { ...inputs, 'audio.volume': '55' }, []);
    expect(changed.overrides).toEqual({ 'audio.volume': 55 });

    const cleared = buildSettingsOverrides(fixture, inputs, ['audio.volume']);
    expect(cleared.clearedKeys).toEqual(['audio.volume']);
    expect(isClearedSetting(cleared.overrides['audio.volume'])).toBe(true);

    const wire = toSettingsWireMap(cleared.overrides);
    expect(wire).toEqual({ 'audio.volume': null });
  });

  test('cleared sentinel is not confused with a real value', () => {
    expect(isClearedSetting(clearedSetting())).toBe(true);
    expect(isClearedSetting(null)).toBe(false);
    expect(isClearedSetting('value')).toBe(false);
  });

  test('formatting renders enum labels and JSON bodies', () => {
    expect(
      formatSettingValue(setting({ kind: 'enum', options: [{ label: 'Auto', value: 'auto' }] }), 'auto'),
    ).toBe('Auto');
    expect(formatSettingValue(setting({ kind: 'json' }), { a: 1 })).toBe('{\n  "a": 1\n}');
    expect(formatSettingValue(setting(), undefined)).toBe('');
  });

  test('settings mapping keeps the revision and override set', () => {
    const mapped = mapDeviceSettings({
      deviceId: 'dev-1',
      revision: '9',
      definitions: [{ settingKey: 'audio.volume', displayName: 'Volume', kind: 'integer' }],
      defaults: { 'audio.volume': 30 },
      overrides: { 'audio.volume': 44 },
      effective: { 'audio.volume': 44 },
    });
    expect(mapped.revision).toBe('9');
    expect(mapped.overrides).toEqual({ 'audio.volume': 44 });
  });
});

describe('bulk results and list helpers', () => {
  test('bulk result mapping normalizes unknown statuses to failed', () => {
    const result = mapBulkResult({
      allOrNothing: true,
      items: [
        { deviceId: 'a', status: 'updated', revision: '2' },
        { deviceId: 'b', status: 'mystery', errors: [{ code: 40001, field: 'x', message: 'bad' }] },
      ],
    });
    expect(result.items[0]).toMatchObject({ deviceId: 'a', status: 'updated', revision: '2' });
    expect(result.items[1]?.status).toBe('failed');
    expect(result.items[1]?.errors[0]?.code).toBe(40001);

    const summary = summarizeBulkResult(result);
    expect(summary).toMatchObject({ succeeded: 1, failed: 1, total: 2 });
  });

  test('health counting and list splitting support the pages', () => {
    const counts = countHealth([
      { chipFamily: '', clientId: '', deviceId: 'a', displayName: 'a', health: 'healthy', lastSeenAt: '', productId: '', status: 'online' },
      { chipFamily: '', clientId: '', deviceId: 'b', displayName: 'b', health: 'critical', lastSeenAt: '', productId: '', status: 'failed' },
      { chipFamily: '', clientId: '', deviceId: 'c', displayName: 'c', health: 'healthy', lastSeenAt: '', productId: '', status: 'online' },
    ]);
    expect(counts).toEqual({ critical: 1, healthy: 2, offline: 0, warning: 0 });
    expect(splitListInput('a, b\n\nc')).toEqual(['a', 'b', 'c']);
  });
});
