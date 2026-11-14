/**
 * Cloud Router adapter for the AIoT-owned Smart Hardware console.
 *
 * The capability — domain model, app-surface operations, and the console view —
 * lives in `@sdkwork/aiot-pc-console-hardware`. This module only binds that port
 * to the Cloud Router user session:
 *
 * - AIoT app client (AIoT app-api iot surface) for the user's own devices,
 *   device registration, firmware catalog, and the device metadata update that
 *   carries the agent binding;
 * - agents app client for the agent picker.
 */

import {
  createConsoleHardwareService,
  mapAgent,
  mapPage,
  type ConsoleHardwareAgent,
  type ConsoleHardwarePage,
  type ConsoleHardwareService,
} from '@sdkwork/aiot-pc-console-hardware';
import {
  getSdkworkAgentAppSdkClient,
  getSdkworkAiotAppSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';

// The port types are re-exported so host code and tests import them from the
// adapter instead of reaching into the AIoT package directly.
export type { ConsoleHardwareAgent, ConsoleHardwarePage, ConsoleHardwareService };
export type {
  ConsoleHardwareDevice,
  ConsoleHardwareFirmware,
  ConsoleHardwareProduct,
} from '@sdkwork/aiot-pc-console-hardware';

/** Binds the AIoT console port to the Cloud Router session clients. */
export function createCloudRouterHardwareService(): ConsoleHardwareService {
  return createConsoleHardwareService({
    resolveClient: () => getSdkworkAiotAppSdkClient(),
    resolveAgents: async (): Promise<ConsoleHardwarePage<ConsoleHardwareAgent>> => {
      const page = await getSdkworkAgentAppSdkClient().ai.agents.list({ page: 1, pageSize: 100 });
      return mapPage(page, mapAgent);
    },
  });
}
