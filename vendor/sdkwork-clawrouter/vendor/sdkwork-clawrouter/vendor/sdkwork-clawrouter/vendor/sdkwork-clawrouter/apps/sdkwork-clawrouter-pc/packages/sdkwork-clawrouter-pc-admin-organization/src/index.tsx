import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  Edit,
  GitBranch,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { BusinessStatePanel, BusinessStateTableRow, ConfirmDialog, AdminTableShell } from '@sdkwork/clawroutes-pc-commons';
import {
  OrganizationService,
  type DepartmentAssignmentRecord,
  type DepartmentAssignmentCommand,
  type DepartmentCommand,
  type DepartmentRecord,
  type DepartmentTreeNode,
  type MembershipCommand,
  type OrganizationCommand,
  type OrganizationDirectoryData,
  type OrganizationMemberRecord,
  type OrganizationRecord,
  type OrganizationTreeNode,
  type PermissionCommand,
  type PermissionRecord,
  type PositionAssignmentCommand,
  type PositionAssignmentRecord,
  type PositionCommand,
  type PositionRecord,
  type RoleBindingCommand,
  type RoleBindingRecord,
  type RoleCommand,
  type RoleRecord,
  type UserRecord,
} from './organizationService';

type OrganizationAdminTab = 'members' | 'positions' | 'authorization';
type OrganizationDialog =
  | { kind: 'organization'; mode: 'create'; parentOrganizationId?: string; target?: undefined }
  | { kind: 'organization'; mode: 'edit'; target: OrganizationRecord }
  | { kind: 'department'; mode: 'create'; target?: undefined }
  | { kind: 'department'; mode: 'edit'; target: DepartmentRecord }
  | { kind: 'membership'; mode: 'edit'; target: OrganizationMemberRecord }
  | { kind: 'departmentAssignment'; mode: 'create'; target?: undefined }
  | { kind: 'departmentAssignment'; mode: 'edit'; target: DepartmentAssignmentRecord }
  | { kind: 'position'; mode: 'create'; target?: undefined }
  | { kind: 'position'; mode: 'edit'; target: PositionRecord }
  | { kind: 'positionAssignment'; mode: 'create'; target?: undefined }
  | { kind: 'positionAssignment'; mode: 'edit'; target: PositionAssignmentRecord }
  | { kind: 'role'; mode: 'create'; target?: undefined }
  | { kind: 'role'; mode: 'edit'; target: RoleRecord }
  | { kind: 'roleBinding'; mode: 'create'; target?: undefined }
  | { kind: 'permission'; mode: 'create'; target?: undefined }
  | { kind: 'permission'; mode: 'edit'; target: PermissionRecord }
  | { kind: 'rolePermission'; mode: 'create'; target?: undefined };

type OrganizationDialogSubmitResult =
  | { kind: 'organization'; item: OrganizationRecord }
  | { kind: 'department'; item: DepartmentRecord }
  | null;

type AssignmentDrawerState = 'departmentAssignments' | 'positionAssignments';
type AuthorizationDrawerState = 'roles' | 'rolePermissions' | 'roleBindings';
type ChooseUserSelectionMode = 'single' | 'multiple';
type ChooseUserModalState = { organizationId: string; departmentId?: string; selectionMode?: ChooseUserSelectionMode } | null;
type ConfirmDependency = { count: number; label: string };
type ConfirmTargetBase = { id: string; label: string; dependencies?: ConfirmDependency[]; blocked?: boolean };
type ConfirmTarget =
  | ({ kind: 'organization' } & ConfirmTargetBase)
  | ({ kind: 'department' } & ConfirmTargetBase)
  | ({ kind: 'membership' } & ConfirmTargetBase)
  | ({ kind: 'departmentAssignment' } & ConfirmTargetBase)
  | ({ kind: 'position' } & ConfirmTargetBase)
  | ({ kind: 'positionAssignment' } & ConfirmTargetBase)
  | ({ kind: 'role' } & ConfirmTargetBase)
  | ({ kind: 'roleBinding' } & ConfirmTargetBase)
  | ({ kind: 'rolePermission'; roleId: string } & ConfirmTargetBase)
  | ({ kind: 'permission' } & ConfirmTargetBase);

type TranslationFunction = ReturnType<typeof useTranslation>['t'];
type SelectOption = { value: string; label: string };
type DirectoryNodeMenuState = {
  nodeId: string;
  mode: 'dropdown' | 'context';
  x: number;
  y: number;
};
type DirectoryNodeMenuAction = {
  danger?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  id: string;
  label: string;
  onSelect: () => void;
};
type DirectoryNodeMenuGroup = {
  id: string;
  label: string;
  actions: DirectoryNodeMenuAction[];
};
type OrganizationDirectoryTreeNode = {
  nodeKind: 'organization' | 'department';
  id: string;
  organizationId: string;
  departmentId: string;
  code: string;
  name: string;
  meta: string;
  children: OrganizationDirectoryTreeNode[];
};

const DIRECTORY_NODE_MENU_WIDTH = 300;
const DIRECTORY_NODE_MENU_POSITION_ESTIMATED_HEIGHT = 440;

interface DirectoryLookups {
  usersById: Map<string, UserRecord>;
  organizationsById: Map<string, OrganizationRecord>;
  departmentsById: Map<string, DepartmentRecord>;
  membershipsById: Map<string, OrganizationMemberRecord>;
  membershipsByUserId: Map<string, OrganizationMemberRecord>;
  positionsById: Map<string, PositionRecord>;
  rolesById: Map<string, RoleRecord>;
  permissionsById: Map<string, PermissionRecord>;
}

const EMPTY_DIRECTORY: OrganizationDirectoryData = {
  organizationTree: [],
  users: [],
  organizations: [],
  departmentTree: [],
  departments: [],
  memberships: [],
  departmentAssignments: [],
  positions: [],
  positionAssignments: [],
  roles: [],
  roleBindings: [],
  permissions: [],
};

const TAB_ITEMS: Array<{ id: OrganizationAdminTab; icon: typeof Users; labelKey: string; fallback: string }> = [
  { id: 'members', icon: Users, labelKey: 'admin.organization.tabs.members', fallback: 'Members' },
  { id: 'positions', icon: BriefcaseBusiness, labelKey: 'admin.organization.tabs.positions', fallback: 'Positions' },
  { id: 'authorization', icon: ShieldCheck, labelKey: 'admin.organization.tabs.authorization', fallback: 'Permissions' },
];

export function OrganizationAdmin() {
  const { t } = useTranslation();
  const [directory, setDirectory] = useState<OrganizationDirectoryData>(EMPTY_DIRECTORY);
  const [listSearchInput, setListSearchInput] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [activeTab, setActiveTab] = useState<OrganizationAdminTab>('members');
  const [activeOrganizationId, setActiveOrganizationId] = useState<string>('');
  const [activeDepartmentId, setActiveDepartmentId] = useState<string>('');
  const [expandedDirectoryNodeIds, setExpandedDirectoryNodeIds] = useState<Set<string>>(() => new Set());
  const [directoryNodeMenu, setDirectoryNodeMenu] = useState<DirectoryNodeMenuState | null>(null);
  const [dialog, setDialog] = useState<OrganizationDialog | null>(null);
  const [chooseUserModal, setChooseUserModal] = useState<ChooseUserModalState>(null);
  const [assignmentDrawer, setAssignmentDrawer] = useState<AssignmentDrawerState | null>(null);
  const [authorizationDrawer, setAuthorizationDrawer] = useState<AuthorizationDrawerState | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [activeRoleId, setActiveRoleId] = useState<string>('');
  const [rolePermissions, setRolePermissions] = useState<PermissionRecord[]>([]);
  const [rolePermissionsLoading, setRolePermissionsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadDirectory = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const nextDirectory = await OrganizationService.loadDirectory();
      const nextActiveOrganization = nextDirectory.organizations.find(isActiveRecord) ?? nextDirectory.organizations[0] ?? null;
      const nextActiveRole = nextDirectory.roles.find(isActiveRecord) ?? nextDirectory.roles[0] ?? null;
      const nextActiveOrganizationId = activeOrganizationId && nextDirectory.organizations.some((item) => item.id === activeOrganizationId)
        ? activeOrganizationId
        : nextActiveOrganization?.id || '';
      const nextCombinedDirectoryTree = buildOrganizationDepartmentTree(nextDirectory.organizationTree, nextDirectory.departmentTree, nextDirectory.organizations, nextDirectory.departments);
      setDirectory(nextDirectory);
      setActiveOrganizationId(nextActiveOrganizationId);
      setActiveDepartmentId((current) => current || nextDirectory.departments[0]?.id || '');
      setExpandedDirectoryNodeIds((current) => (nextActiveOrganizationId ? expandDirectoryPath(current, nextCombinedDirectoryTree, `organization:${nextActiveOrganizationId}`) : current));
      setActiveRoleId((current) => (current && nextDirectory.roles.some((item) => item.id === current && isActiveRecord(item)) ? current : nextActiveRole?.id || ''));
    } catch (error) {
      setLoadError(getErrorMessage(error, t('admin.organization.errors.loadDirectory', 'Organization directory could not be loaded')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDirectory();
  }, []);

  useEffect(() => {
    if (!activeRoleId) {
      setRolePermissions([]);
      return;
    }

    let cancelled = false;
    setRolePermissionsLoading(true);
    OrganizationService.listRolePermissions(activeRoleId)
      .then((items) => {
        if (!cancelled) {
          setRolePermissions(items);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setActionError(getErrorMessage(error, t('admin.organization.errors.loadRolePermissions', 'Role permissions could not be loaded')));
          setRolePermissions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRolePermissionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeRoleId, t]);

  useEffect(() => {
    if (!directoryNodeMenu) {
      return undefined;
    }

    const closeMenu = () => setDirectoryNodeMenu(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeMenu);
    return () => {
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', closeMenu);
    };
  }, [directoryNodeMenu]);

  const normalizedListSearch = listSearch.trim().toLowerCase();
  const lookups = useMemo(() => buildDirectoryLookups(directory), [directory]);
  const activeOrganizations = useMemo(
    () => directory.organizations.filter(isActiveRecord),
    [directory.organizations],
  );
  const activeOrganization = directory.organizations.find((item) => item.id === activeOrganizationId) ?? directory.organizations[0] ?? null;
  const effectiveOrganizationId = activeOrganization?.id ?? '';
  const activeOrganizationIdForRelations = activeOrganization && isActiveRecord(activeOrganization) ? activeOrganization.id : '';
  const activeDepartment = directory.departments.find((item) => item.id === activeDepartmentId) ?? null;
  const departmentsForActiveOrganization = useMemo(
    () => directory.departments.filter((item) => !effectiveOrganizationId || item.organizationId === effectiveOrganizationId),
    [directory.departments, effectiveOrganizationId],
  );
  useEffect(() => {
    if (activeDepartmentId && !departmentsForActiveOrganization.some((item) => item.id === activeDepartmentId)) {
      setActiveDepartmentId('');
    }
  }, [activeDepartmentId, departmentsForActiveOrganization]);
  const membersForActiveOrganization = useMemo(
    () => directory.memberships.filter((item) => !effectiveOrganizationId || item.organizationId === effectiveOrganizationId),
    [directory.memberships, effectiveOrganizationId],
  );
  const activeMembersForActiveOrganization = useMemo(
    () => membersForActiveOrganization.filter(isActiveRecord),
    [membersForActiveOrganization],
  );
  const activeMembershipIdsForOrganization = useMemo(
    () => new Set(activeMembersForActiveOrganization.map((item) => item.id)),
    [activeMembersForActiveOrganization],
  );
  const activeUserIdsForOrganization = useMemo(
    () => new Set(activeMembersForActiveOrganization.map((item) => item.userId).filter(Boolean)),
    [activeMembersForActiveOrganization],
  );
  const activeDepartmentsForActiveOrganization = useMemo(
    () => departmentsForActiveOrganization.filter(isActiveRecord),
    [departmentsForActiveOrganization],
  );
  const activeDepartmentIdForRelations = activeDepartmentsForActiveOrganization.some((item) => item.id === activeDepartmentId)
    ? activeDepartmentId
    : activeDepartmentsForActiveOrganization[0]?.id || '';
  const organizationsForActiveContext = useMemo(
    () => (activeOrganizationIdForRelations
      ? activeOrganizations.filter((item) => item.id === activeOrganizationIdForRelations)
      : activeOrganizations),
    [activeOrganizations, activeOrganizationIdForRelations],
  );
  const positionsForActiveContext = useMemo(
    () => directory.positions.filter((item) => {
      const inOrganization = !effectiveOrganizationId || item.organizationId === effectiveOrganizationId;
      const inDepartment = !activeDepartmentId || item.departmentId === activeDepartmentId;
      return inOrganization && inDepartment;
    }),
    [directory.positions, effectiveOrganizationId, activeDepartmentId],
  );
  const activePositionsForActiveContext = useMemo(
    () => directory.positions.filter(isActiveRecord).filter((item) => {
      const inOrganization = !effectiveOrganizationId || item.organizationId === effectiveOrganizationId;
      const inDepartment = !activeDepartmentId || item.departmentId === activeDepartmentId;
      return inOrganization && inDepartment;
    }),
    [directory.positions, effectiveOrganizationId, activeDepartmentId],
  );
  const activeRolesForAssignment = useMemo(
    () => directory.roles.filter(isActiveRecord),
    [directory.roles],
  );
  const activePermissionsForAssignment = useMemo(
    () => directory.permissions.filter(isActiveRecord),
    [directory.permissions],
  );
  const departmentIdsForOrganization = useMemo(
    () => new Set(departmentsForActiveOrganization.map((item) => item.id)),
    [departmentsForActiveOrganization],
  );
  const activeDepartmentAssignmentsForContext = useMemo(
    () => directory.departmentAssignments.filter(isActiveRecord).filter((item) => {
      if (activeDepartmentId) {
        return item.departmentId === activeDepartmentId;
      }
      return departmentIdsForOrganization.size === 0 || departmentIdsForOrganization.has(item.departmentId);
    }),
    [directory.departmentAssignments, activeDepartmentId, departmentIdsForOrganization],
  );
  const membershipIdsForDepartment = useMemo(
    () => new Set(activeDepartmentAssignmentsForContext.map((item) => item.membershipId).filter(Boolean)),
    [activeDepartmentAssignmentsForContext],
  );
  const userIdsForDepartment = useMemo(
    () => new Set(activeDepartmentAssignmentsForContext.map((item) => item.userId).filter(Boolean)),
    [activeDepartmentAssignmentsForContext],
  );
  const visibleMemberships = filterBySearchWithLabels(
    membersForActiveOrganization.filter((item) => {
      const inDepartment = !activeDepartmentId || membershipIdsForDepartment.has(item.id) || userIdsForDepartment.has(item.userId);
      return inDepartment;
    }),
    normalizedListSearch,
    (item) => [
      item.id,
      item.userId,
      item.displayName,
      item.email,
      item.mobile,
      item.memberKind,
      item.status,
      memberDisplayName(item, lookups),
      memberContactPrimary(item, lookups),
      memberContactSecondary(item, lookups),
      memberUserRegion(item, lookups),
      memberUserGender(item, lookups, t),
      formatMemberLabel(item.id, item.userId, lookups),
    ],
  );
  const visibleDepartmentAssignments = filterBySearchWithLabels(
    activeDepartmentAssignmentsForContext,
    normalizedListSearch,
    (item) => [
      item.id,
      item.membershipId,
      item.userId,
      item.departmentId,
      item.role,
      item.status,
      formatMemberLabel(item.membershipId, item.userId, lookups),
      formatDepartmentLabel(item.departmentId, lookups),
    ],
  );
  const visiblePositions = filterBySearchWithLabels(
    positionsForActiveContext,
    normalizedListSearch,
    (item) => [
      item.id,
      item.code,
      item.name,
      item.departmentId,
      item.status,
      item.description,
      formatDepartmentLabel(item.departmentId, lookups),
    ],
  );
  const visiblePositionAssignments = filterBySearchWithLabels(
    directory.positionAssignments.filter(isActiveRecord).filter((item) => positionsForActiveContext.some((position) => position.id === item.positionId)),
    normalizedListSearch,
    (item) => [
      item.id,
      item.positionId,
      item.membershipId,
      item.userId,
      item.status,
      item.startedAt,
      item.endedAt,
      formatPositionLabel(item.positionId, lookups),
      formatMemberLabel(item.membershipId, item.userId, lookups),
    ],
  );
  const visibleRoleBindings = filterBySearchWithLabels(
    directory.roleBindings.filter((item) => roleBindingBelongsToContext(item, effectiveOrganizationId, activeDepartmentId, departmentIdsForOrganization, activeMembershipIdsForOrganization, activeUserIdsForOrganization)),
    normalizedListSearch,
    (item) => [
      item.id,
      item.roleId,
      item.principalKind,
      item.principalId,
      item.scopeKind,
      item.scopeId,
      item.organizationId,
      item.departmentId,
      item.status,
      formatPrincipalLabel(item.principalKind, item.principalId, lookups),
      formatRoleLabel(item.roleId, lookups),
      formatRoleBindingScopeLabel(item, lookups),
    ],
  );
  const visibleRoles = filterBySearchWithLabels(
    directory.roles,
    normalizedListSearch,
    (item) => [item.id, item.code, item.name, item.description, item.status],
  );
  const visiblePermissions = filterBySearchWithLabels(
    directory.permissions,
    normalizedListSearch,
    (item) => [item.id, item.code, item.name, item.resource, item.action, item.description, item.status],
  );
  const activeRole = visibleRoles.find((item) => item.id === activeRoleId) ?? directory.roles.find((item) => item.id === activeRoleId) ?? null;
  const combinedDirectoryTree = useMemo(
    () => buildOrganizationDepartmentTree(directory.organizationTree, directory.departmentTree, directory.organizations, directory.departments),
    [directory.organizationTree, directory.departmentTree, directory.organizations, directory.departments],
  );

  function handleListSearchSubmit(event?: FormEvent<HTMLFormElement>): void {
    event?.preventDefault();
    setListSearch(listSearchInput);
  }

  function handleDirectoryNodeSelect(node: OrganizationDirectoryTreeNode): void {
    if (node.nodeKind === 'organization') {
      setActiveOrganizationId(node.organizationId);
      setActiveDepartmentId('');
      setExpandedDirectoryNodeIds((current) => expandDirectoryNode(current, node.id));
      return;
    }
    setActiveOrganizationId(node.organizationId);
    setActiveDepartmentId(node.departmentId);
    setExpandedDirectoryNodeIds((current) => expandDirectoryPath(current, combinedDirectoryTree, node.id));
  }

  function openDirectoryNodeMenu(nodeId: string, mode: DirectoryNodeMenuState['mode'], x: number, y: number): void {
    const position = constrainDirectoryNodeMenuPosition(x, y);
    setDirectoryNodeMenu({ nodeId, mode, x: position.x, y: position.y });
  }

  const handleDialogSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dialog) {
      return;
    }
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setActionError(null);
    try {
      const submitResult = await submitDialog(dialog, form, activeOrganizationIdForRelations, activeDepartmentIdForRelations);
      setDialog(null);
      await loadDirectory();
      setCreatedDirectorySelection(submitResult);
    } catch (error) {
      setActionError(getErrorMessage(error, t('admin.organization.errors.actionFailed', 'Action failed')));
    } finally {
      setBusy(false);
    }
  };

  function setCreatedDirectorySelection(result: OrganizationDialogSubmitResult): void {
    if (!result) {
      return;
    }
    if (result.kind === 'organization') {
      setActiveOrganizationId(result.item.id);
      setActiveDepartmentId('');
      setExpandedDirectoryNodeIds((current) => expandDirectoryNode(current, `organization:${result.item.id}`));
      return;
    }
    setActiveOrganizationId(result.item.organizationId);
    setActiveDepartmentId(result.item.id);
    setExpandedDirectoryNodeIds((current) => {
      const withOrganization = expandDirectoryNode(current, `organization:${result.item.organizationId}`);
      const withParentDepartment = result.item.parentDepartmentId
        ? expandDirectoryPath(withOrganization, combinedDirectoryTree, `department:${result.item.parentDepartmentId}`)
        : withOrganization;
      return expandDirectoryNode(withParentDepartment, `department:${result.item.id}`);
    });
  }

  async function handleChooseUsers(users: UserRecord[]): Promise<void> {
    if (!chooseUserModal || users.length === 0) {
      return;
    }
    const targetDepartmentId = chooseUserModal.departmentId;
    setBusy(true);
    setActionError(null);
    try {
      await Promise.all(users.map(async (user) => {
        const membership = await ensureOrganizationMemberForUser(user, chooseUserModal.organizationId, directory.memberships);
        if (targetDepartmentId) {
          await ensureDepartmentAssignmentForMember(targetDepartmentId, membership, directory.departmentAssignments);
        }
      }));
      setChooseUserModal(null);
      await loadDirectory();
    } catch (error) {
      setActionError(getErrorMessage(error, t('admin.organization.errors.actionFailed', 'Action failed')));
    } finally {
      setBusy(false);
    }
  }

  const handleConfirm = async () => {
    if (!confirmTarget) {
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await deleteTarget(confirmTarget);
      if (confirmTarget.kind === 'rolePermission') {
        setRolePermissions((current) => current.filter((item) => item.id !== confirmTarget.id));
      }
      setConfirmTarget(null);
      await loadDirectory();
    } catch (error) {
      setActionError(getErrorMessage(error, t('admin.organization.errors.actionFailed', 'Action failed')));
    } finally {
      setBusy(false);
    }
  };

  if (loading && directory.organizations.length === 0) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center">
        <BusinessStatePanel kind="loading" title={t('admin.organization.loading', 'Loading organization directory...')} />
      </div>
    );
  }

  if (loadError && directory.organizations.length === 0) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center">
        <BusinessStatePanel
          kind="error"
          title={t('admin.organization.loadError', 'Organization directory could not be loaded')}
          description={loadError}
          retryLabel={t('common.actions.retry', 'Retry')}
          onRetry={() => { void loadDirectory(); }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      {actionError ? (
        <div className="flex shrink-0 items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-500/20" aria-label={t('common.actions.close', 'Close')}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Panel title={t('admin.organization.panels.directory', 'Organization structure')}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <SmallButton label={t('admin.organization.actions.createOrganization', 'Create organization')} onClick={() => setDialog({ kind: 'organization', mode: 'create' })} />
            <SmallButton label={t('admin.organization.actions.createDepartment', 'Create department')} onClick={() => setDialog({ kind: 'department', mode: 'create' })} disabled={!activeOrganizationIdForRelations} />
          </div>
          <TreeList
            emptyLabel={t('admin.organization.empty.directory', 'No organization structure')}
            isNodeExpanded={(node) => expandedDirectoryNodeIds.has(node.id)}
            nodes={combinedDirectoryTree}
            renderFallback={() => []}
            renderNode={(node, depth) => (
              (() => {
                const organization = node.nodeKind === 'organization'
                  ? directory.organizations.find((item) => item.id === node.organizationId)
                  : null;
                const department = node.nodeKind === 'department'
                  ? directory.departments.find((item) => item.id === node.departmentId)
                  : null;
                const owningOrganization = directory.organizations.find((item) => item.id === node.organizationId) ?? organization;
                const nodeMenuState = directoryNodeMenu?.nodeId === node.id ? directoryNodeMenu : null;
                const nodeMenuGroups: DirectoryNodeMenuGroup[] = [
                  {
                    id: 'navigate',
                    label: t('admin.organization.menu.navigate', 'Navigate'),
                    actions: [
                      {
                        id: 'select',
                        label: t('admin.organization.actions.selectNode', 'Select'),
                        icon: <BadgeCheck className="h-4 w-4" />,
                        onSelect: () => handleDirectoryNodeSelect(node),
                      },
                      {
                        id: 'view-members',
                        label: t('admin.organization.actions.viewMembers', 'View members'),
                        icon: <Users className="h-4 w-4" />,
                        onSelect: () => {
                          handleDirectoryNodeSelect(node);
                          setActiveTab('members');
                        },
                      },
                      {
                        id: 'view-positions',
                        label: t('admin.organization.actions.viewPositions', 'View positions'),
                        icon: <BriefcaseBusiness className="h-4 w-4" />,
                        onSelect: () => {
                          handleDirectoryNodeSelect(node);
                          setActiveTab('positions');
                        },
                      },
                      {
                        id: 'view-permissions',
                        label: t('admin.organization.actions.viewPermissions', 'View permissions'),
                        icon: <ShieldCheck className="h-4 w-4" />,
                        onSelect: () => {
                          handleDirectoryNodeSelect(node);
                          setActiveTab('authorization');
                        },
                      },
                    ],
                  },
                  {
                    id: 'create',
                    label: t('admin.organization.menu.create', 'Create'),
                    actions: compactNodeMenuActions([
                      owningOrganization && isActiveRecord(owningOrganization) ? {
                        id: 'create-child-organization',
                        label: t('admin.organization.actions.createChildOrganization', 'Create child organization'),
                        icon: <Building2 className="h-4 w-4" />,
                        onSelect: () => {
                          setActiveOrganizationId(node.organizationId);
                          setActiveDepartmentId('');
                          setExpandedDirectoryNodeIds((current) => expandDirectoryPath(current, combinedDirectoryTree, node.id));
                          setDialog({ kind: 'organization', mode: 'create', parentOrganizationId: node.organizationId });
                        },
                      } : null,
                      organization && isActiveRecord(organization) ? {
                        id: 'create-department',
                        label: t('admin.organization.actions.createDepartment', 'Create department'),
                        icon: <GitBranch className="h-4 w-4" />,
                        onSelect: () => {
                          setActiveOrganizationId(node.organizationId);
                          setActiveDepartmentId('');
                          setExpandedDirectoryNodeIds((current) => expandDirectoryNode(current, node.id));
                          setDialog({ kind: 'department', mode: 'create' });
                        },
                      } : null,
                      department && isActiveRecord(department) ? {
                        id: 'create-child-department',
                        label: t('admin.organization.actions.addChildDepartment', 'Add child department'),
                        icon: <GitBranch className="h-4 w-4" />,
                        onSelect: () => {
                          setActiveOrganizationId(node.organizationId);
                          setActiveDepartmentId(node.departmentId);
                          setExpandedDirectoryNodeIds((current) => expandDirectoryPath(current, combinedDirectoryTree, node.id));
                          setDialog({ kind: 'department', mode: 'create' });
                        },
                      } : null,
                      (organization && isActiveRecord(organization)) || (department && isActiveRecord(department)) ? {
                        id: 'add-member',
                        label: t('admin.organization.actions.addMember', 'Add member'),
                        icon: <UserPlus className="h-4 w-4" />,
                        onSelect: () => {
                          handleDirectoryNodeSelect(node);
                          setActiveTab('members');
                          setChooseUserModal({ organizationId: node.organizationId, departmentId: node.nodeKind === 'department' ? node.departmentId : undefined });
                        },
                      } : null,
                      department && isActiveRecord(department) ? {
                        id: 'assign-member',
                        label: t('admin.organization.actions.assignMember', 'Assign member'),
                        icon: <Users className="h-4 w-4" />,
                        onSelect: () => {
                          handleDirectoryNodeSelect(node);
                          setActiveTab('members');
                          setDialog({ kind: 'departmentAssignment', mode: 'create' });
                        },
                      } : null,
                      (organization && isActiveRecord(organization)) || (department && isActiveRecord(department)) ? {
                        id: 'create-position',
                        label: t('admin.organization.actions.createPosition', 'Create position'),
                        icon: <BriefcaseBusiness className="h-4 w-4" />,
                        onSelect: () => {
                          handleDirectoryNodeSelect(node);
                          setActiveTab('positions');
                          setDialog({ kind: 'position', mode: 'create' });
                        },
                      } : null,
                    ]),
                  },
                  {
                    id: 'maintain',
                    label: t('admin.organization.menu.maintain', 'Maintain'),
                    actions: compactNodeMenuActions([
                      organization ? {
                        id: 'edit-organization',
                        label: t('common.actions.edit', 'Edit'),
                        icon: <Edit className="h-4 w-4" />,
                        onSelect: () => setDialog({ kind: 'organization', mode: 'edit', target: organization }),
                      } : department ? {
                        id: 'edit-department',
                        label: t('common.actions.edit', 'Edit'),
                        icon: <Edit className="h-4 w-4" />,
                        onSelect: () => setDialog({ kind: 'department', mode: 'edit', target: department }),
                      } : null,
                      organization ? {
                        id: 'delete-organization',
                        label: t('common.actions.delete', 'Delete'),
                        icon: <Trash2 className="h-4 w-4" />,
                        danger: true,
                        onSelect: () => setConfirmTarget(buildOrganizationConfirmTarget(organization, directory, t)),
                      } : department ? {
                        id: 'delete-department',
                        label: t('common.actions.delete', 'Delete'),
                        icon: <Trash2 className="h-4 w-4" />,
                        danger: true,
                        onSelect: () => setConfirmTarget(buildDepartmentConfirmTarget(department, directory, t)),
                      } : null,
                    ]),
                  },
                ].filter((group) => group.actions.length > 0);
                return (
                  <TreeNodeButton
                    active={node.nodeKind === 'organization' ? node.organizationId === effectiveOrganizationId && !activeDepartmentId : node.departmentId === activeDepartmentId}
                    depth={depth}
                    expanded={expandedDirectoryNodeIds.has(node.id)}
                    hasChildren={node.children.length > 0}
                    key={node.id}
                    label={node.name}
                    menu={nodeMenuState ? <DirectoryNodeMenu groups={nodeMenuGroups} menuState={nodeMenuState} onClose={() => setDirectoryNodeMenu(null)} /> : null}
                    menuOpen={Boolean(nodeMenuState)}
                    meta={node.meta}
                    onClick={() => handleDirectoryNodeSelect(node)}
                    onCreateChild={organization && isActiveRecord(organization)
                      ? () => {
                        setActiveOrganizationId(node.organizationId);
                        setActiveDepartmentId('');
                        setExpandedDirectoryNodeIds((current) => expandDirectoryNode(current, node.id));
                        setDialog({ kind: 'department', mode: 'create' });
                      }
                      : department && isActiveRecord(department) ? () => {
                        setActiveOrganizationId(node.organizationId);
                        setActiveDepartmentId(node.departmentId);
                        setExpandedDirectoryNodeIds((current) => expandDirectoryPath(current, combinedDirectoryTree, node.id));
                        setDialog({ kind: 'department', mode: 'create' });
                      } : undefined}
                    onDelete={organization
                      ? () => setConfirmTarget(buildOrganizationConfirmTarget(organization, directory, t))
                      : department ? () => setConfirmTarget(buildDepartmentConfirmTarget(department, directory, t)) : undefined}
                    onEdit={organization
                      ? () => setDialog({ kind: 'organization', mode: 'edit', target: organization })
                      : department ? () => setDialog({ kind: 'department', mode: 'edit', target: department }) : undefined}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      openDirectoryNodeMenu(node.id, 'context', event.clientX, event.clientY);
                    }}
                    onOpenMenu={(event) => {
                      event.stopPropagation();
                      const rect = event.currentTarget.getBoundingClientRect();
                      openDirectoryNodeMenu(node.id, 'dropdown', rect.right - DIRECTORY_NODE_MENU_WIDTH, rect.bottom + 6);
                    }}
                    onToggle={() => setExpandedDirectoryNodeIds((current) => toggleDirectoryNode(current, node.id))}
                  />
                );
              })()
            )}
          />
        </Panel>

        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-[#171717]">
            <div className="flex flex-wrap gap-1">
              {TAB_ITEMS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {t(tab.labelKey, tab.fallback)}
                  </button>
                );
              })}
            </div>
            <ContextBadge organization={activeOrganization} department={activeDepartment} t={t} />
          </div>

          {activeTab === 'members' ? (
            <MembersTab
              canAddAssignment={Boolean(activeOrganizationIdForRelations && activeDepartmentIdForRelations && activeMembersForActiveOrganization.length > 0)}
              canAddMember={Boolean(activeOrganizationIdForRelations)}
              lookups={lookups}
              members={visibleMemberships}
              onAddAssignment={() => setDialog({ kind: 'departmentAssignment', mode: 'create' })}
              onAddMember={() => setChooseUserModal({ organizationId: activeOrganizationIdForRelations })}
              onManageAssignments={() => setAssignmentDrawer('departmentAssignments')}
              onDeactivateMember={(target) => setConfirmTarget({ kind: 'membership', id: target.id, label: formatMemberLabel(target.id, target.userId, lookups) })}
              onEditMember={(target) => setDialog({ kind: 'membership', mode: 'edit', target })}
              onQuery={handleListSearchSubmit}
              onQueryValueChange={setListSearchInput}
              queryLabel={t('common.actions.query', 'Query')}
              queryPlaceholder={t('admin.organization.search.members', 'Search members...')}
              queryValue={listSearchInput}
              t={t}
            />
          ) : null}

          {activeTab === 'positions' ? (
            <PositionsTab
              canAddAssignment={Boolean(activeOrganizationIdForRelations && activePositionsForActiveContext.length > 0 && activeMembersForActiveOrganization.length > 0)}
              canCreate={Boolean(activeOrganizationIdForRelations)}
              lookups={lookups}
              onAddAssignment={() => setDialog({ kind: 'positionAssignment', mode: 'create' })}
              onCreate={() => setDialog({ kind: 'position', mode: 'create' })}
              onManageAssignments={() => setAssignmentDrawer('positionAssignments')}
              onDelete={(target) => setConfirmTarget(buildPositionConfirmTarget(target, directory, t))}
              onEdit={(target) => setDialog({ kind: 'position', mode: 'edit', target })}
              onQuery={handleListSearchSubmit}
              onQueryValueChange={setListSearchInput}
              positions={visiblePositions}
              queryLabel={t('common.actions.query', 'Query')}
              queryPlaceholder={t('admin.organization.search.positions', 'Search positions...')}
              queryValue={listSearchInput}
              t={t}
            />
          ) : null}

          {activeTab === 'authorization' ? (
            <AuthorizationTab
              onCreatePermission={() => setDialog({ kind: 'permission', mode: 'create' })}
              onDeletePermission={(target) => setConfirmTarget(buildPermissionConfirmTarget(target, rolePermissions, t))}
              onEditPermission={(target) => setDialog({ kind: 'permission', mode: 'edit', target })}
              onManageRoleBindings={() => setAuthorizationDrawer('roleBindings')}
              onManageRolePermissions={() => setAuthorizationDrawer('rolePermissions')}
              onManageRoles={() => setAuthorizationDrawer('roles')}
              onQuery={handleListSearchSubmit}
              onQueryValueChange={setListSearchInput}
              permissions={visiblePermissions}
              queryLabel={t('common.actions.query', 'Query')}
              queryPlaceholder={t('admin.organization.search.permissions', 'Search permissions...')}
              queryValue={listSearchInput}
              t={t}
            />
          ) : null}
        </div>
      </div>

      {assignmentDrawer ? (
        <AssignmentDrawer
          activeKind={assignmentDrawer}
          canAddDepartmentAssignment={Boolean(activeOrganizationIdForRelations && activeDepartmentIdForRelations && activeMembersForActiveOrganization.length > 0)}
          canAddPositionAssignment={Boolean(activeOrganizationIdForRelations && activePositionsForActiveContext.length > 0 && activeMembersForActiveOrganization.length > 0)}
          departmentAssignments={visibleDepartmentAssignments}
          lookups={lookups}
          onAddDepartmentAssignment={() => {
            setAssignmentDrawer(null);
            setDialog({ kind: 'departmentAssignment', mode: 'create' });
          }}
          onAddPositionAssignment={() => {
            setAssignmentDrawer(null);
            setDialog({ kind: 'positionAssignment', mode: 'create' });
          }}
          onClose={() => setAssignmentDrawer(null)}
          onDeactivateDepartmentAssignment={(target) => setConfirmTarget({ kind: 'departmentAssignment', id: target.id, label: formatMemberLabel(target.membershipId, target.userId, lookups) })}
          onDeactivatePositionAssignment={(target) => setConfirmTarget({ kind: 'positionAssignment', id: target.id, label: formatPositionLabel(target.positionId, lookups) })}
          onEditDepartmentAssignment={(target) => {
            setAssignmentDrawer(null);
            setDialog({ kind: 'departmentAssignment', mode: 'edit', target });
          }}
          onEditPositionAssignment={(target) => {
            setAssignmentDrawer(null);
            setDialog({ kind: 'positionAssignment', mode: 'edit', target });
          }}
          positionAssignments={visiblePositionAssignments}
          t={t}
        />
      ) : null}

      {authorizationDrawer ? (
        <AuthorizationDrawer
          activeKind={authorizationDrawer}
          rolePermissions={rolePermissions}
          rolePermissionsLoading={rolePermissionsLoading}
          bindings={visibleRoleBindings}
          canBindRole={Boolean(activeRoleId && activeOrganizationIdForRelations)}
          lookups={lookups}
          onBindRole={() => {
            if (!activeRoleId || !activeOrganizationIdForRelations) {
              return;
            }
            setAuthorizationDrawer(null);
            setDialog({ kind: 'roleBinding', mode: 'create' });
          }}
          onClose={() => setAuthorizationDrawer(null)}
          onCreateRole={() => {
            setAuthorizationDrawer(null);
            setDialog({ kind: 'role', mode: 'create' });
          }}
          onDeleteBinding={(target) => setConfirmTarget({ kind: 'roleBinding', id: target.id, label: `${formatPrincipalLabel(target.principalKind, target.principalId, lookups)} / ${formatRoleLabel(target.roleId, lookups)}` })}
          onDeleteRole={(target) => setConfirmTarget(buildRoleConfirmTarget(target, directory, rolePermissions, t))}
          onDeleteRolePermission={(permission) => activeRoleId ? setConfirmTarget({ kind: 'rolePermission', id: permission.id, roleId: activeRoleId, label: `${activeRole?.name ?? activeRoleId} / ${permission.name}` }) : undefined}
          onEditRole={(target) => {
            setAuthorizationDrawer(null);
            setDialog({ kind: 'role', mode: 'edit', target });
          }}
          onGrantPermission={() => {
            if (!activeRoleId) {
              return;
            }
            setAuthorizationDrawer(null);
            setDialog({ kind: 'rolePermission', mode: 'create' });
          }}
          onViewRolePermissions={(roleId) => {
            setActiveRoleId(roleId);
            setAuthorizationDrawer('rolePermissions');
          }}
          roles={visibleRoles}
          selectedRoleId={activeRoleId}
          t={t}
        />
      ) : null}

      {chooseUserModal ? (
        <ChooseUserModal
          departmentAssignments={directory.departmentAssignments}
          existingMembers={directory.memberships}
          isBusy={busy}
          lookups={lookups}
          onCancel={() => setChooseUserModal(null)}
          onChooseUsers={handleChooseUsers}
          organizationId={chooseUserModal.organizationId}
          targetDepartmentId={chooseUserModal.departmentId}
          selectionMode={chooseUserModal.selectionMode ?? 'multiple'}
          t={t}
          users={directory.users}
        />
      ) : null}

      {dialog ? (
        <EntityDialog
          key={dialogKey(dialog)}
          activePermissionsForAssignment={activePermissionsForAssignment}
          activePositionsForActiveContext={activePositionsForActiveContext}
          activeOrganizations={activeOrganizations}
          activeOrganizationIdForRelations={activeOrganizationIdForRelations}
          activeRoleId={activeRoleId}
          activeRolesForAssignment={activeRolesForAssignment}
          activeDepartmentsForActiveOrganization={activeDepartmentsForActiveOrganization}
          activeDepartmentIdForRelations={activeDepartmentIdForRelations}
          activeMembersForActiveOrganization={activeMembersForActiveOrganization}
          activeOrganizationId={effectiveOrganizationId}
          dialog={dialog}
          directory={directory}
          error={actionError}
          isBusy={busy}
          lookups={lookups}
          onCancel={() => {
            setDialog(null);
            setActionError(null);
          }}
          onSubmit={handleDialogSubmit}
          organizationsForActiveContext={organizationsForActiveContext}
          rolePermissions={rolePermissions}
          t={t}
        />
      ) : null}

      {confirmTarget ? (
        <ConfirmDialog
          title={confirmDialogTitle(confirmTarget, t)}
          description={confirmDialogDescription(confirmTarget, t)}
          confirmLabel={confirmDialogConfirmLabel(confirmTarget, t)}
          confirmDisabled={isConfirmBlocked(confirmTarget)}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          isBusy={busy}
          tone="danger"
          icon={<Trash2 className="h-4 w-4" />}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={() => { void handleConfirm(); }}
        />
      ) : null}
    </div>
  );
}

function Panel({ action, children, title }: { action?: ReactNode; children: ReactNode; title: string }) {
  return (
    <section aria-label={title} className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171717]">
      <div className="flex shrink-0 items-center border-b border-slate-200 px-3 py-3 dark:border-white/10">
        {action}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">{children}</div>
    </section>
  );
}

function TreeList<TNode>({
  emptyLabel,
  isNodeExpanded,
  nodes,
  renderFallback,
  renderNode,
}: {
  emptyLabel: string;
  isNodeExpanded: (node: TNode) => boolean;
  nodes: TNode[];
  renderFallback: () => ReactNode[];
  renderNode: (node: TNode, depth: number, hasChildren: boolean, expanded: boolean) => ReactNode;
}) {
  if (nodes.length > 0) {
    return <div className="flex flex-col gap-1">{renderTree(nodes, renderNode, isNodeExpanded)}</div>;
  }
  const fallback = renderFallback();
  if (fallback.length > 0) {
    return <div className="flex flex-col gap-1">{fallback}</div>;
  }
  return (
    <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
      {emptyLabel}
    </div>
  );
}

function renderTree<TNode>(nodes: TNode[], renderNode: (node: TNode, depth: number, hasChildren: boolean, expanded: boolean) => ReactNode, isNodeExpanded: (node: TNode) => boolean, depth = 0): ReactNode[] {
  return nodes.flatMap((node) => {
    const children = readTreeChildren(node);
    const expanded = children.length > 0 && isNodeExpanded(node);
    return [
      renderNode(node, depth, children.length > 0, expanded),
      ...(expanded ? renderTree(children as TNode[], renderNode, isNodeExpanded, depth + 1) : []),
    ];
  });
}

function readTreeChildren(node: unknown): unknown[] {
  if (!node || typeof node !== 'object' || !('children' in node)) {
    return [];
  }
  const children = (node as { children?: unknown }).children;
  return Array.isArray(children) ? children : [];
}

function compactNodeMenuActions(actions: Array<DirectoryNodeMenuAction | null | undefined>): DirectoryNodeMenuAction[] {
  return actions.filter((action): action is DirectoryNodeMenuAction => Boolean(action));
}

function constrainDirectoryNodeMenuPosition(x: number, y: number): { x: number; y: number } {
  if (typeof window === 'undefined') {
    return { x, y };
  }
  const maxX = Math.max(8, window.innerWidth - DIRECTORY_NODE_MENU_WIDTH - 8);
  const maxY = Math.max(8, window.innerHeight - DIRECTORY_NODE_MENU_POSITION_ESTIMATED_HEIGHT - 8);
  return {
    x: Math.min(Math.max(8, x), maxX),
    y: Math.min(Math.max(8, y), maxY),
  };
}

function expandDirectoryNode(current: Set<string>, nodeId: string): Set<string> {
  const next = new Set(current);
  next.add(nodeId);
  return next;
}

function toggleDirectoryNode(current: Set<string>, nodeId: string): Set<string> {
  const next = new Set(current);
  if (next.has(nodeId)) {
    next.delete(nodeId);
    return next;
  }
  next.add(nodeId);
  return next;
}

function expandDirectoryPath(current: Set<string>, nodes: OrganizationDirectoryTreeNode[], targetNodeId: string): Set<string> {
  const path = findDirectoryPath(nodes, targetNodeId);
  if (path.length === 0) {
    return current;
  }
  const next = new Set(current);
  path.forEach((nodeId) => next.add(nodeId));
  return next;
}

function findDirectoryPath(nodes: OrganizationDirectoryTreeNode[], targetNodeId: string, ancestors: string[] = []): string[] {
  for (const node of nodes) {
    const nextAncestors = ancestors.concat(node.id);
    if (node.id === targetNodeId) {
      return nextAncestors;
    }
    const childPath = findDirectoryPath(node.children, targetNodeId, nextAncestors);
    if (childPath.length > 0) {
      return childPath;
    }
  }
  return [];
}

function TreeNodeButton({
  active,
  depth,
  expanded,
  hasChildren,
  label,
  menu,
  menuOpen,
  meta,
  onClick,
  onContextMenu,
  onCreateChild,
  onDelete,
  onEdit,
  onOpenMenu,
  onToggle,
}: {
  active: boolean;
  depth: number;
  expanded: boolean;
  hasChildren: boolean;
  label: string;
  menu?: ReactNode;
  menuOpen?: boolean;
  meta: string;
  onClick: () => void;
  onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void;
  onCreateChild?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onOpenMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
  onToggle?: () => void;
}) {
  const { t } = useTranslation();
  const toggleLabel = expanded ? t('common.actions.collapse', 'Collapse') : t('common.actions.expand', 'Expand');

  return (
    <div
      className={`group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors ${active ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5'} ${menuOpen ? 'ring-1 ring-blue-200 dark:ring-blue-500/30' : ''}`}
      onContextMenu={onContextMenu}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
    >
      <button
        type="button"
        onClick={hasChildren ? onToggle : undefined}
        title={hasChildren ? `${toggleLabel}: ${label}` : undefined}
        aria-label={hasChildren ? `${toggleLabel}: ${label}` : undefined}
        aria-expanded={hasChildren ? expanded : undefined}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition-colors ${hasChildren ? 'hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200' : 'pointer-events-none opacity-0'}`}
        tabIndex={hasChildren ? 0 : -1}
      >
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
        {meta ? <span className="max-w-20 truncate rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500 dark:bg-white/10 dark:text-slate-400">{meta}</span> : null}
      </button>
      {onCreateChild ? <RowIconButton label={t('admin.organization.actions.addChildDepartment', 'Add child department')} onClick={onCreateChild}><Plus className="h-3.5 w-3.5" /></RowIconButton> : null}
      {onOpenMenu ? <RowIconButton label={t('admin.organization.actions.more', 'More actions')} onClick={onOpenMenu}><MoreHorizontal className="h-3.5 w-3.5" /></RowIconButton> : null}
      {!onOpenMenu && onEdit ? <RowIconButton label={t('common.actions.edit', 'Edit')} onClick={onEdit}><Edit className="h-3.5 w-3.5" /></RowIconButton> : null}
      {!onOpenMenu && onDelete ? <RowIconButton label={t('common.actions.delete', 'Delete')} onClick={onDelete} danger><Trash2 className="h-3.5 w-3.5" /></RowIconButton> : null}
      {menu}
    </div>
  );
}

function DirectoryNodeMenu({
  groups,
  menuState,
  onClose,
}: {
  groups: DirectoryNodeMenuGroup[];
  menuState: DirectoryNodeMenuState;
  onClose: () => void;
}) {
  return (
    <div
      role="menu"
      className="fixed z-50 rounded-lg border border-slate-200 bg-white p-1.5 text-sm shadow-xl shadow-slate-950/10 dark:border-white/10 dark:bg-[#1e1e1e] dark:shadow-black/30"
      style={{ left: menuState.x, top: menuState.y, width: DIRECTORY_NODE_MENU_WIDTH }}
      onClick={(event) => event.stopPropagation()}
    >
      {groups.map((group, groupIndex) => (
        <div key={group.id} className={groupIndex > 0 ? 'border-t border-slate-100 pt-1.5 dark:border-white/10' : ''}>
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">{group.label}</div>
          <div className="space-y-1">
            {group.actions.map((action) => (
              <button
                type="button"
                role="menuitem"
                key={action.id}
                disabled={action.disabled}
                onClick={() => {
                  if (action.disabled) {
                    return;
                  }
                  action.onSelect();
                  onClose();
                }}
                className={`flex w-full min-w-0 items-center justify-start gap-2 rounded-md px-3 py-2 text-left text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${action.danger ? 'text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5'}`}
              >
                <span className="shrink-0 opacity-80">{action.icon}</span>
                <span className="min-w-0 flex-1 truncate">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContextBadge({ department, organization, t }: { department: DepartmentRecord | null; organization: OrganizationRecord | null; t: TranslationFunction }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-500" />
      <span className="truncate">
        {organization?.name || t('admin.organization.context.allOrganizations', 'All organizations')}
        {department ? ` / ${department.name}` : ''}
      </span>
    </div>
  );
}

function MembersTab({
  canAddAssignment,
  canAddMember,
  lookups,
  members,
  onAddAssignment,
  onAddMember,
  onManageAssignments,
  onDeactivateMember,
  onEditMember,
  onQuery,
  onQueryValueChange,
  queryLabel,
  queryPlaceholder,
  queryValue,
  t,
}: {
  canAddAssignment: boolean;
  canAddMember: boolean;
  lookups: DirectoryLookups;
  members: OrganizationMemberRecord[];
  onAddAssignment: () => void;
  onAddMember: () => void;
  onManageAssignments: () => void;
  onDeactivateMember: (target: OrganizationMemberRecord) => void;
  onEditMember: (target: OrganizationMemberRecord) => void;
  onQuery: (event?: FormEvent<HTMLFormElement>) => void;
  onQueryValueChange: (value: string) => void;
  queryLabel: string;
  queryPlaceholder: string;
  queryValue: string;
  t: TranslationFunction;
}) {
  return (
    <div className="flex min-h-0 flex-1">
      <AdminTableShell
        header={(
          <TableHeader
            query={(
              <ListQueryControl
                onChange={onQueryValueChange}
                onQuery={onQuery}
                placeholder={queryPlaceholder}
                queryLabel={queryLabel}
                value={queryValue}
              />
            )}
            action={(
              <div className="flex flex-wrap items-center gap-2">
                <HeaderButton label={t('admin.organization.actions.assign', 'Assign')} onClick={onAddAssignment} disabled={!canAddAssignment} />
                <HeaderButton label={t('admin.organization.actions.assignments', 'Assignments')} onClick={onManageAssignments} />
                <HeaderButton label={t('admin.organization.actions.addMember', 'Add member')} onClick={onAddMember} disabled={!canAddMember} variant="primary">
                  <UserPlus className="h-4 w-4" />
                </HeaderButton>
              </div>
            )}
          />
        )}
        viewportClassName="min-h-0"
      >
        <table className="w-full min-w-[1240px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{t('admin.organization.columns.member', 'Member')}</th>
              <th className="px-4 py-3">{t('admin.organization.columns.contact', 'Contact')}</th>
              <th className="px-4 py-3">{t('admin.organization.columns.region', 'Region')}</th>
              <th className="px-4 py-3">{t('admin.organization.columns.address', 'Address')}</th>
              <th className="px-4 py-3">{t('admin.organization.columns.gender', 'Gender')}</th>
              <th className="px-4 py-3">{t('admin.organization.columns.kind', 'Kind')}</th>
              <th className="px-4 py-3">{t('admin.organization.columns.status', 'Status')}</th>
              <th className="px-4 py-3">{t('admin.organization.columns.joinedAt', 'Joined')}</th>
              <th className="px-4 py-3 text-right">{t('admin.organization.columns.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/5">
            {members.length === 0 ? (
              <BusinessStateTableRow colSpan={9} kind="empty" title={t('admin.organization.empty.members', 'No members')} />
            ) : members.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 dark:text-white">{memberDisplayName(member, lookups)}</div>
                  <div className="text-xs text-slate-500">{formatMemberLabel(member.id, member.userId, lookups)}</div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  <div>{memberContactPrimary(member, lookups)}</div>
                  <div className="text-xs text-slate-500">{memberContactSecondary(member, lookups)}</div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{memberUserRegion(member, lookups)}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{memberUserAddress(member, lookups)}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{memberUserGender(member, lookups, t)}</td>
                <td className="px-4 py-3">{member.memberKind}</td>
                <td className="px-4 py-3"><StatusPill status={member.status} t={t} /></td>
                <td className="px-4 py-3 text-slate-500">{member.joinedAt || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <TextButton label={t('common.actions.edit', 'Edit')} onClick={() => onEditMember(member)} />
                    <TextButton label={t('admin.organization.actions.deactivate', 'Deactivate')} onClick={() => onDeactivateMember(member)} danger />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableShell>
    </div>
  );
}

function PositionsTab({
  canAddAssignment,
  canCreate,
  lookups,
  onAddAssignment,
  onCreate,
  onManageAssignments,
  onDelete,
  onEdit,
  onQuery,
  onQueryValueChange,
  positions,
  queryLabel,
  queryPlaceholder,
  queryValue,
  t,
}: {
  canAddAssignment: boolean;
  canCreate: boolean;
  lookups: DirectoryLookups;
  onAddAssignment: () => void;
  onCreate: () => void;
  onManageAssignments: () => void;
  onDelete: (target: PositionRecord) => void;
  onEdit: (target: PositionRecord) => void;
  onQuery: (event?: FormEvent<HTMLFormElement>) => void;
  onQueryValueChange: (value: string) => void;
  positions: PositionRecord[];
  queryLabel: string;
  queryPlaceholder: string;
  queryValue: string;
  t: TranslationFunction;
}) {
  return (
    <div className="flex min-h-0 flex-1">
      <AdminTableShell
        header={(
          <TableHeader
            query={(
              <ListQueryControl
                onChange={onQueryValueChange}
                onQuery={onQuery}
                placeholder={queryPlaceholder}
                queryLabel={queryLabel}
                value={queryValue}
              />
            )}
            action={(
              <div className="flex flex-wrap items-center gap-2">
                <HeaderButton label={t('admin.organization.actions.assign', 'Assign')} onClick={onAddAssignment} disabled={!canAddAssignment} />
                <HeaderButton label={t('admin.organization.actions.assignments', 'Assignments')} onClick={onManageAssignments} />
                <HeaderButton label={t('admin.organization.actions.createPosition', 'Create position')} onClick={onCreate} disabled={!canCreate} variant="primary">
                  <Plus className="h-4 w-4" />
                </HeaderButton>
              </div>
            )}
          />
        )}
      >
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{t('admin.organization.columns.position', 'Position')}</th>
              <th className="px-4 py-3">{t('admin.organization.columns.department', 'Department')}</th>
              <th className="px-4 py-3">{t('admin.organization.columns.rank', 'Rank')}</th>
              <th className="px-4 py-3">{t('admin.organization.columns.status', 'Status')}</th>
              <th className="px-4 py-3 text-right">{t('admin.organization.columns.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/5">
            {positions.length === 0 ? (
              <BusinessStateTableRow colSpan={5} kind="empty" title={t('admin.organization.empty.positions', 'No positions')} />
            ) : positions.map((position) => (
              <tr key={position.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 dark:text-white">{position.name}</div>
                  <div className="text-xs text-slate-500">{position.code || position.id}</div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDepartmentLabel(position.departmentId, lookups)}</td>
                <td className="px-4 py-3 tabular-nums">{position.rankLevel}</td>
                <td className="px-4 py-3"><StatusPill status={position.status} t={t} /></td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <TextButton label={t('common.actions.edit', 'Edit')} onClick={() => onEdit(position)} />
                    <TextButton label={t('common.actions.delete', 'Delete')} onClick={() => onDelete(position)} danger />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableShell>
    </div>
  );
}

function AssignmentDrawer({
  activeKind,
  canAddDepartmentAssignment,
  canAddPositionAssignment,
  departmentAssignments,
  lookups,
  onAddDepartmentAssignment,
  onAddPositionAssignment,
  onClose,
  onDeactivateDepartmentAssignment,
  onDeactivatePositionAssignment,
  onEditDepartmentAssignment,
  onEditPositionAssignment,
  positionAssignments,
  t,
}: {
  activeKind: AssignmentDrawerState;
  canAddDepartmentAssignment: boolean;
  canAddPositionAssignment: boolean;
  departmentAssignments: DepartmentAssignmentRecord[];
  lookups: DirectoryLookups;
  onAddDepartmentAssignment: () => void;
  onAddPositionAssignment: () => void;
  onClose: () => void;
  onDeactivateDepartmentAssignment: (target: DepartmentAssignmentRecord) => void;
  onDeactivatePositionAssignment: (target: PositionAssignmentRecord) => void;
  onEditDepartmentAssignment: (target: DepartmentAssignmentRecord) => void;
  onEditPositionAssignment: (target: PositionAssignmentRecord) => void;
  positionAssignments: PositionAssignmentRecord[];
  t: TranslationFunction;
}) {
  const isDepartmentDrawer = activeKind === 'departmentAssignments';
  const title = isDepartmentDrawer
    ? t('admin.organization.departmentAssignments.title', 'Department assignments')
    : t('admin.organization.positionAssignments.title', 'Position assignments');
  const action = isDepartmentDrawer
    ? <SmallButton label={t('admin.organization.actions.assign', 'Assign')} onClick={onAddDepartmentAssignment} disabled={!canAddDepartmentAssignment} />
    : <SmallButton label={t('admin.organization.actions.assign', 'Assign')} onClick={onAddPositionAssignment} disabled={!canAddPositionAssignment} />;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl dark:bg-[#171717]" onClick={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-950 dark:text-white">{title}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t('admin.organization.assignmentDrawer.description', 'Review existing assignments and move edit or deactivate actions out of the main list.')}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-white/10" aria-label={t('common.actions.close', 'Close')}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 p-4">
          {isDepartmentDrawer ? (
            <AdminTableShell
              header={<TableHeader action={action} />}
              viewportClassName="min-h-0"
            >
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">{t('admin.organization.columns.member', 'Member')}</th>
                    <th className="px-4 py-3">{t('admin.organization.columns.department', 'Department')}</th>
                    <th className="px-4 py-3">{t('admin.organization.columns.role', 'Role')}</th>
                    <th className="px-4 py-3">{t('admin.organization.columns.status', 'Status')}</th>
                    <th className="px-4 py-3 text-right">{t('admin.organization.columns.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {departmentAssignments.length === 0 ? (
                    <BusinessStateTableRow colSpan={5} kind="empty" title={t('admin.organization.empty.assignments', 'No assignments')} />
                  ) : departmentAssignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">{formatMemberLabel(assignment.membershipId, assignment.userId, lookups)}</div>
                        <div className="text-xs text-slate-500">{assignment.membershipId || assignment.userId || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDepartmentLabel(assignment.departmentId, lookups)}</td>
                      <td className="px-4 py-3">{assignment.role}</td>
                      <td className="px-4 py-3"><StatusPill status={assignment.status} t={t} /></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <TextButton label={t('common.actions.edit', 'Edit')} onClick={() => onEditDepartmentAssignment(assignment)} />
                          <TextButton label={t('admin.organization.actions.deactivate', 'Deactivate')} onClick={() => onDeactivateDepartmentAssignment(assignment)} danger />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableShell>
          ) : (
            <AdminTableShell
              header={<TableHeader action={action} />}
              viewportClassName="min-h-0"
            >
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">{t('admin.organization.columns.position', 'Position')}</th>
                    <th className="px-4 py-3">{t('admin.organization.columns.member', 'Member')}</th>
                    <th className="px-4 py-3">{t('admin.organization.columns.status', 'Status')}</th>
                    <th className="px-4 py-3">{t('admin.organization.columns.startedAt', 'Started')}</th>
                    <th className="px-4 py-3 text-right">{t('admin.organization.columns.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {positionAssignments.length === 0 ? (
                    <BusinessStateTableRow colSpan={5} kind="empty" title={t('admin.organization.empty.assignments', 'No assignments')} />
                  ) : positionAssignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3">{formatPositionLabel(assignment.positionId, lookups)}</td>
                      <td className="px-4 py-3">{formatMemberLabel(assignment.membershipId, assignment.userId, lookups)}</td>
                      <td className="px-4 py-3"><StatusPill status={assignment.status} t={t} /></td>
                      <td className="px-4 py-3 text-slate-500">{assignment.startedAt || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <TextButton label={t('common.actions.edit', 'Edit')} onClick={() => onEditPositionAssignment(assignment)} />
                          <TextButton label={t('admin.organization.actions.deactivate', 'Deactivate')} onClick={() => onDeactivatePositionAssignment(assignment)} danger />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableShell>
          )}
        </div>
      </div>
    </div>
  );
}

function AuthorizationTab({
  onCreatePermission,
  onDeletePermission,
  onEditPermission,
  onManageRoleBindings,
  onManageRolePermissions,
  onManageRoles,
  onQuery,
  onQueryValueChange,
  permissions,
  queryLabel,
  queryPlaceholder,
  queryValue,
  t,
}: {
  onCreatePermission: () => void;
  onDeletePermission: (target: PermissionRecord) => void;
  onEditPermission: (target: PermissionRecord) => void;
  onManageRoleBindings: () => void;
  onManageRolePermissions: () => void;
  onManageRoles: () => void;
  onQuery: (event?: FormEvent<HTMLFormElement>) => void;
  onQueryValueChange: (value: string) => void;
  permissions: PermissionRecord[];
  queryLabel: string;
  queryPlaceholder: string;
  queryValue: string;
  t: TranslationFunction;
}) {
  return (
    <div className="flex min-h-0 flex-1">
      <AdminTableShell
        header={(
          <TableHeader
            query={(
              <ListQueryControl
                onChange={onQueryValueChange}
                onQuery={onQuery}
                placeholder={queryPlaceholder}
                queryLabel={queryLabel}
                value={queryValue}
              />
            )}
            action={(
              <div className="flex flex-wrap items-center justify-end gap-2">
                <HeaderButton label={t('admin.organization.actions.createPermission', 'Permission')} onClick={onCreatePermission} variant="primary" />
                <HeaderButton label={t('admin.organization.actions.roles', 'Roles')} onClick={onManageRoles} />
                <HeaderButton label={t('admin.organization.actions.rolePermissions', 'Role permissions')} onClick={onManageRolePermissions} />
                <HeaderButton label={t('admin.organization.actions.roleBindings', 'Role bindings')} onClick={onManageRoleBindings} />
              </div>
            )}
          />
        )}
      >
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{t('admin.organization.columns.permission', 'Permission')}</th>
              <th className="px-4 py-3">{t('admin.organization.columns.code', 'Code')}</th>
              <th className="px-4 py-3">{t('admin.organization.columns.resource', 'Resource')}</th>
              <th className="px-4 py-3">{t('admin.organization.columns.action', 'Action')}</th>
              <th className="px-4 py-3 text-right">{t('admin.organization.columns.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/5">
            {permissions.length === 0 ? (
              <BusinessStateTableRow colSpan={5} kind="empty" title={t('admin.organization.empty.permissions', 'No permissions')} />
            ) : permissions.map((permission) => (
              <tr key={permission.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 dark:text-white">{permission.name}</div>
                  <div className="text-xs text-slate-500">{permission.description || '-'}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{permission.code || permission.id}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{permission.resource || '-'}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{permission.action || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <TextButton label={t('common.actions.edit', 'Edit')} onClick={() => onEditPermission(permission)} />
                    <TextButton label={t('common.actions.delete', 'Delete')} onClick={() => onDeletePermission(permission)} danger />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableShell>
    </div>
  );
}

function AuthorizationDrawer({
  activeKind,
  bindings,
  canBindRole,
  lookups,
  onBindRole,
  onClose,
  onCreateRole,
  onDeleteBinding,
  onDeleteRole,
  onDeleteRolePermission,
  onEditRole,
  onGrantPermission,
  onViewRolePermissions,
  rolePermissions,
  rolePermissionsLoading,
  roles,
  selectedRoleId,
  t,
}: {
  activeKind: AuthorizationDrawerState;
  bindings: RoleBindingRecord[];
  canBindRole: boolean;
  lookups: DirectoryLookups;
  onBindRole: () => void;
  onClose: () => void;
  onCreateRole: () => void;
  onDeleteBinding: (target: RoleBindingRecord) => void;
  onDeleteRole: (target: RoleRecord) => void;
  onDeleteRolePermission: (target: PermissionRecord) => void;
  onEditRole: (target: RoleRecord) => void;
  onGrantPermission: () => void;
  onViewRolePermissions: (roleId: string) => void;
  rolePermissions: PermissionRecord[];
  rolePermissionsLoading: boolean;
  roles: RoleRecord[];
  selectedRoleId: string;
  t: TranslationFunction;
}) {
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null;
  const title = activeKind === 'roles'
    ? t('admin.organization.roles.title', 'Roles')
    : activeKind === 'rolePermissions'
      ? t('admin.organization.rolePermissions.title', 'Role permissions')
      : t('admin.organization.roleBindings.title', 'Role bindings');
  const action = activeKind === 'roles'
    ? <SmallButton label={t('admin.organization.actions.createRole', 'Role')} onClick={onCreateRole} />
    : activeKind === 'rolePermissions'
      ? <SmallButton label={t('admin.organization.actions.grant', 'Grant')} onClick={onGrantPermission} disabled={!selectedRoleId} />
      : <SmallButton label={t('admin.organization.actions.bindRole', 'Bind')} onClick={onBindRole} disabled={!canBindRole} />;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#171717]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
              {title}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t('admin.organization.authorizationDrawer.description', 'Use drawers to inspect roles, role permissions and bindings without crowding the permission list.')}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {action}
            <button
              type="button"
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              onClick={onClose}
              aria-label={t('common.actions.close', 'Close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {activeKind === 'roles' ? (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">{t('admin.organization.columns.role', 'Role')}</th>
                  <th className="px-4 py-3">{t('admin.organization.columns.status', 'Status')}</th>
                  <th className="px-4 py-3">{t('admin.organization.columns.description', 'Description')}</th>
                  <th className="px-4 py-3 text-right">{t('admin.organization.columns.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {roles.length === 0 ? (
                  <BusinessStateTableRow colSpan={4} kind="empty" title={t('admin.organization.empty.roles', 'No roles')} />
                ) : roles.map((role) => (
                  <tr key={role.id} className={role.id === selectedRoleId ? 'bg-blue-50/70 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{role.name}</div>
                      <div className="text-xs text-slate-500">{role.code || role.id}</div>
                    </td>
                    <td className="px-4 py-3"><StatusPill status={role.status} t={t} /></td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{role.description || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <TextButton label={t('admin.organization.actions.viewPermissions', 'Permissions')} onClick={() => onViewRolePermissions(role.id)} />
                        <TextButton label={t('common.actions.edit', 'Edit')} onClick={() => onEditRole(role)} />
                        <TextButton label={t('common.actions.delete', 'Delete')} onClick={() => onDeleteRole(role)} danger />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {activeKind === 'rolePermissions' ? (
            <div>
              <div className="border-b border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                {selectedRole ? selectedRole.name : t('admin.organization.rolePermissions.noRole', 'Select a role to inspect permissions')}
              </div>
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">{t('admin.organization.columns.permission', 'Permission')}</th>
                    <th className="px-4 py-3">{t('admin.organization.columns.code', 'Code')}</th>
                    <th className="px-4 py-3">{t('admin.organization.columns.resource', 'Resource')}</th>
                    <th className="px-4 py-3">{t('admin.organization.columns.action', 'Action')}</th>
                    <th className="px-4 py-3 text-right">{t('admin.organization.columns.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {rolePermissionsLoading ? (
                    <BusinessStateTableRow colSpan={5} kind="loading" title={t('admin.organization.loadingRolePermissions', 'Loading role permissions...')} />
                  ) : !selectedRoleId ? (
                    <BusinessStateTableRow colSpan={5} kind="empty" title={t('admin.organization.empty.selectRole', 'Select a role')} />
                  ) : rolePermissions.length === 0 ? (
                    <BusinessStateTableRow colSpan={5} kind="empty" title={t('admin.organization.empty.rolePermissions', 'No role permissions')} />
                  ) : rolePermissions.map((permission) => (
                    <tr key={`${selectedRoleId}-${permission.id}`} className="hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{permission.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{permission.code || permission.id}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{permission.resource || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{permission.action || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <TextButton label={t('admin.organization.actions.revoke', 'Revoke')} onClick={() => onDeleteRolePermission(permission)} danger />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {activeKind === 'roleBindings' ? (
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">{t('admin.organization.columns.principal', 'Principal')}</th>
                  <th className="px-4 py-3">{t('admin.organization.columns.role', 'Role')}</th>
                  <th className="px-4 py-3">{t('admin.organization.columns.scope', 'Scope')}</th>
                  <th className="px-4 py-3">{t('admin.organization.columns.status', 'Status')}</th>
                  <th className="px-4 py-3 text-right">{t('admin.organization.columns.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {bindings.length === 0 ? (
                  <BusinessStateTableRow colSpan={5} kind="empty" title={t('admin.organization.empty.roleBindings', 'No role bindings')} />
                ) : bindings.map((binding) => (
                  <tr key={binding.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{formatPrincipalLabel(binding.principalKind, binding.principalId, lookups)}</div>
                      <div className="text-xs text-slate-500">{binding.principalKind}:{binding.principalId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatRoleLabel(binding.roleId, lookups)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatRoleBindingScopeLabel(binding, lookups)}</td>
                    <td className="px-4 py-3"><StatusPill status={binding.status} t={t} /></td>
                    <td className="px-4 py-3 text-right"><TextButton label={t('common.actions.delete', 'Delete')} onClick={() => onDeleteBinding(binding)} danger /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TableHeader({ action, query }: { action?: ReactNode; query?: ReactNode }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10 ${query ? 'justify-between' : 'justify-end'}`}>
      {query ? <div className="w-full shrink-0 sm:w-[360px] lg:w-[420px]">{query}</div> : null}
      {action ? <div className="flex shrink-0 justify-end">{action}</div> : null}
    </div>
  );
}

function ListQueryControl({
  onChange,
  onQuery,
  placeholder,
  queryLabel,
  value,
}: {
  onChange: (value: string) => void;
  onQuery: (event?: FormEvent<HTMLFormElement>) => void;
  placeholder: string;
  queryLabel: string;
  value: string;
}) {
  return (
    <form className="flex w-full items-center gap-2" onSubmit={onQuery}>
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          aria-label={placeholder}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-500 focus:border-blue-500 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type="search"
          value={value}
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
      >
        {queryLabel}
      </button>
    </form>
  );
}

function ChooseUserModal({
  departmentAssignments,
  existingMembers,
  isBusy,
  lookups,
  onCancel,
  onChooseUsers,
  organizationId,
  selectionMode = 'multiple',
  targetDepartmentId,
  t,
  users,
}: {
  departmentAssignments: DepartmentAssignmentRecord[];
  existingMembers: OrganizationMemberRecord[];
  isBusy: boolean;
  lookups: DirectoryLookups;
  onCancel: () => void;
  onChooseUsers: (users: UserRecord[]) => void | Promise<void>;
  organizationId: string;
  selectionMode?: ChooseUserSelectionMode;
  targetDepartmentId?: string;
  t: TranslationFunction;
  users: UserRecord[];
}) {
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(() => new Set());
  const normalizedQuery = query.trim().toLowerCase();
  const availableUsers = availableUsersForMembership(users, existingMembers, organizationId, departmentAssignments, targetDepartmentId);
  const visibleUsers = filterBySearchWithLabels(availableUsers, normalizedQuery, userSearchLabels);

  function handleUserQuerySubmit(event?: FormEvent<HTMLFormElement>): void {
    event?.preventDefault();
    setQuery(queryInput);
  }

  function toggleSelectedUser(userId: string): void {
    setSelectedUserIds((current) => {
      if (selectionMode === 'single') {
        return current.has(userId) ? new Set<string>() : new Set<string>([userId]);
      }
      const nextSelectedUserIds = new Set(current);
      if (nextSelectedUserIds.has(userId)) {
        nextSelectedUserIds.delete(userId);
      } else {
        nextSelectedUserIds.add(userId);
      }
      return nextSelectedUserIds;
    });
  }

  async function handleChooseSelectedUsers(): Promise<void> {
    const selectedUsers = availableUsers.filter((user) => selectedUserIds.has(user.id));
    await onChooseUsers(selectedUsers);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t('admin.organization.chooseUser.title', 'Choose user')}>
      <div className="flex h-[min(760px,calc(100vh-48px))] w-full max-w-[min(1280px,calc(100vw-32px))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#171717]">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-950 dark:text-white">{t('admin.organization.chooseUser.title', 'Choose user')}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t('admin.organization.chooseUser.description', 'Select an existing appbase user to add as an organization member.')}
            </div>
          </div>
          <button type="button" onClick={onCancel} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-white/10" aria-label={t('common.actions.close', 'Close')}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-3 dark:border-white/10">
          <form className="flex w-full items-center gap-2 sm:w-[420px]" onSubmit={handleUserQuerySubmit}>
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label={t('admin.organization.search.users', 'Search users...')}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-500 focus:border-blue-500 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white"
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder={t('admin.organization.search.users', 'Search users...')}
                type="search"
                value={queryInput}
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              {t('common.actions.query', 'Query')}
            </button>
          </form>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <table className="w-full min-w-0 table-fixed text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
              <tr>
                <th className="w-24 px-4 py-3 whitespace-nowrap">{t('admin.organization.chooseUser.selection', 'Selection')}</th>
                <th className="px-4 py-3">{t('admin.organization.columns.member', 'Member')}</th>
                <th className="px-4 py-3">{t('admin.organization.columns.contact', 'Contact')}</th>
                <th className="px-4 py-3">{t('admin.organization.columns.region', 'Region')}</th>
                <th className="px-4 py-3">{t('admin.organization.columns.address', 'Address')}</th>
                <th className="px-4 py-3">{t('admin.organization.columns.gender', 'Gender')}</th>
                <th className="px-4 py-3">{t('admin.organization.columns.status', 'Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {visibleUsers.length === 0 ? (
                <BusinessStateTableRow colSpan={7} kind="empty" title={t('admin.organization.chooseUser.empty', 'No users available')} />
              ) : visibleUsers.map((user) => (
                <tr key={user.id} className={`cursor-pointer ${selectedUserIds.has(user.id) ? 'bg-blue-50/80 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`} onClick={() => toggleSelectedUser(user.id)}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={formatUserLabel(user.id, lookups)}
                      checked={selectedUserIds.has(user.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      onClick={(event) => event.stopPropagation()}
                      onChange={() => toggleSelectedUser(user.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-white">{user.displayName || user.username || user.id}</div>
                    <div className="text-xs text-slate-500">{formatUserLabel(user.id, lookups)}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    <div>{user.email || '-'}</div>
                    <div className="text-xs text-slate-500">{user.mobile || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatUserRegion(user)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{user.address || '-'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatUserGender(user, t)}</td>
                  <td className="px-4 py-3"><StatusPill status={user.status} t={t} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('admin.organization.chooseUser.selectedCount', '{{count}} selected', { count: selectedUserIds.size })}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onCancel} disabled={isBusy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
              {t('common.actions.cancel', 'Cancel')}
            </button>
            <HeaderButton label={t('admin.organization.chooseUser.confirmSelection', 'Add selected')} onClick={handleChooseSelectedUsers} disabled={isBusy || selectedUserIds.size === 0} variant="primary" />
          </div>
        </div>
      </div>
    </div>
  );
}

function EntityDialog({
  activePermissionsForAssignment,
  activePositionsForActiveContext,
  activeOrganizations,
  activeOrganizationIdForRelations,
  activeDepartmentsForActiveOrganization,
  activeDepartmentIdForRelations,
  activeMembersForActiveOrganization,
  activeOrganizationId,
  activeRoleId,
  activeRolesForAssignment,
  dialog,
  directory,
  error,
  isBusy,
  lookups,
  onCancel,
  onSubmit,
  organizationsForActiveContext,
  rolePermissions,
  t,
}: {
  activePermissionsForAssignment: PermissionRecord[];
  activePositionsForActiveContext: PositionRecord[];
  activeOrganizations: OrganizationRecord[];
  activeOrganizationIdForRelations: string;
  activeDepartmentsForActiveOrganization: DepartmentRecord[];
  activeDepartmentIdForRelations: string;
  activeMembersForActiveOrganization: OrganizationMemberRecord[];
  activeOrganizationId: string;
  activeRoleId: string;
  activeRolesForAssignment: RoleRecord[];
  dialog: OrganizationDialog;
  directory: OrganizationDirectoryData;
  error: string | null;
  isBusy: boolean;
  lookups: DirectoryLookups;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  organizationsForActiveContext: OrganizationRecord[];
  rolePermissions: PermissionRecord[];
  t: TranslationFunction;
}) {
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-slate-950 dark:text-white">{dialogTitle(dialog, t)}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('admin.organization.dialog.description', 'Changes are written through the appbase backend SDK.')}</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5" aria-label={t('common.actions.close', 'Close')}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
          {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</div> : null}
          <DialogFields
            activePermissionsForAssignment={activePermissionsForAssignment}
            activePositionsForActiveContext={activePositionsForActiveContext}
            activeOrganizations={activeOrganizations}
            activeOrganizationIdForRelations={activeOrganizationIdForRelations}
            activeDepartmentsForActiveOrganization={activeDepartmentsForActiveOrganization}
            activeDepartmentIdForRelations={activeDepartmentIdForRelations}
            activeMembersForActiveOrganization={activeMembersForActiveOrganization}
            activeOrganizationId={activeOrganizationId}
            activeRoleId={activeRoleId}
            activeRolesForAssignment={activeRolesForAssignment}
            dialog={dialog}
            directory={directory}
            lookups={lookups}
            organizationsForActiveContext={organizationsForActiveContext}
            rolePermissions={rolePermissions}
            t={t}
          />
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-white/10">
          <button type="button" onClick={onCancel} disabled={isBusy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
            {t('common.actions.cancel', 'Cancel')}
          </button>
          <button type="submit" disabled={isBusy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
            {isBusy ? t('common.actions.saving', 'Saving...') : t('common.actions.save', 'Save')}
          </button>
        </div>
      </form>
    </div>
  );
}

function DialogFields({
  activePermissionsForAssignment,
  activePositionsForActiveContext,
  activeOrganizations,
  activeOrganizationIdForRelations,
  activeDepartmentsForActiveOrganization,
  activeDepartmentIdForRelations,
  activeMembersForActiveOrganization,
  activeOrganizationId,
  activeRoleId,
  activeRolesForAssignment,
  dialog,
  directory,
  lookups,
  organizationsForActiveContext,
  rolePermissions,
  t,
}: {
  activePermissionsForAssignment: PermissionRecord[];
  activePositionsForActiveContext: PositionRecord[];
  activeOrganizations: OrganizationRecord[];
  activeOrganizationIdForRelations: string;
  activeDepartmentsForActiveOrganization: DepartmentRecord[];
  activeDepartmentIdForRelations: string;
  activeMembersForActiveOrganization: OrganizationMemberRecord[];
  activeOrganizationId: string;
  activeRoleId: string;
  activeRolesForAssignment: RoleRecord[];
  dialog: OrganizationDialog;
  directory: OrganizationDirectoryData;
  lookups: DirectoryLookups;
  organizationsForActiveContext: OrganizationRecord[];
  rolePermissions: PermissionRecord[];
  t: TranslationFunction;
}) {
  const roleOptions = activeRolesForAssignment.map((item) => ({ value: item.id, label: formatRoleLabel(item.id, lookups) }));
  const availablePermissionOptions = availableRolePermissionOptions(activePermissionsForAssignment, rolePermissions, lookups);
  const activeMemberships = directory.memberships.filter(isActiveRecord);
  const activeDepartments = directory.departments.filter(isActiveRecord);
  const [roleBindingRoleId, setRoleBindingRoleId] = useState(activeRoleId);
  const [roleBindingPrincipalKind, setRoleBindingPrincipalKind] = useState('member');
  const [roleBindingScopeKind, setRoleBindingScopeKind] = useState(activeDepartmentIdForRelations ? 'department' : 'organization');
  const [roleBindingDepartmentId, setRoleBindingDepartmentId] = useState(activeDepartmentIdForRelations);
  const [departmentOrganizationId, setDepartmentOrganizationId] = useState(
    dialog.kind === 'department' ? dialog.target?.organizationId || activeOrganizationIdForRelations : activeOrganizationIdForRelations,
  );
  const [positionOrganizationId, setPositionOrganizationId] = useState(
    dialog.kind === 'position' ? dialog.target?.organizationId || activeOrganizationIdForRelations : activeOrganizationIdForRelations,
  );
  const roleBindingScopeId = roleBindingScopeKind === 'department' ? roleBindingDepartmentId : activeOrganizationIdForRelations;
  const roleBindingRawPrincipalOptions = principalOptions(
    roleBindingPrincipalKind,
    organizationsForActiveContext,
    activeDepartmentsForActiveOrganization,
    activeMembersForActiveOrganization,
    lookups,
  );
  const roleBindingPrincipalOptions = availableRoleBindingPrincipalOptions(roleBindingRawPrincipalOptions, directory.roleBindings, roleBindingRoleId, roleBindingPrincipalKind, roleBindingScopeKind, roleBindingScopeId);
  const membersForDepartmentOrganization = membersForOrganization(activeMemberships, departmentOrganizationId);
  const departmentsForDepartmentOrganization = departmentsForOrganization(activeDepartments, departmentOrganizationId);
  const departmentsForPositionOrganization = departmentsForOrganization(activeDepartments, positionOrganizationId);
  const initialDepartmentAssignmentDepartmentId = dialog.kind === 'departmentAssignment'
    ? dialog.target?.departmentId || activeDepartmentIdForRelations
    : activeDepartmentIdForRelations;
  const [departmentAssignmentDepartmentId, setDepartmentAssignmentDepartmentId] = useState(initialDepartmentAssignmentDepartmentId);
  const initialPositionAssignmentPositionId = dialog.kind === 'positionAssignment'
    ? dialog.target?.positionId ?? activePositionsForActiveContext[0]?.id ?? ''
    : activePositionsForActiveContext[0]?.id ?? '';
  const [positionAssignmentPositionId, setPositionAssignmentPositionId] = useState(initialPositionAssignmentPositionId);
  const membersForSelectedPosition = membersForPositionAssignment(activeMemberships, directory.departmentAssignments, directory.positions, positionAssignmentPositionId, activeOrganizationIdForRelations);
  const [organizationNameForCode, setOrganizationNameForCode] = useState(dialog.kind === 'organization' ? dialog.target?.name ?? '' : '');
  const [organizationCodeTouched, setOrganizationCodeTouched] = useState(dialog.kind === 'organization' && Boolean(dialog.target?.code));
  const [organizationCodeValue, setOrganizationCodeValue] = useState(dialog.kind === 'organization' ? dialog.target?.code ?? '' : '');
  const [departmentNameForCode, setDepartmentNameForCode] = useState(dialog.kind === 'department' ? dialog.target?.name ?? '' : '');
  const [departmentCodeTouched, setDepartmentCodeTouched] = useState(dialog.kind === 'department' && Boolean(dialog.target?.code));
  const [departmentCodeValue, setDepartmentCodeValue] = useState(dialog.kind === 'department' ? dialog.target?.code ?? '' : '');

  if (dialog.kind === 'organization') {
    const target = dialog.target;
    const ownerMembers = membersForOrganization(activeMemberships, target?.id || activeOrganizationId);
    const defaultParentOrganizationId = dialog.mode === 'create' ? dialog.parentOrganizationId ?? '' : target?.parentOrganizationId ?? '';
    const renderedOrganizationCode = organizationCodeTouched
      ? organizationCodeValue
      : generatedEntityCode(organizationNameForCode, 'organization');
    return (
      <FieldGrid>
        <TextField label={t('admin.organization.fields.name', 'Name')} name="name" required defaultValue={target?.name} onChange={setOrganizationNameForCode} />
        <TextField label={t('admin.organization.fields.code', 'Code')} name="code" value={renderedOrganizationCode} onChange={(value) => { setOrganizationCodeTouched(true); setOrganizationCodeValue(value); }} />
        <SelectField label={t('admin.organization.fields.kind', 'Kind')} name="organizationKind" defaultValue={target?.organizationKind || 'company'} options={organizationKindOptions(t, target?.organizationKind)} />
        <SelectField label={t('admin.organization.fields.status', 'Status')} name="status" defaultValue={target?.status || 'active'} options={statusOptions(t)} />
        <SelectField label={t('admin.organization.fields.parentOrganization', 'Parent organization')} name="parentOrganizationId" defaultValue={defaultParentOrganizationId} options={organizationParentOptions(directory.organizations, target?.id, lookups, t)} />
        <SelectField label={t('admin.organization.fields.ownerUserId', 'Owner')} name="ownerUserId" defaultValue={target?.ownerUserId ?? ''} options={emptyOption(t).concat(userOptions(ownerMembers, lookups, target?.ownerUserId))} />
      </FieldGrid>
    );
  }

  if (dialog.kind === 'department') {
    const target = dialog.target;
    const defaultParentDepartmentId = dialog.mode === 'create' ? activeDepartmentIdForRelations : target?.parentDepartmentId ?? '';
    const renderedDepartmentCode = departmentCodeTouched
      ? departmentCodeValue
      : generatedEntityCode(departmentNameForCode, 'department');
    return (
      <FieldGrid>
        <SelectField label={t('admin.organization.fields.organization', 'Organization')} name="organizationId" required defaultValue={target?.organizationId || activeOrganizationIdForRelations} options={organizationOptions(activeOrganizations, lookups, target?.organizationId || activeOrganizationIdForRelations)} onChange={setDepartmentOrganizationId} />
        <TextField label={t('admin.organization.fields.name', 'Name')} name="name" required defaultValue={target?.name} onChange={setDepartmentNameForCode} />
        <TextField label={t('admin.organization.fields.code', 'Code')} name="code" value={renderedDepartmentCode} onChange={(value) => { setDepartmentCodeTouched(true); setDepartmentCodeValue(value); }} />
        <SelectField key={`department-parent-${departmentOrganizationId}`} label={t('admin.organization.fields.parentDepartment', 'Parent department')} name="parentDepartmentId" defaultValue={defaultParentDepartmentId} options={departmentParentOptions(departmentsForDepartmentOrganization, target?.id, lookups, t)} />
        <SelectField key={`department-manager-${departmentOrganizationId}`} label={t('admin.organization.fields.managerUserId', 'Manager')} name="managerUserId" defaultValue={target?.managerUserId ?? ''} options={emptyOption(t).concat(userOptions(membersForDepartmentOrganization, lookups, target?.managerUserId))} />
        <SelectField label={t('admin.organization.fields.status', 'Status')} name="status" defaultValue={target?.status || 'active'} options={statusOptions(t)} />
      </FieldGrid>
    );
  }

  if (dialog.kind === 'membership') {
    const target = dialog.target;
    if (dialog.mode !== 'edit' || !target) {
      return null;
    }
    return (
      <FieldGrid>
        <SelectField label={t('admin.organization.fields.organization', 'Organization')} name="organizationId" required defaultValue={target.organizationId || activeOrganizationIdForRelations} options={organizationOptions(activeOrganizations, lookups, target.organizationId || activeOrganizationIdForRelations)} />
        <TextField label={t('admin.organization.fields.displayName', 'Display name')} name="displayName" defaultValue={target.displayName} />
        <TextField label={t('admin.organization.fields.email', 'Email')} name="email" defaultValue={target.email} />
        <TextField label={t('admin.organization.fields.mobile', 'Mobile')} name="mobile" defaultValue={target.mobile} />
        <SelectField label={t('admin.organization.fields.memberKind', 'Member kind')} name="memberKind" defaultValue={target.memberKind || 'member'} options={memberKindOptions(t, target.memberKind)} />
        <SelectField label={t('admin.organization.fields.status', 'Status')} name="status" defaultValue={target.status || 'active'} options={statusOptions(t)} />
      </FieldGrid>
    );
  }

  if (dialog.kind === 'departmentAssignment') {
    const target = dialog.target;
    return (
      <FieldGrid>
        <SelectField label={t('admin.organization.fields.department', 'Department')} name="departmentId" required defaultValue={departmentAssignmentDepartmentId} options={departmentOptions(activeDepartmentsForActiveOrganization, lookups, target?.departmentId)} onChange={setDepartmentAssignmentDepartmentId} />
        <SelectField key={`department-assignment-member-${departmentAssignmentDepartmentId}`} label={t('admin.organization.fields.member', 'Member')} name="membershipId" required defaultValue={target?.membershipId ?? ''} options={availableDepartmentAssignmentMemberOptions(activeMembersForActiveOrganization, directory.departmentAssignments, departmentAssignmentDepartmentId, lookups, target?.membershipId, target?.userId)} />
        <SelectField label={t('admin.organization.fields.role', 'Role')} name="role" defaultValue={target?.role || 'member'} options={departmentAssignmentRoleOptions(t, target?.role)} />
        <SelectField label={t('admin.organization.fields.status', 'Status')} name="status" defaultValue={target?.status || 'active'} options={statusOptions(t)} />
        <CheckField label={t('admin.organization.fields.primary', 'Primary department')} name="isPrimary" defaultChecked={target?.isPrimary} />
      </FieldGrid>
    );
  }

  if (dialog.kind === 'position') {
    const target = dialog.target;
    return (
      <FieldGrid>
        <SelectField label={t('admin.organization.fields.organization', 'Organization')} name="organizationId" required defaultValue={target?.organizationId || activeOrganizationIdForRelations} options={organizationOptions(activeOrganizations, lookups, target?.organizationId || activeOrganizationIdForRelations)} onChange={setPositionOrganizationId} />
        <SelectField key={`position-department-${positionOrganizationId}`} label={t('admin.organization.fields.department', 'Department')} name="departmentId" defaultValue={target?.departmentId ?? activeDepartmentIdForRelations} options={emptyOption(t).concat(departmentOptions(departmentsForPositionOrganization, lookups, target?.departmentId))} />
        <TextField label={t('admin.organization.fields.name', 'Name')} name="name" required defaultValue={target?.name} />
        <TextField label={t('admin.organization.fields.code', 'Code')} name="code" defaultValue={target?.code} />
        <TextField label={t('admin.organization.fields.rankLevel', 'Rank level')} name="rankLevel" type="number" defaultValue={String(target?.rankLevel ?? 0)} />
        <SelectField label={t('admin.organization.fields.status', 'Status')} name="status" defaultValue={target?.status || 'active'} options={statusOptions(t)} />
        <TextField label={t('admin.organization.fields.description', 'Description')} name="description" defaultValue={target?.description} wide />
      </FieldGrid>
    );
  }

  if (dialog.kind === 'positionAssignment') {
    const target = dialog.target;
    return (
      <FieldGrid>
        <SelectField label={t('admin.organization.fields.position', 'Position')} name="positionId" required defaultValue={positionAssignmentPositionId} options={positionOptions(activePositionsForActiveContext, lookups, target?.positionId)} onChange={setPositionAssignmentPositionId} />
        <SelectField key={`position-assignment-member-${positionAssignmentPositionId}`} label={t('admin.organization.fields.member', 'Member')} name="membershipId" required defaultValue={target?.membershipId ?? ''} options={availablePositionAssignmentMemberOptions(membersForSelectedPosition, directory.positionAssignments, positionAssignmentPositionId, lookups, target?.membershipId, target?.userId)} />
        <SelectField label={t('admin.organization.fields.status', 'Status')} name="status" defaultValue={target?.status || 'active'} options={statusOptions(t)} />
        <TextField label={t('admin.organization.fields.startedAt', 'Started at')} name="startedAt" defaultValue={target?.startedAt} />
        <TextField label={t('admin.organization.fields.endedAt', 'Ended at')} name="endedAt" defaultValue={target?.endedAt} />
      </FieldGrid>
    );
  }

  if (dialog.kind === 'role') {
    const target = dialog.target;
    return (
      <FieldGrid>
        <TextField label={t('admin.organization.fields.name', 'Name')} name="name" required defaultValue={target?.name} />
        <TextField label={t('admin.organization.fields.code', 'Code')} name="code" required defaultValue={target?.code} />
        <SelectField label={t('admin.organization.fields.status', 'Status')} name="status" defaultValue={target?.status || 'active'} options={statusOptions(t)} />
        <TextField label={t('admin.organization.fields.description', 'Description')} name="description" defaultValue={target?.description} wide />
      </FieldGrid>
    );
  }

  if (dialog.kind === 'roleBinding') {
    return (
      <FieldGrid>
        <SelectField label={t('admin.organization.fields.role', 'Role')} name="roleId" required defaultValue={roleBindingRoleId} options={roleOptions} onChange={setRoleBindingRoleId} />
        <SelectField label={t('admin.organization.fields.principalKind', 'Principal kind')} name="principalKind" required defaultValue={roleBindingPrincipalKind} options={principalKindOptions(t)} onChange={setRoleBindingPrincipalKind} />
        <SelectField key={`role-binding-principal-${roleBindingRoleId}-${roleBindingPrincipalKind}-${roleBindingScopeKind}-${roleBindingScopeId}`} label={t('admin.organization.fields.principalId', 'Principal ID')} name="principalId" required options={roleBindingPrincipalOptions} />
        <SelectField label={t('admin.organization.fields.scopeKind', 'Scope kind')} name="scopeKind" defaultValue={roleBindingScopeKind} options={scopeKindOptions(t)} onChange={setRoleBindingScopeKind} />
        {roleBindingScopeKind === 'organization' ? (
          <SelectField label={t('admin.organization.fields.organization', 'Organization')} name="organizationId" required defaultValue={activeOrganizationIdForRelations} options={organizationOptions(organizationsForActiveContext, lookups, activeOrganizationIdForRelations)} />
        ) : null}
        {roleBindingScopeKind === 'department' ? (
          <SelectField label={t('admin.organization.fields.department', 'Department')} name="departmentId" required defaultValue={roleBindingDepartmentId} options={departmentOptions(activeDepartmentsForActiveOrganization, lookups, roleBindingDepartmentId)} onChange={setRoleBindingDepartmentId} />
        ) : null}
      </FieldGrid>
    );
  }

  if (dialog.kind === 'permission') {
    const target = dialog.target;
    return (
      <FieldGrid>
        <TextField label={t('admin.organization.fields.name', 'Name')} name="name" required defaultValue={target?.name} />
        <TextField label={t('admin.organization.fields.code', 'Code')} name="code" required defaultValue={target?.code} />
        <TextField label={t('admin.organization.fields.resource', 'Resource')} name="resource" defaultValue={target?.resource} />
        <TextField label={t('admin.organization.fields.action', 'Action')} name="action" defaultValue={target?.action} />
        <SelectField label={t('admin.organization.fields.status', 'Status')} name="status" defaultValue={target?.status || 'active'} options={statusOptions(t)} />
        <TextField label={t('admin.organization.fields.description', 'Description')} name="description" defaultValue={target?.description} wide />
      </FieldGrid>
    );
  }

  return (
    <FieldGrid>
      <SelectField label={t('admin.organization.fields.role', 'Role')} name="roleId" required defaultValue={activeRoleId} options={roleOptions} />
      <SelectField label={t('admin.organization.fields.permission', 'Permission')} name="permissionId" required options={availablePermissionOptions} />
    </FieldGrid>
  );
}

function buildDirectoryLookups(directory: OrganizationDirectoryData): DirectoryLookups {
  return {
    usersById: new Map(directory.users.map((item) => [item.id, item])),
    organizationsById: new Map(directory.organizations.map((item) => [item.id, item])),
    departmentsById: new Map(directory.departments.map((item) => [item.id, item])),
    membershipsById: new Map(directory.memberships.map((item) => [item.id, item])),
    membershipsByUserId: new Map(directory.memberships.filter((item) => item.userId).map((item) => [item.userId, item])),
    positionsById: new Map(directory.positions.map((item) => [item.id, item])),
    rolesById: new Map(directory.roles.map((item) => [item.id, item])),
    permissionsById: new Map(directory.permissions.map((item) => [item.id, item])),
  };
}

function formatOrganizationLabel(organizationId: string | null | undefined, lookups: DirectoryLookups): string {
  if (!organizationId) {
    return '-';
  }
  const organization = lookups.organizationsById.get(organizationId);
  if (!organization) {
    return organizationId;
  }
  return appendSecondaryLabel(organization.name, organization.code || organization.id);
}

function formatMemberLabel(membershipId: string | null | undefined, userId: string | null | undefined, lookups: DirectoryLookups): string {
  const member = (membershipId ? lookups.membershipsById.get(membershipId) : undefined)
    ?? (userId ? lookups.membershipsByUserId.get(userId) : undefined);
  if (!member) {
    return formatUserLabel(userId, lookups) || membershipId || '-';
  }
  return appendSecondaryLabel(member.displayName || member.username || member.userId || member.id, member.userId || member.id);
}

function memberDisplayName(member: OrganizationMemberRecord, lookups: DirectoryLookups): string {
  const user = lookups.usersById.get(member.userId);
  return member.displayName || user?.displayName || member.username || user?.username || member.userId || member.id;
}

function memberContactPrimary(member: OrganizationMemberRecord, lookups: DirectoryLookups): string {
  const user = lookups.usersById.get(member.userId);
  return member.email || user?.email || member.mobile || user?.mobile || '-';
}

function memberContactSecondary(member: OrganizationMemberRecord, lookups: DirectoryLookups): string {
  const user = lookups.usersById.get(member.userId);
  return member.mobile || user?.mobile || member.username || user?.username || member.userId || '-';
}

function userForMember(member: OrganizationMemberRecord, lookups: DirectoryLookups): UserRecord | null {
  return lookups.usersById.get(member.userId) ?? null;
}

function memberUserRegion(member: OrganizationMemberRecord, lookups: DirectoryLookups): string {
  return formatUserRegion(userForMember(member, lookups));
}

function memberUserGender(member: OrganizationMemberRecord, lookups: DirectoryLookups, t: TranslationFunction): string {
  return formatUserGender(userForMember(member, lookups), t);
}

function memberUserAddress(member: OrganizationMemberRecord, lookups: DirectoryLookups): string {
  return userForMember(member, lookups)?.address || '-';
}

function formatUserRegion(user: UserRecord | null | undefined): string {
  if (!user) {
    return '-';
  }
  const region = [user.country, user.province, user.city, user.district].filter(Boolean).join(' / ');
  return region || '-';
}

function formatUserGender(user: UserRecord | null | undefined, t: TranslationFunction): string {
  const gender = user?.gender.trim().toLowerCase();
  if (!gender) {
    return '-';
  }
  if (gender === 'male' || gender === 'm') {
    return t('admin.organization.gender.male', 'Male');
  }
  if (gender === 'female' || gender === 'f') {
    return t('admin.organization.gender.female', 'Female');
  }
  if (gender === 'unknown' || gender === 'unspecified') {
    return t('admin.organization.gender.unknown', 'Unknown');
  }
  return user?.gender || '-';
}

function userSearchLabels(user: UserRecord): string[] {
  return [
    user.id,
    user.username,
    user.displayName,
    user.email,
    user.mobile,
    user.gender,
    user.country,
    user.province,
    user.city,
    user.district,
    user.address,
    user.status,
  ];
}

function formatUserLabel(userId: string | null | undefined, lookups: DirectoryLookups): string {
  if (!userId) {
    return '';
  }
  const user = lookups.usersById.get(userId);
  if (!user) {
    return userId;
  }
  return appendSecondaryLabel(user.displayName || user.username || user.id, user.email || user.mobile || user.username || user.id);
}

function formatDepartmentLabel(departmentId: string | null | undefined, lookups: DirectoryLookups): string {
  if (!departmentId) {
    return '-';
  }
  const department = lookups.departmentsById.get(departmentId);
  if (!department) {
    return departmentId;
  }
  return appendSecondaryLabel(department.name, department.code || department.id);
}

function formatPositionLabel(positionId: string | null | undefined, lookups: DirectoryLookups): string {
  if (!positionId) {
    return '-';
  }
  const position = lookups.positionsById.get(positionId);
  if (!position) {
    return positionId;
  }
  return appendSecondaryLabel(position.name, position.code || position.id);
}

function formatRoleLabel(roleId: string | null | undefined, lookups: DirectoryLookups): string {
  if (!roleId) {
    return '-';
  }
  const role = lookups.rolesById.get(roleId);
  if (!role) {
    return roleId;
  }
  return appendSecondaryLabel(role.name, role.code || role.id);
}

function formatPermissionLabel(permissionId: string | null | undefined, lookups: DirectoryLookups): string {
  if (!permissionId) {
    return '-';
  }
  const permission = lookups.permissionsById.get(permissionId);
  if (!permission) {
    return permissionId;
  }
  return appendSecondaryLabel(permission.name, permission.code || permission.id);
}

function formatPrincipalLabel(principalKind: string, principalId: string, lookups: DirectoryLookups): string {
  if (principalKind === 'member' || principalKind === 'user') {
    return formatMemberLabel(principalKind === 'member' ? principalId : undefined, principalId, lookups);
  }
  if (principalKind === 'department') {
    return formatDepartmentLabel(principalId, lookups);
  }
  if (principalKind === 'organization') {
    return formatOrganizationLabel(principalId, lookups);
  }
  return principalId || '-';
}

function formatRoleBindingScopeLabel(binding: RoleBindingRecord, lookups: DirectoryLookups): string {
  const scopeKind = binding.scopeKind || (binding.departmentId ? 'department' : 'organization');
  const scopeId = binding.scopeId || binding.departmentId || binding.organizationId;
  const scopeLabel = scopeKind === 'department'
    ? formatDepartmentLabel(scopeId, lookups)
    : formatOrganizationLabel(scopeId, lookups);
  return `${scopeKind || '-'} / ${scopeLabel}`;
}

function organizationOptions(organizations: OrganizationRecord[], lookups: DirectoryLookups, keepId?: string | null): SelectOption[] {
  return withKeptOption(
    organizations.map((item) => ({ value: item.id, label: formatOrganizationLabel(item.id, lookups) })),
    keepId,
    (id) => formatOrganizationLabel(id, lookups),
  );
}

function organizationParentOptions(organizations: OrganizationRecord[], targetId: string | null | undefined, lookups: DirectoryLookups, t: TranslationFunction): SelectOption[] {
  const excludedIds = collectDescendantIds(organizations, targetId, 'parentOrganizationId');
  if (targetId) {
    excludedIds.add(targetId);
  }
  return emptyOption(t).concat(
    organizationOptions(
      organizations.filter((item) => !excludedIds.has(item.id)),
      lookups,
    ),
  );
}

function departmentOptions(departments: DepartmentRecord[], lookups: DirectoryLookups, keepId?: string | null): SelectOption[] {
  return withKeptOption(
    departments.map((item) => ({ value: item.id, label: formatDepartmentLabel(item.id, lookups) })),
    keepId,
    (id) => formatDepartmentLabel(id, lookups),
  );
}

function departmentParentOptions(departments: DepartmentRecord[], targetId: string | null | undefined, lookups: DirectoryLookups, t: TranslationFunction): SelectOption[] {
  const excludedIds = collectDescendantIds(departments, targetId, 'parentDepartmentId');
  if (targetId) {
    excludedIds.add(targetId);
  }
  return emptyOption(t).concat(
    departmentOptions(
      departments.filter((item) => !excludedIds.has(item.id)),
      lookups,
    ),
  );
}

function memberOptions(members: OrganizationMemberRecord[], lookups: DirectoryLookups, keepMembershipId?: string | null, keepUserId?: string | null): SelectOption[] {
  return withKeptOption(
    members.map((item) => ({ value: item.id, label: formatMemberLabel(item.id, item.userId, lookups) })),
    keepMembershipId,
    (id) => formatMemberLabel(id, keepUserId, lookups),
  );
}

function userOptions(members: OrganizationMemberRecord[], lookups: DirectoryLookups, keepUserId?: string | null): SelectOption[] {
  return withKeptOption(
    members
      .filter((item) => item.userId)
      .map((item) => ({ value: item.userId, label: formatMemberLabel(item.id, item.userId, lookups) })),
    keepUserId,
    (id) => formatMemberLabel(undefined, id, lookups),
  );
}

function availableUsersForMembership(
  users: UserRecord[],
  existingMembers: OrganizationMemberRecord[],
  organizationId: string | null | undefined,
  departmentAssignments: DepartmentAssignmentRecord[] = [],
  targetDepartmentId?: string | null,
): UserRecord[] {
  const blockedUserIds = targetDepartmentId
    ? activeDepartmentAssignmentUserIds(departmentAssignments, targetDepartmentId)
    : new Set(
      existingMembers
        .filter((item) => item.organizationId === organizationId && isActiveRecord(item) && item.userId)
        .map((item) => item.userId),
    );
  return users.filter((item) => !blockedUserIds.has(item.id));
}

async function ensureOrganizationMemberForUser(
  user: UserRecord,
  organizationId: string,
  existingMemberships: OrganizationMemberRecord[],
): Promise<OrganizationMemberRecord> {
  const activeMembership = findOrganizationMembershipForUser(existingMemberships, organizationId, user.id, { activeOnly: true });
  if (activeMembership) {
    return activeMembership;
  }

  const inactiveMemberMembership = findOrganizationMembershipForUser(existingMemberships, organizationId, user.id, { memberKind: 'member' });
  if (inactiveMemberMembership) {
    return OrganizationService.updateMembership(inactiveMemberMembership.id, {
      displayName: user.displayName,
      email: user.email,
      mobile: user.mobile,
      memberKind: 'member',
      status: 'active',
    });
  }

  return OrganizationService.createMembership({
    organizationId,
    userId: user.id,
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    mobile: user.mobile,
    memberKind: 'member',
    status: 'active',
  });
}

async function ensureDepartmentAssignmentForMember(
  departmentId: string,
  membership: OrganizationMemberRecord,
  existingAssignments: DepartmentAssignmentRecord[],
): Promise<void> {
  const existingAssignment = findDepartmentAssignmentForMember(existingAssignments, departmentId, membership, 'member');
  if (existingAssignment && isActiveRecord(existingAssignment)) {
    return;
  }
  if (existingAssignment) {
    await OrganizationService.updateDepartmentAssignment(existingAssignment.id, { status: 'active' });
    return;
  }
  await OrganizationService.createDepartmentAssignment({
    departmentId,
    membershipId: membership.id,
    role: 'member',
    status: 'active',
  });
}

function findOrganizationMembershipForUser(
  memberships: OrganizationMemberRecord[],
  organizationId: string,
  userId: string,
  options: { activeOnly?: boolean; memberKind?: string } = {},
): OrganizationMemberRecord | null {
  const normalizedMemberKind = options.memberKind?.trim().toLowerCase();
  return memberships.find((item) => {
    if (item.organizationId !== organizationId || item.userId !== userId) {
      return false;
    }
    if (options.activeOnly && !isActiveRecord(item)) {
      return false;
    }
    if (normalizedMemberKind && item.memberKind.trim().toLowerCase() !== normalizedMemberKind) {
      return false;
    }
    return true;
  }) ?? null;
}

function findDepartmentAssignmentForMember(
  assignments: DepartmentAssignmentRecord[],
  departmentId: string,
  membership: OrganizationMemberRecord,
  role: string,
): DepartmentAssignmentRecord | null {
  const normalizedRole = role.trim().toLowerCase();
  return assignments.find((item) => item.departmentId === departmentId
    && (item.membershipId === membership.id || Boolean(membership.userId && item.userId === membership.userId))
    && item.role.trim().toLowerCase() === normalizedRole) ?? null;
}

function activeDepartmentAssignmentUserIds(
  assignments: DepartmentAssignmentRecord[],
  departmentId: string,
): Set<string> {
  return new Set(
    assignments
      .filter((item) => item.departmentId === departmentId && isActiveRecord(item) && item.userId)
      .map((item) => item.userId),
  );
}

function availableDepartmentAssignmentMemberOptions(
  members: OrganizationMemberRecord[],
  existingAssignments: DepartmentAssignmentRecord[],
  departmentId: string | null | undefined,
  lookups: DirectoryLookups,
  keepMembershipId?: string | null,
  keepUserId?: string | null,
): SelectOption[] {
  const blockedMembershipIds = new Set(
    existingAssignments
      .filter((item) => item.departmentId === departmentId && isActiveRecord(item) && item.membershipId)
      .map((item) => item.membershipId),
  );
  const blockedUserIds = new Set(
    existingAssignments
      .filter((item) => item.departmentId === departmentId && isActiveRecord(item) && item.userId)
      .map((item) => item.userId),
  );
  return memberOptions(
    members.filter((item) => item.id === keepMembershipId || item.userId === keepUserId || (!blockedMembershipIds.has(item.id) && !blockedUserIds.has(item.userId))),
    lookups,
    keepMembershipId,
    keepUserId,
  );
}

function availablePositionAssignmentMemberOptions(
  members: OrganizationMemberRecord[],
  existingAssignments: PositionAssignmentRecord[],
  positionId: string | null | undefined,
  lookups: DirectoryLookups,
  keepMembershipId?: string | null,
  keepUserId?: string | null,
): SelectOption[] {
  const blockedMembershipIds = new Set(
    existingAssignments
      .filter((item) => item.positionId === positionId && isActiveRecord(item) && item.membershipId)
      .map((item) => item.membershipId),
  );
  const blockedUserIds = new Set(
    existingAssignments
      .filter((item) => item.positionId === positionId && isActiveRecord(item) && item.userId)
      .map((item) => item.userId),
  );
  return memberOptions(
    members.filter((item) => item.id === keepMembershipId || item.userId === keepUserId || (!blockedMembershipIds.has(item.id) && !blockedUserIds.has(item.userId))),
    lookups,
    keepMembershipId,
    keepUserId,
  );
}

function availableRolePermissionOptions(
  permissions: PermissionRecord[],
  existingRolePermissions: PermissionRecord[],
  lookups: DirectoryLookups,
): SelectOption[] {
  const grantedPermissionIds = new Set(existingRolePermissions.map((item) => item.id));
  return permissions
    .filter((item) => !grantedPermissionIds.has(item.id))
    .map((item) => ({ value: item.id, label: formatPermissionLabel(item.id, lookups) }));
}

function availableRoleBindingPrincipalOptions(
  options: SelectOption[],
  existingBindings: RoleBindingRecord[],
  roleId: string,
  principalKind: string,
  scopeKind: string,
  scopeId: string,
): SelectOption[] {
  const blockedPrincipalIds = new Set(
    existingBindings
      .filter((item) => item.roleId === roleId
        && item.principalKind === principalKind
        && roleBindingEffectiveScopeKind(item) === scopeKind
        && roleBindingEffectiveScopeId(item) === scopeId
        && isActiveRecord(item))
      .map((item) => item.principalId),
  );
  return options.filter((option) => !blockedPrincipalIds.has(option.value));
}

function roleBindingEffectiveScopeKind(binding: RoleBindingRecord): string {
  return binding.scopeKind || (binding.departmentId ? 'department' : 'organization');
}

function roleBindingEffectiveScopeId(binding: RoleBindingRecord): string {
  return binding.scopeId || binding.departmentId || binding.organizationId || '';
}

function positionOptions(positions: PositionRecord[], lookups: DirectoryLookups, keepId?: string | null): SelectOption[] {
  return withKeptOption(
    positions.map((item) => ({ value: item.id, label: formatPositionLabel(item.id, lookups) })),
    keepId,
    (id) => formatPositionLabel(id, lookups),
  );
}

function principalOptions(
  principalKind: string,
  organizations: OrganizationRecord[],
  departments: DepartmentRecord[],
  members: OrganizationMemberRecord[],
  lookups: DirectoryLookups,
): SelectOption[] {
  if (principalKind === 'department') {
    return departmentOptions(departments, lookups);
  }
  if (principalKind === 'organization') {
    return organizationOptions(organizations, lookups);
  }
  if (principalKind === 'user') {
    return members
      .filter((item) => item.userId)
      .map((item) => ({ value: item.userId, label: formatMemberLabel(item.id, item.userId, lookups) }));
  }
  return memberOptions(members, lookups);
}

function membersForOrganization(members: OrganizationMemberRecord[], organizationId: string | null | undefined): OrganizationMemberRecord[] {
  if (!organizationId) {
    return members;
  }
  return members.filter((item) => item.organizationId === organizationId);
}

function departmentsForOrganization(departments: DepartmentRecord[], organizationId: string | null | undefined): DepartmentRecord[] {
  if (!organizationId) {
    return departments;
  }
  return departments.filter((item) => item.organizationId === organizationId);
}

function membersForPositionAssignment(
  members: OrganizationMemberRecord[],
  departmentAssignments: DepartmentAssignmentRecord[],
  positions: PositionRecord[],
  positionId: string | null | undefined,
  fallbackOrganizationId: string | null | undefined,
): OrganizationMemberRecord[] {
  const position = positionId ? positions.find((item) => item.id === positionId) : undefined;
  const organizationMembers = membersForOrganization(members, position?.organizationId || fallbackOrganizationId);
  if (!position?.departmentId) {
    return organizationMembers;
  }

  const membershipIds = new Set(
    departmentAssignments
      .filter((item) => item.departmentId === position.departmentId && isActiveRecord(item) && item.membershipId)
      .map((item) => item.membershipId),
  );
  const userIds = new Set(
    departmentAssignments
      .filter((item) => item.departmentId === position.departmentId && isActiveRecord(item) && item.userId)
      .map((item) => item.userId),
  );
  return organizationMembers.filter((item) => membershipIds.has(item.id) || userIds.has(item.userId));
}

function collectDescendantIds<T extends { id: string }>(
  records: T[],
  targetId: string | null | undefined,
  parentKey: keyof T,
): Set<string> {
  const descendants = new Set<string>();
  if (!targetId) {
    return descendants;
  }
  const remaining = [...records];
  let changed = true;
  while (changed) {
    changed = false;
    for (const record of remaining) {
      const parentId = record[parentKey];
      if ((parentId === targetId || (typeof parentId === 'string' && descendants.has(parentId))) && !descendants.has(record.id)) {
        descendants.add(record.id);
        changed = true;
      }
    }
  }
  return descendants;
}

function isActiveRecord(record: { status?: string }): boolean {
  const status = record.status?.trim().toLowerCase();
  return !status || status === 'active' || status === 'enabled';
}

function filterBySearchWithLabels<T>(
  items: T[],
  search: string,
  labels: (item: T) => Array<number | string | null | undefined>,
): T[] {
  if (!search) {
    return items;
  }
  return items.filter((item) => labels(item).some((value) => String(value ?? '').toLowerCase().includes(search)));
}

function roleBindingBelongsToContext(
  binding: RoleBindingRecord,
  organizationId: string,
  departmentId: string,
  departmentIdsForOrganization: Set<string>,
  activeMembershipIdsForOrganization: Set<string>,
  activeUserIdsForOrganization: Set<string>,
): boolean {
  if (departmentId) {
    return binding.departmentId === departmentId
      || binding.scopeId === departmentId
      || (binding.scopeKind === 'department' && binding.scopeId === departmentId)
      || (binding.principalKind === 'department' && binding.principalId === departmentId)
      || (binding.principalKind === 'member' && activeMembershipIdsForOrganization.has(binding.principalId))
      || (binding.principalKind === 'user' && activeUserIdsForOrganization.has(binding.principalId));
  }

  if (!organizationId) {
    return true;
  }

  if (binding.organizationId === organizationId || binding.scopeId === organizationId) {
    return true;
  }

  const scopedDepartmentId = binding.scopeKind === 'department' ? binding.scopeId : undefined;
  const principalDepartmentId = binding.principalKind === 'department' ? binding.principalId : undefined;
  const relatedDepartmentId = binding.departmentId || scopedDepartmentId || principalDepartmentId;
  return Boolean(
    (relatedDepartmentId && departmentIdsForOrganization.has(relatedDepartmentId))
      || (binding.principalKind === 'member' && activeMembershipIdsForOrganization.has(binding.principalId))
      || (binding.principalKind === 'user' && activeUserIdsForOrganization.has(binding.principalId)),
  );
}

function principalKindOptions(t: TranslationFunction): SelectOption[] {
  return [
    { value: 'member', label: t('admin.organization.principalKinds.member', 'Member') },
    { value: 'user', label: t('admin.organization.principalKinds.user', 'User') },
    { value: 'department', label: t('admin.organization.principalKinds.department', 'Department') },
    { value: 'organization', label: t('admin.organization.principalKinds.organization', 'Organization') },
  ];
}

function scopeKindOptions(t: TranslationFunction): SelectOption[] {
  return [
    { value: 'organization', label: t('admin.organization.scopeKinds.organization', 'Organization') },
    { value: 'department', label: t('admin.organization.scopeKinds.department', 'Department') },
  ];
}

function withKeptOption(options: SelectOption[], keepId: string | null | undefined, labelForKeepId: (id: string) => string): SelectOption[] {
  if (!keepId || options.some((option) => option.value === keepId)) {
    return options;
  }
  return [{ value: keepId, label: labelForKeepId(keepId) }, ...options];
}

function appendSecondaryLabel(primary: string, secondary: string): string {
  if (!primary) {
    return secondary || '-';
  }
  return secondary && secondary !== primary ? `${primary} (${secondary})` : primary;
}

async function submitDialog(dialog: OrganizationDialog, form: FormData, activeOrganizationId: string, activeDepartmentId: string): Promise<OrganizationDialogSubmitResult> {
  if (dialog.kind === 'organization') {
    const input = readOrganizationCommand(form);
    let item: OrganizationRecord;
    if (dialog.mode === 'edit') {
      item = await OrganizationService.updateOrganization(dialog.target.id, input);
    } else {
      item = await OrganizationService.createOrganization(input);
    }
    return { kind: 'organization', item };
  }
  if (dialog.kind === 'department') {
    const input = readDepartmentCommand(form, activeOrganizationId);
    let item: DepartmentRecord;
    if (dialog.mode === 'edit') {
      item = await OrganizationService.updateDepartment(dialog.target.id, input);
    } else {
      item = await OrganizationService.createDepartment(input);
    }
    return { kind: 'department', item };
  }
  if (dialog.kind === 'membership') {
    const input = readMembershipUpdateCommand(form, activeOrganizationId);
    if (dialog.mode === 'edit') {
      await OrganizationService.updateMembership(dialog.target.id, input);
    }
    return null;
  }
  if (dialog.kind === 'departmentAssignment') {
    const input = readDepartmentAssignmentCommand(form, activeDepartmentId);
    if (dialog.mode === 'edit') {
      await OrganizationService.updateDepartmentAssignment(dialog.target.id, input);
    } else {
      await OrganizationService.createDepartmentAssignment(input);
    }
    return null;
  }
  if (dialog.kind === 'position') {
    const input = readPositionCommand(form, activeOrganizationId);
    if (dialog.mode === 'edit') {
      await OrganizationService.updatePosition(dialog.target.id, input);
    } else {
      await OrganizationService.createPosition(input);
    }
    return null;
  }
  if (dialog.kind === 'positionAssignment') {
    const input = readPositionAssignmentCommand(form);
    if (dialog.mode === 'edit') {
      await OrganizationService.updatePositionAssignment(dialog.target.id, input);
    } else {
      await OrganizationService.createPositionAssignment(input);
    }
    return null;
  }
  if (dialog.kind === 'role') {
    const input = readRoleCommand(form);
    if (dialog.mode === 'edit') {
      await OrganizationService.updateRole(dialog.target.id, input);
    } else {
      await OrganizationService.createRole(input);
    }
    return null;
  }
  if (dialog.kind === 'roleBinding') {
    await OrganizationService.bindRole(readRoleBindingCommand(form, activeOrganizationId, activeDepartmentId));
    return null;
  }
  if (dialog.kind === 'permission') {
    const input = readPermissionCommand(form);
    if (dialog.mode === 'edit') {
      await OrganizationService.updatePermission(dialog.target.id, input);
    } else {
      await OrganizationService.createPermission(input);
    }
    return null;
  }
  await OrganizationService.grantRolePermission(requiredFormText(form, 'roleId'), requiredFormText(form, 'permissionId'));
  return null;
}

async function deleteTarget(target: ConfirmTarget): Promise<void> {
  if (isConfirmBlocked(target)) {
    throw new Error('Deletion is blocked by active dependent records');
  }
  if (target.kind === 'organization') {
    await OrganizationService.deleteOrganization(target.id);
  } else if (target.kind === 'department') {
    await OrganizationService.deleteDepartment(target.id);
  } else if (target.kind === 'membership') {
    await OrganizationService.deactivateMembership(target.id);
  } else if (target.kind === 'departmentAssignment') {
    await OrganizationService.deactivateDepartmentAssignment(target.id);
  } else if (target.kind === 'position') {
    await OrganizationService.deletePosition(target.id);
  } else if (target.kind === 'positionAssignment') {
    await OrganizationService.deactivatePositionAssignment(target.id);
  } else if (target.kind === 'role') {
    await OrganizationService.deleteRole(target.id);
  } else if (target.kind === 'roleBinding') {
    await OrganizationService.deleteRoleBinding(target.id);
  } else if (target.kind === 'rolePermission') {
    await OrganizationService.revokeRolePermission(target.roleId, target.id);
  } else {
    await OrganizationService.deletePermission(target.id);
  }
}

function confirmDialogTitle(target: ConfirmTarget, t: TranslationFunction): string {
  if (target.kind === 'rolePermission') {
    return t('admin.organization.confirm.revokeTitle', 'Confirm revocation');
  }
  if (isDeactivateTarget(target)) {
    return t('admin.organization.confirm.deactivateTitle', 'Confirm deactivation');
  }
  return t('admin.organization.confirm.title', 'Confirm deletion');
}

function confirmDialogDescription(target: ConfirmTarget, t: TranslationFunction): string {
  if (target.kind === 'rolePermission') {
    return t('admin.organization.confirm.revokeDescription', 'This action will revoke {{label}} from the selected role.', { label: target.label });
  }
  if (isDeactivateTarget(target)) {
    return t('admin.organization.confirm.deactivateDescription', 'This action will deactivate {{label}} and keep the record for audit.', { label: target.label });
  }
  const dependencies = confirmDependencySummary(target.dependencies, t);
  if (isConfirmBlocked(target)) {
    return t(
      'admin.organization.confirm.blockedDescription',
      'Cannot delete {{label}} while active dependencies exist. {{dependencies}}',
      { label: target.label, dependencies },
    );
  }
  if (dependencies) {
    return t(
      'admin.organization.confirm.descriptionWithDependencies',
      'This action will remove {{label}} from the organization directory. Current dependencies: {{dependencies}}.',
      { label: target.label, dependencies },
    );
  }
  return t('admin.organization.confirm.description', 'This action will remove {{label}} from the organization directory.', { label: target.label });
}

function confirmDialogConfirmLabel(target: ConfirmTarget, t: TranslationFunction): string {
  if (target.kind === 'rolePermission') {
    return t('admin.organization.actions.revoke', 'Revoke');
  }
  if (isDeactivateTarget(target)) {
    return t('admin.organization.actions.deactivate', 'Deactivate');
  }
  return t('common.actions.delete', 'Delete');
}

function isDeactivateTarget(target: ConfirmTarget): boolean {
  return target.kind === 'membership' || target.kind === 'departmentAssignment' || target.kind === 'positionAssignment';
}

function isConfirmBlocked(target: ConfirmTarget): boolean {
  return target.blocked === true;
}

function confirmDependencySummary(dependencies: ConfirmDependency[] | undefined, t: TranslationFunction): string {
  const activeDependencies = (dependencies ?? []).filter((item) => item.count > 0);
  if (activeDependencies.length === 0) {
    return '';
  }
  return activeDependencies
    .map((item) => t('admin.organization.confirm.dependencies', '{{count}} {{label}}', { count: item.count, label: item.label }))
    .join(', ');
}

function buildOrganizationConfirmTarget(organization: OrganizationRecord, directory: OrganizationDirectoryData, t: TranslationFunction): ConfirmTarget {
  const dependencies = activeOrganizationDependencies(organization.id, directory, t);
  return {
    kind: 'organization',
    id: organization.id,
    label: organization.name,
    dependencies,
    blocked: dependencies.some((item) => item.count > 0),
  };
}

function buildDepartmentConfirmTarget(department: DepartmentRecord, directory: OrganizationDirectoryData, t: TranslationFunction): ConfirmTarget {
  const dependencies = activeDepartmentDependencies(department.id, directory, t);
  return {
    kind: 'department',
    id: department.id,
    label: department.name,
    dependencies,
    blocked: dependencies.some((item) => item.count > 0),
  };
}

function buildPositionConfirmTarget(position: PositionRecord, directory: OrganizationDirectoryData, t: TranslationFunction): ConfirmTarget {
  const dependencies = activePositionDependencies(position.id, directory, t);
  return {
    kind: 'position',
    id: position.id,
    label: position.name,
    dependencies,
    blocked: dependencies.some((item) => item.count > 0),
  };
}

function buildRoleConfirmTarget(role: RoleRecord, directory: OrganizationDirectoryData, rolePermissions: PermissionRecord[], t: TranslationFunction): ConfirmTarget {
  const dependencies = activeRoleDependencies(role.id, directory, rolePermissions, t);
  return {
    kind: 'role',
    id: role.id,
    label: role.name,
    dependencies,
    blocked: dependencies.some((item) => item.count > 0),
  };
}

function buildPermissionConfirmTarget(permission: PermissionRecord, rolePermissions: PermissionRecord[], t: TranslationFunction): ConfirmTarget {
  const dependencies = activePermissionDependencies(permission.id, rolePermissions, t);
  return {
    kind: 'permission',
    id: permission.id,
    label: permission.name,
    dependencies,
    blocked: dependencies.some((item) => item.count > 0),
  };
}

function activeOrganizationDependencies(organizationId: string, directory: OrganizationDirectoryData, t: TranslationFunction): ConfirmDependency[] {
  const departmentIds = new Set(directory.departments.filter((item) => item.organizationId === organizationId).map((item) => item.id));
  const positionIds = new Set(directory.positions.filter((item) => item.organizationId === organizationId).map((item) => item.id));
  const membershipIds = new Set(directory.memberships.filter((item) => item.organizationId === organizationId).map((item) => item.id));
  return compactDependencies([
    { count: directory.departments.filter((item) => item.organizationId === organizationId && isActiveRecord(item)).length, label: t('admin.organization.metrics.departments', 'Departments') },
    { count: directory.memberships.filter((item) => item.organizationId === organizationId && isActiveRecord(item)).length, label: t('admin.organization.metrics.members', 'Members') },
    { count: directory.positions.filter((item) => item.organizationId === organizationId && isActiveRecord(item)).length, label: t('admin.organization.metrics.positions', 'Positions') },
    {
      count: directory.departmentAssignments.filter((item) => isActiveRecord(item) && departmentIds.has(item.departmentId)).length,
      label: t('admin.organization.metrics.departmentAssignments', 'Department assignments'),
    },
    {
      count: directory.positionAssignments.filter((item) => isActiveRecord(item) && (positionIds.has(item.positionId) || membershipIds.has(item.membershipId))).length,
      label: t('admin.organization.metrics.positionAssignments', 'Position assignments'),
    },
    {
      count: directory.roleBindings.filter((item) => isActiveRecord(item) && roleBindingTouchesOrganization(item, organizationId, departmentIds, membershipIds)).length,
      label: t('admin.organization.metrics.roleBindings', 'Role bindings'),
    },
  ]);
}

function activeDepartmentDependencies(departmentId: string, directory: OrganizationDirectoryData, t: TranslationFunction): ConfirmDependency[] {
  const childDepartmentIds = collectDescendantIds(directory.departments, departmentId, 'parentDepartmentId');
  const relatedDepartmentIds = new Set([departmentId, ...childDepartmentIds]);
  const positionIds = new Set(directory.positions.filter((item) => item.departmentId && relatedDepartmentIds.has(item.departmentId)).map((item) => item.id));
  const assignedMembershipIds = new Set(directory.departmentAssignments.filter((item) => relatedDepartmentIds.has(item.departmentId)).map((item) => item.membershipId));
  return compactDependencies([
    { count: childDepartmentIds.size, label: t('admin.organization.metrics.childDepartments', 'Child departments') },
    {
      count: directory.departmentAssignments.filter((item) => isActiveRecord(item) && relatedDepartmentIds.has(item.departmentId)).length,
      label: t('admin.organization.metrics.departmentAssignments', 'Department assignments'),
    },
    {
      count: directory.positions.filter((item) => item.departmentId && relatedDepartmentIds.has(item.departmentId) && isActiveRecord(item)).length,
      label: t('admin.organization.metrics.positions', 'Positions'),
    },
    {
      count: directory.positionAssignments.filter((item) => isActiveRecord(item) && (positionIds.has(item.positionId) || assignedMembershipIds.has(item.membershipId))).length,
      label: t('admin.organization.metrics.positionAssignments', 'Position assignments'),
    },
    {
      count: directory.roleBindings.filter((item) => isActiveRecord(item) && roleBindingTouchesDepartments(item, relatedDepartmentIds, assignedMembershipIds)).length,
      label: t('admin.organization.metrics.roleBindings', 'Role bindings'),
    },
  ]);
}

function activePositionDependencies(positionId: string, directory: OrganizationDirectoryData, t: TranslationFunction): ConfirmDependency[] {
  return compactDependencies([
    {
      count: directory.positionAssignments.filter((item) => item.positionId === positionId && isActiveRecord(item)).length,
      label: t('admin.organization.metrics.positionAssignments', 'Position assignments'),
    },
  ]);
}

function activeRoleDependencies(roleId: string, directory: OrganizationDirectoryData, rolePermissions: PermissionRecord[], t: TranslationFunction): ConfirmDependency[] {
  return compactDependencies([
    {
      count: directory.roleBindings.filter((item) => item.roleId === roleId && isActiveRecord(item)).length,
      label: t('admin.organization.metrics.roleBindings', 'Role bindings'),
    },
    {
      count: rolePermissions.length,
      label: t('admin.organization.metrics.permissions', 'Permissions'),
    },
  ]);
}

function activePermissionDependencies(permissionId: string, rolePermissions: PermissionRecord[], t: TranslationFunction): ConfirmDependency[] {
  return compactDependencies([
    {
      count: rolePermissions.some((item) => item.id === permissionId) ? 1 : 0,
      label: t('admin.organization.metrics.roles', 'Roles'),
    },
  ]);
}

function compactDependencies(dependencies: ConfirmDependency[]): ConfirmDependency[] {
  return dependencies.filter((item) => item.count > 0);
}

function roleBindingTouchesOrganization(
  binding: RoleBindingRecord,
  organizationId: string,
  departmentIds: Set<string>,
  membershipIds: Set<string>,
): boolean {
  return binding.organizationId === organizationId
    || binding.scopeId === organizationId
    || (binding.principalKind === 'organization' && binding.principalId === organizationId)
    || roleBindingTouchesDepartments(binding, departmentIds, membershipIds);
}

function roleBindingTouchesDepartments(binding: RoleBindingRecord, departmentIds: Set<string>, membershipIds: Set<string>): boolean {
  return Boolean(
    (binding.departmentId && departmentIds.has(binding.departmentId))
      || (binding.scopeKind === 'department' && departmentIds.has(binding.scopeId))
      || (binding.principalKind === 'department' && departmentIds.has(binding.principalId))
      || (binding.principalKind === 'member' && membershipIds.has(binding.principalId)),
  );
}

function readOrganizationCommand(form: FormData): OrganizationCommand {
  return {
    code: optionalFormText(form, 'code'),
    name: requiredFormText(form, 'name'),
    organizationKind: optionalFormText(form, 'organizationKind'),
    parentOrganizationId: optionalFormText(form, 'parentOrganizationId'),
    ownerUserId: optionalFormText(form, 'ownerUserId'),
    status: optionalFormText(form, 'status'),
  };
}

function generatedEntityCode(name: string, fallbackCode: string): string {
  let code = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  while (code.includes('--')) {
    code = code.replace(/--/g, '-');
  }
  return code || fallbackCode;
}

function readDepartmentCommand(form: FormData, fallbackOrganizationId: string): DepartmentCommand {
  return {
    organizationId: optionalFormText(form, 'organizationId') || fallbackOrganizationId,
    parentDepartmentId: optionalFormText(form, 'parentDepartmentId'),
    code: optionalFormText(form, 'code'),
    name: requiredFormText(form, 'name'),
    managerUserId: optionalFormText(form, 'managerUserId'),
    status: optionalFormText(form, 'status'),
  };
}

function readMembershipUpdateCommand(form: FormData, fallbackOrganizationId: string): Partial<MembershipCommand> {
  return {
    organizationId: optionalFormText(form, 'organizationId') || fallbackOrganizationId,
    displayName: optionalFormText(form, 'displayName'),
    email: optionalFormText(form, 'email'),
    mobile: optionalFormText(form, 'mobile'),
    memberKind: optionalFormText(form, 'memberKind'),
    status: optionalFormText(form, 'status'),
  };
}

function readDepartmentAssignmentCommand(form: FormData, fallbackDepartmentId: string): DepartmentAssignmentCommand {
  return {
    departmentId: optionalFormText(form, 'departmentId') || fallbackDepartmentId,
    membershipId: requiredFormText(form, 'membershipId'),
    role: optionalFormText(form, 'role'),
    status: optionalFormText(form, 'status'),
    isPrimary: form.get('isPrimary') === 'on',
  };
}

function readPositionCommand(form: FormData, fallbackOrganizationId: string): PositionCommand {
  return {
    organizationId: optionalFormText(form, 'organizationId') || fallbackOrganizationId,
    departmentId: optionalFormText(form, 'departmentId'),
    code: optionalFormText(form, 'code'),
    name: requiredFormText(form, 'name'),
    rankLevel: optionalFormNumber(form, 'rankLevel'),
    description: optionalFormText(form, 'description'),
    status: optionalFormText(form, 'status'),
  };
}

function readPositionAssignmentCommand(form: FormData): PositionAssignmentCommand {
  return {
    positionId: requiredFormText(form, 'positionId'),
    membershipId: requiredFormText(form, 'membershipId'),
    status: optionalFormText(form, 'status'),
    startedAt: optionalFormText(form, 'startedAt'),
    endedAt: optionalFormText(form, 'endedAt'),
  };
}

function readRoleCommand(form: FormData): RoleCommand {
  return {
    code: requiredFormText(form, 'code'),
    name: requiredFormText(form, 'name'),
    description: optionalFormText(form, 'description'),
    status: optionalFormText(form, 'status'),
  };
}

function readRoleBindingCommand(form: FormData, fallbackOrganizationId: string, fallbackDepartmentId: string): RoleBindingCommand {
  const requestedScopeKind = optionalFormText(form, 'scopeKind');
  const organizationId = optionalFormText(form, 'organizationId') || fallbackOrganizationId || undefined;
  const departmentId = requestedScopeKind === 'department'
    ? optionalFormText(form, 'departmentId') || fallbackDepartmentId || undefined
    : undefined;
  return {
    roleId: requiredFormText(form, 'roleId'),
    principalKind: requiredFormText(form, 'principalKind'),
    principalId: requiredFormText(form, 'principalId'),
    organizationId,
    departmentId,
    scopeKind: departmentId ? 'department' : 'organization',
    scopeId: departmentId || organizationId,
    status: 'active',
  };
}

function readPermissionCommand(form: FormData): PermissionCommand {
  return {
    code: requiredFormText(form, 'code'),
    name: requiredFormText(form, 'name'),
    resource: optionalFormText(form, 'resource'),
    action: optionalFormText(form, 'action'),
    description: optionalFormText(form, 'description'),
    status: optionalFormText(form, 'status'),
  };
}

function requiredFormText(form: FormData, key: string): string {
  const value = optionalFormText(form, key);
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

function optionalFormText(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized || undefined;
}

function optionalFormNumber(form: FormData, key: string): number | undefined {
  const value = optionalFormText(form, key);
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildOrganizationDepartmentTree(
  organizationTree: OrganizationTreeNode[],
  departmentTree: DepartmentTreeNode[],
  organizations: OrganizationRecord[],
  departments: DepartmentRecord[],
): OrganizationDirectoryTreeNode[] {
  const sourceOrganizationTree = organizationTree.length > 0 ? organizationTree : buildOrganizationTreeFromRecords(organizations);
  const sourceDepartmentTree = departmentTree.length > 0 ? departmentTree : buildDepartmentTreeFromRecords(departments);
  const departmentsByOrganization = new Map<string, DepartmentTreeNode[]>();
  sourceDepartmentTree.forEach((node) => {
    const current = departmentsByOrganization.get(node.organizationId) ?? [];
    current.push(node);
    departmentsByOrganization.set(node.organizationId, current);
  });
  return sourceOrganizationTree.map((node) => organizationDirectoryNode(node, departmentsByOrganization));
}

function organizationDirectoryNode(node: OrganizationTreeNode, departmentsByOrganization: Map<string, DepartmentTreeNode[]>): OrganizationDirectoryTreeNode {
  const childOrganizations = node.children.map((child) => organizationDirectoryNode(child, departmentsByOrganization));
  const childDepartments = (departmentsByOrganization.get(node.id) ?? []).map(departmentDirectoryNode);
  return {
    nodeKind: 'organization',
    id: `organization:${node.id}`,
    organizationId: node.id,
    departmentId: '',
    code: node.code,
    name: node.name,
    meta: '',
    children: childOrganizations.concat(childDepartments),
  };
}

function departmentDirectoryNode(node: DepartmentTreeNode): OrganizationDirectoryTreeNode {
  return {
    nodeKind: 'department',
    id: `department:${node.id}`,
    organizationId: node.organizationId,
    departmentId: node.id,
    code: node.code,
    name: node.name,
    meta: '',
    children: node.children.map(departmentDirectoryNode),
  };
}

function buildOrganizationTreeFromRecords(organizations: OrganizationRecord[]): OrganizationTreeNode[] {
  const organizationIds = new Set(organizations.map((item) => item.id));
  const childrenByParent = new Map<string, OrganizationRecord[]>();
  organizations.forEach((item) => {
    const parentId = item.parentOrganizationId && organizationIds.has(item.parentOrganizationId) ? item.parentOrganizationId : '';
    const current = childrenByParent.get(parentId) ?? [];
    current.push(item);
    childrenByParent.set(parentId, current);
  });
  const convert = (item: OrganizationRecord): OrganizationTreeNode => ({
    id: item.id,
    code: item.code,
    name: item.name,
    parentId: item.parentOrganizationId,
    status: item.status,
    kind: item.organizationKind,
    children: (childrenByParent.get(item.id) ?? []).map(convert),
  });
  return (childrenByParent.get('') ?? []).map(convert);
}

function buildDepartmentTreeFromRecords(departments: DepartmentRecord[]): DepartmentTreeNode[] {
  const departmentsById = new Map(departments.map((item) => [item.id, item]));
  const childrenByParent = new Map<string, DepartmentRecord[]>();
  departments.forEach((item) => {
    const parentDepartment = item.parentDepartmentId ? departmentsById.get(item.parentDepartmentId) : undefined;
    const parentId = parentDepartment && parentDepartment.organizationId === item.organizationId ? parentDepartment.id : '';
    const current = childrenByParent.get(parentId) ?? [];
    current.push(item);
    childrenByParent.set(parentId, current);
  });
  const convert = (item: DepartmentRecord): DepartmentTreeNode => ({
    id: item.id,
    code: item.code,
    name: item.name,
    organizationId: item.organizationId,
    parentId: item.parentDepartmentId,
    status: item.status,
    children: (childrenByParent.get(item.id) ?? []).map(convert),
  });
  return (childrenByParent.get('') ?? []).map(convert);
}

function dialogTitle(dialog: OrganizationDialog, t: TranslationFunction): string {
  const action = dialog.mode === 'edit' ? t('common.actions.edit', 'Edit') : t('common.actions.create', 'Create');
  const entity = {
    organization: t('admin.organization.entities.organization', 'Organization'),
    department: t('admin.organization.entities.department', 'Department'),
    membership: t('admin.organization.entities.member', 'Member'),
    departmentAssignment: t('admin.organization.entities.departmentAssignment', 'Department assignment'),
    position: t('admin.organization.entities.position', 'Position'),
    positionAssignment: t('admin.organization.entities.positionAssignment', 'Position assignment'),
    role: t('admin.organization.entities.role', 'Role'),
    roleBinding: t('admin.organization.entities.roleBinding', 'Role binding'),
    permission: t('admin.organization.entities.permission', 'Permission'),
    rolePermission: t('admin.organization.entities.rolePermission', 'Role permission'),
  }[dialog.kind];
  return `${action} ${entity}`;
}

function dialogKey(dialog: OrganizationDialog): string {
  return `${dialog.kind}-${dialog.mode}-${'target' in dialog ? dialog.target?.id ?? '' : ''}`;
}

function statusOptions(t: TranslationFunction) {
  return [
    { value: 'active', label: t('admin.organization.status.active', 'Active') },
    { value: 'inactive', label: t('admin.organization.status.inactive', 'Inactive') },
    { value: 'archived', label: t('admin.organization.status.archived', 'Archived') },
  ];
}

function organizationKindOptions(t: TranslationFunction, keepValue?: string | null): SelectOption[] {
  return withKeptOption(
    [
      { value: 'company', label: t('admin.organization.organizationKinds.company', 'Company') },
      { value: 'business_unit', label: t('admin.organization.organizationKinds.businessUnit', 'Business unit') },
      { value: 'subsidiary', label: t('admin.organization.organizationKinds.subsidiary', 'Subsidiary') },
      { value: 'branch', label: t('admin.organization.organizationKinds.branch', 'Branch') },
      { value: 'partner', label: t('admin.organization.organizationKinds.partner', 'Partner') },
    ],
    keepValue,
    (value) => value,
  );
}

function memberKindOptions(t: TranslationFunction, keepValue?: string | null): SelectOption[] {
  return withKeptOption(
    [
      { value: 'member', label: t('admin.organization.memberKinds.member', 'Member') },
      { value: 'employee', label: t('admin.organization.memberKinds.employee', 'Employee') },
      { value: 'manager', label: t('admin.organization.memberKinds.manager', 'Manager') },
      { value: 'owner', label: t('admin.organization.memberKinds.owner', 'Owner') },
      { value: 'contractor', label: t('admin.organization.memberKinds.contractor', 'Contractor') },
      { value: 'external', label: t('admin.organization.memberKinds.external', 'External') },
    ],
    keepValue,
    (value) => value,
  );
}

function departmentAssignmentRoleOptions(t: TranslationFunction, keepValue?: string | null): SelectOption[] {
  return withKeptOption(
    [
      { value: 'member', label: t('admin.organization.assignmentRoles.member', 'Member') },
      { value: 'lead', label: t('admin.organization.assignmentRoles.lead', 'Lead') },
      { value: 'manager', label: t('admin.organization.assignmentRoles.manager', 'Manager') },
      { value: 'owner', label: t('admin.organization.assignmentRoles.owner', 'Owner') },
      { value: 'assistant', label: t('admin.organization.assignmentRoles.assistant', 'Assistant') },
    ],
    keepValue,
    (value) => value,
  );
}

function emptyOption(t: TranslationFunction) {
  return [{ value: '', label: t('admin.organization.fields.none', 'None') }];
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>;
}

function TextField({
  defaultValue,
  label,
  name,
  onChange,
  required,
  type = 'text',
  value,
  wide,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  onChange?: (value: string) => void;
  required?: boolean;
  type?: string;
  value?: string;
  wide?: boolean;
}) {
  const valueProps = value === undefined
    ? { defaultValue: defaultValue ?? '' }
    : { value, onChange: (event: ChangeEvent<HTMLInputElement>) => onChange?.(event.target.value) };
  return (
    <label className={`flex min-w-0 flex-col gap-1 text-sm ${wide ? 'md:col-span-2' : ''}`}>
      <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <input
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-[#121212] dark:text-white"
        name={name}
        onChange={value === undefined ? (event) => onChange?.(event.target.value) : undefined}
        required={required}
        type={type}
        {...valueProps}
      />
    </label>
  );
}

function SelectField({
  defaultValue,
  label,
  name,
  onChange,
  options,
  required,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  onChange?: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <select
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-[#121212] dark:text-white"
        defaultValue={defaultValue ?? options[0]?.value ?? ''}
        name={name}
        onChange={(event) => onChange?.(event.target.value)}
        required={required}
      >
        {options.map((option) => <option key={`${name}-${option.value}`} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function CheckField({ defaultChecked, label, name }: { defaultChecked?: boolean; label: string; name: string }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:text-slate-200">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
      {label}
    </label>
  );
}

function StatusPill({ status, t }: { status: string; t: TranslationFunction }) {
  const normalizedStatus = status.trim().toLowerCase();
  const active = normalizedStatus === 'active' || normalizedStatus === 'enabled';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>
      {formatStatusLabel(status, t)}
    </span>
  );
}

function formatStatusLabel(status: string, t: TranslationFunction): string {
  const normalizedStatus = status.trim().toLowerCase();
  if (!normalizedStatus) {
    return '-';
  }
  return t(`admin.organization.status.${normalizedStatus}`, fallbackStatusLabel(normalizedStatus));
}

function fallbackStatusLabel(status: string): string {
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function SmallButton({ disabled, label, onClick }: { disabled?: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:text-blue-300">
      {label}
    </button>
  );
}

function HeaderButton({ children, disabled, label, onClick, variant = 'secondary' }: {
  children?: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const tone = variant === 'primary'
    ? 'border-blue-600 bg-blue-600 text-white shadow-sm hover:border-blue-700 hover:bg-blue-700'
    : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:text-blue-300';
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${tone}`}>
      {children}
      <span>{label}</span>
    </button>
  );
}

function RowIconButton({ children, danger, label, onClick }: { children: ReactNode; danger?: boolean; label: string; onClick: (event: MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`rounded p-1 opacity-70 hover:opacity-100 ${danger ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
    >
      {children}
    </button>
  );
}

function TextButton({ danger, label, onClick }: { danger?: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`text-xs font-semibold ${danger ? 'text-red-600 hover:text-red-700 dark:text-red-300' : 'text-blue-600 hover:text-blue-700 dark:text-blue-300'}`}>
      {label}
    </button>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
