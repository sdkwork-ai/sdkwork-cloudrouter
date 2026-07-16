export interface CreateAfterSalesRequestItem {
  evidenceSnapshot?: Record<string, unknown>[];
  orderItemId: string;
  reasonCode?: string;
  refundAmount?: string;
  replacementSkuId?: string;
  requestedQuantity: number;
  skuId?: string;
}
