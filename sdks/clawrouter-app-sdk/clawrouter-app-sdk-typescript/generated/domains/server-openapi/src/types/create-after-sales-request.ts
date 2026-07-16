import type { CreateAfterSalesRequestItem } from './create-after-sales-request-item';

export interface CreateAfterSalesRequest {
  afterSalesType: string;
  currencyCode: string;
  description?: string;
  evidenceSnapshot?: Record<string, unknown>[];
  items: CreateAfterSalesRequestItem[];
  orderId: string;
  reasonCode: string;
  requestedAmount: string;
}
