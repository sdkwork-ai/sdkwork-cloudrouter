import { CLOUDROUTER_CONSOLE_ROUTE_ORDER } from '@sdkwork/cloudrouter-contracts';

/** Module registry for the H5 console surface, derived from the shared route order. */
export interface SdkworkH5ConsoleModule {
  readonly id: string;
  readonly order: number;
}

export function listSdkworkH5ConsoleModules(): readonly SdkworkH5ConsoleModule[] {
  return CLOUDROUTER_CONSOLE_ROUTE_ORDER.map((routeKey, index) => ({
    id: `cloudrouter-h5-${routeKey}`,
    order: (index + 1) * 10,
  }));
}
