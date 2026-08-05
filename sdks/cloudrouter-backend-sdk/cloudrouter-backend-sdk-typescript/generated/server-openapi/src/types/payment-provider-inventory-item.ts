/** Payment provider inventory item schema exposed by Cloud Router. */
export interface PaymentProviderInventoryItem {
  /** Capabilities field on payment provider inventory item. */
  capabilities: ('payment_intent' | 'payment_query' | 'payment_close' | 'refund' | 'webhook' | 'reconciliation')[];
  /** Created at field on payment provider inventory item. */
  createdAt?: string | null;
  /** Display name field on payment provider inventory item. */
  displayName: string;
  /** Id field on payment provider inventory item. */
  id: string;
  /** Provider code field on payment provider inventory item. */
  providerCode: 'wechat_pay' | 'alipay' | 'stripe' | 'paypal' | 'apple_pay' | 'google_pay' | 'yeepay' | 'unionpay' | 'jd_pay' | 'lianlian_pay' | 'lakala' | 'allinpay' | 'china_ums' | 'fuiou_pay' | 'sandpay' | 'huifu_pay' | 'baofoo' | 'bill99' | 'pingan_pay' | 'icbc_pay' | 'cmb_pay' | 'ccb_pay' | 'boc_pay' | 'psbc_pay' | 'tenpay' | 'bestpay' | 'unicom_pay' | 'cmcc_pay' | 'baidu_pay' | 'suning_pay' | 'meituan_pay' | 'didi_pay' | 'mi_pay' | 'huawei_pay' | 'douyin_pay' | 'duoduo_pay' | 'netease_pay' | 'suixingfu' | 'leshua' | 'shouqianba' | 'qfpay' | 'fubei' | 'yinsheng' | 'umf' | 'kuaijietong' | 'ips' | 'payease' | 'cicc_pay' | 'guofubao' | 'worldfirst' | 'sunrate' | 'xtransfer' | 'abc_pay' | 'bocom_pay' | 'spdb_pay' | 'cib_pay' | 'cmbc_pay' | 'ceb_pay' | 'citic_pay' | 'pab_pay' | 'huaxia_pay' | 'cgb_pay' | 'adyen' | 'worldpay' | 'fiserv' | 'global_payments' | 'checkout' | 'cybersource' | 'authorizenet' | 'square' | 'braintree' | 'amazon_pay' | 'nuvei' | 'rapyd' | 'dlocal' | 'payu' | 'payoneer' | 'airwallex' | 'c2p' | 'klarna' | 'afterpay' | 'gmo_pg' | 'kcp' | 'paystack' | 'flutterwave' | 'telr' | 'tap_payments' | 'noon_payments' | 'moyasar' | 'razorpay' | 'paytm' | 'phonepe' | 'ccavenue' | 'cashfree' | 'billdesk' | 'gcash' | 'maya' | 'grabpay' | 'gopay' | 'ovo' | 'dana' | 'shopee_pay' | 'truemoney' | 'momo' | 'zalo_pay' | 'vnpay' | 'touch_n_go' | 'boost' | 'kakaopay' | 'naver_pay' | 'toss_pay' | 'paypay' | 'line_pay' | 'rakuten_pay' | 'merpay' | 'd_barai' | 'jkopay' | 'mercadopago' | 'pagseguro' | 'ebanx' | 'clip' | 'conekta' | 'pingpong';
  /** Provider type field on payment provider inventory item. */
  providerType: string;
  /** Sort order field on payment provider inventory item. */
  sortOrder: number;
  /** Status field on payment provider inventory item. */
  status: 'active' | 'inactive' | 'disabled';
  /** Supported countries field on payment provider inventory item. */
  supportedCountries: string[];
  /** Supported currencies field on payment provider inventory item. */
  supportedCurrencies: string[];
  /** Updated at field on payment provider inventory item. */
  updatedAt?: string | null;
}
