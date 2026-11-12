import { useMemo, type ComponentType } from 'react';

import { getHardwareService, type HardwareService } from '../hardwareService.ts';
import {
  createCapabilityModelResource,
  createFirmwareArtifactResource,
  createFirmwareRolloutResource,
  createHardwareProfileResource,
  createProductResource,
  createProtocolProfileResource,
  type HardwareResourceDescriptor,
} from '../resources.ts';
import { ResourceBrowser } from '../components/ResourceBrowser.tsx';
import { HardwareToastProvider } from '../components/ui.tsx';

export interface HardwarePageProps {
  /** Test seam: a caller may supply a service bound to a stub client. */
  service?: HardwareService;
}

function bindResourcePage(
  build: (service: HardwareService) => HardwareResourceDescriptor,
): ComponentType<HardwarePageProps> {
  function HardwareResourcePage({ service }: HardwarePageProps) {
    const descriptor = useMemo(() => build(service ?? getHardwareService()), [service]);
    return (
      <HardwareToastProvider>
        <ResourceBrowser descriptor={descriptor} />
      </HardwareToastProvider>
    );
  }
  return HardwareResourcePage;
}

/** AIoT product catalog: the root aggregate every device inherits from. */
export const HardwareProductsPage = bindResourcePage(createProductResource);

/** Hardware capability profiles: chip family, runtime, connectivity, security, OTA. */
export const HardwareProfilesPage = bindResourcePage(createHardwareProfileResource);

/** Protocol profiles: transports, message classes, and capability bridges. */
export const HardwareProtocolProfilesPage = bindResourcePage(createProtocolProfileResource);

/** Capability (thing) models: properties, commands, events, and the settings schema. */
export const HardwareCapabilityModelsPage = bindResourcePage(createCapabilityModelResource);

/** Firmware artifacts: versioned, checksummed, signed binary metadata. */
export const HardwareFirmwareArtifactsPage = bindResourcePage(createFirmwareArtifactResource);

/** Firmware rollouts: staged distribution of one artifact to a target policy. */
export const HardwareFirmwareRolloutsPage = bindResourcePage(createFirmwareRolloutResource);
