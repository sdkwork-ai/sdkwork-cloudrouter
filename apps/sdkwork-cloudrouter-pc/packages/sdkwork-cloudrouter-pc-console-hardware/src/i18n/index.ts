import { hardwareConsoleMessagesEn } from './en-US/aiot/hardware/console.ts';
import { hardwareConsoleMessagesZh } from './zh-CN/aiot/hardware/console.ts';

/**
 * Smart Hardware console message bundle (English + Simplified Chinese).
 *
 * Data only: the host i18n provider owns the i18next instance and
 * `@sdkwork/cloudrouter-pc-i18n` composes this bundle into the console/admin
 * catalog. The sidebar group labels live in the same fragment so the console
 * shell can render the group from the contribution.
 */
export type HardwareConsoleMessageBundle = {
  en: Record<string, string>;
  zh: Record<string, string>;
};

export const hardwareConsoleMessages: HardwareConsoleMessageBundle = {
  en: hardwareConsoleMessagesEn,
  zh: hardwareConsoleMessagesZh,
};
