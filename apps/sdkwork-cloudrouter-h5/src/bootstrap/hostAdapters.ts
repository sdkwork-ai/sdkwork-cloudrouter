import { listSdkworkH5HostAdapters } from '@sdkwork/cloudrouter-h5-core';

export interface CloudRouterH5HostAdapterRegistration {
  readonly registered: readonly string[];
}

/** Registers the browser host adapters declared by the H5 core composition. */
export function registerHostAdapters(): CloudRouterH5HostAdapterRegistration {
  return { registered: listSdkworkH5HostAdapters().map((adapter) => adapter.id) };
}
