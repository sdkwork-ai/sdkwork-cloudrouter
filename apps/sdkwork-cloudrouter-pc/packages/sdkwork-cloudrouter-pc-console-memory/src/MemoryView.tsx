import {
  getSdkworkMemoryAppSdkClient,
  readPortalPermissionScope,
  resolveSdkworkSdkLocale,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import {
  MemoryConsoleEmbed,
  findMemoryConsoleModuleByRoute,
  memoryConsoleModules,
} from '@sdkwork/memory-pc-console-shell';
import { useCallback, useMemo } from 'react';
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
