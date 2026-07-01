import { useMemo, useState, useEffect } from 'react';
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

function sidebarItemClassName(isActive: boolean): string {
  return `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-lobster-50 text-lobster-600 dark:bg-lobster-500/10 dark:text-lobster-400'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
  }`;
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
        className={`flex w-full items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
          hasActiveChild
            ? 'text-lobster-500 dark:text-lobster-400'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
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
                aria-current={isActive ? 'page' : undefined}
                className={sidebarItemClassName(isActive)}
              >
                <item.icon className={`w-4 h-4 ${item.iconColor ?? ''}`} />
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
      aria-current={isActive ? 'page' : undefined}
      className={sidebarItemClassName(isActive)}
    >
      <item.icon className={`w-4 h-4 ${item.iconColor ?? ''}`} />
      {t(item.labelKey)}
    </Link>
  );
}

export function AdminLayout({ isDark, toggleTheme }: { isDark: boolean; toggleTheme: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [permissionScope, setPermissionScope] = useState(() => readPortalPermissionScope());

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
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              onClick={() => {
                void revokeAppSession();
                navigate('/', { replace: true });
              }}
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
