import { useEffect, useMemo, useState } from 'react';
import {
  hasPortalPermission,
  readPortalPermissionScope,
  subscribePortalSessionChange,
} from '@sdkwork/cloudroutes-pc-commons/runtime';

import { CashierTokenSettingsPanel } from './components/CashierTokenSettingsPanel';

/**
 * Payment center → 支付设置 → 收银台密钥 page.
 *
 * Renders the epoch/rotation panel as a standalone sidebar destination. The
 * rotate action reuses the payment domain-settings update permission because the
 * key epoch is part of the same payment settings surface.
 */
export function CashierTokenSettingsAdmin() {
  const [permissionScope, setPermissionScope] = useState(() => readPortalPermissionScope());

  useEffect(() => {
    const sync = () => setPermissionScope(readPortalPermissionScope());
    sync();
    return subscribePortalSessionChange(sync);
  }, []);

  const canRotate = useMemo(
    () => hasPortalPermission('commerce.payments.domain_settings.update', permissionScope),
    [permissionScope],
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-auto p-4">
      <div className="mx-auto w-full max-w-5xl">
        <CashierTokenSettingsPanel canRotate={canRotate} />
      </div>
    </div>
  );
}
