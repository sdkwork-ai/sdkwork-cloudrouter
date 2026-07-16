export interface UpdateAfterSalesRequest {
  approvedAmount?: string;
  currencyCode?: string;
  description?: string;
  evidenceSnapshot?: Record<string, unknown>[];
  reasonCode?: string;
  requestedAmount?: string;
  reviewerNote?: string;
  /** Target status for the after-sales request lifecycle transition. */
  status?: string;
}
