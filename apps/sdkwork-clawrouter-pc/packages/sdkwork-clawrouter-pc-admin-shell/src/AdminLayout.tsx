import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AdminHeader, getActiveModuleFromPath, type AdminModuleId } from './AdminHeader.tsx';
import { getFilteredAdminModuleMenu } from './admin-menu-permissions.ts';
import { AdminRoutePermissionGuard } from './AdminRoutePermissionGuard.tsx';
import { hasActiveSidebarGroupItem, isSidebarItemActive } from './adminSidebarActive';
import type { AdminMenuGroup, AdminMenuItem } from './adminModuleRegistry.ts';
import {
  readPortalPermissionScope,
  revokeAppSession,
  subscribePortalSessionChange,
} from '@sdkwork/clawroutes-pc-commons/runtime';

const ADMIN_SIDEBAR_GROUPS_DEFAULT_OPEN = true;

function sidebarItemClassName(): string {
  return 'sdkwork-portal-sidebar-item';
}

function SidebarGroup({
  group,
  defaultOpen,
}: {
  group: AdminMenuGroup;
  defaultOpen: boolean;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const hasActiveChild = hasActiveSidebarGroupItem(location.pathname, group);

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-active={hasActiveChild ? 'true' : 'false'}
        className="sdkwork-portal-sidebar-group-label"
        type="button"
      >
        <span>{t(group.groupKey)}</span>
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
      </button>
      {isOpen && (
        <div className="flex flex-col gap-0.5">
          {group.items.map((item) => {
            const isActive = isSidebarItemActive(location.pathname, item, group.items);

            return (
              <Link
                key={item.path}
                to={item.path}
                data-active={isActive ? 'true' : 'false'}
                aria-current={isActive ? 'page' : undefined}
                className={sidebarItemClassName()}
              >
                <item.icon className={`sdkwork-portal-sidebar-item__icon w-4 h-4 ${item.iconColor ?? ''}`} />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SidebarItem({
  item,
  siblingItems,
}: {
  item: AdminMenuItem;
  siblingItems: readonly AdminMenuItem[];
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const isActive = isSidebarItemActive(location.pathname, item, siblingItems);

  return (
    <Link
      key={item.path}
      to={item.path}
      data-active={isActive ? 'true' : 'false'}
      aria-current={isActive ? 'page' : undefined}
      className={sidebarItemClassName()}
    >
      <item.icon className={`sdkwork-portal-sidebar-item__icon w-4 h-4 ${item.iconColor ?? ''}`} />
      {t(item.labelKey)}
    </Link>
  );
}

export function AdminLayout({ isDark, toggleTheme }: { isDark: boolean; toggleTheme: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [permissionScope, setPermissionScope] = useState(() => readPortalPermissionScope());
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const syncPermissionScope = () => setPermissionScope(readPortalPermissionScope());
    syncPermissionScope();
    return subscribePortalSessionChange(syncPermissionScope);
  }, []);

  const activeModule = useMemo<AdminModuleId>(
    () => getActiveModuleFromPath(location.pathname),
    [location.pathname],
  );

  const currentModuleMenu = useMemo(
    () => getFilteredAdminModuleMenu(activeModule, permissionScope),
    [activeModule, permissionScope],
  );

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
    <div
      className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-slate-50 dark:bg-black font-sans text-slate-900 dark:text-white"
    >
      <AdminHeader
        isDark={isDark}
        toggleTheme={toggleTheme}
        activeModule={activeModule}
        onModuleChange={() => {}}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden pt-16">
        <div className="w-64 min-h-0 bg-white dark:bg-[#121212] border-r border-slate-200 dark:border-white/10 flex flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-2">
            {currentModuleMenu.items?.map((item) => (
              <SidebarItem key={item.path} item={item} siblingItems={currentModuleMenu.items ?? []} />
            ))}
            {currentModuleMenu.groups.map((group) => (
              <SidebarGroup
                key={group.groupKey}
                group={group}
                defaultOpen={ADMIN_SIDEBAR_GROUPS_DEFAULT_OPEN}
              />
            ))}
          </div>
          <div className="p-3 border-t border-slate-200 dark:border-white/10 shrink-0">
            <button
              aria-busy={isLoggingOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:cursor-wait disabled:opacity-60"
              disabled={isLoggingOut}
              onClick={() => void handleLogout()}
              type="button"
            >
              <LogOut className="w-4 h-4" />
              {t('admin.menu.logout')}
            </button>
          </div>
        </div>

        <div className="flex-1 flex min-h-0 flex-col overflow-hidden bg-slate-50 dark:bg-[#0a0a0a] min-w-0 relative">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-[5px]">
            <AdminRoutePermissionGuard>
              <Outlet />
            </AdminRoutePermissionGuard>
          </div>
        </div>
      </div>
    </div>
  );
}
