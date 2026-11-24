import { CircleAlert, RefreshCw, Search, Users } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { MembershipTranslate } from '../catalog/membershipDefinition.js';
import type { TeamDirectoryState } from '../team/useTeamMembership.js';
import type {
  TeamErrorReason,
  TeamSeatPolicyInput,
  TeamSeatPolicy,
  TeamSeatReconciliation,
  TeamSubscriptionOverview,
} from '../team/teamContract.js';
import { teamErrorCopy, teamRoleLabel } from '../team/teamErrorCopy.js';
import { MobileSheet } from './MobileSheet.js';

export interface TeamSeatManagementProps {
  readonly busy: boolean;
  readonly directory: TeamDirectoryState;
  readonly onAssign: (userId: string) => Promise<void>;
  readonly onLoadMore: () => Promise<void>;
  readonly onReconcile: () => Promise<TeamSeatReconciliation>;
  readonly onRevoke: (userId: string) => Promise<void>;
  readonly onSearch: (query: string) => Promise<void>;
  readonly onSavePolicy: (input: TeamSeatPolicyInput) => Promise<void>;
  readonly overview: TeamSubscriptionOverview;
  readonly t: MembershipTranslate;
}

function errorMessage(cause: unknown, t: MembershipTranslate): string {
  const reason = (cause as { reason?: TeamErrorReason } | null)?.reason;
  if (reason) {
    return teamErrorCopy(reason, t);
  }
  return cause instanceof Error && cause.message
    ? cause.message
    : t('team.membersLoadFailed', '组织成员加载失败。');
}

interface ToggleRowProps {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly label: string;
  readonly onChange: (checked: boolean) => void;
}

function ToggleRow({ checked, disabled, label, onChange }: ToggleRowProps) {
  return (
    <button
      aria-checked={checked}
      className="flex w-full items-center justify-between gap-3 py-2 text-left text-[13px] text-ink"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span>{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-brand-fill' : 'bg-line-strong'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? 'left-[1.375rem]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

/**
 * Mobile seat management for organization owners/admins.
 *
 * The policy form, the capacity warning, the searchable seat directory with
 * assign/revoke, and the reconcile action mirror the PC team seat surface; the
 * layout is a thumb-reachable single column with a confirmation sheet for
 * revoking a member's seat.
 */
export function TeamSeatManagement({
  busy,
  directory,
  onAssign,
  onLoadMore,
  onReconcile,
  onRevoke,
  onSearch,
  onSavePolicy,
  overview,
  t,
}: TeamSeatManagementProps) {
  const [autoAssignSeat, setAutoAssignSeat] = useState(overview.autoAssignSeat);
  const [seatPolicy, setSeatPolicy] = useState<TeamSeatPolicy>(overview.seatPolicy);
  const [query, setQuery] = useState(directory.query);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [revokeName, setRevokeName] = useState('');
  const [reconciling, setReconciling] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setAutoAssignSeat(overview.autoAssignSeat);
    setSeatPolicy(overview.seatPolicy);
  }, [overview.autoAssignSeat, overview.seatPolicy]);

  useEffect(() => () => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
  }, []);

  const dirty = autoAssignSeat !== overview.autoAssignSeat || seatPolicy !== overview.seatPolicy;
  const capacityBlocked = overview.seatPolicy === 'strict' && overview.seatsAvailable <= 0;
  const overCapacity = overview.seatsUsed > overview.seatsPurchased;
  const membersLabel = useMemo(
    () => t('team.seats.summary', '已分配 {{used}} / {{purchased}} 个坐席')
      .replace('{{used}}', String(overview.seatsUsed))
      .replace('{{purchased}}', String(overview.seatsPurchased)),
    [overview.seatsPurchased, overview.seatsUsed, t],
  );

  async function runAction(action: () => Promise<void>) {
    setActionError(null);
    setNotice(null);
    try {
      await action();
    } catch (cause) {
      setActionError(errorMessage(cause, t));
    }
  }

  async function handleReconcile() {
    setReconciling(true);
    setActionError(null);
    try {
      const result = await onReconcile();
      setNotice(
        result.revokedCount > 0
          ? t('team.reconcileSuccess', '已回收 {{count}} 个离组成员坐席。').replace(
            '{{count}}',
            String(result.revokedCount),
          )
          : t('team.reconcileNone', '所有坐席均与组织有效成员一致。'),
      );
    } catch (cause) {
      setActionError(errorMessage(cause, t));
    } finally {
      setReconciling(false);
    }
  }

  async function handleSavePolicy() {
    setSavingPolicy(true);
    setActionError(null);
    try {
      await onSavePolicy({ autoAssignSeat, seatPolicy });
      setNotice(t('team.policy.saved', '坐席策略已更新。'));
    } catch (cause) {
      setActionError(errorMessage(cause, t));
    } finally {
      setSavingPolicy(false);
    }
  }

  async function handleAssign(userId: string) {
    setPendingUser(userId);
    await runAction(async () => {
      await onAssign(userId);
    });
    setPendingUser(null);
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setPendingUser(revokeTarget);
    setActionError(null);
    try {
      await onRevoke(revokeTarget);
      setRevokeTarget(null);
      setNotice(t('team.seatRevoked', '已回收坐席。'));
    } catch (cause) {
      // Keep the confirmation open so the failure is actionable.
      setActionError(errorMessage(cause, t));
    } finally {
      setPendingUser(null);
    }
  }

  return (
    <section className="flex flex-col gap-3" data-team-seat-management>
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-semibold text-ink">
            {t('team.seats.title', '席位管理')}
          </h3>
          <span className="flex items-center gap-1 text-[11px] text-ink-subtle">
            <Users aria-hidden="true" className="h-3.5 w-3.5" />
            {membersLabel}
          </span>
        </div>

        {overCapacity ? (
          <p className="mt-2 rounded-lg bg-danger-soft px-2.5 py-1.5 text-[11px] text-danger">
            {t('team.seats.overCapacity', '坐席数超过已购数量，请及时扩容或回收坐席。')}
          </p>
        ) : null}

        <div className="mt-3 border-t border-line pt-1">
          <ToggleRow
            checked={autoAssignSeat}
            disabled={busy || savingPolicy}
            label={t('team.policy.autoAssign', '新成员自动分配坐席')}
            onChange={setAutoAssignSeat}
          />
          <div className="mt-2">
            <p className="text-[12px] font-medium text-ink-subtle">
              {t('team.policy.title', '超员策略')}
            </p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(['strict', 'flex_overflow'] as const).map((policy) => {
                const selected = seatPolicy === policy;
                return (
                  <button
                    aria-pressed={selected}
                    className={`min-h-10 rounded-xl border px-2 text-[12px] font-medium ${
                      selected
                        ? 'border-brand bg-brand-soft text-brand'
                        : 'border-line bg-surface text-ink-muted'
                    }`}
                    key={policy}
                    onClick={() => setSeatPolicy(policy)}
                    type="button"
                  >
                    {policy === 'strict'
                      ? t('team.policy.strictLabel', '严格匹配')
                      : t('team.policy.flexLabel', '弹性超配')}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[10px] leading-snug text-ink-subtle">
              {seatPolicy === 'strict'
                ? t('team.policy.strictHint', '坐席分配满后必须扩容才能继续分配。')
                : t('team.policy.flexHint', '组织成员多于坐席时，按分配顺序保留权益。')}
            </p>
          </div>
          <button
            className="mt-3 min-h-10 w-full rounded-full border border-brand text-[13px] font-semibold text-brand disabled:opacity-50"
            disabled={!dirty || busy || savingPolicy}
            onClick={() => void handleSavePolicy()}
            type="button"
          >
            {savingPolicy
              ? t('team.policy.saving', '保存中…')
              : t('team.policy.save', '保存坐席策略')}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-semibold text-ink">
            {t('team.seats.membersTitle', '组织成员')}
          </h3>
          <button
            className="flex min-h-8 items-center gap-1 rounded-full border border-line px-2.5 text-[11px] font-medium text-ink-muted disabled:opacity-50"
            disabled={busy || reconciling}
            onClick={() => void handleReconcile()}
            type="button"
          >
            <RefreshCw aria-hidden="true" className={`h-3 w-3 ${reconciling ? 'animate-spin' : ''}`} />
            {t('team.seats.reconcile', '同步离组成员')}
          </button>
        </div>

        <label className="mt-2 flex min-h-10 items-center gap-2 rounded-xl border border-line bg-canvas px-3">
          <Search aria-hidden="true" className="h-3.5 w-3.5 text-ink-subtle" />
          <input
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-subtle"
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              if (debounceRef.current !== null) {
                window.clearTimeout(debounceRef.current);
              }
              debounceRef.current = window.setTimeout(() => {
                void onSearch(next);
              }, 300);
            }}
            placeholder={t('team.seats.search', '搜索成员姓名或账号')}
            value={query}
          />
        </label>

        {capacityBlocked ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            {t('team.seats.capacityBlocked', '坐席已分配完，请先扩容再分配新成员。')}
          </p>
        ) : null}

        <ul className="mt-2 divide-y divide-line" data-team-seat-directory>
          {directory.rows.map((row) => (
            <li className="flex items-center gap-2 py-2.5" key={row.userId}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">{row.name}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-subtle">
                  <span>{teamRoleLabel(row.membershipKind, t)}</span>
                  {row.isAssigned ? (
                    <span className="rounded bg-brand-soft px-1 py-0.5 text-[10px] font-semibold text-brand">
                      {t('team.seats.seatNo', '坐席 {{no}}').replace('{{no}}', String(row.seatNo ?? ''))}
                    </span>
                  ) : (
                    <span className="rounded bg-surface-elevated px-1 py-0.5 text-[10px] text-ink-subtle">
                      {t('team.seats.unassigned', '未分配')}
                    </span>
                  )}
                </p>
              </div>
              {row.isAssigned ? (
                <button
                  className="min-h-8 shrink-0 rounded-full border border-line px-3 text-[11px] font-medium text-ink-muted disabled:opacity-50"
                  disabled={busy || pendingUser !== null}
                  onClick={() => {
                    setRevokeTarget(row.userId);
                    setRevokeName(row.name);
                  }}
                  type="button"
                >
                  {t('team.seats.revoke', '回收')}
                </button>
              ) : (
                <button
                  className="min-h-8 shrink-0 rounded-full bg-brand-fill px-3 text-[11px] font-semibold text-on-brand disabled:opacity-50"
                  disabled={busy || pendingUser !== null || capacityBlocked}
                  onClick={() => void handleAssign(row.userId)}
                  type="button"
                >
                  {pendingUser === row.userId
                    ? t('team.seats.assigning', '分配中…')
                    : t('team.seats.assign', '分配坐席')}
                </button>
              )}
            </li>
          ))}
        </ul>

        {directory.rows.length === 0 && !directory.loading ? (
          <p className="py-6 text-center text-[12px] text-ink-subtle">
            {t('team.seats.empty', '未找到组织成员。')}
          </p>
        ) : null}
        {directory.loading ? (
          <p className="py-3 text-center text-[11px] text-ink-subtle">
            {t('team.loading', '正在加载团队订阅…')}
          </p>
        ) : null}
        {directory.hasMore ? (
          <button
            className="mt-2 min-h-9 w-full rounded-full border border-line text-[12px] font-medium text-ink-muted disabled:opacity-50"
            disabled={directory.loading}
            onClick={() => void onLoadMore()}
            type="button"
          >
            {t('team.seats.loadMore', '加载更多成员')}
          </button>
        ) : null}

        {actionError ? (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-danger" role="alert">
            <CircleAlert aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
            {actionError}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-2 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-700 dark:text-emerald-300" role="status">
            {notice}
          </p>
        ) : null}
      </div>

      <MobileSheet
        closeLabel={t('close', '关闭')}
        description={t('team.confirm.revokeDesc', '{{name}} 将失去订阅权益，直到重新分配坐席。')
          .replace('{{name}}', revokeName)}
        footer={(
          <div className="flex gap-2">
            <button
              className="min-h-11 flex-1 rounded-full border border-line text-[14px] font-medium text-ink-muted"
              onClick={() => setRevokeTarget(null)}
              type="button"
            >
              {t('cancel', '取消')}
            </button>
            <button
              className="min-h-11 flex-1 rounded-full bg-rose-600 text-[14px] font-semibold text-white disabled:opacity-60"
              disabled={pendingUser !== null}
              onClick={() => void handleRevoke()}
              type="button"
            >
              {t('team.confirm.revokeAction', '回收坐席')}
            </button>
          </div>
        )}
        onClose={() => setRevokeTarget(null)}
        open={revokeTarget !== null}
        title={t('team.confirm.revokeTitle', '确认回收该坐席？')}
      >
        <p className="text-[12px] leading-snug text-ink-muted">
          {t('team.seats.revokeHint', '回收后该成员立即失去团队订阅权益，可随时重新分配。')}
        </p>
      </MobileSheet>
    </section>
  );
}
