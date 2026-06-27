/** Admin site channel item schema exposed by Claw Router. */
export interface AdminSiteChannelItem {
  /** Channel code field on admin site channel item. */
  channelCode: string;
  /** Channel name field on admin site channel item. */
  channelName: string;
  /** Health status field on admin site channel item. */
  healthStatus: 'unknown' | 'healthy' | 'degraded' | 'unhealthy';
  /** Id field on admin site channel item. */
  id: string;
  /** Provider code field on admin site channel item. */
  providerCode?: string | null;
  /** Site channel role field on admin site channel item. */
  siteChannelRole?: string | null;
  /** Site code field on admin site channel item. */
  siteCode?: string | null;
  /** Site service code field on admin site channel item. */
  siteServiceCode?: string | null;
  /** Status field on admin site channel item. */
  status: 'active' | 'disabled';
}
