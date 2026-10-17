import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, KeyRound, LayoutDashboard, Table2 } from 'lucide-react';

import { cn } from '@sdkwork/cloudrouter-h5-commons';

import { CONSOLE_NAVIGATION } from '../navigation/consoleNavigation.js';

export interface ConsoleShellLayoutProps {
  readonly title: string;
  readonly subtitle: string;
  readonly signOutLabel: string;
  readonly labelForKey: (key: string) => string;
  readonly headerAction?: ReactNode;
  readonly onSignOut: () => void;
  readonly children: ReactNode;
}

const ICONS = {
  dashboard: LayoutDashboard,
  usage: Table2,
  key: KeyRound,
  catalog: BarChart3,
} as const;

/**
 * Mobile console shell.
 *
 * Scroll containment follows `APP_MOBILE_REACT_UI_SPEC.md` section 5: the
 * viewport wrapper is a fixed-height `overflow: hidden` frame, the app canvas
 * below the header is the ONLY scroll container, and the bottom tab bar sits
 * outside that scroll flow (`position: fixed`), so the document itself never
 * scrolls and the tab bar never moves. The tab bar renders only on tab roots
 * because the shell wraps exactly the declared console tab routes; the sign-in
 * route renders without this shell. Selected tabs fill the same glyph
 * (`fill="currentColor"` on the stroke-based lucide set) instead of relying on
 * color alone.
 */
export function ConsoleShellLayout({
  title,
  subtitle,
  signOutLabel,
  labelForKey,
  headerAction,
  onSignOut,
  children,
}: ConsoleShellLayoutProps) {
  return (
    <div className="mx-auto flex h-screen h-[100dvh] max-w-lg flex-col overflow-hidden bg-[#141414] text-gray-100">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h1 className="text-base font-semibold">{title}</h1>
          <p className="text-[11px] text-gray-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {headerAction}
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-gray-300"
          >
            {signOutLabel}
          </button>
        </div>
      </header>
      <main className="cr-canvas flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-behavior-contain">
        {children}
      </main>
      <nav
        aria-label={title}
        className="cr-tabbar fixed bottom-0 left-1/2 grid w-full max-w-lg -translate-x-1/2 grid-cols-4 border-t border-white/10 bg-[#181818]"
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
                    'flex flex-col items-center gap-1 py-2 text-[10px]',
                    isActive ? 'text-white' : 'text-gray-400',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className="h-4 w-4"
                      aria-hidden
                      fill={isActive ? 'currentColor' : 'none'}
                    />
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
