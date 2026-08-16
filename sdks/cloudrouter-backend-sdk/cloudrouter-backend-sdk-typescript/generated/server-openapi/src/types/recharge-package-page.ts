import type { AdminRechargePackage } from './admin-recharge-package';
import type { PageInfo } from './page-info';

/** RechargePackagePage contract. */
export interface RechargePackagePage {
  /** items field on RechargePackagePage. */
  items: AdminRechargePackage[];
  /** Page info field on recharge package page. */
  pageInfo: PageInfo;
}
