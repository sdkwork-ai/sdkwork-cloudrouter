import React, { useState, useCallback, useEffect, type ReactNode } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Crown,
  Key,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  Ticket,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import { Navbar } from '@sdkwork/clawroutes-pc-commons';
import { revokeAppSession } from '@sdkwork/clawroutes-pc-commons/runtime';

import { useTranslation } from 'react-i18next';

const CONSOLE_SIDEBAR_GROUPS_DEFAULT_OPEN = true;

type ConsoleMenuItem = {
  path: string;
  labelKey: string;
  fallbackLabel: string;
  icon: LucideIcon;
};

type ConsoleMenuGroup = {
  groupKey: string;
  fallbackLabel: string;
  items: ConsoleMenuItem[];
};

function itemBlock(item: ConsoleMenuItem): ConsoleMenuItem {
  return item;
}

function groupBlock(groupKey: string, fallbackLabel: string, items: ConsoleMenuItem[]): ConsoleMenuGroup {
  return { groupKey, fallbackLabel, items };
}

const consoleSidebarItems = [
  itemBlock({ path: '/console/dashboard', labelKey: 'console.menu.dashboard', fallbackLabel: 'Dashboard', icon: LayoutDashboard }),
];

const consoleSidebarGroups = [
  groupBlock('console.menu.group.integration', 'Access & Routing', [
    itemBlock({ path: '/console/api-keys', labelKey: 'console.menu.apiKeys', fallbackLabel: 'Token management', icon: Key }),
  ]),
  groupBlock('console.menu.group.accountBusiness', 'Account & Commerce', [
    itemBlock({ path: '/console/account', labelKey: 'console.menu.account', fallbackLabel: 'Account overview', icon: CreditCard }),
    itemBlock({ path: '/console/wallet', labelKey: 'console.menu.wallet', fallbackLabel: 'Wallet & top-up', icon: Wallet }),
    itemBlock({ path: '/console/coupons', labelKey: 'console.menu.coupons', fallbackLabel: 'Coupons', icon: Ticket }),
    itemBlock({ path: '/console/memberships', labelKey: 'console.menu.memberships', fallbackLabel: 'Memberships', icon: Crown }),
    itemBlock({ path: '/console/settlements', labelKey: 'console.menu.settlements', fallbackLabel: 'Bills and Reports', icon: Receipt }),
  ]),
  groupBlock('console.menu.group.observability', 'Usage & Observability', [
    itemBlock({ path: '/console/usage', labelKey: 'console.menu.usage', fallbackLabel: 'Call statistics', icon: Activity }),
  ]),
  groupBlock('console.menu.group.notificationsSettings', 'Notifications & Settings', [
    itemBlock({ path: '/console/settings', labelKey: 'console.menu.settings', fallbackLabel: 'Configuration center', icon: Settings }),
  ]),
];

export type ConsoleThemePreference = 'system' | 'light' | 'dark';
export type ConsoleThemeColorPreference = 'lobster' | 'blue' | 'emerald' | 'violet' | 'amber';

export interface ConsoleContextProps {
  isDark: boolean;
  toggleTheme: () => void;
  theme: ConsoleThemePreference;
  setTheme: (theme: ConsoleThemePreference) => void;
  themeColor: ConsoleThemeColorPreference;
  setThemeColor: (themeColor: ConsoleThemeColorPreference) => void;
}

interface ConsoleLayoutProps {
  isDark: boolean;
  navbarAuthenticatedActionsStart?: ReactNode;
  toggleTheme: () => void;
  theme: ConsoleThemePreference;
  setTheme: (theme: ConsoleThemePreference) => void;
  themeColor: ConsoleThemeColorPreference;
  setThemeColor: (themeColor: ConsoleThemeColorPreference) => void;
}

function isConsoleSidebarItemActive(pathname: string, item: ConsoleMenuItem): boolean {
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

function ConsoleSidebarItem({
  item,
  sidebarOpen,
}: {
  item: ConsoleMenuItem;
  sidebarOpen: boolean;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const isActive = isConsoleSidebarItemActive(location.pathname, item);
  const Icon = item.icon;
  const itemName = t(item.labelKey, item.fallbackLabel);

  return (
    <Link
      key={item.path}
      to={item.path}
      data-active={isActive ? 'true' : 'false'}
      aria-current={isActive ? 'page' : undefined}
      className={`sdkwork-portal-sidebar-item ${sidebarOpen ? '' : 'sdkwork-portal-sidebar-item--icon-only'}`}
      title={!sidebarOpen ? itemName : undefined}
    >
      <Icon className="sdkwork-portal-sidebar-item__icon" />
      <div className="sdkwork-portal-sidebar-item__label">
        {sidebarOpen && <span>{itemName}</span>}
      </div>
    </Link>
  );
}

function ConsoleSidebarGroup({
  group,
  sidebarOpen,
  defaultOpen,
}: {
  group: ConsoleMenuGroup;
  sidebarOpen: boolean;
  defaultOpen: boolean;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasActiveChild = group.items.some((item) => isConsoleSidebarItemActive(location.pathname, item));
  const shouldRenderItems = !sidebarOpen || isOpen;

  return (
    <div className="mb-1">
      {sidebarOpen && (
        <button
          onClick={() => setIsOpen((current) => !current)}
          data-active={hasActiveChild ? 'true' : 'false'}
          className="sdkwork-portal-sidebar-group-label"
          type="button"
        >
          <span>{t(group.groupKey, group.fallbackLabel)}</span>
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      )}
      {shouldRenderItems && (
        <div className="flex flex-col gap-0.5">
          {group.items.map((item) => (
            <ConsoleSidebarItem key={item.path} item={item} sidebarOpen={sidebarOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ConsoleLayout({
  isDark,
  navbarAuthenticatedActionsStart,
  toggleTheme,
  theme,
  setTheme,
  themeColor,
  setThemeColor,
}: ConsoleLayoutProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth > 180 && newWidth < 480) {
        setSidebarWidth(newWidth);
        setSidebarOpen(true);
      } else if (newWidth <= 180) {
        setSidebarOpen(false);
      }
    }
  }, [isResizing]);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      document.body.style.cursor = '';
    }
    return () => {
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const currentWidth = sidebarOpen ? sidebarWidth : 80;

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await revokeAppSession();
    } finally {
      navigate('/', { replace: true });
    }
  }, [isLoggingOut, navigate]);

  return (
    <div className="sdkwork-console-shell flex h-[100dvh] min-h-0 w-full max-w-none flex-col overflow-hidden bg-slate-50 selection:bg-lobster-500/30 dark:bg-[#121212]">
      <Navbar
        authenticatedActionsStart={navbarAuthenticatedActionsStart}
        isDark={isDark}
        toggleTheme={toggleTheme}
      />

      <div className="flex min-h-0 w-full max-w-none flex-1 overflow-hidden pt-16">
        {/* Sidebar */}
        <div
          style={{ width: `${currentWidth}px` }}
          className={`shrink-0 bg-white dark:bg-[#1e1e1e] border-r border-slate-200 dark:border-white/5 flex flex-col relative z-20 group ${!isResizing && 'transition-all duration-300'}`}
        >

          {/* Drag & Collapse Handle */}
          <div
            className={`absolute right-0 top-0 w-2 h-full cursor-col-resize z-50 flex items-center justify-center transition-colors ${isResizing ? 'bg-lobster-500' : 'hover:bg-lobster-500/50 opacity-0 group-hover:opacity-100'}`}
            onMouseDown={startResizing}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen(!sidebarOpen);
                if (!sidebarOpen) {
                  setSidebarWidth(256); // Reset to default when opening
                }
              }}
              className="absolute -right-3.5 p-1 bg-white dark:bg-[#252525] border border-slate-200 dark:border-white/10 rounded-full shadow-md text-slate-500 hover:text-lobster-500 hover:border-lobster-500/50 dark:hover:border-lobster-500/50 opacity-0 group-hover:opacity-100 transition-all z-50 cursor-pointer flex items-center justify-center"
            >
              {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Main Nav */}
          <nav className="flex-1 overflow-y-auto pt-6 pb-6 px-3 flex flex-col gap-1 custom-scrollbar">
            {consoleSidebarItems.map((item) => (
              <ConsoleSidebarItem key={item.path} item={item} sidebarOpen={sidebarOpen} />
            ))}
            <div className={sidebarOpen ? 'my-2 h-px bg-slate-200 dark:bg-white/10' : 'my-2'} />
            {consoleSidebarGroups.map((group) => (
              <ConsoleSidebarGroup
                key={group.groupKey}
                group={group}
                sidebarOpen={sidebarOpen}
                defaultOpen={CONSOLE_SIDEBAR_GROUPS_DEFAULT_OPEN}
              />
            ))}
          </nav>

          {/* Logout Nav */}
          <div className="p-3 border-t border-slate-200 dark:border-white/10 flex flex-col gap-1 overflow-hidden">
             <button
                aria-busy={isLoggingOut}
                disabled={isLoggingOut}
                onClick={() => void handleLogout()}
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:cursor-wait disabled:opacity-60"
                title={!sidebarOpen ? t("console.core.consolelayout.text.12hokt7", "Log out") : undefined}
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <div className="overflow-hidden whitespace-nowrap">
                  {sidebarOpen && <span>{t("console.core.consolelayout.text.12hokt7", "Log out")}</span>}
                </div>
             </button>
          </div>
        </div>

        {/* Main Content Pane */}
        <div className="custom-scrollbar flex h-full min-h-0 w-full max-w-none min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-[#121212]">
          <main className="claw-router-console-commerce-surface min-w-0 w-full max-w-none flex-1">
            <Outlet context={{ isDark, toggleTheme, theme, setTheme, themeColor, setThemeColor }} />
          </main>
        </div>

      </div>
    </div>
  );
}
