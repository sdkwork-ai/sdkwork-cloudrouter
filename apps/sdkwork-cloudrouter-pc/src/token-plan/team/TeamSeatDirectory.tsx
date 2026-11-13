import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
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
  assignTeamSeat,
  listTeamSeats,
  normalizeTeamPlanError,
  revokeTeamSeat,
  type TeamPlanServiceError,
  type TeamSeatMember,
  type TeamSeatPageInfo,
  type TeamSubscriptionOverview,
} from './teamSubscriptionService.ts';

export interface TeamSeatDirectoryProps {
  /** Called after a seat mutation so the container refreshes the overview. */
  onSeatChanged: () => void;
  overview: TeamSubscriptionOverview;
}

const SEAT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MILLIS = 300;

const ROLE_COPY: Record<string, { fallback: string; key: string }> = {
  admin: { fallback: 'Admin', key: 'token_plan.team.role_admin' },
  member: { fallback: 'Member', key: 'token_plan.team.role_member' },
  owner: { fallback: 'Owner', key: 'token_plan.team.role_owner' },
};

function memberLabel(member: TeamSeatMember): string {
  const name = member.displayName?.trim();
  if (name) {
    return name;
  }
  const email = member.email?.trim();
  return email ?? member.userId;
}

/**
 * Organization seat directory: searchable, paginated assignment table.
 *
 * Mutations keep the current page, refresh only the directory, and ask the
 * container to refresh the seat counts; failures render the typed problem
 * reason instead of a raw backend message.
 */
export function TeamSeatDirectory({
  onSeatChanged,
  overview,
}: TeamSeatDirectoryProps) {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [items, setItems] = useState<TeamSeatMember[]>([]);
  const [pageInfo, setPageInfo] = useState<TeamSeatPageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<TeamPlanServiceError | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<TeamPlanServiceError | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<TeamSeatMember | null>(null);

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

    void listTeamSeats({ page, pageSize: SEAT_PAGE_SIZE, q: searchQuery })
      .then((result) => {
        if (!active) {
          return;
        }
        setItems(result.items);
        setPageInfo(result.pageInfo);
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
  }, [page, reloadToken, searchQuery]);

  const isStrictAtCapacity = overview.seatsAvailable === 0 && overview.seatPolicy === 'strict';
  const seatsFullCopy = t('token_plan.team.seat_capacity_exceeded', {
    seats: overview.seatsPurchased,
  });
  const totalPages = pageInfo?.totalPages ?? 1;
  const canGoBack = page > 1;
  const canGoForward = pageInfo?.hasMore === true || page < totalPages;

  function handleAssign(member: TeamSeatMember): void {
    setActionError(null);
    setPendingUserId(member.userId);

    void assignTeamSeat(member.userId)
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

  function handleRevoke(member: TeamSeatMember): void {
    setActionError(null);
    setPendingUserId(member.userId);

    void revokeTeamSeat(member.userId)
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

      {!isLoading && !loadError && items.length === 0 ? (
        <div className="mt-4">
          <EmptyState description={t('token_plan.team.empty_members', 'No organization members found.')} />
        </div>
      ) : null}

      {!isLoading && !loadError && items.length > 0 ? (
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
                {items.map((member) => {
                  const roleCopy = ROLE_COPY[member.membershipKind] ?? ROLE_COPY.member;
                  const isAssigned = member.seatState === 'active';
                  const isPending = pendingUserId === member.userId;
                  const assignDisabled = isPending || (!isAssigned && isStrictAtCapacity);

                  return (
                    <tr
                      className="border-b border-slate-100 last:border-0 dark:border-white/5"
                      data-seat-state={member.seatState}
                      key={member.membershipId || member.userId}
                    >
                      <td className="px-2 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-950 dark:text-white">
                            {memberLabel(member)}
                          </p>
                          {member.email ? (
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {member.email}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-slate-600 dark:text-slate-300">
                        {t(roleCopy.key, roleCopy.fallback)}
                      </td>
                      <td className="px-2 py-3">
                        {isAssigned && member.seatNo !== undefined ? (
                          <span className="inline-flex items-center rounded-md bg-lobster-500/10 px-2 py-1 text-xs font-semibold tabular-nums text-lobster-600 dark:text-lobster-400">
                            #{member.seatNo}
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
                              onClick={() => setRevokeTarget(member)}
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
                              onClick={() => handleAssign(member)}
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
                name: revokeTarget ? memberLabel(revokeTarget) : '',
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
