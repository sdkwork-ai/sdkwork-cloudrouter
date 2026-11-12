/**
 * Cloud Router user-console adapter for the Smart Hardware group.
 *
 * The group's capability (domain model, app-surface operations, console view) is
 * owned by `sdkwork-aiot` (`@sdkwork/aiot-pc-console-hardware`). This package only
 * contributes:
 *
 * - the console sidebar group + route helpers (`./contribution`),
 * - the Cloud Router session-bound AIoT client adapter,
 * - the localized copy the AIoT console renders,
 * - the `HardwareConsoleView` host element mounted at `/console/hardware/*`.
 */

export { HardwareConsoleView, type HardwareConsoleViewProps } from './HardwareConsoleView.tsx';
export {
  createCloudRouterHardwareService,
  type ConsoleHardwareAgent,
  type ConsoleHardwareDevice,
  type ConsoleHardwareFirmware,
  type ConsoleHardwarePage,
  type ConsoleHardwareProduct,
  type ConsoleHardwareService,
} from './cloudRouterHardwareService.ts';
export {
  HARDWARE_CONSOLE_BASE_PATH,
  HARDWARE_CONSOLE_FIRMWARE_PATH,
  HARDWARE_CONSOLE_MODULE_ICON,
  HARDWARE_CONSOLE_NAV_AFTER_GROUP_KEY,
  HARDWARE_CONSOLE_NAV_GROUP,
  resolveHardwareConsoleScreen,
  type HardwareConsoleScreen,
} from './contribution.ts';
