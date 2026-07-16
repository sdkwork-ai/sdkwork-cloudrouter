export interface MembershipOrderCreateResult {
  amount: string;
  cashierUrl: string;
  currencyCode: string;
  durationDays: string;
  orderId: string;
  orderNo: string;
  outTradeNo: string;
  packageId: string;
  packageName: string;
  paymentId?: string | null;
  paymentMethod: string;
  paymentParams: Record<string, string>;
  paymentProduct: 'mobile_cashier_h5' | 'wechat_native' | 'alipay_native';
  qrCode: string;
  qrCodeType: 'cashier_url' | 'provider_native';
  status: string;
}
