import { hardwareAdminMessagesEn } from './en-US/aiot/hardware/hardware.ts';
import { hardwareAdminMessagesZh } from './zh-CN/aiot/hardware/hardware.ts';

/**
 * Smart Hardware Center message bundle (English + Simplified Chinese).
 *
 * Data only: the host i18n provider owns the i18next instance, and
 * `@sdkwork/cloudrouter-pc-i18n` composes this bundle into the admin catalog.
 */
export type HardwareMessageBundle = {
  en: Record<string, string>;
  zh: Record<string, string>;
};

export const hardwareAdminMessages: HardwareMessageBundle = {
  en: hardwareAdminMessagesEn,
  zh: hardwareAdminMessagesZh,
};
