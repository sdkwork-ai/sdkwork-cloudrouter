import type { AdminRechargeRecord } from './admin-recharge-record';

/** Admin recharge record response schema exposed by Claw Router. */
export interface AdminRechargeRecordResponse {
  /** Item field on admin recharge record response. */
  item: AdminRechargeRecord;
}
