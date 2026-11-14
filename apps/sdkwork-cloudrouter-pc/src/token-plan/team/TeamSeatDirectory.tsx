import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  ShieldAlert,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  LoadingBlock,
  StatusNotice,
} from '@sdkwork/ui-pc-react';

import { resolveTeamPlanErrorCopy } from './teamPlanErrorCopy.ts';
import {
  joinTeamSeatDirectory,
  type TeamSeatDirectoryRow,
} from './teamRosterComposition.ts';
import {
  assignTeamSeat,
  listTeamRosterPage,
  normalizeTeamPlanError,
  reconcileTeamSeats,
  revokeTeamSeat,
  type TeamPlanServiceError,
  type TeamSeatAssignment,
  type TeamSubscriptionOverview,
} from './teamSubscriptionService.ts';
import type { TeamPlanNotify } from './TeamPlanCards.tsx';

export interface TeamSeatDirectoryProps {
  /**
   * Whether the caller may manage organization seats (IAM owner/admin).
   *
   * The container already withholds the directory for a plain member; the flag
   * also keeps the member-removal reconciliation action hidden, so a caller who
   * cannot manage seats never sees a seat-management control.
   */
  canManageSeats: boolean;
  /** Called after a seat mutation so the container refreshes the snapshot. */
  onSeatChanged: () => void;
  /** Toast sink for the reconciliation result. */
  onNotify: TeamPlanNotify;
  /**
   * IAM organization id the roster is read from. It is derived by the container
   * from the caller's own IAM membership, never from a custom header.
   */
  organizationId: string;
  overview: TeamSubscriptionOverview;
  /** Membership-owned seat assignment rows for the current subscription. */
  seatAssignments: TeamSeatAssignment[];
}

const SEAT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MILLIS = 300;

const ROLE_COPY: Record<string, { fallback: string; key: string }> = {
  admin: { fallback: 'Admin', key: 'token_plan.team.role_admin' },
  member: { fallback: 'Member', key: 'token_plan.team.role_member' },
  owner: { fallback: 'Owner', key: 'token_plan.team.role_owner' },
};

/**
 * Organization seat directory: searchable, IAM-paginated roster joined with the
 * membership seat map.
 *
 * The IAM roster is the member directory (identity, role, and `q` search); the
 * membership seat assignments are the licensing facts. Rows are joined by user
 * id so an unassigned member renders an Assign action and an assigned member
 * renders its seat number. Mutations keep the current page, refresh only the
 * page, and ask the container to refresh the derived counts; failures render the
 * typed problem reason instead of a raw backend message.
 */
export function TeamSeatDirectory({
  canManageSeats,
  onNotify,
  onSeatChanged,
  organizationId,
  overview,
  seatAssignments,
}: TeamSeatDirectoryProps) {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [rows, setRows] = useState<TeamSeatDirectoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<TeamPlanServiceError | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<TeamPlanServiceError | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<TeamSeatDirectoryRow | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MILLIS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);

    void listTeamRosterPage({
      organizationId,
      page,
      pageSize: SEAT_PAGE_SIZE,
      q: searchQuery,
    })
      .then((result) => {
        if (!active) {
          return;
        }
        // Re-join the freshly searched roster with the current seat map.
        setRows(joinTeamSeatDirectory(result.items, seatAssignments));
        setTotal(result.total);
        setHasMore(result.hasMore);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(normalizeTeamPlanError(error));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [organizationId, page, reloadToken, searchQuery, seatAssignments]);

  const isStrictAtCapacity = overview.seatsAvailable === 0 && overview.seatPolicy === 'strict';
  const seatsFullCopy = t('token_plan.team.seat_capacity_exceeded', {
    seats: overview.seatsPurchased,
  });
  const totalPages = total > 0 ? Math.max(1, Math.ceil(total / SEAT_PAGE_SIZE)) : 1;
  const canGoBack = page > 1;
  const canGoForward = hasMore || page < totalPages;

  function handleAssign(row: TeamSeatDirectoryRow): void {
    setActionError(null);
    setPendingUserId(row.userId);

    void assignTeamSeat(row.userId)
      .then(() => {
        setReloadToken((token) => token + 1);
        onSeatChanged();
      })
      .catch((error: unknown) => {
        setActionError(normalizeTeamPlanError(error));
      })
      .finally(() => {
        setPendingUserId(null);
      });
  }

  function handleRevoke(row: TeamSeatDirectoryRow): void {
    setActionError(null);
    setPendingUserId(row.userId);

    void revokeTeamSeat(row.userId)
      .then(() => {
        setRevokeTarget(null);
        setReloadToken((token) => token + 1);
        onSeatChanged();
      })
      .catch((error: unknown) => {
        setActionError(normalizeTeamPlanError(error));
      })
      .finally(() => {
        setPendingUserId(null);
      });
  }

  /**
   * Revokes every seat whose user IAM no longer reports as an active member.
   *
   * The endpoint owns the membership decision (it calls the IAM directory port)
   * and runs once per click; the directory then re-reads its page and asks the
   * container to refresh the overview. `revokedCount` is surfaced in a toast so
   * a sweep that found nothing reads as "already consistent", not as a failure.
   */
  function handleReconcile(): void {
    if (isReconciling) {
      return;
    }
    setActionError(null);
    setIsReconciling(true);

    void reconcileTeamSeats()
      .then((result) => {
        setReloadToken((token) => token + 1);
        onSeatChanged();
        onNotify(
          result.revokedCount > 0
            ? t('token_plan.team.reconcile_success', {
              defaultValue: '{{revoked}} seat(s) revoked for members who left the organization.',
              revoked: result.revokedCount,
            })
            : t(
              'token_plan.team.reconcile_none',
              'Every seat matches an active organization member.',
            ),
          'success',
        );
      })
      .catch((error: unknown) => {
        setActionError(normalizeTeamPlanError(error));
      })
      .finally(() => {
        setIsReconciling(false);
      });
  }

  const actionErrorCopy = actionError ? resolveTeamPlanErrorCopy(actionError.reason) : null;

  return (
    <section
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-white/10 dark:bg-zinc-950"
      data-team-seat-directory
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
            {t('token_plan.team.seat_management_title', 'Seat assignments')}
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {t(
              'token_plan.team.seat_management_desc',
              'Each member can hold at most one seat. Revoking a seat frees it for another member.',
            )}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {canManageSeats ? (
            <Button
              data-team-seat-reconcile
              disabled={isReconciling || isLoading}
              loading={isReconciling}
              onClick={handleReconcile}
              size="sm"
              type="button"
              variant="ghost"
            >
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
              {isReconciling
                ? t('token_plan.team.reconcile_saving', 'Reconciling…')
                : t('token_plan.team.reconcile_seats', 'Reconcile seats')}
            </Button>
          ) : null}
          <div className="relative w-full sm:w-64">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <Input
              aria-label={t('token_plan.team.search_placeholder', 'Search members')}
              className="h-9 pl-9 text-sm"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t('token_plan.team.search_placeholder', 'Search members')}
              type="search"
              value={searchInput}
            />
          </div>
        </div>
      </div>

      {isStrictAtCapacity ? (
        <div className="mt-4">
          <StatusNotice tone="warning">{seatsFullCopy}</StatusNotice>
        </div>
      ) : null}

      {actionError && actionErrorCopy ? (
        <div className="mt-4">
          <StatusNotice
            title={t(actionErrorCopy.key, {
              defaultValue: actionErrorCopy.fallback,
              seats: overview.seatsPurchased,
            })}
            tone="danger"
          />
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-4">
          <LoadingBlock label={t('token_plan.team.loading', 'Loading team subscription…')} />
        </div>
      ) : null}

      {!isLoading && loadError ? (
        <div className="mt-4">
          <StatusNotice
            title={t('token_plan.team.members_load_failed', 'Unable to load organization members.')}
            tone="danger"
          >
            <div className="flex justify-end">
              <Button
                onClick={() => setReloadToken((token) => token + 1)}
                size="sm"
                type="button"
                variant="ghost"
              >
                {t('token_plan.team.retry', 'Retry')}
              </Button>
            </div>
          </StatusNotice>
        </div>
      ) : null}

      {!isLoading && !loadError && rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState description={t('token_plan.team.empty_members', 'No organization members found.')} />
        </div>
      ) : null}

      {!isLoading && !loadError && rows.length > 0 ? (
        <>
          <div className="mt-4 -mx-1 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:border-white/10 dark:text-slate-400">
                  <th className="px-2 py-2.5 font-semibold" scope="col">
                    {t('token_plan.team.member', 'Member')}
                  </th>
                  <th className="px-2 py-2.5 font-semibold" scope="col">
                    {t('token_plan.team.role', 'Role')}
                  </th>
                  <th className="px-2 py-2.5 font-semibold" scope="col">
                    {t('token_plan.team.seat_no', 'Seat')}
                  </th>
                  <th className="px-2 py-2.5 text-right font-semibold" scope="col">
                    {t('token_plan.team.manage_seats', 'Manage seats')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const roleCopy = ROLE_COPY[row.membershipKind] ?? ROLE_COPY.member;
                  const isAssigned = row.isAssigned;
                  const isPending = pendingUserId === row.userId;
                  const assignDisabled = isPending || (!isAssigned && isStrictAtCapacity);

                  return (
                    <tr
                      className="border-b border-slate-100 last:border-0 dark:border-white/5"
                      data-seat-state={isAssigned ? 'active' : 'unassigned'}
                      key={row.membershipId || row.userId}
                    >
                      <td className="px-2 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-950 dark:text-white">
                            {row.name}
                          </p>
                          {row.email ? (
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {row.email}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-slate-600 dark:text-slate-300">
                        {t(roleCopy.key, roleCopy.fallback)}
                      </td>
                      <td className="px-2 py-3">
                        {isAssigned && row.seatNo !== undefined ? (
                          <span className="inline-flex items-center rounded-md bg-lobster-500/10 px-2 py-1 text-xs font-semibold tabular-nums text-lobster-600 dark:text-lobster-400">
                            #{row.seatNo}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {t('token_plan.team.seat_state_unassigned', 'Unassigned')}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex justify-end">
                          {isAssigned ? (
                            <Button
                              disabled={isPending}
                              loading={isPending}
                              onClick={() => setRevokeTarget(row)}
                              size="sm"
                              type="button"
                              variant="ghost"
                            >
                              <UserMinus aria-hidden="true" className="h-3.5 w-3.5" />
                              {t('token_plan.team.revoke_seat', 'Revoke')}
                            </Button>
                          ) : (
                            <Button
                              disabled={assignDisabled}
                              loading={isPending}
                              onClick={() => handleAssign(row)}
                              size="sm"
                              type="button"
                              variant="secondary"
                            >
                              <UserPlus aria-hidden="true" className="h-3.5 w-3.5" />
                              {t('token_plan.team.assign_seat', 'Assign seat')}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {t('common.pagination.page', { page })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                aria-label={t('common.pagination.previous', 'Previous page')}
                disabled={!canGoBack || isLoading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                size="sm"
                type="button"
                variant="ghost"
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              </Button>
              <Button
                aria-label={t('common.pagination.next', 'Next page')}
                disabled={!canGoForward || isLoading}
                onClick={() => setPage((current) => current + 1)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      ) : null}

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setRevokeTarget(null);
          }
        }}
        open={revokeTarget !== null}
      >
        <DialogContent className="w-[min(92vw,28rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert aria-hidden="true" className="h-4 w-4 text-amber-500" />
              {t('token_plan.team.confirm_revoke_title', 'Revoke this seat?')}
            </DialogTitle>
            <DialogDescription>
              {t('token_plan.team.confirm_revoke_desc', {
                name: revokeTarget?.name ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t('cancel', 'Cancel')}
              </Button>
            </DialogClose>
            <Button
              disabled={pendingUserId !== null}
              loading={pendingUserId !== null && pendingUserId === revokeTarget?.userId}
              onClick={() => {
                if (revokeTarget) {
                  handleRevoke(revokeTarget);
                }
              }}
              type="button"
              variant="danger"
            >
              {t('token_plan.team.confirm_revoke_action', 'Revoke seat')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
