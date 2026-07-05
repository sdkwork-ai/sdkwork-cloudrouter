export interface ReviewAfterSalesRequest {
  reviewAction: string;
  status?: string;
  refundStatus?: string;
  returnStatus?: string;
  exchangeStatus?: string;
  approvedAmount?: string;
  replacementOrderId?: string;
  reasonCode?: string;
  reasonDetail?: string;
  reviewComment?: string;
}
