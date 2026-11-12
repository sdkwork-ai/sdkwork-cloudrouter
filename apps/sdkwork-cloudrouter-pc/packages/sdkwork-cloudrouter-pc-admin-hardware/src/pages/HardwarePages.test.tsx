import { renderToString } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { createInstance } from 'i18next';
import { describe, expect, test } from 'vitest';

import type { HardwareService } from '../hardwareService.ts';
import { hardwareAdminMessages } from '../i18n/index.ts';
import { HardwareProductsPage } from './HardwareResourcePages.tsx';
import { HardwareDevicesPage } from './HardwareDevicesPage.tsx';
import { HardwareRuntimePage } from './HardwareRuntimePage.tsx';

/**
 * Server-render smoke tests: the pages must survive one render pass with a
 * stubbed service before any effect runs. They catch the class of regressions a
 * typecheck cannot — a hook order change, an undefined export, or a translation
 * key that resolves to nothing at first paint.
 */

async function createTranslator() {
  const instance = createInstance();
  await instance.init({
    fallbackLng: 'en',
    lng: 'en',
    resources: { en: { translation: hardwareAdminMessages.en } },
  });
  return instance;
}

function stubService(overrides: Partial<HardwareService> = {}): HardwareService {
  const notImplemented = async () => {
    throw new Error('not implemented in render test');
  };
  const emptyPage = async () => ({ hasMore: false, items: [], page: 1, pageSize: 20 });
  return {
    applyDeviceSettingsBulk: notImplemented,
    cancelDeviceCommand: notImplemented,
    createCapabilityModel: notImplemented,
    createDevice: notImplemented,
    createDeviceCredential: notImplemented,
    createFirmwareArtifact: notImplemented,
    createFirmwareRollout: notImplemented,
    createHardwareProfile: notImplemented,
    createProduct: notImplemented,
    createProtocolProfile: notImplemented,
    deleteCapabilityModel: notImplemented,
    deleteDevice: notImplemented,
    deleteFirmwareArtifact: notImplemented,
    deleteFirmwareRollout: notImplemented,
    deleteHardwareProfile: notImplemented,
    deleteProduct: notImplemented,
    deleteProtocolProfile: notImplemented,
    disconnectDeviceSession: notImplemented,
    getDeviceSettings: notImplemented,
    getDeviceTwin: notImplemented,
    listCapabilities: emptyPage,
    listCapabilityModels: emptyPage,
    listDeviceCommands: emptyPage,
    listDeviceCredentials: emptyPage,
    listDevices: emptyPage,
    listDeviceSessions: emptyPage,
    listEvents: emptyPage,
    listFirmwareArtifacts: emptyPage,
    listFirmwareRollouts: emptyPage,
    listHardwareProfiles: emptyPage,
    listProducts: emptyPage,
    listProtocolAdapters: emptyPage,
    listProtocolProfiles: emptyPage,
    listSettingsHistory: emptyPage,
    resetDeviceSettings: notImplemented,
    retrieveDevice: async () => null,
    retrieveRuntimeCapacity: async () => null,
    revokeDeviceCredential: notImplemented,
    rollbackDeviceSettings: notImplemented,
    saveDeviceSettings: notImplemented,
    updateCapabilityModel: notImplemented,
    updateDevice: notImplemented,
    updateDeviceTwin: notImplemented,
    updateFirmwareArtifact: notImplemented,
    updateFirmwareRollout: notImplemented,
    updateHardwareProfile: notImplemented,
    updateProduct: notImplemented,
    updateProtocolProfile: notImplemented,
    ...overrides,
  } as HardwareService;
}

describe('smart hardware center pages render', () => {
  test('product management renders its heading, toolbar, and first-paint state', async () => {
    const i18n = await createTranslator();
    const html = renderToString(
      <I18nextProvider i18n={i18n}>
        <HardwareProductsPage service={stubService()} />
      </I18nextProvider>,
    );
    expect(html).toContain('Products');
    expect(html).toContain('Create product');
    expect(html).toContain('Search by name or identifier');
    // Effects do not run during a server render, so the table reports loading.
    expect(html).toContain('Loading hardware data...');
  });

  test('device registry renders its KPI row, filters, and first-paint state', async () => {
    const i18n = await createTranslator();
    const html = renderToString(
      <I18nextProvider i18n={i18n}>
        <HardwareDevicesPage service={stubService()} />
      </I18nextProvider>,
    );
    expect(html).toContain('Device Registry');
    expect(html).toContain('Devices on this page');
    expect(html).toContain('Search device id, name, product, chip');
    expect(html).toContain('All products');
    expect(html).toContain('Loading hardware data...');
  });

  test('runtime capacity page renders its heading and loads its policy', async () => {
    const i18n = await createTranslator();
    const html = renderToString(
      <I18nextProvider i18n={i18n}>
        <HardwareRuntimePage service={stubService()} />
      </I18nextProvider>,
    );
    expect(html).toContain('Runtime Capacity');
    expect(html).toContain('Loading hardware data...');
  });
});
