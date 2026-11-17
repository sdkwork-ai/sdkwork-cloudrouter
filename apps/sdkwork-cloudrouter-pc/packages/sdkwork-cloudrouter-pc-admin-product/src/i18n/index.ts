import { productCenterMessagesEn } from './en-US/product/product-center/product-center.ts';
import { productCenterMessagesZh } from './zh-CN/product/product-center/product-center.ts';

/**
 * Product Center message bundle (English + Simplified Chinese).
 *
 * Data only: the host i18n provider owns the i18next instance and
 * `@sdkwork/cloudrouter-pc-i18n` composes this bundle into the admin catalog.
 */
export type ProductCenterMessageBundle = {
  en: Record<string, string>;
  zh: Record<string, string>;
};

export const productCenterAdminMessages: ProductCenterMessageBundle = {
  en: productCenterMessagesEn,
  zh: productCenterMessagesZh,
};
