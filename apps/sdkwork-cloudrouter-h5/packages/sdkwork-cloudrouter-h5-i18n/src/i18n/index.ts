// Thin i18n registry: no authored copy lives here, only the per-locale merge of
// the `<locale>/<domain>/<capability>/<fragment>` message fragments.
import { sharedMessages as ZhCnShared } from './zh-CN/cloudrouter/console/shared.js';
import { homeMessages as ZhCnHome } from './zh-CN/cloudrouter/console/home.js';
import { dashboardMessages as ZhCnDashboard } from './zh-CN/cloudrouter/console/dashboard.js';
import { usageMessages as ZhCnUsage } from './zh-CN/cloudrouter/console/usage.js';
import { apiKeysMessages as ZhCnApiKeys } from './zh-CN/cloudrouter/console/apiKeys.js';
import { catalogMessages as ZhCnCatalog } from './zh-CN/cloudrouter/console/catalog.js';
import { profileMessages as ZhCnProfile } from './zh-CN/cloudrouter/console/profile.js';
import { playgroundMessages as ZhCnPlayground } from './zh-CN/cloudrouter/console/playground.js';
import { settingsMessages as ZhCnSettings } from './zh-CN/cloudrouter/console/settings.js';
import { signInMessages as ZhCnSignIn } from './zh-CN/cloudrouter/auth/signIn.js';
import { appAuthMessages as ZhCnAppAuth } from './zh-CN/cloudrouter/auth/app.js';
import { sharedMessages as EnUsShared } from './en-US/cloudrouter/console/shared.js';
import { homeMessages as EnUsHome } from './en-US/cloudrouter/console/home.js';
import { dashboardMessages as EnUsDashboard } from './en-US/cloudrouter/console/dashboard.js';
import { usageMessages as EnUsUsage } from './en-US/cloudrouter/console/usage.js';
import { apiKeysMessages as EnUsApiKeys } from './en-US/cloudrouter/console/apiKeys.js';
import { catalogMessages as EnUsCatalog } from './en-US/cloudrouter/console/catalog.js';
import { profileMessages as EnUsProfile } from './en-US/cloudrouter/console/profile.js';
import { playgroundMessages as EnUsPlayground } from './en-US/cloudrouter/console/playground.js';
import { settingsMessages as EnUsSettings } from './en-US/cloudrouter/console/settings.js';
import { signInMessages as EnUsSignIn } from './en-US/cloudrouter/auth/signIn.js';
import { appAuthMessages as EnUsAppAuth } from './en-US/cloudrouter/auth/app.js';
import { SDKWORK_CONSOLE_DEFAULT_LOCALE, type SdkworkConsoleLocale } from '../locale.js';

export type SdkworkConsoleMessages = Record<string, string>;

export const SDKWORK_CONSOLE_MESSAGES: Record<SdkworkConsoleLocale, SdkworkConsoleMessages> = {
  'zh-CN': {
    ...ZhCnShared,
    ...ZhCnHome,
    ...ZhCnDashboard,
    ...ZhCnUsage,
    ...ZhCnApiKeys,
    ...ZhCnCatalog,
    ...ZhCnProfile,
    ...ZhCnPlayground,
    ...ZhCnSettings,
    ...ZhCnSignIn,
    ...ZhCnAppAuth,
  },
  'en-US': {
    ...EnUsShared,
    ...EnUsHome,
    ...EnUsDashboard,
    ...EnUsUsage,
    ...EnUsApiKeys,
    ...EnUsCatalog,
    ...EnUsProfile,
    ...EnUsPlayground,
    ...EnUsSettings,
    ...EnUsSignIn,
    ...EnUsAppAuth,
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
