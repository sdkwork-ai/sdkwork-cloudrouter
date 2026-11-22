/** App routing model group default request schema exposed by Cloud Router. */
export interface AppRoutingModelGroupDefaultRequest {
  /** Backward-compatible single-group form; merged into accountGroups. */
  accountGroup?: string;
  /** Ordered failover list of group ids or codes; replaces the scope's list. */
  accountGroups?: string[];
  /** Modality field on app routing model group default request. */
  modality?: 'text' | 'image' | 'video' | 'audio' | 'music' | null;
  /** Model field on app routing model group default request. */
  model?: string | null;
  /** Scope field on app routing model group default request. */
  scope: 'model' | 'vendor' | 'modality';
  /** Vendor code field on app routing model group default request. */
  vendorCode?: string | null;
}
