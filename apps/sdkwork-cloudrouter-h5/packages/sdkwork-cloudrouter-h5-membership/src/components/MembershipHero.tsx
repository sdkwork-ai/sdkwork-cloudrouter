import { ChevronRight, Crown, Sparkles, Ticket, WalletCards } from 'lucide-react';

import type { MembershipTranslate } from '../catalog/membershipDefinition.js';
import type { MembershipMemberProfile } from '../runtime.js';

export interface MembershipHeroProps {
  readonly levelName: string;
  readonly onOpenRedeem: () => void;
  readonly onOpenTokenBankDetails: () => void;
  readonly onOpenTokenBankRecharge: () => void;
  readonly onSignIn: () => void;
  readonly profile: MembershipMemberProfile | null;
  readonly signedIn: boolean;
  readonly t: MembershipTranslate;
  /** Spendable Token Bank compute credits, or null when unavailable. */
  readonly tokenBankBalance: number | null;
}

function formatPoints(value: number | null): string {
  if (value === null) {
    return '--';
  }
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string | undefined): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/**
 * Member status card: the signed-in level, validity, and Token Bank balance.
 *
 * This is the mobile answer to the PC token-plan header — same membership facts
 * (current level, remaining validity, compute-credit balance) with the balance
 * and the three commerce entries (`购买算力积分` / `会员兑换` / `算力积分详情`)
 * promoted to thumb reach instead of a desktop text row.
 */
export function MembershipHero({
  levelName,
  onOpenRedeem,
  onOpenTokenBankDetails,
  onOpenTokenBankRecharge,
  onSignIn,
  profile,
  signedIn,
  t,
  tokenBankBalance,
}: MembershipHeroProps) {
  const isMember = Boolean(profile?.active) && signedIn;
  const expiryLabel = formatDate(profile?.expiresAt);
  const remainingLabel = profile?.remainingDays !== null && profile?.remainingDays !== undefined
    ? t('hero.remainingDays', '{days} 天后到期').replace('{days}', String(profile.remainingDays))
    : null;

  return (
    <section
      className="mx-3 mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#3b82f6] p-4 text-white shadow-lg shadow-blue-500/20"
      data-membership-hero
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Crown aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
            {t('hero.eyebrow', 'Cloud Router 会员')}
          </p>
          <h1 className="mt-1 truncate text-[21px] font-bold leading-tight" data-membership-level>
            {levelName}
          </h1>
          <p className="mt-1 text-[12px] text-white/80">
            {signedIn
              ? isMember
                ? expiryLabel
                  ? t('hero.expiresAt', '有效期至 {date}').replace('{date}', expiryLabel)
                  : t('hero.memberHint', '会员权益生效中')
                : t('hero.upgradeHint', '开通会员，解锁算力积分与专属通道')
              : t('hero.guestHint', '登录后查看会员等级与算力积分')}
          </p>
          {isMember && remainingLabel ? (
            <p className="mt-0.5 text-[11px] text-white/70">{remainingLabel}</p>
          ) : null}
        </div>
        {!signedIn ? (
          <button
            className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[#1d4ed8] active:opacity-90"
            onClick={onSignIn}
            type="button"
          >
            {t('hero.signIn', '去登录')}
          </button>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl bg-white/10 px-3 py-2.5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[11px] text-white/70">
              <WalletCards aria-hidden="true" className="h-3.5 w-3.5" />
              {t('hero.tokenBank', 'Token Bank 算力积分')}
            </p>
            <p className="mt-1 text-[24px] font-bold leading-none tabular-nums" data-membership-token-bank>
              {signedIn ? formatPoints(tokenBankBalance) : '--'}
            </p>
          </div>
          <button
            className="shrink-0 rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-medium active:bg-white/30"
            onClick={signedIn ? onOpenTokenBankRecharge : onSignIn}
            type="button"
          >
            {t('hero.recharge', '充值')}
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 divide-x divide-white/15 rounded-xl bg-white/10 py-2">
        <button
          className="flex flex-col items-center gap-1 px-1 text-[11px] font-medium active:opacity-80"
          onClick={signedIn ? onOpenTokenBankRecharge : onSignIn}
          type="button"
        >
          <Sparkles aria-hidden="true" className="h-4 w-4" />
          {t('hero.buyPoints', '购买算力积分')}
        </button>
        <button
          className="flex flex-col items-center gap-1 px-1 text-[11px] font-medium active:opacity-80"
          onClick={signedIn ? onOpenRedeem : onSignIn}
          type="button"
        >
          <Ticket aria-hidden="true" className="h-4 w-4" />
          {t('hero.redeem', '会员兑换')}
        </button>
        <button
          className="flex flex-col items-center gap-1 px-1 text-[11px] font-medium active:opacity-80"
          onClick={signedIn ? onOpenTokenBankDetails : onSignIn}
          type="button"
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
          {t('hero.pointsDetails', '算力积分详情')}
        </button>
      </div>
    </section>
  );
}
