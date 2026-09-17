import {
  createCloudRouterMpConsolePorts,
  resolveRuntimeEnv,
} from '@sdkwork/cloudrouter-mp-core';
import {
  createConsoleTranslator,
  resolveConsoleLocale,
  type SdkworkConsoleLocale,
} from '@sdkwork/cloudrouter-mp-i18n';

/**
 * Single mini-program bootstrap: environment selection, the generated app SDK
 * client, the console ports, and the translator, in the order required by
 * `APP_SDK_INTEGRATION_SPEC.md` §4.
 */
export interface CloudRouterMpRuntime {
  readonly locale: SdkworkConsoleLocale;
  readonly translate: (key: string) => string;
  readonly consolePorts: ReturnType<typeof createCloudRouterMpConsolePorts>;
}

export function bootstrapMiniProgramApplication(): CloudRouterMpRuntime {
  const environment = resolveRuntimeEnv();
  const locale = resolveConsoleLocale();
  return {
    locale,
    translate: createConsoleTranslator(locale),
    consolePorts: createCloudRouterMpConsolePorts(environment.appApiBaseUrl),
  };
}
