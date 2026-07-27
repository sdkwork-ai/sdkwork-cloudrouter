/** Updated API key metadata. Authenticated owner management responses include copyableKey for console copy actions. */
export interface AppApiKeyItem {
  /** Channel group field on app api key item. */
  channelGroup: string;
  /** Display name snapshot for the bound channel group so the list view does not need to preload selectable groups. */
  channelGroupName?: string;
  /** Full plaintext API key returned only by authenticated owner management responses; public catalog responses omit this field. */
  copyableKey?: string;
  /** Created field on app api key item. */
  created: string;
  /** Whether this key is the current console default for backend runtime API key selection. */
  defaultForRuntime: boolean;
  /** Expires field on app api key item. */
  expires: string;
  /** Id field on app api key item. */
  id: string;
  /** Ip limit field on app api key item. */
  ipLimit: string;
  /** Masked key field on app api key item. */
  maskedKey: string;
  /** Modalities field on app api key item. */
  modalities: ('text' | 'image' | 'video' | 'audio' | 'music')[];
  /** Name field on app api key item. */
  name: string;
  /** Quota field on app api key item. */
  quota: string;
  /** Rate field on app api key item. */
  rate?: string | null;
  /** Status field on app api key item. */
  status: 'enabled' | 'disabled';
  /** Used quota field on app api key item. */
  usedQuota: string;
}
