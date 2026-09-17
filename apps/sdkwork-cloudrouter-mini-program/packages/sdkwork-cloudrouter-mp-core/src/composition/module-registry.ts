import { CLOUDROUTER_CONSOLE_ROUTE_ORDER } from '@sdkwork/cloudrouter-contracts';

/** Module registry for the mini-program console surface, derived from the shared route order. */
export interface SdkworkMpConsoleModule {
  readonly id: string;
  readonly order: number;
}

export function listSdkworkMpConsoleModules(): readonly SdkworkMpConsoleModule[] {
  return CLOUDROUTER_CONSOLE_ROUTE_ORDER.map((routeKey, index) => ({
    id: `cloudrouter-mp-${routeKey}`,
    order: (index + 1) * 10,
  }));
}
