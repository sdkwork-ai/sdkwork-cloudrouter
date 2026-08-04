import type { AdminRechargePackage } from './admin-recharge-package';
import type { PageInfo } from './page-info';

/** Admin recharge package list response schema exposed by Claw Router. */
export interface AdminRechargePackageListResponse {
  /** Items field on admin recharge package list response. */
  items: AdminRechargePackage[];
  /** Page info field on admin recharge package list response. */
  pageInfo: PageInfo;
}
