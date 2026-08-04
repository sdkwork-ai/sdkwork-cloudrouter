import type { PropsWithChildren } from 'react';
import { useOutletContext } from 'react-router-dom';

import type { ConsoleContextProps } from '@sdkwork/cloudrouter-pc-console-core';

import { createConsoleCommerceThemeStyle } from './consoleCommerceTheme.ts';

export interface CloudRouterConsoleCommerceSurfaceProps extends PropsWithChildren {
  isDark?: boolean;
  themeColor?: ConsoleContextProps['themeColor'];
}

export function CloudRouterConsoleCommerceSurface({
  children,
  isDark: isDarkProp,
  themeColor: themeColorProp,
}: CloudRouterConsoleCommerceSurfaceProps) {
  const outletContext = useOutletContext<ConsoleContextProps | undefined>();
  const isDark = isDarkProp ?? outletContext?.isDark ?? false;
  const themeColor = themeColorProp ?? outletContext?.themeColor ?? 'lobster';
  const themeStyle = createConsoleCommerceThemeStyle(isDark, themeColor);

  return (
    <div
      className="cloud-router-console-commerce-surface h-full min-h-0"
      data-cloud-router-commerce-surface=""
      style={themeStyle}
    >
      {children}
    </div>
  );
}
