import { useTranslation } from 'react-i18next';
import { CalendarClock, Repeat, ShoppingBag, Tag } from 'lucide-react';
import {
  classifyPurchaseModel,
  normalizeBillingCycles,
  type MembershipsAdminPurchaseModel,
} from '../planTaxonomy';
import { membershipBillingCycleLabel } from './MembershipPageControls';

type MembershipTranslate = (key: string, fallback: string) => string;

const purchaseModelStyles: Record<MembershipsAdminPurchaseModel, string> = {
  subscription: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  one_time: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
  mixed: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300',
  unlisted: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400',
};

/** Localized purchase-model name. */
export function membershipPurchaseModelLabel(
  model: MembershipsAdminPurchaseModel,
  t: MembershipTranslate,
): string {
  switch (model) {
    case 'subscription':
      return t('admin.commerce.memberships.purchaseModel.subscription', 'Subscription');
    case 'one_time':
      return t('admin.commerce.memberships.purchaseModel.oneTime', 'One-time');
    case 'mixed':
      return t('admin.commerce.memberships.purchaseModel.mixed', 'Subscription + One-time');
    default:
      return t('admin.commerce.memberships.purchaseModel.unlisted', 'Not on sale');
  }
}

const purchaseModelIcon: Record<MembershipsAdminPurchaseModel, typeof Repeat> = {
  subscription: Repeat,
  one_time: ShoppingBag,
  mixed: Tag,
  unlisted: Tag,
};

interface MembershipPurchaseModelBadgeProps {
  billingCycles: readonly string[];
}

/**
 * Purchase-model badge derived from the plan's package coverage.
 *
 * The model is never stored on the plan: it is computed from the packages that
 * sell it, so an operator cannot desynchronise "how it is billed" from the real
 * packages.
 */
export function MembershipPurchaseModelBadge({ billingCycles }: MembershipPurchaseModelBadgeProps) {
  const { t } = useTranslation();
  const model = classifyPurchaseModel(billingCycles);
  const Icon = purchaseModelIcon[model];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${purchaseModelStyles[model]}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {membershipPurchaseModelLabel(model, t)}
    </span>
  );
}

interface MembershipBillingCycleChipsProps {
  billingCycles: readonly string[];
}

/** Canonical, de-duplicated cycle chips (`once`, `month`, …). */
export function MembershipBillingCycleChips({ billingCycles }: MembershipBillingCycleChipsProps) {
  const { t } = useTranslation();
  const cycles = normalizeBillingCycles(billingCycles);
  if (cycles.length === 0) {
    return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>;
  }
  return (
    <span className="flex flex-wrap items-center gap-1">
      {cycles.map((cycle) => (
        <span
          key={cycle}
          className="inline-flex items-center gap-0.5 rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600 dark:border-white/10 dark:text-slate-300"
        >
          <CalendarClock className="h-3 w-3 text-slate-400" aria-hidden="true" />
          {membershipBillingCycleLabel(cycle, t)}
        </span>
      ))}
    </span>
  );
}
