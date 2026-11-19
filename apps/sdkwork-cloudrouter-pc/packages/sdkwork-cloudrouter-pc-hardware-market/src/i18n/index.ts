import { hardwareMarketMessagesEn } from './en-US/commerce/hardware-market/hardware-market.ts';
import { hardwareMarketMessagesZh } from './zh-CN/commerce/hardware-market/hardware-market.ts';

/**
 * Smart Hardware Market message bundle (English + Simplified Chinese).
 *
 * Data only: the host i18n provider owns the i18next instance and
 * `@sdkwork/cloudrouter-pc-i18n` composes this bundle into the portal catalog.
 */
export type HardwareMarketMessageBundle = {
  en: Record<string, string>;
  zh: Record<string, string>;
};

export const hardwareMarketMessages: HardwareMarketMessageBundle = {
  en: hardwareMarketMessagesEn,
  zh: hardwareMarketMessagesZh,
};
