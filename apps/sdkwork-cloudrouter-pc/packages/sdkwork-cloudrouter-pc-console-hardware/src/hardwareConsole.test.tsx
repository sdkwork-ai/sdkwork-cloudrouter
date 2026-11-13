import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createInstance } from 'i18next';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { hardwareConsoleMessages } from './i18n/index.ts';
import {
  HARDWARE_CONSOLE_BASE_PATH,
  HARDWARE_CONSOLE_DEVICES_PATH,
  HARDWARE_CONSOLE_FIRMWARE_PATH,
  HARDWARE_CONSOLE_NAV_AFTER_GROUP_KEY,
  HARDWARE_CONSOLE_NAV_GROUP,
  resolveHardwareConsoleScreen,
} from './contribution.ts';
import type { ConsoleHardwareService } from './cloudRouterHardwareService.ts';
import { HardwareConsoleView } from './HardwareConsoleView.tsx';

function stubService(): ConsoleHardwareService {
  const emptyPage = async () => ({ hasMore: false, items: [], page: 1, pageSize: 20 });
  return {
    bindDeviceAgent: vi.fn(async () => null),
    listAgents: emptyPage,
    listDevices: vi.fn(async () => ({
      hasMore: false,
      items: [
        {
          agentId: '',
          agentName: '',
          chipFamily: 'esp32',
          clientId: '',
          deviceId: 'dev-1',
          displayName: 'Lobby lock',
          health: 'healthy' as const,
          lastSeenAt: '2026-02-03T04:05:06Z',
          metadata: {},
          productId: '1008',
          status: 'online',
        },
      ],
      page: 1,
      pageSize: 20,
    })),
    listFirmware: vi.fn(async () => ({
      hasMore: false,
      items: [
        {
          artifactId: 'art-1',
          artifactKey: 'lock-fw',
          checksumPreview: '0123456789abcdef',
          downloadUrl: 'https://example.test/fw.bin',
          fileName: 'fw.bin',
          signature: '',
          status: 'published',
          targetChipFamily: 'esp32',
          targetRuntimeProfile: 'default',
          version: '1.2.0',
        },
      ],
      page: 1,
      pageSize: 20,
    })),
    listProducts: emptyPage,
    registerDevice: vi.fn(async () => null),
    renameDevice: vi.fn(async () => null),
    retrieveDevice: vi.fn(async () => null),
  };
}

afterEach(() => {
  cleanup();
});

async function createTranslator() {
  const instance = createInstance();
  await instance.init({
    fallbackLng: 'en',
    lng: 'en',
    resources: { en: { translation: hardwareConsoleMessages.en } },
  });
  return instance;
}

async function renderAt(path: string, service: ConsoleHardwareService) {
  const i18n = await createTranslator();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <I18nextProvider i18n={i18n}>
        <HardwareConsoleView service={service} />
      </I18nextProvider>
    </MemoryRouter>,
  );
}

describe('smart hardware console contribution', () => {
  test('the group renders right below the memory group', () => {
    expect(HARDWARE_CONSOLE_NAV_AFTER_GROUP_KEY).toBe('console.menu.group.memory');
    expect(HARDWARE_CONSOLE_NAV_GROUP.items.map((item) => item.path)).toEqual([
      HARDWARE_CONSOLE_BASE_PATH,
      HARDWARE_CONSOLE_FIRMWARE_PATH,
    ]);
  });

  test('each URL maps to exactly one console page', () => {
    expect(resolveHardwareConsoleScreen('/console/hardware/devices')).toEqual({ screen: 'devices' });
    expect(resolveHardwareConsoleScreen('/console/hardware/firmware')).toEqual({ screen: 'firmware' });
    expect(resolveHardwareConsoleScreen('/console/hardware/devices/dev-1')).toEqual({ screen: 'devices' });
    // The bare group root falls back to the registry page (the host redirects it).
    expect(resolveHardwareConsoleScreen('/console/hardware')).toEqual({ screen: 'devices' });
    expect(resolveHardwareConsoleScreen('/console/memory')).toEqual({ screen: 'devices' });
  });

  test('the sidebar entries point at the two page URLs', () => {
    expect(HARDWARE_CONSOLE_NAV_GROUP.items.map((item) => item.path)).toEqual([
      '/console/hardware/devices',
      '/console/hardware/firmware',
    ]);
    expect(HARDWARE_CONSOLE_DEVICES_PATH).toBe('/console/hardware/devices');
    expect(HARDWARE_CONSOLE_BASE_PATH).toBe(HARDWARE_CONSOLE_DEVICES_PATH);
  });
});

describe('smart hardware console host view', () => {
  test('the device registry URL renders only the devices page', async () => {
    await renderAt(HARDWARE_CONSOLE_BASE_PATH, stubService());
    await waitFor(() => expect(screen.getAllByText('Lobby lock').length).toBeGreaterThan(0));
    expect(screen.getByRole('heading', { level: 1, name: 'My smart hardware' })).toBeTruthy();
    expect(screen.getByText('My devices')).toBeTruthy();
    expect(screen.queryByText('lock-fw')).toBeNull();
  });

  test('the firmware URL renders only the firmware page', async () => {
    await renderAt(HARDWARE_CONSOLE_FIRMWARE_PATH, stubService());
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Firmware downloads' })).toBeTruthy(),
    );
    expect(screen.getByText('lock-fw')).toBeTruthy();
    expect(screen.queryByText('Lobby lock')).toBeNull();
    expect(screen.queryByText('My devices')).toBeNull();
  });

  test('the page switcher navigates between the two URLs', async () => {
    await renderAt(HARDWARE_CONSOLE_BASE_PATH, stubService());
    await waitFor(() => expect(screen.getAllByText('Lobby lock').length).toBeGreaterThan(0));
    screen.getByRole('button', { name: 'Firmware downloads' }).click();
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Firmware downloads' })).toBeTruthy(),
    );
    await waitFor(() => expect(screen.getByText('lock-fw')).toBeTruthy());
    expect(screen.queryByText('Lobby lock')).toBeNull();
  });
});
