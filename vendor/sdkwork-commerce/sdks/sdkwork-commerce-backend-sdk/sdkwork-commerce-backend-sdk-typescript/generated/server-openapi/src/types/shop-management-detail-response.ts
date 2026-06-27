import type { ShopDetail } from './shop-detail';

export interface ShopManagementDetailResponse {
  code: string;
  message: string;
  /** Server-owned request correlation id. */
  requestId: string;
  data: ShopDetail;
}
