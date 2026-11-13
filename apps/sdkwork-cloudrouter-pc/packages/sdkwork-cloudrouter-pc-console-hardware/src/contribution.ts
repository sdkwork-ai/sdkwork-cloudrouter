import { CircuitBoard, Cpu, Download } from 'lucide-react';

/**
 * Smart Hardware console contribution.
 *
 * Data-only: the console shell spreads {@link HARDWARE_CONSOLE_NAV_GROUP} into
 * its sidebar right below the Memory group, and the host route table mounts the two
 * page paths. Keeping this file free of page imports means the shell bundle does
 * not pull the hardware pages.
 */

/** Group root; the host redirects it to the device registry page. */
export const HARDWARE_CONSOLE_GROUP_PATH = '/console/hardware';

/** Device registry page: `…/hardware/devices`. */
export const HARDWARE_CONSOLE_DEVICES_PATH = `${HARDWARE_CONSOLE_GROUP_PATH}/devices`;

/** Firmware catalog page: `…/hardware/firmware`. */
export const HARDWARE_CONSOLE_FIRMWARE_PATH = `${HARDWARE_CONSOLE_GROUP_PATH}/firmware`;

/**
 * Default console path. Kept as the alias for the device registry page so callers
 * that only need "the hardware console" land on the group's primary page.
 */
export const HARDWARE_CONSOLE_BASE_PATH = HARDWARE_CONSOLE_DEVICES_PATH;

export const HARDWARE_CONSOLE_NAV_GROUP = {
  groupKey: 'console.menu.group.hardware',
  fallbackLabel: 'Smart Hardware',
  items: [
    {
      path: HARDWARE_CONSOLE_DEVICES_PATH,
      labelKey: 'console.menu.hardwareDevices',
      fallbackLabel: 'My hardware',
      icon: Cpu,
    },
    {
      path: HARDWARE_CONSOLE_FIRMWARE_PATH,
      labelKey: 'console.menu.hardwareFirmware',
      fallbackLabel: 'Firmware downloads',
      icon: Download,
    },
  ],
} as const;

export const HARDWARE_CONSOLE_MODULE_ICON = CircuitBoard;

/** Sidebar insertion anchor: the group renders directly after Memory. */
export const HARDWARE_CONSOLE_NAV_AFTER_GROUP_KEY = 'console.menu.group.memory';

export type HardwareConsoleScreen = 'devices' | 'firmware';

/**
 * Reads which hardware screen the current pathname addresses.
 *
 * `/console/hardware/devices` -> the device registry, `/console/hardware/firmware`
 * -> the firmware catalog. The bare group root and any unknown segment fall back to
 * the device registry, so a stale deep link still lands on a usable screen.
 */
export function resolveHardwareConsoleScreen(pathname: string): {
  screen: HardwareConsoleScreen;
} {
  const [pathOnly] = pathname.split(/[?#]/u);
  if (!pathOnly.startsWith(`${HARDWARE_CONSOLE_GROUP_PATH}/`)) {
    return { screen: 'devices' };
  }
  const segments = pathOnly
    .slice(HARDWARE_CONSOLE_GROUP_PATH.length)
    .split('/')
    .filter(Boolean);
  if (segments[0] === 'firmware') {
    return { screen: 'firmware' };
  }
  return { screen: 'devices' };
}
