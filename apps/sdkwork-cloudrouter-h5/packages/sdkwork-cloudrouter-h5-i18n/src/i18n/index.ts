// Thin i18n registry: no authored copy lives here, only the per-locale merge of
// the `<locale>/<domain>/<capability>/<fragment>` message fragments.
import { sharedMessages as ZhCnShared } from './zh-CN/cloudrouter/console/shared.js';
import { dashboardMessages as ZhCnDashboard } from './zh-CN/cloudrouter/console/dashboard.js';
import { usageMessages as ZhCnUsage } from './zh-CN/cloudrouter/console/usage.js';
import { apiKeysMessages as ZhCnApiKeys } from './zh-CN/cloudrouter/console/apiKeys.js';
import { catalogMessages as ZhCnCatalog } from './zh-CN/cloudrouter/console/catalog.js';
import { signInMessages as ZhCnSignIn } from './zh-CN/cloudrouter/auth/signIn.js';
import { sharedMessages as EnUsShared } from './en-US/cloudrouter/console/shared.js';
import { dashboardMessages as EnUsDashboard } from './en-US/cloudrouter/console/dashboard.js';
import { usageMessages as EnUsUsage } from './en-US/cloudrouter/console/usage.js';
import { apiKeysMessages as EnUsApiKeys } from './en-US/cloudrouter/console/apiKeys.js';
import { catalogMessages as EnUsCatalog } from './en-US/cloudrouter/console/catalog.js';
import { signInMessages as EnUsSignIn } from './en-US/cloudrouter/auth/signIn.js';
import { SDKWORK_CONSOLE_DEFAULT_LOCALE, type SdkworkConsoleLocale } from '../locale.js';

export type SdkworkConsoleMessages = Record<string, string>;

export const SDKWORK_CONSOLE_MESSAGES: Record<SdkworkConsoleLocale, SdkworkConsoleMessages> = {
  'zh-CN': {
    ...ZhCnShared,
    ...ZhCnDashboard,
    ...ZhCnUsage,
    ...ZhCnApiKeys,
    ...ZhCnCatalog,
    ...ZhCnSignIn,
  },
  'en-US': {
    ...EnUsShared,
    ...EnUsDashboard,
    ...EnUsUsage,
    ...EnUsApiKeys,
    ...EnUsCatalog,
    ...EnUsSignIn,
  },
};

export function resolveConsoleMessages(locale: SdkworkConsoleLocale): SdkworkConsoleMessages {
  return SDKWORK_CONSOLE_MESSAGES[locale] ?? SDKWORK_CONSOLE_MESSAGES[SDKWORK_CONSOLE_DEFAULT_LOCALE];
}

/** Falls back to the default locale, then to the key itself, never to undefined. */
export function createConsoleTranslator(locale: SdkworkConsoleLocale): (key: string) => string {
  const messages = resolveConsoleMessages(locale);
  const fallback = SDKWORK_CONSOLE_MESSAGES[SDKWORK_CONSOLE_DEFAULT_LOCALE];
  return (key: string) => messages[key] ?? fallback[key] ?? key;
}
