/** Updated API key metadata. Secret material is never returned by update operations. */
export interface AppApiKeyItem {
  /** Account group field on app api key item. */
  accountGroup: string;
  /** Display name snapshot for the bound upstream account group. */
  accountGroupName: string;
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
