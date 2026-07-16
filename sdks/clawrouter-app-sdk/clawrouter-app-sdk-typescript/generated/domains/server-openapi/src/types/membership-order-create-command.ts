export interface MembershipOrderCreateCommand {
  clientRequestNo?: string;
  packageId: string;
  paymentMethod: string;
  /** QR payment product. H5 returns the order-bound cashierUrl; native products create a provider payment intent. */
  paymentProduct?: 'mobile_cashier_h5' | 'wechat_native' | 'alipay_native';
  source?: string;
}
