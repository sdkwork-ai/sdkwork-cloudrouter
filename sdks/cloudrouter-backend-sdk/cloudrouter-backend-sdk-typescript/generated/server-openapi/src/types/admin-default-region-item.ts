/** Admin default region item schema exposed by Cloud Router. */
export interface AdminDefaultRegionItem {
  /** Catalog key field on admin default region item. */
  catalogKey: string;
  /** Created at field on admin default region item. */
  createdAt?: string | null;
  /** Currency code field on admin default region item. */
  currencyCode: string;
  /** Default region code field on admin default region item. */
  defaultRegionCode: string;
  /** Description field on admin default region item. */
  description?: string | null;
  /** Effective from field on admin default region item. */
  effectiveFrom?: string | null;
  /** Effective to field on admin default region item. */
  effectiveTo?: string | null;
  /** Id field on admin default region item. */
  id: string;
  /** Product code field on admin default region item. */
  productCode: string;
  /** Status field on admin default region item. */
  status: 'active' | 'inactive';
  /** Updated at field on admin default region item. */
  updatedAt?: string | null;
  /** Vendor code field on admin default region item. */
  vendorCode: string;
  /** Version field on admin default region item. */
  version: string;
}
