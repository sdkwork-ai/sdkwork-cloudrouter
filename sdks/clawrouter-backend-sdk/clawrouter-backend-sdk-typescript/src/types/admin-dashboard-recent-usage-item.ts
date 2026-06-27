/** Admin dashboard recent usage item schema exposed by Claw Router. */
export interface AdminDashboardRecentUsageItem {
  /** Billing mode field on admin dashboard recent usage item. */
  billingMode: string;
  /** Cost field on admin dashboard recent usage item. */
  cost: string;
  /** Id field on admin dashboard recent usage item. */
  id: string;
  /** Is api user field on admin dashboard recent usage item. */
  isApiUser: boolean;
  /** Model field on admin dashboard recent usage item. */
  model: string;
  /** Status field on admin dashboard recent usage item. */
  status: string;
  /** Time field on admin dashboard recent usage item. */
  time: string;
  /** Type field on admin dashboard recent usage item. */
  type: string;
  /** Usage count field on admin dashboard recent usage item. */
  usageCount?: number;
  /** Usage in field on admin dashboard recent usage item. */
  usageIn?: number;
  /** Usage out field on admin dashboard recent usage item. */
  usageOut?: number;
  /** User field on admin dashboard recent usage item. */
  user: string;
}
