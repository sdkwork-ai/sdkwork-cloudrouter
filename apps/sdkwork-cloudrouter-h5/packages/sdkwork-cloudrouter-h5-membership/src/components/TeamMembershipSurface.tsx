import { CircleAlert, Crown, Loader2, RefreshCw, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { MembershipTranslate } from '../catalog/membershipDefinition.js';
import {
  isTeamSubscriptionUnbound,
  TeamSubscriptionError,
  type TeamErrorReason,
  type TeamOrganizationChoice,
  type TeamSeatPolicyInput,
} from '../team/teamContract.js';
import { teamErrorCopy, teamRoleLabel } from '../team/teamErrorCopy.js';
import { useTeamMembership } from '../team/useTeamMembership.js';
import type { MembershipPaymentMethod, MembershipTeamCatalog } from '../runtime.js';
import { TeamCheckoutSheet } from './TeamCheckoutSheet.js';
import { TeamPlanCards, type TeamBuyDraft } from './TeamPlanCards.js';
import { TeamSeatManagement } from './TeamSeatManagement.js';

export type TeamNotifyTone = 'error' | 'success';

export interface TeamMembershipSurfaceProps {
  readonly onNotify: (message: string, tone: TeamNotifyTone) => void;
  readonly onSignIn: () => void;
  readonly t: MembershipTranslate;
}

function reasonOf(cause: unknown): TeamErrorReason {
  return cause instanceof TeamSubscriptionError ? cause.reason : 'unknown';
}

function actionErrorMessage(cause: unknown, t: MembershipTranslate): string {
  if (cause instanceof TeamSubscriptionError) {
    return teamErrorCopy(cause.reason, t);
  }
  return cause instanceof Error && cause.message
    ? cause.message
    : t('team.loadFailed', '团队订阅加载失败。');
}

function formatTeamDate(value: string | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/**
 * Cloud Router mobile organization (team) membership surface.
 *
 * One audience tab of `/membership`. It presents the team subscription the same
 * way the PC `/token-plan` team surface does — overview, plan purchase with seat
 * counts, seat directory with assign/revoke, over-seat policy, reconcile, and
 * the unbound "buy first, bind later" step — composed for thumb navigation:
 * plan cards with steppers, inline policy controls, and a bottom checkout sheet.
 */
export function TeamMembershipSurface({ onNotify, onSignIn, t }: TeamMembershipSurfaceProps) {
  const team = useTeamMembership();
  const {
    composition,
    directory,
    error,
    loadCatalog,
    loadMoreDirectory,
    organizationChoices,
    organizationName,
    overview,
    refresh,
    retry,
    status,
  } = team;
  const [catalog, setCatalog] = useState<MembershipTeamCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [expanding, setExpanding] = useState(false);
  const [draft, setDraft] = useState<TeamBuyDraft | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [binding, setBinding] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  const runtime = team.runtime;
  const unbound = overview ? isTeamSubscriptionUnbound(overview) : false;
  const hasOrgScope = Boolean(overview?.organizationId.trim())
    && !unbound;
  const showPlans = overview !== null
    && (!overview.hasSubscription || expanding)
    && !unbound;

  useEffect(() => {
    if (!showPlans || catalog || catalogLoading) {
      return;
    }
    setCatalogLoading(true);
    setCatalogError(null);
    void loadCatalog().then(
      (next) => {
        setCatalog(next);
        setCatalogLoading(false);
      },
      (cause: unknown) => {
        setCatalogError(actionErrorMessage(cause, t));
        setCatalogLoading(false);
      },
    );
  }, [catalog, catalogLoading, loadCatalog, showPlans, t]);

  const effectiveOrganizationName = useMemo(
    () => organizationName ?? composition?.organizationName,
    [composition?.organizationName, organizationName],
  );

  async function handleSwitch(organizationId: string) {
    setSwitching(organizationId);
    setActionError(null);
    setNeedsSignIn(false);
    try {
      await team.switchOrganization(organizationId);
      onNotify(t('team.organizationSwitched', '已切换团队组织。'), 'success');
    } catch (cause) {
      const message = actionErrorMessage(cause, t);
      setActionError(message);
      setNeedsSignIn(reasonOf(cause) === 'organization_sign_in_required');
    } finally {
      setSwitching(null);
    }
  }

  async function handleBind(organizationId: string) {
    setBinding(organizationId);
    setActionError(null);
    setNeedsSignIn(false);
    try {
      await team.bindOrganization(organizationId);
      onNotify(t('team.bindSuccess', '团队订阅已绑定组织。'), 'success');
    } catch (cause) {
      setActionError(actionErrorMessage(cause, t));
      setNeedsSignIn(reasonOf(cause) === 'organization_sign_in_required');
    } finally {
      setBinding(null);
    }
  }

  async function handleAssign(userId: string) {
    await team.assignSeat(userId);
    onNotify(t('team.seatAssigned', '已分配坐席。'), 'success');
  }

  async function handleRevoke(userId: string) {
    await team.revokeSeat(userId);
    onNotify(t('team.seatRevoked', '已回收坐席。'), 'success');
  }

  async function handleReconcile() {
    await team.reconcile();
    onNotify(t('team.reconcileSuccessToast', '已同步组织成员与坐席。'), 'success');
  }

  async function handleSavePolicy(input: TeamSeatPolicyInput) {
    await team.savePolicy(input);
    onNotify(t('team.policy.saved', '坐席策略已更新。'), 'success');
  }

  async function handleCheckout(method: MembershipPaymentMethod) {
    if (!runtime || !draft) {
      return;
    }
    setSubmitting(true);
    setCheckoutError(null);
    try {
      const outcome = await runtime.createTeamCheckout({
        action: draft.action,
        packageId: draft.packageId,
        paymentMethod: method,
        seats: draft.seats,
      });
      if (outcome.cashierUrl) {
        window.location.assign(outcome.cashierUrl);
        return;
      }
      if (outcome.status === 'completed') {
        setDraft(null);
        setExpanding(false);
        onNotify(t('team.checkoutSuccess', '团队会员开通成功。'), 'success');
        await refresh();
        return;
      }
      if (outcome.status === 'pending') {
        setDraft(null);
        onNotify(t('team.pending', '支付处理中，请稍后在订单中心查看。'), 'success');
        return;
      }
      setCheckoutError(t('team.checkoutFailed', '团队订阅支付未能发起。'));
    } catch (cause) {
      setCheckoutError(actionErrorMessage(cause, t));
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="mx-3 mt-3 flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-12">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-brand" />
        <p className="text-[12px] text-ink-subtle">{t('team.loading', '正在加载团队订阅…')}</p>
      </div>
    );
  }

  if (status === 'error' && error) {
    if (error.reason === 'unauthenticated' || !runtime?.signedIn) {
      return (
        <div className="mx-3 mt-3 rounded-2xl border border-line bg-surface px-4 py-8 text-center">
          <Crown aria-hidden="true" className="mx-auto h-6 w-6 text-brand" />
          <p className="mt-2 text-[15px] font-semibold text-ink">
            {t('team.signInTitle', '登录后管理团队会员')}
          </p>
          <p className="mt-1 text-[12px] leading-snug text-ink-subtle">
            {t('team.signInHint', '团队坐席按组织授权，登录后即可购买与管理团队会员。')}
          </p>
          <button
            className="mt-4 min-h-11 w-full rounded-full bg-brand-fill text-[14px] font-semibold text-on-brand"
            onClick={onSignIn}
            type="button"
          >
            {t('hero.signIn', '去登录')}
          </button>
        </div>
      );
    }
    return (
      <div className="mx-3 mt-3 rounded-2xl border border-line bg-surface px-4 py-8 text-center">
        <CircleAlert aria-hidden="true" className="mx-auto h-5 w-5 text-danger" />
        <p className="mt-2 text-[13px] text-ink-muted">{teamErrorCopy(error.reason, t)}</p>
        <button
          className="mt-3 min-h-9 rounded-full border border-line px-4 text-[12px] font-medium text-ink"
          onClick={() => void retry()}
          type="button"
        >
          {t('team.retry', '重试')}
        </button>
      </div>
    );
  }

  if (!overview) {
    return null;
  }

  const bindableChoices = organizationChoices.filter(
    (choice) => choice.role === 'owner' || choice.role === 'admin',
  );

  return (
    <div className="flex flex-col gap-3 px-3 pb-4 pt-3" data-team-membership-surface>
      {/* Overview */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f766e] via-[#0d9488] to-[#14b8a6] p-4 text-white shadow-lg shadow-teal-500/20">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
              {t('team.overview.eyebrow', 'Cloud Router 团队会员')}
            </p>
            <h2 className="mt-1 truncate text-[20px] font-bold leading-tight" data-team-overview>
              {effectiveOrganizationName ?? (
                overview.organizationId
                  ? overview.organizationId
                  : t('team.overview.noOrganization', '未选择团队组织')
              )}
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-white/80">
              {unbound ? (
                <span className="rounded bg-white/20 px-1.5 py-0.5 font-semibold">
                  {t('team.overview.unbound', '待绑定组织')}
                </span>
              ) : null}
              {composition?.viewerRole ? (
                <span className="rounded bg-white/15 px-1.5 py-0.5">
                  {teamRoleLabel(composition.viewerRole, t)}
                </span>
              ) : null}
              {overview.planName ? (
                <span className="rounded bg-white/15 px-1.5 py-0.5">{overview.planName}</span>
              ) : null}
            </p>
          </div>
          <button
            aria-label={t('team.refresh', '刷新团队订阅')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
            onClick={() => void refresh()}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <p className="flex items-center gap-1 text-[10px] text-white/70">
              <Users aria-hidden="true" className="h-3 w-3" />
              {t('team.overview.seats', '团队坐席')}
            </p>
            <p className="mt-0.5 text-[18px] font-bold leading-none tabular-nums">
              {overview.seatsUsed}
              <span className="text-[12px] font-medium text-white/70">
                {' / '}
                {overview.seatsPurchased}
              </span>
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <p className="text-[10px] text-white/70">
              {t('team.overview.expiresAt', '到期时间')}
            </p>
            <p className="mt-0.5 truncate text-[13px] font-semibold">
              {formatTeamDate(overview.expiresAt) || '--'}
            </p>
          </div>
        </div>

        {!unbound && overview.hasSubscription ? (
          <button
            className="mt-3 min-h-10 w-full rounded-full bg-white/20 text-[13px] font-semibold active:bg-white/30 disabled:opacity-50"
            disabled={expanding}
            onClick={() => setExpanding(true)}
            type="button"
          >
            {t('team.overview.expand', '扩容团队坐席')}
          </button>
        ) : null}
      </section>

      {/* Organization scope / switch */}
      {!hasOrgScope && !unbound ? (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h3 className="text-[15px] font-semibold text-ink">
            {t('team.organization.chooseTitle', '选择团队组织')}
          </h3>
          <p className="mt-1 text-[12px] leading-snug text-ink-subtle">
            {organizationChoices.length > 0
              ? t('team.organization.chooseHint', '团队订阅按组织生效，请先切换到团队组织。')
              : t(
                'team.organization.none',
                '当前账号不属于任何团队组织，因此无法购买或管理团队坐席。',
              )}
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {organizationChoices.map((choice) => (
              <OrganizationChoiceRow
                busy={switching === choice.organizationId}
                choice={choice}
                key={choice.organizationId}
                onSelect={() => void handleSwitch(choice.organizationId)}
                t={t}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Bound organization switch */}
      {hasOrgScope ? (
        <OrganizationSwitcher
          busyId={switching}
          choices={organizationChoices}
          onSelect={(organizationId) => void handleSwitch(organizationId)}
          t={t}
        />
      ) : null}

      {/* Unbound: buy first, bind later */}
      {unbound ? (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h3 className="text-[15px] font-semibold text-ink">
            {t('team.bind.title', '绑定团队组织')}
          </h3>
          <p className="mt-1 text-[12px] leading-snug text-ink-subtle">
            {t(
              'team.bind.hint',
              '该团队订阅购买时未选择组织，绑定后即可分配坐席；一个组织只能绑定一个团队订阅。',
            )}
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {bindableChoices.length === 0 ? (
              <p className="rounded-lg bg-surface-elevated px-3 py-2 text-[11px] text-ink-subtle">
                {t(
                  'team.bind.noEligible',
                  '当前账号没有可绑定的所有者/管理员组织，请先加入或创建一个组织。',
                )}
              </p>
            ) : null}
            {bindableChoices.map((choice) => (
              <OrganizationChoiceRow
                busy={binding === choice.organizationId}
                choice={choice}
                key={choice.organizationId}
                onSelect={() => void handleBind(choice.organizationId)}
                t={t}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Plan purchase / add seats */}
      {showPlans ? (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-ink">
              {expanding
                ? t('team.plans.expandTitle', '扩容团队坐席')
                : t('team.plans.title', '团队套餐')}
            </h3>
            {expanding ? (
              <button
                className="text-[12px] font-medium text-brand"
                onClick={() => setExpanding(false)}
                type="button"
              >
                {t('team.plans.collapse', '收起')}
              </button>
            ) : null}
          </div>
          {expanding ? (
            <p className="mt-1 text-[11px] text-ink-subtle">
              {t('team.plans.expandHint', '扩容只增加坐席数量，不改变订阅到期时间。')}
            </p>
          ) : null}

          {catalogLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-ink-subtle">
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-brand" />
              {t('team.plans.loading', '正在加载团队套餐…')}
            </div>
          ) : null}
          {catalogError ? (
            <div className="py-6 text-center">
              <p className="text-[12px] text-danger">{catalogError}</p>
              <button
                className="mt-2 min-h-9 rounded-full border border-line px-4 text-[12px] text-ink"
                onClick={() => {
                  setCatalogError(null);
                  setCatalog(null);
                }}
                type="button"
              >
                {t('team.retry', '重试')}
              </button>
            </div>
          ) : null}
          {catalog ? (
            <div className="mt-3">
              <TeamPlanCards
                busy={submitting}
                catalog={catalog}
                mode={expanding ? 'expand' : 'subscribe'}
                onBuy={(next) => {
                  setCheckoutError(null);
                  setDraft(next);
                }}
                overview={overview}
                t={t}
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Seat management */}
      {hasOrgScope && overview.hasSubscription && composition?.canManageSeats && !expanding ? (
        <TeamSeatManagement
          busy={submitting}
          directory={directory}
          onAssign={handleAssign}
          onLoadMore={loadMoreDirectory}
          onReconcile={handleReconcile}
          onRevoke={handleRevoke}
          onSavePolicy={handleSavePolicy}
          onSearch={team.searchDirectory}
          overview={overview}
          t={t}
        />
      ) : null}

      {hasOrgScope && overview.hasSubscription && composition && !composition.canManageSeats ? (
        <p className="rounded-xl bg-surface-elevated px-3 py-2 text-[11px] leading-snug text-ink-muted">
          {t('team.seats.readOnly', '仅组织所有者或管理员可以管理坐席。')}
        </p>
      ) : null}

      {actionError ? (
        <div className="rounded-xl bg-danger-soft px-3 py-2" role="alert">
          <p className="text-[12px] text-danger">{actionError}</p>
          {needsSignIn ? (
            <button
              className="mt-2 min-h-9 rounded-full border border-danger px-3 text-[12px] font-medium text-danger"
              onClick={onSignIn}
              type="button"
            >
              {t('team.signInAgain', '重新登录并选择组织')}
            </button>
          ) : null}
        </div>
      ) : null}

      <p className="px-1 text-center text-[10px] leading-snug text-ink-subtle">
        {t(
          'team.footer.note',
          '团队订阅、坐席与权益以服务端配置为准；坐席分配需要组织所有者或管理员权限。',
        )}
      </p>

      <TeamCheckoutSheet
        draft={draft}
        error={checkoutError}
        onClose={() => {
          if (submitting) return;
          setDraft(null);
        }}
        onConfirm={(method) => void handleCheckout(method)}
        open={draft !== null}
        submitting={submitting}
        t={t}
      />
    </div>
  );
}

interface OrganizationChoiceRowProps {
  readonly busy: boolean;
  readonly choice: TeamOrganizationChoice;
  readonly onSelect: () => void;
  readonly t: MembershipTranslate;
}

function OrganizationChoiceRow({ busy, choice, onSelect, t }: OrganizationChoiceRowProps) {
  return (
    <button
      className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-line bg-canvas px-3 text-left text-[13px] text-ink disabled:opacity-60"
      disabled={busy || choice.isCurrent}
      onClick={onSelect}
      type="button"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          {choice.organizationName ?? choice.organizationId}
        </span>
        <span className="mt-0.5 block text-[10px] text-ink-subtle">
          {teamRoleLabel(choice.role, t)}
          {choice.isCurrent ? ` · ${t('team.organization.current', '当前组织')}` : ''}
        </span>
      </span>
      <span className="shrink-0 text-[11px] font-medium text-brand">
        {busy
          ? t('team.organization.switching', '切换中…')
          : choice.isCurrent
            ? ''
            : t('team.organization.switch', '切换')}
      </span>
    </button>
  );
}

interface OrganizationSwitcherProps {
  readonly busyId: string | null;
  readonly choices: readonly TeamOrganizationChoice[];
  readonly onSelect: (organizationId: string) => void;
  readonly t: MembershipTranslate;
}

function OrganizationSwitcher({ busyId, choices, onSelect, t }: OrganizationSwitcherProps) {
  const switchable = choices.filter((choice) => !choice.isCurrent);
  if (switchable.length === 0) {
    return null;
  }
  return (
    <section className="rounded-2xl border border-line bg-surface p-3">
      <p className="text-[11px] font-medium text-ink-subtle">
        {t('team.organization.switchTitle', '切换团队组织')}
      </p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {switchable.map((choice) => (
          <button
            className="min-h-9 shrink-0 rounded-full border border-line bg-canvas px-3 text-[12px] font-medium text-ink-muted disabled:opacity-50"
            disabled={busyId !== null}
            key={choice.organizationId}
            onClick={() => onSelect(choice.organizationId)}
            type="button"
          >
            {busyId === choice.organizationId
              ? t('team.organization.switching', '切换中…')
              : choice.organizationName ?? choice.organizationId}
          </button>
        ))}
      </div>
    </section>
  );
}
