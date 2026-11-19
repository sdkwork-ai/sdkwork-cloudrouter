import { vmInstancesConsoleMessagesEn } from './en-US/compute/vm-instances/console.ts';
import { vmInstancesConsoleMessagesZh } from './zh-CN/compute/vm-instances/console.ts';

/**
 * Virtual Machines console message bundle (English + Simplified Chinese).
 *
 * Data only: the host i18n provider owns the i18next instance and
 * `@sdkwork/cloudrouter-pc-i18n` composes this bundle into the console catalog.
 * The sidebar group labels live in the same fragment so the console shell can
 * render the group from the contribution.
 */
export type VmInstancesConsoleMessageBundle = {
  en: Record<string, string>;
  zh: Record<string, string>;
};

export const vmInstancesConsoleMessages: VmInstancesConsoleMessageBundle = {
  en: vmInstancesConsoleMessagesEn,
  zh: vmInstancesConsoleMessagesZh,
};
