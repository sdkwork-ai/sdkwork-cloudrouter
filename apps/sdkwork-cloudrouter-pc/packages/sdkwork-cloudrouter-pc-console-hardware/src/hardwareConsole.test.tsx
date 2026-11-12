import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createInstance } from 'i18next';
import { describe, expect, test, vi } from 'vitest';

import { hardwareConsoleMessages } from './i18n/index.ts';
import {
  HARDWARE_CONSOLE_BASE_PATH,
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
    listFirmware: emptyPage,
    listProducts: emptyPage,
    registerDevice: vi.fn(async () => null),
    renameDevice: vi.fn(async () => null),
    retrieveDevice: vi.fn(async () => null),
  };
}

async function createTranslator() {
  const instance = createInstance();
  await instance.init({
    fallbackLng: 'en',
    lng: 'en',
    resources: { en: { translation: hardwareConsoleMessages.en } },
  });
  return instance;
}

describe('smart hardware console contribution', () => {
  test('the group renders right below the memory group', () => {
    expect(HARDWARE_CONSOLE_NAV_AFTER_GROUP_KEY).toBe('console.menu.group.memory');
    expect(HARDWARE_CONSOLE_NAV_GROUP.items.map((item) => item.path)).toEqual([
      HARDWARE_CONSOLE_BASE_PATH,
      HARDWARE_CONSOLE_FIRMWARE_PATH,
    ]);
  });

  test('the console screen resolves from the group path', () => {
    expect(resolveHardwareConsoleScreen('/console/hardware')).toEqual({ screen: 'devices' });
    expect(resolveHardwareConsoleScreen('/console/hardware/firmware')).toEqual({ screen: 'firmware' });
    expect(resolveHardwareConsoleScreen('/console/hardware/devices/dev-1')).toEqual({ screen: 'devices' });
    expect(resolveHardwareConsoleScreen('/console/memory')).toEqual({ screen: 'devices' });
  });
});

describe('smart hardware console host view', () => {
  test('renders the AIoT-owned console with Cloud Router copy', async () => {
    const i18n = await createTranslator();
    render(
      <MemoryRouter initialEntries={['/console/hardware']}>
        <I18nextProvider i18n={i18n}>
          <HardwareConsoleView service={stubService()} />
        </I18nextProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getAllByText('Lobby lock').length).toBeGreaterThan(0));
    expect(screen.getAllByText('My smart hardware').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'My hardware' }).length).toBeGreaterThan(0);
  });

  test('deep links to the firmware catalog', async () => {
    const i18n = await createTranslator();
    const { container } = render(
      <MemoryRouter initialEntries={['/console/hardware/firmware']}>
        <I18nextProvider i18n={i18n}>
          <HardwareConsoleView service={stubService()} />
        </I18nextProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getAllByText('Firmware downloads').length).toBeGreaterThan(0));
    expect(
      container.querySelector('[data-cloudrouter-hardware-console]')?.getAttribute(
        'data-cloudrouter-hardware-firmware-path',
      ),
    ).toBe(HARDWARE_CONSOLE_FIRMWARE_PATH);
  });
});
