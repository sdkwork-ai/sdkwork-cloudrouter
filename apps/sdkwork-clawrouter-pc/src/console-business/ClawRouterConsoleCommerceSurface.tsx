import type { PropsWithChildren } from 'react';
import { useOutletContext } from 'react-router-dom';

import type { ConsoleContextProps } from '@sdkwork/clawrouter-pc-console-core';

import { createConsoleCommerceThemeStyle } from './consoleCommerceTheme.ts';

export interface ClawRouterConsoleCommerceSurfaceProps extends PropsWithChildren {
  isDark?: boolean;
  themeColor?: ConsoleContextProps['themeColor'];
}

export function ClawRouterConsoleCommerceSurface({
  children,
  isDark: isDarkProp,
  themeColor: themeColorProp,
}: ClawRouterConsoleCommerceSurfaceProps) {
  const outletContext = useOutletContext<ConsoleContextProps | undefined>();
  const isDark = isDarkProp ?? outletContext?.isDark ?? false;
  const themeColor = themeColorProp ?? outletContext?.themeColor ?? 'lobster';
  const themeStyle = createConsoleCommerceThemeStyle(isDark, themeColor);

  return (
    <div
      className="claw-router-console-commerce-surface h-full min-h-0"
      data-claw-router-commerce-surface=""
      style={themeStyle}
    >
      {children}
    </div>
  );
}
