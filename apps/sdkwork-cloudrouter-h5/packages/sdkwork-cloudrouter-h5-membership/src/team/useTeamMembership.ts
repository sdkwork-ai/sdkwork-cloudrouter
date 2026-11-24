import { useCallback, useEffect, useRef, useState } from 'react';

import {
  composeTeamSeatComposition,
  hasTeamOrganizationScope,
  isTeamSubscriptionUnbound,
  joinTeamSeatDirectory,
  resolveTeamOrganizationChoices,
  resolveTeamOrganizationId,
  resolveTeamViewerRole,
  TeamSubscriptionError,
  type TeamOrganizationChoice,
  type TeamOwnMembership,
  type TeamRosterMember,
  type TeamSeatAssignment,
  type TeamSeatComposition,
  type TeamSeatDirectoryRow,
  type TeamSeatPolicyInput,
  type TeamSeatReconciliation,
  type TeamSubscriptionOverview,
} from './teamContract.js';
import { getCloudRouterH5MembershipRuntime, type MembershipTeamCatalog } from '../runtime.js';

const TEAM_SEAT_READ_LIMIT = 2000;
const TEAM_DIRECTORY_PAGE_SIZE = 10;

export type TeamSurfaceStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface TeamDirectoryState {
  readonly hasMore: boolean;
  readonly loading: boolean;
  readonly page: number;
  readonly query: string;
  readonly rows: readonly TeamSeatDirectoryRow[];
  readonly total: number;
}

export interface TeamMembershipHookState {
  readonly catalog: MembershipTeamCatalog | null;
  readonly composition: TeamSeatComposition | null;
  readonly directory: TeamDirectoryState;
  readonly error: TeamSubscriptionError | null;
  readonly organizationChoices: readonly TeamOrganizationChoice[];
  readonly organizationName?: string;
  readonly overview: TeamSubscriptionOverview | null;
  readonly seatAssignments: readonly TeamSeatAssignment[];
  readonly status: TeamSurfaceStatus;
}

const EMPTY_DIRECTORY: TeamDirectoryState = {
  hasMore: false,
  loading: false,
  page: 0,
  query: '',
  rows: [],
  total: 0,
};

function toTeamError(cause: unknown): TeamSubscriptionError {
  if (cause instanceof TeamSubscriptionError) {
    return cause;
  }
  return new TeamSubscriptionError(
    'unknown',
    cause instanceof Error && cause.message ? cause.message : 'Team subscription request failed.',
  );
}

async function walkTeamRoster(
  runtime: NonNullable<ReturnType<typeof getCloudRouterH5MembershipRuntime>>,
  organizationId: string,
): Promise<{ items: TeamRosterMember[]; total: number }> {
  const items: TeamRosterMember[] = [];
  let total = 0;
  for (let page = 1; page <= 10; page += 1) {
    const result = await runtime.loadTeamRoster({
      organizationId,
      page,
      pageSize: 200,
    });
    items.push(...result.items);
    total = Math.max(total, result.total);
    if (!result.hasMore) {
      break;
    }
  }
  return { items, total: total > 0 ? total : items.length };
}

/**
 * State machine for the mobile organization (team) membership surface.
 *
 * Mirrors the PC team snapshot composition: membership owns the overview, seat
 * ledger, and policy; IAM owns the caller's organization memberships, the roster,
 * and the organization name. The unbound ("buy first, bind later") lifecycle
 * skips every organization-scoped read.
 */
export function useTeamMembership() {
  const [status, setStatus] = useState<TeamSurfaceStatus>('idle');
  const [error, setError] = useState<TeamSubscriptionError | null>(null);
  const [overview, setOverview] = useState<TeamSubscriptionOverview | null>(null);
  const [composition, setComposition] = useState<TeamSeatComposition | null>(null);
  const [organizationChoices, setOrganizationChoices] = useState<readonly TeamOrganizationChoice[]>([]);
  const [organizationName, setOrganizationName] = useState<string | undefined>(undefined);
  const [seatAssignments, setSeatAssignments] = useState<readonly TeamSeatAssignment[]>([]);
  const [catalog, setCatalog] = useState<MembershipTeamCatalog | null>(null);
  const [directory, setDirectory] = useState<TeamDirectoryState>(EMPTY_DIRECTORY);
  const bootstrapToken = useRef(0);

  const runtime = getCloudRouterH5MembershipRuntime();

  const loadDirectoryPage = useCallback(async (
    page: number,
    query: string,
    options: { append: boolean },
    assignments: readonly TeamSeatAssignment[],
    organizationId: string,
  ) => {
    if (!runtime || !organizationId) {
      return;
    }
    setDirectory((current) => ({ ...current, loading: true, query }));
    try {
      const result = await runtime.loadTeamRoster({
        organizationId,
        page,
        pageSize: TEAM_DIRECTORY_PAGE_SIZE,
        ...(query.trim() ? { q: query.trim() } : {}),
      });
      const rows = joinTeamSeatDirectory(result.items, assignments);
      setDirectory((current) => ({
        hasMore: result.hasMore,
        loading: false,
        page,
        query,
        rows: options.append ? [...current.rows, ...rows] : rows,
        total: result.total,
      }));
    } catch (cause) {
      setDirectory((current) => ({ ...current, loading: false }));
      throw toTeamError(cause);
    }
  }, [runtime]);

  const bootstrap = useCallback(async () => {
    bootstrapToken.current += 1;
    const token = bootstrapToken.current;
    if (!runtime) {
      setStatus('error');
      setError(new TeamSubscriptionError('unknown', 'Team membership is not available.'));
      return;
    }
    if (!runtime.signedIn) {
      setStatus('error');
      setError(new TeamSubscriptionError('unauthenticated', 'Sign in required.', 401));
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const nextOverview = await runtime.loadTeamOverview();
      if (token !== bootstrapToken.current) {
        return;
      }
      const ownMemberships = await runtime.loadOwnTeamMemberships().catch(
        () => [] as TeamOwnMembership[],
      );
      const scoped = hasTeamOrganizationScope(nextOverview);
      const organizationId = scoped
        ? resolveTeamOrganizationId(ownMemberships, nextOverview.organizationId)
        : nextOverview.organizationId.trim();
      const baseChoices = resolveTeamOrganizationChoices(ownMemberships, nextOverview.organizationId);
      // Localize organization ids with one directory read (permission-gated;
      // the ids stay the fallback labels when the read is not allowed).
      const organizationDirectory = await runtime.loadTeamOrganizationDirectory().catch(() => []);
      const nameById = new Map(
        organizationDirectory
          .filter((organization) => organization.name)
          .map((organization) => [organization.id, organization.name as string]),
      );
      const choices = baseChoices.map((choice) => {
        const name = nameById.get(choice.organizationId);
        return name ? { ...choice, organizationName: name } : choice;
      });
      const assignments = scoped
        ? await runtime.loadTeamSeatAssignments(TEAM_SEAT_READ_LIMIT)
        : await runtime.loadTeamSeatAssignments(TEAM_SEAT_READ_LIMIT).catch(
          () => [] as TeamSeatAssignment[],
        );

      let roster: TeamRosterMember[] = [];
      let membersTotal = 0;
      let name: string | undefined;
      if (scoped) {
        const walk = await walkTeamRoster(runtime, organizationId);
        roster = walk.items;
        membersTotal = walk.total;
        name = nameById.get(organizationId)
          ?? await runtime.loadTeamOrganizationName(organizationId).catch(() => undefined);
      }

      if (token !== bootstrapToken.current) {
        return;
      }
      const nextComposition = composeTeamSeatComposition({
        membersTotal,
        organizationId,
        ...(name ? { organizationName: name } : {}),
        overview: nextOverview,
        roster,
        seatAssignments: assignments,
        viewerRole: resolveTeamViewerRole(ownMemberships, organizationId),
      });

      setOverview(nextOverview);
      setOrganizationChoices(choices);
      setOrganizationName(name);
      setSeatAssignments(assignments);
      setComposition(nextComposition);
      setStatus('ready');
      setDirectory(EMPTY_DIRECTORY);

      if (
        scoped
        && nextComposition.canManageSeats
        && nextOverview.hasSubscription
        && !isTeamSubscriptionUnbound(nextOverview)
      ) {
        await loadDirectoryPage(1, '', { append: false }, assignments, organizationId);
      }
    } catch (cause) {
      if (token !== bootstrapToken.current) {
        return;
      }
      setError(toTeamError(cause));
      setStatus('error');
    }
  }, [loadDirectoryPage, runtime]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const refresh = useCallback(async () => {
    await bootstrap();
  }, [bootstrap]);

  const retry = useCallback(async () => {
    await bootstrap();
  }, [bootstrap]);

  const switchOrganization = useCallback(async (organizationId: string) => {
    if (!runtime) {
      throw new TeamSubscriptionError('unknown', 'Team membership is not available.');
    }
    await runtime.switchTeamOrganization(organizationId);
    await bootstrap();
  }, [bootstrap, runtime]);

  const bindOrganization = useCallback(async (organizationId: string) => {
    if (!runtime) {
      throw new TeamSubscriptionError('unknown', 'Team membership is not available.');
    }
    // Binding authorizes the caller's TEAM_SEAT_MANAGE capability in the target
    // organization, so the session must be scoped to it first. Rotating to the
    // same organization is a no-op the IAM endpoint answers with the current
    // session, so this is safe for an already-scoped session.
    await runtime.switchTeamOrganization(organizationId);
    const bound = await runtime.bindTeamOrganization(organizationId);
    setOverview(bound);
    await bootstrap();
  }, [bootstrap, runtime]);

  const assignSeat = useCallback(async (userId: string) => {
    if (!runtime) {
      throw new TeamSubscriptionError('unknown', 'Team membership is not available.');
    }
    await runtime.assignTeamSeat(userId);
    await bootstrap();
  }, [bootstrap, runtime]);

  const revokeSeat = useCallback(async (userId: string) => {
    if (!runtime) {
      throw new TeamSubscriptionError('unknown', 'Team membership is not available.');
    }
    await runtime.revokeTeamSeat(userId);
    await bootstrap();
  }, [bootstrap, runtime]);

  const reconcile = useCallback(async (): Promise<TeamSeatReconciliation> => {
    if (!runtime || !composition) {
      throw new TeamSubscriptionError('unknown', 'Team membership is not available.');
    }
    const result = await runtime.reconcileTeamSeats();
    await bootstrap();
    return result;
  }, [bootstrap, composition, runtime]);

  const savePolicy = useCallback(async (input: TeamSeatPolicyInput) => {
    if (!runtime) {
      throw new TeamSubscriptionError('unknown', 'Team membership is not available.');
    }
    const updated = await runtime.updateTeamSeatPolicy(input);
    setOverview(updated);
    await bootstrap();
  }, [bootstrap, runtime]);

  const searchDirectory = useCallback(async (query: string) => {
    if (!composition || !runtime) {
      return;
    }
    await loadDirectoryPage(1, query, { append: false }, seatAssignments, composition.organizationId);
  }, [composition, loadDirectoryPage, runtime, seatAssignments]);

  const loadMoreDirectory = useCallback(async () => {
    if (!composition || !runtime || !directory.hasMore || directory.loading) {
      return;
    }
    await loadDirectoryPage(
      directory.page + 1,
      directory.query,
      { append: true },
      seatAssignments,
      composition.organizationId,
    );
  }, [composition, directory, loadDirectoryPage, runtime, seatAssignments]);

  const loadCatalog = useCallback(async (): Promise<MembershipTeamCatalog> => {
    if (catalog) {
      return catalog;
    }
    if (!runtime) {
      throw new TeamSubscriptionError('unknown', 'Team membership is not available.');
    }
    const nextCatalog = await runtime.loadTeamCatalog();
    setCatalog(nextCatalog);
    return nextCatalog;
  }, [catalog, runtime]);

  return {
    assignSeat,
    bindOrganization,
    bootstrap,
    composition,
    directory,
    error,
    loadCatalog,
    loadMoreDirectory,
    organizationChoices,
    organizationName,
    overview,
    reconcile,
    refresh,
    retry,
    revokeSeat,
    runtime,
    savePolicy,
    searchDirectory,
    seatAssignments,
    status,
    switchOrganization,
  };
}
