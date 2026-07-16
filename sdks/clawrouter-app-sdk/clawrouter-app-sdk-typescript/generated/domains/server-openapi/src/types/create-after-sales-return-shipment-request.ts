export interface CreateAfterSalesReturnShipmentRequest {
  carrierCode: string;
  carrierName?: string;
  packageSnapshot?: Record<string, unknown>[];
  shipFromAddressSnapshot?: Record<string, unknown>;
  shipToAddressSnapshot?: Record<string, unknown>;
  shipmentDirection?: string;
  shippedAt?: string;
  trackingNo: string;
}
