/** App routing model group default schema exposed by Cloud Router. */
export interface AppRoutingModelGroupDefault {
  /** Account group code field on app routing model group default. */
  accountGroupCode: string;
  /** Account group id field on app routing model group default. */
  accountGroupId: string;
  /** Account group name field on app routing model group default. */
  accountGroupName: string;
  /** Modality field on app routing model group default. */
  modality: string;
  /** Model field on app routing model group default. */
  model: string;
  /** Priority field on app routing model group default. */
  priority: number;
  /** Scope field on app routing model group default. */
  scope: 'model' | 'vendor' | 'modality';
  /** Vendor code field on app routing model group default. */
  vendorCode: string;
}
