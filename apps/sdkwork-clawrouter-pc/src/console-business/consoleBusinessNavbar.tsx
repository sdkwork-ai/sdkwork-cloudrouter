import { ClawRouterNavbarWalletEntry } from './ClawRouterNavbarWalletEntry.tsx';
import type { ClawRouterConsoleBusinessHostConfig } from './consoleBusinessConfig.ts';

export interface ClawRouterConsoleBusinessNavbarActionsProps
  extends ClawRouterConsoleBusinessHostConfig {
  isDark: boolean;
}

export function ClawRouterConsoleBusinessNavbarActions({
  isDark,
  routePrefix,
}: ClawRouterConsoleBusinessNavbarActionsProps) {
  return <ClawRouterNavbarWalletEntry isDark={isDark} routePrefix={routePrefix} />;
}
