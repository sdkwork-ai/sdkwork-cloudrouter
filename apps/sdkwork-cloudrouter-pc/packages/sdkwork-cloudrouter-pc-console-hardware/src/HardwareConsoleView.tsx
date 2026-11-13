import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { hasPortalPermission, readPortalPermissionScope } from '@sdkwork/cloudroutes-pc-commons/runtime';
import {
  SdkworkHardwareDevicesPage,
  SdkworkHardwareFirmwarePage,
  type ConsoleHardwareScreen,
  type HardwareConsoleCopy,
} from '@sdkwork/aiot-pc-console-hardware';

import { createCloudRouterHardwareService } from './cloudRouterHardwareService.ts';
import {
  HARDWARE_CONSOLE_BASE_PATH,
  HARDWARE_CONSOLE_FIRMWARE_PATH,
  resolveHardwareConsoleScreen,
} from './contribution.ts';

/** IoT grant that unlocks device registration and agent binding. */
const IOT_PERMISSION_DEVICES_WRITE = 'iot.devices.write';

export interface HardwareConsoleViewProps {
  /** Test seam: inject a service bound to stub clients. */
  service?: ReturnType<typeof createCloudRouterHardwareService>;
}

/**
 * Cloud Router user-console entry for the Smart Hardware group.
 *
 * Each URL renders exactly one AIoT page: `/console/hardware` renders the device
 * registry and `/console/hardware/firmware` renders the firmware catalog. The page
 * switcher inside the console navigates between those two routes; the console
 * itself is owned by `sdkwork-aiot`, so this view only supplies localized copy, the
 * session-bound AIoT clients, and the route wiring.
 */
export function HardwareConsoleView({ service }: HardwareConsoleViewProps = {}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const resolvedService = useMemo(() => service ?? createCloudRouterHardwareService(), [service]);
  const screen = useMemo(
    () => resolveHardwareConsoleScreen(location.pathname).screen,
    [location.pathname],
  );
  const permissionScope = useMemo(() => readPortalPermissionScope(), []);
  const canManage = useMemo(
    () => hasPortalPermission(IOT_PERMISSION_DEVICES_WRITE, permissionScope),
    [permissionScope],
  );

  const handleNavigate = useCallback(
    (target: ConsoleHardwareScreen) => {
      navigate(target === 'firmware' ? HARDWARE_CONSOLE_FIRMWARE_PATH : HARDWARE_CONSOLE_BASE_PATH);
    },
    [navigate],
  );

  const copy = useMemo<HardwareConsoleCopy>(
    () => ({
      agentBound: t('console.hardware.list.agentBound', { name: '{{name}}' }),
      agentDescription: t('console.hardware.device.agentDescription'),
      agentEmpty: t('console.hardware.list.agentEmpty'),
      agentNone: t('console.hardware.device.agentNone'),
      agentReadOnly: t('console.hardware.device.agentReadOnly'),
      agentSave: t('console.hardware.device.agentSave'),
      agentSaved: t('console.hardware.device.agentSaved'),
      agentSelect: t('console.hardware.device.agentSelect'),
      agentTitle: t('console.hardware.device.agentTitle'),
      cancel: t('console.hardware.common.cancel'),
      chipLabel: t('console.hardware.list.column.chip'),
      clientIdLabel: t('console.hardware.register.clientId'),
      close: t('console.hardware.common.close'),
      columnArtifact: t('console.hardware.firmware.column.artifact'),
      columnChecksum: t('console.hardware.firmware.column.checksum'),
      columnDownload: t('console.hardware.firmware.column.download'),
      columnStatus: t('console.hardware.firmware.column.status'),
      columnTarget: t('console.hardware.firmware.column.target'),
      columnVersion: t('console.hardware.firmware.column.version'),
      confirm: t('console.hardware.common.confirm'),
      count: t('console.hardware.common.count', { count: '{{count}}' }),
      description: t('console.hardware.list.description'),
      deviceIdColumn: t('console.hardware.device.deviceId'),
      deviceIdHint: t('console.hardware.register.deviceIdHint'),
      deviceIdLabel: t('console.hardware.register.deviceId'),
      deviceTitle: t('console.hardware.device.title'),
      displayNameLabel: t('console.hardware.register.displayName'),
      download: t('console.hardware.firmware.download'),
      emptyDevices: t('console.hardware.list.empty'),
      emptyDevicesHint: t('console.hardware.list.emptyHint'),
      emptyFirmware: t('console.hardware.firmware.empty'),
      emptyFirmwareHint: t('console.hardware.firmware.emptyHint'),
      errors: {
        conflict: t('console.hardware.error.conflict'),
        forbidden: t('console.hardware.error.forbidden'),
        notFound: t('console.hardware.error.notFound'),
        unauthorized: t('console.hardware.error.unauthorized'),
        unavailable: t('console.hardware.error.unavailable'),
        validation: t('console.hardware.error.validation'),
      },
      firmwareDescription: t('console.hardware.firmware.description'),
      firmwareHint: t('console.hardware.firmware.hint'),
      firmwareTitle: t('console.hardware.firmware.title'),
      healthCritical: t('console.hardware.health.critical'),
      healthHealthy: t('console.hardware.health.healthy'),
      healthOffline: t('console.hardware.health.offline'),
      healthWarning: t('console.hardware.health.warning'),
      identityTitle: t('console.hardware.device.identity'),
      lastSeen: t('console.hardware.device.lastSeen'),
      loading: t('console.hardware.common.loading'),
      loadMore: t('console.hardware.common.loadMore'),
      managedOnly: t('console.hardware.firmware.managedOnly'),
      noMatches: t('console.hardware.common.noMatches'),
      noProducts: t('console.hardware.register.noProducts'),
      openDevice: t('console.hardware.list.open'),
      productColumn: t('console.hardware.device.product'),
      productHint: t('console.hardware.register.productHint'),
      productLabel: t('console.hardware.register.product'),
      readOnlyHint: t('console.hardware.list.readOnlyHint'),
      refresh: t('console.hardware.common.refresh'),
      register: t('console.hardware.list.register'),
      registerDescription: t('console.hardware.register.description'),
      registerTitle: t('console.hardware.register.title'),
      renameLabel: t('console.hardware.device.renameLabel'),
      renameSave: t('console.hardware.device.renameSave'),
      renamed: t('console.hardware.device.renamed'),
      required: t('console.hardware.common.required'),
      retry: t('console.hardware.common.retry'),
      saving: t('console.hardware.common.saving'),
      searchDevices: t('console.hardware.list.searchPlaceholder'),
      searchFirmware: t('console.hardware.firmware.searchPlaceholder'),
      selectPlaceholder: t('console.hardware.common.selectPlaceholder'),
      statAttention: t('console.hardware.list.stat.attention'),
      statBound: t('console.hardware.list.stat.bound'),
      statOnline: t('console.hardware.list.stat.online'),
      statTotal: t('console.hardware.list.stat.total'),
      tabDevices: t('console.menu.hardwareDevices'),
      tabFirmware: t('console.menu.hardwareFirmware'),
      title: t('console.hardware.list.title'),
    }),
    [t],
  );

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 flex-col"
      data-cloudrouter-hardware-console
      data-cloudrouter-hardware-screen={screen}
      data-cloudrouter-hardware-devices-path={HARDWARE_CONSOLE_BASE_PATH}
      data-cloudrouter-hardware-firmware-path={HARDWARE_CONSOLE_FIRMWARE_PATH}
    >
      {screen === 'firmware' ? (
        <SdkworkHardwareFirmwarePage
          className="min-w-0"
          copy={copy}
          onNavigate={handleNavigate}
          service={resolvedService}
        />
      ) : (
        <SdkworkHardwareDevicesPage
          canManage={canManage}
          className="min-w-0"
          copy={copy}
          onNavigate={handleNavigate}
          service={resolvedService}
        />
      )}
    </div>
  );
}
