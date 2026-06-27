import { createElement, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  readPortalPermissionScope,
  subscribePortalSessionChange,
} from '@sdkwork/clawroutes-pc-commons/runtime';

import { isAdminRouteAllowed } from './admin-menu-permissions.ts';

export function AdminRoutePermissionGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { t } = useTranslation();
  const [permissionScope, setPermissionScope] = useState(() => readPortalPermissionScope());

  useEffect(() => {
    const syncPermissionScope = () => setPermissionScope(readPortalPermissionScope());
    syncPermissionScope();
    return subscribePortalSessionChange(syncPermissionScope);
  }, []);

  if (!isAdminRouteAllowed(location.pathname, permissionScope)) {
    return createElement(
      'div',
      {
        className:
          'flex min-h-full flex-col items-center justify-center gap-3 px-6 py-24 text-center',
        role: 'alert',
      },
      createElement(
        'h1',
        {
          className: 'text-lg font-semibold text-slate-900 dark:text-white',
        },
        t('shared.auth.adminAccess.forbiddenTitle'),
      ),
      createElement(
        'p',
        {
          className: 'max-w-md text-sm text-slate-600 dark:text-slate-300',
        },
        t('shared.auth.adminAccess.forbiddenDescription'),
      ),
    );
  }

  return createElement('div', { className: 'min-h-0 flex-1 flex flex-col overflow-hidden' }, children);
}
