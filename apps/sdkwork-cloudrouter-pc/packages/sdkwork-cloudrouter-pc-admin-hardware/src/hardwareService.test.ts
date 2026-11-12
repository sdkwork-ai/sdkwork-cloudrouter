import { describe, expect, test, vi } from 'vitest';

import type { SdkworkAiotBackendClient } from '@sdkwork/cloudrouter-pc-admin-core/sdk';

import {
  createHardwareService,
  describeHardwareError,
  isHardwareRevisionConflict,
} from './hardwareService.ts';
import { clearedSetting } from './hardware.ts';

/** Builds a client whose operations are individually observable. */
function stubClient() {
  const createDevice = vi.fn(async () => ({ deviceId: 'dev-1' }));
  const updateDevice = vi.fn(async () => ({}));
  const deviceList = vi.fn(async () => ({
    items: [{ deviceId: 'dev-1', displayName: 'Lobby', status: 'online' }],
    pageInfo: { mode: 'offset', page: 1, pageSize: 20, total: 1, hasMore: false },
  }));
  const settingsUpdate = vi.fn(async () => ({
    deviceId: 'dev-1',
    revision: '8',
    definitions: [],
    defaults: {},
    overrides: { 'audio.volume': 55 },
    effective: { 'audio.volume': 55 },
  }));
  const settingsRetrieve = vi.fn(async () => ({
    deviceId: 'dev-1',
    revision: '7',
    definitions: [
      { settingKey: 'audio.volume', displayName: 'Volume', kind: 'integer', writable: true },
    ],
    defaults: { 'audio.volume': 30 },
    overrides: { 'audio.volume': 42 },
    effective: { 'audio.volume': 42 },
  }));
  const bulkUpdate = vi.fn(async () => ({ allOrNothing: false, items: [{ deviceId: 'dev-1', status: 'updated' }] }));
  const capabilityCreate = vi.fn(async () => ({ capabilityModelId: 'cm-1' }));
  const rolloutCreate = vi.fn(async () => ({ rolloutId: 'ro-1' }));
  const eventsList = vi.fn(async () => ({
    items: [{ eventId: 'evt-1', eventType: 'telemetry', direction: 'device_to_cloud' }],
    pageInfo: { mode: 'offset', page: 1, pageSize: 20, total: 1, hasMore: false },
  }));

  const client = {
    iot: {
      products: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      hardwareProfiles: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      protocolProfiles: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      capabilityModels: { list: vi.fn(), create: capabilityCreate, update: vi.fn(), delete: vi.fn() },
      devices: {
        list: deviceList,
        create: createDevice,
        retrieve: vi.fn(),
        update: updateDevice,
        delete: vi.fn(),
        credentials: { list: vi.fn(), create: vi.fn(), retrieve: vi.fn(), delete: vi.fn() },
        sessions: { list: vi.fn(), delete: vi.fn() },
        capabilities: { list: vi.fn() },
        commands: { list: vi.fn(), retrieve: vi.fn(), cancel: vi.fn() },
        twin: { retrieve: vi.fn(), update: vi.fn() },
        settings: {
          retrieve: settingsRetrieve,
          update: settingsUpdate,
          delete: vi.fn(),
          rollback: vi.fn(),
          history: { list: vi.fn() },
        },
      },
      firmwareArtifacts: { list: vi.fn(), create: vi.fn(), retrieve: vi.fn(), update: vi.fn(), delete: vi.fn() },
      firmwareRollouts: { list: vi.fn(), create: rolloutCreate, retrieve: vi.fn(), update: vi.fn(), delete: vi.fn() },
      events: { list: eventsList },
      protocolAdapters: { list: vi.fn() },
      runtime: { capacity: { retrieve: vi.fn() } },
      deviceSettings: { bulkUpdate },
    },
  };

  return {
    bulkUpdate,
    capabilityCreate,
    client: client as unknown as SdkworkAiotBackendClient,
    createDevice,
    deviceList,
    eventsList,
    rolloutCreate,
    settingsRetrieve,
    settingsUpdate,
    updateDevice,
  };
}

describe('hardware service', () => {
  test('device listing maps the wire page into the domain page', async () => {
    const stub = stubClient();
    const service = createHardwareService({ backendClient: stub.client });
    const page = await service.listDevices({ page: 1, pageSize: 20 });
    expect(stub.deviceList).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    expect(page.items[0]).toMatchObject({ deviceId: 'dev-1', health: 'healthy' });
  });

  test('device creation always carries an idempotency key', async () => {
    const stub = stubClient();
    const service = createHardwareService({ backendClient: stub.client });
    await service.createDevice({ deviceId: 'dev-1', displayName: 'Lobby', productId: 'prod-1' });
    const [, params] = stub.createDevice.mock.calls[0] as unknown as [unknown, { idempotencyKey: string }];
    expect(params.idempotencyKey).toMatch(/^iot-device-create-/);
  });

  test('device update always carries an idempotency key', async () => {
    const stub = stubClient();
    const service = createHardwareService({ backendClient: stub.client });
    await service.updateDevice('dev-1', { displayName: 'Hall' });
    const [, , params] = stub.updateDevice.mock.calls[0] as unknown as [string, unknown, { idempotencyKey: string }];
    expect(params.idempotencyKey).toMatch(/^iot-device-update-/);
  });

  test('settings save submits the expected revision and the override map', async () => {
    const stub = stubClient();
    const service = createHardwareService({ backendClient: stub.client });
    const settings = await service.getDeviceSettings('dev-1');
    expect(settings.revision).toBe('7');

    await service.saveDeviceSettings('dev-1', { expectedRevision: '7', overrides: { 'audio.volume': 55 } });
    expect(stub.settingsUpdate).toHaveBeenCalledWith('dev-1', {
      expectedRevision: '7',
      overrides: { 'audio.volume': 55 },
    });
  });

  test('a cleared override reaches the wire as null', async () => {
    const stub = stubClient();
    const service = createHardwareService({ backendClient: stub.client });
    await service.saveDeviceSettings('dev-1', {
      expectedRevision: '7',
      overrides: { 'audio.muted': clearedSetting() },
    });
    expect(stub.settingsUpdate).toHaveBeenCalledWith('dev-1', {
      expectedRevision: '7',
      overrides: { 'audio.muted': null },
    });
  });

  test('bulk settings map every targeted device', async () => {
    const stub = stubClient();
    const service = createHardwareService({ backendClient: stub.client });
    const result = await service.applyDeviceSettingsBulk({
      allOrNothing: true,
      items: [{ deviceId: 'dev-1', overrides: { 'audio.volume': 20 } }],
    });
    expect(stub.bulkUpdate).toHaveBeenCalledWith({
      allOrNothing: true,
      items: [{ deviceId: 'dev-1', overrides: { 'audio.volume': 20 } }],
    });
    expect(result.items[0]?.status).toBe('updated');
  });

  test('event listing maps the wire page into the domain page', async () => {
    const stub = stubClient();
    const service = createHardwareService({ backendClient: stub.client });
    const page = await service.listEvents({ page: 1, pageSize: 20 });
    expect(page.items[0]).toMatchObject({ eventId: 'evt-1', direction: 'device_to_cloud' });
  });

  test('capability model creation rejects malformed capability entries', async () => {
    const stub = stubClient();
    const service = createHardwareService({ backendClient: stub.client });
    await expect(
      service.createCapabilityModel({
        capabilityModelId: 'cm-1',
        displayName: 'Lock',
        version: '1.0.0',
        capabilities: [{ capabilityName: 'lock' }],
      }),
    ).rejects.toMatchObject({ field: 'capabilities' });
    expect(stub.capabilityCreate).not.toHaveBeenCalled();
  });

  test('capability model creation passes a validated thing model through', async () => {
    const stub = stubClient();
    const service = createHardwareService({ backendClient: stub.client });
    await service.createCapabilityModel({
      capabilityModelId: 'cm-1',
      displayName: 'Lock',
      version: '1.0.0',
      capabilities: [{ capabilityName: 'lock', capabilityKind: 'command' }],
      settings: [{ displayName: 'Volume', kind: 'integer', settingKey: 'audio.volume' }],
    });
    expect(stub.capabilityCreate).toHaveBeenCalledTimes(1);
    const [body] = stub.capabilityCreate.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(body.capabilities).toEqual([{ capabilityName: 'lock', capabilityKind: 'command' }]);
  });

  test('firmware rollout creation requires an artifact and a target policy', async () => {
    const stub = stubClient();
    const service = createHardwareService({ backendClient: stub.client });
    await expect(service.createFirmwareRollout({ targetPolicy: { productId: 'p' } })).rejects.toMatchObject({
      field: 'artifactId',
    });
    await expect(service.createFirmwareRollout({ artifactId: 'art-1' })).rejects.toMatchObject({
      field: 'targetPolicy',
    });
    await service.createFirmwareRollout({
      artifactId: 'art-1',
      targetPolicy: { deviceIds: ['dev-1'] },
    });
    const [body, params] = stub.rolloutCreate.mock.calls[0] as unknown as [
      Record<string, unknown>,
      { idempotencyKey: string },
    ];
    expect(body).toEqual({ artifactId: 'art-1', targetPolicy: { deviceIds: ['dev-1'] } });
    expect(params.idempotencyKey).toMatch(/^iot-firmware-rollout-create-/);
  });
});

describe('hardware error classification', () => {
  test('revision conflicts are detected from the platform code and the status', () => {
    expect(isHardwareRevisionConflict({ problem: { code: 40901 } })).toBe(true);
    expect(isHardwareRevisionConflict({ httpStatus: 409 })).toBe(true);
    expect(isHardwareRevisionConflict({ code: 'CONFLICT' })).toBe(true);
    expect(isHardwareRevisionConflict({ httpStatus: 500 })).toBe(false);
  });

  test('error descriptions resolve to stable reason keys', () => {
    expect(describeHardwareError({ httpStatus: 409 }).key).toBe('revisionConflict');
    expect(describeHardwareError({ httpStatus: 401 }).key).toBe('unauthorized');
    expect(describeHardwareError({ httpStatus: 403 }).key).toBe('forbidden');
    expect(describeHardwareError({ httpStatus: 404 }).key).toBe('notFound');
    expect(describeHardwareError({ httpStatus: 422 }).key).toBe('validation');
    expect(describeHardwareError({ httpStatus: 503 }).key).toBe('unavailable');
    expect(describeHardwareError(new Error('boom'))).toMatchObject({ key: 'conflict', detail: 'boom' });
  });
});


