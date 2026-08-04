import type { AdminRechargeRecord } from './admin-recharge-record';
import type { PageInfo } from './page-info';

/** Admin recharge record list response schema exposed by Claw Router. */
export interface AdminRechargeRecordListResponse {
  /** Items field on admin recharge record list response. */
  items: AdminRechargeRecord[];
  /** Page info field on admin recharge record list response. */
  pageInfo: PageInfo;
}
