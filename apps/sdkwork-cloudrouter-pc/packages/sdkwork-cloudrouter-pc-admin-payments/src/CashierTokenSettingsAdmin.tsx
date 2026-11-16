import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound } from 'lucide-react';
import {
  hasPortalPermission,
  readPortalPermissionScope,
  subscribePortalSessionChange,
} from '@sdkwork/cloudroutes-pc-commons/runtime';

import { CashierTokenSettingsPanel } from './components/CashierTokenSettingsPanel';

/**
 * Payment center → 支付设置 → 收银台密钥 page.
 *
 * Uses the same full-width shell as the sibling payment-settings pages: a page
 * header, then a section that stretches to the available width instead of a
 * centered narrow column.
 */
export function CashierTokenSettingsAdmin() {
  const { t } = useTranslation();
  const [permissionScope, setPermissionScope] = useState(() => readPortalPermissionScope());

  useEffect(() => {
    const sync = () => setPermissionScope(readPortalPermissionScope());
    sync();
    return subscribePortalSessionChange(sync);
  }, []);

  const canManage = useMemo(
    () => hasPortalPermission('commerce.payments.domain_settings.update', permissionScope),
    [permissionScope],
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-auto p-1" data-admin-payment-cashier-token>
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-lobster-500" />
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('admin.commerce.payments.cashierToken.pageTitle', '收银台密钥')}
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t(
            'admin.commerce.payments.cashierToken.pageDesc',
            'The cashier QR carries only a short s1. id; the real signed token is stored encrypted on the server and signed with this key. View or set the key, rotate it, and enable or disable the anonymous cashier.',
          )}
        </p>
        {canManage ? null : (
          <p
            className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
            role="status"
          >
            {t(
              'admin.commerce.payments.cashierToken.readOnlyHint',
              'You can view this page, but changing the key requires the payment settings update permission.',
            )}
          </p>
        )}
      </header>
      <CashierTokenSettingsPanel canManage={canManage} />
    </div>
  );
}
