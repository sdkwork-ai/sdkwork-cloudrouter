import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Table2,
  UserRound,
} from 'lucide-react';

import { CLOUDROUTER_CONSOLE_TABS } from '@sdkwork/cloudrouter-contracts';
import { cn } from '@sdkwork/cloudrouter-h5-commons';

import { CONSOLE_NAVIGATION } from '../navigation/consoleNavigation.js';

export interface ConsoleShellLayoutProps {
  /** Operator-configured site name; used only for the navigation landmark label. */
  readonly brandName: string;
  readonly labelForKey: (key: string) => string;
  readonly children: ReactNode;
}

const ICONS = {
  dashboard: LayoutDashboard,
  usage: Table2,
  key: KeyRound,
  catalog: BarChart3,
  messages: MessageSquare,
  playground: Sparkles,
  profile: UserRound,
} as const;

/**
 * Mobile cloud-app shell.
 *
 * The top bar is a native mobile title bar: only the current page title is
 * rendered, centered. Brand marks, account actions, and the theme switch are
 * intentionally absent; account actions live in the "我的" tab and appearance
 * lives in the shared settings page. The frame is a fixed `100dvh` shell, so the
 * bar stays visible while the app canvas below it is the only scroll container
 * (`APP_MOBILE_REACT_UI_SPEC.md` section 5).
 *
 * The bottom tab bar renders only on tab roots because the shell wraps exactly
 * the declared console tab routes; auth, membership, and recharge screens render
 * without it. Selected tabs fill the same glyph (`fill="currentColor"`) instead
 * of relying on color alone.
 */
export function ConsoleShellLayout({
  brandName,
  labelForKey,
  children,
}: ConsoleShellLayoutProps) {
  const location = useLocation();
  const activeEntry = CONSOLE_NAVIGATION.find(
    (entry) =>
      location.pathname === entry.path || location.pathname.startsWith(`${entry.path}/`),
  );
  const sharedTab = CLOUDROUTER_CONSOLE_TABS.find((tab) => tab.path === location.pathname);
  const pageTitle = activeEntry
    ? labelForKey(activeEntry.labelKey)
    : sharedTab
      ? labelForKey(sharedTab.titleKey)
      : labelForKey('cloudrouter.console.shared.homeTab');

  return (
    <div className="mx-auto flex h-screen h-[100dvh] max-w-lg flex-col overflow-hidden bg-canvas text-ink">
      <header className="relative z-20 flex shrink-0 items-center justify-center border-b border-line bg-surface px-[0.9rem] pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
        <h1 className="min-w-0 truncate text-[16px] font-semibold tracking-tight text-ink">
          {pageTitle}
        </h1>
      </header>
      <main className="cr-canvas flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-behavior-contain">
        {children}
      </main>
      <nav
        aria-label={brandName}
        className="cr-tabbar fixed bottom-0 left-1/2 grid w-full max-w-lg -translate-x-1/2 grid-cols-5 border-t border-line bg-surface"
      >
        {[...CONSOLE_NAVIGATION]
          .sort((left, right) => left.order - right.order)
          .map((entry) => {
            const Icon = ICONS[entry.icon];
            return (
              <NavLink
                key={entry.key}
                to={entry.path}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 pt-2 pb-1.5 text-[10px] transition-colors',
                    isActive ? 'font-semibold text-brand' : 'text-ink-subtle',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                        isActive ? 'bg-brand-soft' : 'bg-transparent',
                      )}
                    >
                      <Icon
                        className="h-4 w-4"
                        aria-hidden
                        fill={isActive ? 'currentColor' : 'none'}
                      />
                    </span>
                    {labelForKey(entry.labelKey)}
                  </>
                )}
              </NavLink>
            );
          })}
      </nav>
    </div>
  );
}
