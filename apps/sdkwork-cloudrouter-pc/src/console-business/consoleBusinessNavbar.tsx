import { CloudRouterNavbarWalletEntry } from './CloudRouterNavbarWalletEntry.tsx';
import type { CloudRouterConsoleBusinessHostConfig } from './consoleBusinessConfig.ts';

export interface CloudRouterConsoleBusinessNavbarActionsProps
  extends CloudRouterConsoleBusinessHostConfig {
  isDark: boolean;
}

export function CloudRouterConsoleBusinessNavbarActions({
  isDark,
  routePrefix,
}: CloudRouterConsoleBusinessNavbarActionsProps) {
  return <CloudRouterNavbarWalletEntry isDark={isDark} routePrefix={routePrefix} />;
}
