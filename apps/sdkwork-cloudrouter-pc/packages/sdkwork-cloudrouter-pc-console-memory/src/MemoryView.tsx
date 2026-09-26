import {
  getSdkworkMemoryAppSdkClient,
  readCloudRouterRuntimeEnv,
  readPortalPermissionScope,
  resolveSdkworkSdkLocale,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import {
  MemoryConsoleEmbed,
  findMemoryConsoleModuleByRoute,
  memoryConsoleModules,
} from '@sdkwork/memory-pc-console-shell';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  MEMORY_CONSOLE_BASE_PATH,
  readMemoryConsoleModuleRoute,
  resolveMemoryConsoleLocale,
} from './memoryConsoleRoute.ts';

export interface MemoryViewProps {
  className?: string;
}

/**
 * Cloud Router user-console entry for the Memory capability.
 *
 * This package is a thin, UI-free adapter: it binds the host runtime (Memory app
 * SDK client, portal permission scope, runtime locale, console routing) to the
 * `MemoryConsoleEmbed` block owned by sdkwork-memory. It deliberately contains no
 * Memory presentation, no Memory business rules, and no direct generated-SDK
 * import — the shared runtime factory injects the client, which keeps the memory
 * app-api credential boundary in one place.
 */
export function MemoryView({ className }: MemoryViewProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Cloud Router owns no memory app-api surface: the console entry proxies the
  // federated sdkwork-memory service, which deployments attach through the
  // dedicated base-URL env key. Without it every request would fall back to
  // the same-origin app-api prefix and fail, so render an explicit
  // not-attached state instead of a page of guaranteed errors.
  const memorySurfaceConfigured = Boolean(
    readCloudRouterRuntimeEnv('VITE_SDKWORK_MEMORY_APP_API_BASE_URL'),
  );

  // Lazy singleton from the shared runtime boundary: the same instance already
  // used for session auth, locale propagation, and idempotency boundaries.
  const client = useMemo(() => getSdkworkMemoryAppSdkClient(), []);

  const activeModule = findMemoryConsoleModuleByRoute(
    readMemoryConsoleModuleRoute(location.pathname),
  );

  const handleModuleChange = useCallback(
    (moduleId: string) => {
      const nextModule = memoryConsoleModules.find((candidate) => candidate.id === moduleId);
      navigate(nextModule ? `${MEMORY_CONSOLE_BASE_PATH}/${nextModule.route}` : MEMORY_CONSOLE_BASE_PATH);
    },
    [navigate],
  );

  if (!memorySurfaceConfigured) {
    return (
      <div
        className={className}
        role="status"
        aria-live="polite"
      >
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('console.memory.notAttached.title', 'Memory is not attached to this deployment')}
          </p>
          <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
            {t(
              'console.memory.notAttached.hint',
              'This deployment has no memory service configured (VITE_SDKWORK_MEMORY_APP_API_BASE_URL). Contact the operator to enable it.',
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <MemoryConsoleEmbed
      className={className}
      client={client}
      locale={resolveMemoryConsoleLocale(resolveSdkworkSdkLocale())}
      moduleId={activeModule?.id}
      modules={memoryConsoleModules}
      onModuleChange={handleModuleChange}
      // Read per render on purpose: the granted scope lives in the signed app
      // session token and must never stay cached across a re-authentication.
      permissionScope={readPortalPermissionScope()}
    />
  );
}
