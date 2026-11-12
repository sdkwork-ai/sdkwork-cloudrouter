/**
 * Public page surface of the Smart Hardware Center.
 *
 * The host route table lazy-loads these components; every page resolves the
 * AIoT backend client from the host-injected holder configured in
 * `main.tsx` (`configureHardwareBackendSdkClient`). A page never imports a
 * transport client factory itself.
 */

export {
  HardwareCapabilityModelsPage,
  HardwareFirmwareArtifactsPage,
  HardwareFirmwareRolloutsPage,
  HardwareProductsPage,
  HardwareProfilesPage,
  HardwareProtocolProfilesPage,
  type HardwarePageProps,
} from './pages/HardwareResourcePages.tsx';
export { HardwareOverviewPage } from './pages/HardwareOverviewPage.tsx';
export { HardwareDevicesPage } from './pages/HardwareDevicesPage.tsx';
export { HardwareDeviceDetailPage } from './pages/HardwareDeviceDetailPage.tsx';
export { HardwareDeviceSettingsPage } from './pages/HardwareDeviceSettingsPage.tsx';
export { HardwareEventsPage } from './pages/HardwareEventsPage.tsx';
export { HardwareProtocolAdaptersPage } from './pages/HardwareProtocolAdaptersPage.tsx';
export { HardwareRuntimePage } from './pages/HardwareRuntimePage.tsx';

export {
  createHardwareService,
  describeHardwareError,
  getHardwareService,
  isHardwareRevisionConflict,
  type HardwareErrorDescription,
  type HardwareMessageKey,
  type HardwareService,
} from './hardwareService.ts';
export {
  HARDWARE_ADMIN_DEFAULT_PATH,
  HARDWARE_ADMIN_MENU,
  HARDWARE_ADMIN_MODULE_DEF,
  HARDWARE_ADMIN_PERMISSION_HINTS,
  HARDWARE_ADMIN_ROUTE_PREFIX,
  HARDWARE_ADMIN_ROUTE_RECORDS,
  type SdkworkHardwareAdminMenu,
  type SdkworkHardwareAdminMenuGroup,
  type SdkworkHardwareAdminMenuItem,
  type SdkworkHardwareAdminModuleDef,
  type SdkworkHardwareAdminPermissionHint,
  type SdkworkHardwareAdminRouteRecord,
  type SdkworkHardwareAdminScreen,
} from './contribution.ts';
