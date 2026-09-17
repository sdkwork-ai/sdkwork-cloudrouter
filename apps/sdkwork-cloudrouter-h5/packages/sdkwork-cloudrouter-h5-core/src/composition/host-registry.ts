export interface SdkworkH5HostAdapterDescriptor {
  readonly id: string;
  readonly kind: 'storage' | 'navigation' | 'share' | 'clipboard';
}

/**
 * Browser host adapters registered by the H5 bootstrap. Capacitor adapters are
 * added by the optional `-h5-capacitor` host package when that profile ships.
 */
export const SDKWORK_H5_HOST_ADAPTERS: readonly SdkworkH5HostAdapterDescriptor[] = [
  { id: 'h5-browser-storage', kind: 'storage' },
  { id: 'h5-browser-history', kind: 'navigation' },
  { id: 'h5-browser-clipboard', kind: 'clipboard' },
];

export function listSdkworkH5HostAdapters(): readonly SdkworkH5HostAdapterDescriptor[] {
  return SDKWORK_H5_HOST_ADAPTERS;
}
