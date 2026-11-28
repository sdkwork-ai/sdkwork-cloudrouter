import { useTranslation } from 'react-i18next';
import type { MembershipsAdminAudience } from '../membershipsService';

type MembershipTranslate = (key: string, fallback: string) => string;

/** Localized audience name (`personal` | `team`). */
export function membershipAudienceLabel(audience: string, t: MembershipTranslate): string {
  const normalized = audience.trim().toLowerCase();
  if (normalized === 'team') {
    return t('admin.commerce.memberships.audience.team', 'Enterprise');
  }
  return t('admin.commerce.memberships.audience.personal', 'Personal');
}

const audienceClasses: Record<MembershipsAdminAudience, string> = {
  personal: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
  team: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300',
};

interface MembershipAudienceBadgeProps {
  audience: string;
  /** Show the catalog meaning under the name (used in the plan table). */
  hint?: boolean;
}

/**
 * Audience badge: who can buy the plan.
 *
 * Kept visually distinct from the plan-family badge so the two classification
 * axes (who buys / which product family) never blur together.
 */
export function MembershipAudienceBadge({ audience, hint = false }: MembershipAudienceBadgeProps) {
  const { t } = useTranslation();
  const normalized: MembershipsAdminAudience =
    audience.trim().toLowerCase() === 'team' ? 'team' : 'personal';
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${audienceClasses[normalized]}`}>
        {membershipAudienceLabel(normalized, t)}
      </span>
      {hint ? (
        <span className="text-[10px] leading-tight text-slate-400 dark:text-slate-500">
          {normalized === 'team'
            ? t('admin.commerce.memberships.audience.teamHint', 'Organization seats')
            : t('admin.commerce.memberships.audience.personalHint', 'Single account')}
        </span>
      ) : null}
    </span>
  );
}
