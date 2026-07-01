import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useConsoleBusinessNavigation } from './consoleBusinessNavigation.ts';

interface QuickActionItem {
  descriptionKey: string;
  descriptionFallback: string;
  href: string;
  titleKey: string;
  titleFallback: string;
}

export function ConsoleAccountQuickActions() {
  const { t } = useTranslation();
  const {
    couponsPath,
    membershipsPath,
    settlementsPath,
    walletPath,
  } = useConsoleBusinessNavigation();

  const actions: QuickActionItem[] = [
    {
      titleKey: 'console.account.quickActions.recharge.title',
      titleFallback: 'Recharge',
      descriptionKey: 'console.account.quickActions.recharge.description',
      descriptionFallback: 'Top up your balance',
      href: walletPath,
    },
    {
      titleKey: 'console.account.quickActions.redeem.title',
      titleFallback: 'Redeem code',
      descriptionKey: 'console.account.quickActions.redeem.description',
      descriptionFallback: 'Apply promo codes and manage coupons',
      href: couponsPath,
    },
    {
      titleKey: 'console.account.quickActions.membership.title',
      titleFallback: 'Membership',
      descriptionKey: 'console.account.quickActions.membership.description',
      descriptionFallback: 'View plans and upgrade',
      href: membershipsPath,
    },
    {
      titleKey: 'console.account.quickActions.billing.title',
      titleFallback: 'Billing',
      descriptionKey: 'console.account.quickActions.billing.description',
      descriptionFallback: 'Invoices and usage reports',
      href: settlementsPath,
    },
    {
      titleKey: 'console.account.quickActions.profile.title',
      titleFallback: 'Profile',
      descriptionKey: 'console.account.quickActions.profile.description',
      descriptionFallback: 'Account and security settings',
      href: '/console/user',
    },
  ];

  return (
    <section aria-label={t('console.account.quickActions.sectionLabel', 'Shortcuts')}>
      <h2 className="text-sm font-medium text-[var(--sdk-color-text-primary)]">
        {t('console.account.quickActions.title', 'Billing & account')}
      </h2>

      <div className="mt-3 overflow-hidden rounded-[var(--sdk-radius-panel)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)]">
        {actions.map((action, index) => (
          <Link
            className={`group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--sdk-color-surface-panel-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sdk-color-border-focus)] ${
              index > 0 ? 'border-t border-[var(--sdk-color-border-subtle)]' : ''
            }`}
            key={action.href}
            to={action.href}
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[var(--sdk-color-text-primary)]">
                {t(action.titleKey, action.titleFallback)}
              </div>
              <div className="mt-0.5 text-xs text-[var(--sdk-color-text-secondary)]">
                {t(action.descriptionKey, action.descriptionFallback)}
              </div>
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-[var(--sdk-color-text-muted)] transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
