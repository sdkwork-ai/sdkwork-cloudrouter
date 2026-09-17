/**
 * WeChat host adapters registered by the mini-program bootstrap. Every adapter
 * goes through a `wx.*` API so the core stays free of host globals and the
 * storage/session boundary stays replaceable in tests.
 */
export interface SdkworkMpHostAdapterDescriptor {
  readonly id: string;
  readonly kind: 'storage' | 'navigation' | 'share' | 'clipboard';
}

export const SDKWORK_MP_HOST_ADAPTERS: readonly SdkworkMpHostAdapterDescriptor[] = [
  { id: 'mp-weixin-storage', kind: 'storage' },
  { id: 'mp-weixin-navigation', kind: 'navigation' },
  { id: 'mp-weixin-share', kind: 'share' },
  { id: 'mp-weixin-clipboard', kind: 'clipboard' },
];

export function listSdkworkMpHostAdapters(): readonly SdkworkMpHostAdapterDescriptor[] {
  return SDKWORK_MP_HOST_ADAPTERS;
}
