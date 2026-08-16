import type { AdminRechargeRecord } from './admin-recharge-record';
import type { PageInfo } from './page-info';

/** AdminRechargeRecordPage contract. */
export interface AdminRechargeRecordPage {
  /** items field on AdminRechargeRecordPage. */
  items: AdminRechargeRecord[];
  /** Page info field on admin recharge record page. */
  pageInfo: PageInfo;
}
