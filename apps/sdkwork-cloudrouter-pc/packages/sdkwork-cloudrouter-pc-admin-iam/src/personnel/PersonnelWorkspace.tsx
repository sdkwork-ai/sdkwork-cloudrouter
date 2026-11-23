import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SdkworkIamService } from '@sdkwork/iam-service';

/**
 * 人员管理 (personnel management) workspace.
 *
 * Left: organization list + department tree with drag reparent/reorder, backed by
 * `departments.update` (PATCH accepts `parentDepartmentId`/`sortOrder`).
 * Right: the member roster (`organizationMemberships.roster.list`) with a
 * multi-department editor (`organizationMemberships.departments.update`).
 *
 * All remote calls flow through the injected `SdkworkIamService`; this module
 * never creates an HTTP client or an auth header.
 */

export interface CloudRouterIamPersonnelWorkspaceProps {
  can: (permission: string) => boolean;
  service: SdkworkIamService;
}

interface Organization {
  id: string;
  name: string;
}

interface Department {
  code: string;
  departmentId: string;
  name: string;
  organizationId: string;
  parentDepartmentId: string | null;
  sortOrder: number;
  version: number;
}

interface DepartmentRef {
  departmentId: string;
  isPrimary: boolean;
  name: string;
}

interface PositionRef {
  isPrimary: boolean;
  name: string;
  positionId: string;
}

interface RoleRef {
  dataScopeKind: string;
  effect: string;
  roleBindingId: string;
  roleCode: string;
  roleId: string;
  scopeId: string;
  scopeKind: string;
}

interface RosterMember {
  departments: DepartmentRef[];
  displayName: string;
  email: string;
  membershipId: string;
  phone: string;
  positions: PositionRef[];
  roles: RoleRef[];
  username: string;
}

interface RoleCatalogEntry {
  code: string;
  roleId: string;
}

interface FlatDepartment {
  department: Department;
  depth: number;
  hasChildren: boolean;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asItems(payload: unknown): Record<string, unknown>[] {
  return asArray(asRecord(payload).items).map(asRecord);
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asOptionalId(value: unknown): string | null {
  const text = asText(value);
  return text.length > 0 ? text : null;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1;
}

function toOrganization(row: Record<string, unknown>): Organization {
  return { id: asText(row.organizationId), name: asText(row.name) };
}

function toDepartment(row: Record<string, unknown>): Department {
  return {
    code: asText(row.code),
    departmentId: asText(row.departmentId),
    name: asText(row.name),
    organizationId: asText(row.organizationId),
    parentDepartmentId: asOptionalId(row.parentDepartmentId),
    sortOrder: asNumber(row.sortOrder ?? row.order),
    version: asNumber(row.version),
  };
}

function toMember(row: Record<string, unknown>): RosterMember {
  return {
    departments: asArray(row.departments).map((value) => {
      const entry = asRecord(value);
      return {
        departmentId: asText(entry.departmentId),
        isPrimary: asBoolean(entry.isPrimary),
        name: asText(entry.name),
      };
    }),
    displayName: asText(row.displayName) || asText(row.username),
    email: asText(row.email),
    membershipId: asText(row.membershipId),
    phone: asText(row.phone),
    positions: asArray(row.positions).map((value) => {
      const entry = asRecord(value);
      return {
        isPrimary: asBoolean(entry.isPrimary),
        name: asText(entry.name),
        positionId: asText(entry.positionId),
      };
    }),
    roles: asArray(row.roles).map((value) => {
      const entry = asRecord(value);
      return {
        dataScopeKind: asText(entry.dataScopeKind),
        effect: asText(entry.effect),
        roleBindingId: asText(entry.roleBindingId),
        roleCode: asText(entry.roleCode),
        roleId: asText(entry.roleId),
        scopeId: asText(entry.scopeId),
        scopeKind: asText(entry.scopeKind),
      };
    }),
    username: asText(row.username),
  };
}

function flattenDepartments(departments: Department[]): FlatDepartment[] {
  const byParent = new Map<string, Department[]>();
  for (const department of departments) {
    const key = department.parentDepartmentId ?? '';
    const siblings = byParent.get(key) ?? [];
    siblings.push(department);
    byParent.set(key, siblings);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
  }
  const flattened: FlatDepartment[] = [];
  const visit = (parent: string, depth: number) => {
    for (const department of byParent.get(parent) ?? []) {
      flattened.push({
        department,
        depth,
        hasChildren: (byParent.get(department.departmentId) ?? []).length > 0,
      });
      visit(department.departmentId, depth + 1);
    }
  };
  visit('', 0);
  return flattened;
}

function reasonMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  const record = asRecord(reason);
  const message = asText(record.message);
  const traceId = asText(record.traceId);
  if (message && traceId) return `${message} (${traceId})`;
  return message || 'request failed';
}

function csvCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return /[",\n]/.test(value) ? `"${escaped}"` : escaped;
}

function exportRosterCsv(members: RosterMember[]): void {
  const header = ['name', 'departments', 'email', 'phone', 'positions', 'roles'];
  const rows = members.map((member) =>
    [
      member.displayName,
      member.departments
        .map((department) => `${department.name}${department.isPrimary ? ' (primary)' : ''}`)
        .join(' / '),
      member.email,
      member.phone,
      member.positions.map((position) => position.name).join(' / '),
      member.roles.map((role) => role.roleCode).join(' / '),
    ]
      .map(csvCell)
      .join(','),
  );
  const blob = new Blob([`\ufeff${[header.join(','), ...rows].join('\n')}`], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `personnel-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CloudRouterIamPersonnelWorkspace({
  can,
  service,
}: CloudRouterIamPersonnelWorkspaceProps) {
  const { t } = useTranslation();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [members, setMembers] = useState<RosterMember[]>([]);
  const [draggingId, setDraggingId] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState('');
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [editingMember, setEditingMember] = useState<RosterMember | null>(null);
  const [draftDepartmentIds, setDraftDepartmentIds] = useState<Record<string, boolean>>({});
  const [draftPrimaryId, setDraftPrimaryId] = useState('');
  const [roleCatalog, setRoleCatalog] = useState<RoleCatalogEntry[]>([]);
  const [draftRoleIds, setDraftRoleIds] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  const canUpdateDepartments = can('iam.departments.update');
  const canCreateDepartments = can('iam.departments.create');
  const canDeleteDepartments = can('iam.departments.delete');
  const canUpdateMemberships = can('iam.memberships.update');
  const flatDepartments = useMemo(() => flattenDepartments(departments), [departments]);

  const loadOrganizations = useCallback(async () => {
    try {
      const payload = await service.iam.organizations.list({ pageSize: 200 });
      const next = asItems(payload).map(toOrganization).filter((item) => item.id.length > 0);
      setOrganizations(next);
      setSelectedOrganizationId((current) => current || next[0]?.id || '');
    } catch (reason) {
      setError(reasonMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [service]);

  const loadDepartments = useCallback(
    async (organizationId: string) => {
      try {
        const payload = await service.iam.departments.list({ organizationId, pageSize: 200 });
        setDepartments(asItems(payload).map(toDepartment).filter((item) => item.departmentId.length > 0));
      } catch (reason) {
        setError(reasonMessage(reason));
      }
    },
    [service],
  );

  const loadRoster = useCallback(
    async (organizationId: string, departmentId: string, search: string) => {
      try {
        const payload = await service.iam.organizationMemberships.roster.list({
          organizationId,
          ...(departmentId ? { departmentId, includeDescendants: true } : {}),
          ...(search ? { q: search } : {}),
          page,
          pageSize,
        });
        setMembers(asItems(payload).map(toMember).filter((item) => item.membershipId.length > 0));
        const pageInfo = asRecord(asRecord(payload).pageInfo);
        setTotal(
          asNumber(pageInfo.totalItems ?? pageInfo.total ?? pageInfo.totalCount),
        );
      } catch (reason) {
        setError(reasonMessage(reason));
      }
    },
    [page, pageSize, service],
  );

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const payload = await service.iam.roles.list({ pageSize: 200 });
        if (!active) return;
        setRoleCatalog(
          asItems(payload)
            .map((row) => ({ code: asText(row.code), roleId: asText(row.roleId ?? row.id) }))
            .filter((entry) => entry.roleId.length > 0),
        );
      } catch {
        // The role catalog is optional for the page: departments still work and
        // the roster keeps showing the member's current role codes.
      }
    })();
    return () => {
      active = false;
    };
  }, [service]);

  useEffect(() => {
    setSelectedDepartmentId('');
    setPage(1);
    if (!selectedOrganizationId) return;
    setLoading(true);
    void loadDepartments(selectedOrganizationId).finally(() => setLoading(false));
  }, [loadDepartments, selectedOrganizationId]);

  useEffect(() => {
    if (!selectedOrganizationId) return;
    void loadRoster(selectedOrganizationId, selectedDepartmentId, searchQuery);
  }, [loadRoster, page, searchQuery, selectedDepartmentId, selectedOrganizationId]);

  const moveDepartment = useCallback(
    async (
      departmentId: string,
      parentDepartmentId: string | null,
      sortOrder?: number,
      expectedVersion?: number,
    ) => {
      setBusy(true);
      setError('');
      try {
        const body: Record<string, unknown> = { parentDepartmentId };
        if (typeof sortOrder === 'number') body.sortOrder = Math.max(0, sortOrder);
        if (typeof expectedVersion === 'number') body.expectedVersion = expectedVersion;
        await service.iam.departments.update(departmentId, body);
        await loadDepartments(selectedOrganizationId);
      } catch (reason) {
        setError(reasonMessage(reason));
        // A stale revision (409) or any failed move: refresh so the operator
        // sees the winner's tree instead of a diverged local view.
        await loadDepartments(selectedOrganizationId);
      } finally {
        setBusy(false);
      }
    },
    [loadDepartments, selectedOrganizationId, service],
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLElement>, target: FlatDepartment | null) => {
      event.preventDefault();
      event.stopPropagation();
      const draggedId = draggingId || event.dataTransfer.getData('text/plain');
      setDraggingId('');
      if (!canUpdateDepartments || !draggedId || busy) return;
      const sourceVersion = flatDepartments.find(
        (entry) => entry.department.departmentId === draggedId,
      )?.department.version;
      if (!target) {
        await moveDepartment(draggedId, null, undefined, sourceVersion);
        return;
      }
      if (target.department.departmentId === draggedId) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const asChild = event.clientY >= rect.top + rect.height / 2;
      if (asChild) {
        await moveDepartment(
          draggedId,
          target.department.departmentId,
          undefined,
          sourceVersion,
        );
      } else {
        await moveDepartment(
          draggedId,
          target.department.parentDepartmentId,
          target.department.sortOrder,
          sourceVersion,
        );
      }
    },
    [busy, canUpdateDepartments, draggingId, flatDepartments, moveDepartment],
  );

  const moveByKeyboard = useCallback(
    async (item: FlatDepartment, direction: 'up' | 'down' | 'in' | 'out') => {
      const parentId = item.department.parentDepartmentId;
      const siblings = flatDepartments.filter(
        (entry) => entry.department.parentDepartmentId === parentId,
      );
      const index = siblings.findIndex(
        (entry) => entry.department.departmentId === item.department.departmentId,
      );
      if (direction === 'up' || direction === 'down') {
        const target = siblings[direction === 'up' ? index - 1 : index + 1]?.department;
        if (!target) return;
        await moveDepartment(
          item.department.departmentId,
          target.parentDepartmentId,
          target.sortOrder,
          item.department.version,
        );
        return;
      }
      if (direction === 'out') {
        const parent = flatDepartments.find(
          (entry) => entry.department.departmentId === parentId,
        )?.department;
        if (!parent) return;
        await moveDepartment(
          item.department.departmentId,
          parent.parentDepartmentId,
          parent.sortOrder + 1,
          item.department.version,
        );
        return;
      }
      const previous = siblings[index - 1]?.department;
      if (!previous) return;
      await moveDepartment(
        item.department.departmentId,
        previous.departmentId,
        undefined,
        item.department.version,
      );
    },
    [flatDepartments, moveDepartment],
  );

  const createDepartment = useCallback(async () => {
    const name = newDepartmentName.trim();
    if (!name || !selectedOrganizationId) return;
    setBusy(true);
    setError('');
    try {
      await service.iam.departments.create({
        code: `dept-${Date.now().toString(36)}`,
        name,
        organizationId: selectedOrganizationId,
        ...(selectedDepartmentId ? { parentDepartmentId: selectedDepartmentId } : {}),
      });
      setNewDepartmentName('');
      await loadDepartments(selectedOrganizationId);
    } catch (reason) {
      setError(reasonMessage(reason));
    } finally {
      setBusy(false);
    }
  }, [loadDepartments, newDepartmentName, selectedDepartmentId, selectedOrganizationId, service]);

  const deleteDepartment = useCallback(
    async (departmentId: string) => {
      setBusy(true);
      setError('');
      try {
        await service.iam.departments.delete(departmentId);
        setConfirmingDeleteId('');
        if (selectedDepartmentId === departmentId) setSelectedDepartmentId('');
        await loadDepartments(selectedOrganizationId);
        await loadRoster(selectedOrganizationId, '', searchQuery);
      } catch (reason) {
        setError(reasonMessage(reason));
      } finally {
        setBusy(false);
      }
    },
    [loadDepartments, loadRoster, selectedDepartmentId, selectedOrganizationId, service],
  );

  const startEditingMember = useCallback(
    (member: RosterMember) => {
      const checked: Record<string, boolean> = {};
      let primary = '';
      for (const department of member.departments) {
        checked[department.departmentId] = true;
        if (department.isPrimary) primary = department.departmentId;
      }
      setEditingMember(member);
      setDraftDepartmentIds(checked);
      setDraftPrimaryId(primary);
      const roles: Record<string, boolean> = {};
      for (const role of member.roles) roles[role.roleId] = true;
      setDraftRoleIds(roles);
    },
    [],
  );

  const saveMemberDepartments = useCallback(async () => {
    if (!editingMember) return;
    const wanted = departments
      .filter((department) => draftDepartmentIds[department.departmentId])
      .map((department) => ({
        departmentId: department.departmentId,
        isPrimary: department.departmentId === draftPrimaryId,
      }));
    setBusy(true);
    setError('');
    try {
      await service.iam.organizationMemberships.departments.update(editingMember.membershipId, {
        departments: wanted,
        organizationId: selectedOrganizationId,
      });
      // Role grants are a diff against the bindings the roster reported: create
      // the newly checked roles at organization scope and revoke the unchecked
      // ones. Departments and roles land as two operations by design; a failure
      // in the second half leaves the applied departments visible on refresh.
      const desiredRoleIds = new Set(
        Object.entries(draftRoleIds)
          .filter(([, checked]) => checked)
          .map(([roleId]) => roleId),
      );
      const currentRoleIds = new Set(editingMember.roles.map((role) => role.roleId));
      for (const role of roleCatalog) {
        if (desiredRoleIds.has(role.roleId) && !currentRoleIds.has(role.roleId)) {
          await service.iam.roleBindings.create({
            effect: 'allow',
            principalId: editingMember.membershipId,
            principalKind: 'organization_membership',
            roleId: role.roleId,
            scopeId: selectedOrganizationId,
            scopeKind: 'organization',
          });
        }
      }
      for (const role of editingMember.roles) {
        if (!desiredRoleIds.has(role.roleId) && role.roleBindingId) {
          await service.iam.roleBindings.delete(role.roleBindingId);
        }
      }
      setEditingMember(null);
      await loadRoster(selectedOrganizationId, selectedDepartmentId, searchQuery);
    } catch (reason) {
      setError(reasonMessage(reason));
    } finally {
      setBusy(false);
    }
  }, [
    departments,
    draftDepartmentIds,
    draftPrimaryId,
    draftRoleIds,
    editingMember,
    loadRoster,
    roleCatalog,
    selectedDepartmentId,
    selectedOrganizationId,
    service,
  ]);

  const selectedDepartment = flatDepartments.find(
    (item) => item.department.departmentId === selectedDepartmentId,
  )?.department;

  return (
    <div className="flex min-h-full flex-col gap-4 px-4 py-4 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-80" aria-label={t('admin.iam.personnel.directory')}>
        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <label className="block text-xs font-medium text-slate-500" htmlFor="personnel-organization">
            {t('admin.iam.personnel.organization')}
          </label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
            id="personnel-organization"
            onChange={(event) => setSelectedOrganizationId(event.target.value)}
            value={selectedOrganizationId}
          >
            {organizations.length === 0 ? (
              <option value="">{t('admin.iam.personnel.noOrganization')}</option>
            ) : null}
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name || organization.id}
              </option>
            ))}
          </select>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">
              {t('admin.iam.personnel.department')}
            </span>
            <button
              className="rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-40 dark:border-slate-700"
              disabled={!selectedOrganizationId}
              onClick={() => {
                setSelectedDepartmentId('');
                setPage(1);
              }}
              type="button"
            >
              {t('admin.iam.personnel.allDepartments')}
            </button>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-slate-400">
            {t('admin.iam.personnel.dragHint')}
          </p>

          <ul
            className="mt-2 max-h-[60vh] space-y-0.5 overflow-auto"
            onDragOver={(event) => {
              if (canUpdateDepartments) event.preventDefault();
            }}
            onDrop={(event) => {
              if (event.target === event.currentTarget) void handleDrop(event, null);
            }}
          >
            {flatDepartments.map((item) => {
              const active = selectedDepartmentId === item.department.departmentId;
              return (
                <li
                  className="flex items-center gap-1"
                  key={item.department.departmentId}
                  style={{ paddingLeft: `${item.depth * 14}px` }}
                >
                  <button
                    aria-current={active ? 'true' : undefined}
                    className={`min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-sm ${
                      active
                        ? 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    draggable={canUpdateDepartments}
                    onClick={() => {
                      setSelectedDepartmentId(item.department.departmentId);
                      setPage(1);
                    }}
                    onKeyDown={(event) => {
                      if (!event.altKey || !canUpdateDepartments) return;
                      if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        void moveByKeyboard(item, 'up');
                      } else if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        void moveByKeyboard(item, 'down');
                      } else if (event.key === 'ArrowLeft') {
                        event.preventDefault();
                        void moveByKeyboard(item, 'out');
                      } else if (event.key === 'ArrowRight') {
                        event.preventDefault();
                        void moveByKeyboard(item, 'in');
                      }
                    }}
                    onDragEnd={() => setDraggingId('')}
                    onDragOver={(event) => {
                      if (canUpdateDepartments) event.preventDefault();
                    }}
                    onDragStart={(event) => {
                      setDraggingId(item.department.departmentId);
                      event.dataTransfer.setData('text/plain', item.department.departmentId);
                    }}
                    onDrop={(event) => void handleDrop(event, item)}
                    type="button"
                  >
                    {item.hasChildren ? '▾ ' : ''}
                    {item.department.name || item.department.code}
                  </button>
                  {canDeleteDepartments ? (
                    <button
                      aria-label={`${t('admin.iam.personnel.delete')} ${item.department.name}`}
                      className={`rounded px-1 text-xs ${
                        confirmingDeleteId === item.department.departmentId
                          ? 'bg-red-50 text-red-600 dark:bg-red-950'
                          : 'text-slate-400 hover:text-red-600'
                      }`}
                      onClick={() => {
                        if (confirmingDeleteId === item.department.departmentId) {
                          void deleteDepartment(item.department.departmentId);
                        } else {
                          setConfirmingDeleteId(item.department.departmentId);
                        }
                      }}
                      title={
                        confirmingDeleteId === item.department.departmentId
                          ? t('admin.iam.personnel.confirmDelete')
                          : t('admin.iam.personnel.delete')
                      }
                      type="button"
                    >
                      ×
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {canCreateDepartments ? (
            <div className="mt-3 flex gap-2">
              <input
                aria-label={t('admin.iam.personnel.departmentName')}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                onChange={(event) => setNewDepartmentName(event.target.value)}
                placeholder={t('admin.iam.personnel.departmentName')}
                value={newDepartmentName}
              />
              <button
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
                disabled={busy || !newDepartmentName.trim()}
                onClick={() => void createDepartment()}
                type="button"
              >
                {selectedDepartment ? t('admin.iam.personnel.createChild') : t('admin.iam.personnel.create')}
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <section className="min-w-0 flex-1" aria-label={t('admin.iam.personnel.member')}>
        {error ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300" role="alert">
            {error}
          </p>
        ) : null}
        <form
          className="mb-2 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearchQuery(searchInput.trim());
          }}
        >
          <input
            aria-label={t('admin.iam.personnel.searchPlaceholder')}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t('admin.iam.personnel.searchPlaceholder')}
            value={searchInput}
          />
          <button
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-700"
            type="submit"
          >
            {t('admin.iam.personnel.search')}
          </button>
        </form>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="truncate text-sm font-semibold">
            {selectedDepartment ? selectedDepartment.name : t('admin.iam.personnel.allDepartments')}
          </h2>
          <span className="text-xs text-slate-400">
            {t('admin.iam.personnel.memberCount', { count: members.length })}
          </span>
          <button
            className="rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-40 dark:border-slate-700"
            disabled={members.length === 0}
            onClick={() => exportRosterCsv(members)}
            type="button"
          >
            {t('admin.iam.personnel.exportCsv')}
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900">
              <tr>
                <th className="px-3 py-2">{t('admin.iam.personnel.name')}</th>
                <th className="px-3 py-2">{t('admin.iam.personnel.departments')}</th>
                <th className="px-3 py-2">{t('admin.iam.personnel.email')}</th>
                <th className="px-3 py-2">{t('admin.iam.personnel.phone')}</th>
                <th className="px-3 py-2">{t('admin.iam.personnel.positions')}</th>
                <th className="px-3 py-2">{t('admin.iam.personnel.roles')}</th>
                <th className="px-3 py-2">{t('admin.iam.personnel.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-slate-500" colSpan={7}>
                    {loading ? t('admin.iam.personnel.loading') : t('admin.iam.personnel.empty')}
                  </td>
                </tr>
              ) : null}
              {members.map((member) => (
                <tr className="border-t border-slate-100 align-top dark:border-slate-800" key={member.membershipId}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{member.displayName}</div>
                    <div className="text-xs text-slate-400">{member.username}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {member.departments.map((department) => (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            department.isPrimary
                              ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                          key={department.departmentId}
                        >
                          {department.name}
                          {department.isPrimary ? ` · ${t('admin.iam.personnel.primaryBadge')}` : ''}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{member.email || '—'}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{member.phone || '—'}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    {member.positions.length === 0
                      ? '—'
                      : member.positions.map((position) => position.name).join('、')}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {member.roles.length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        member.roles.map((role) => (
                          <span
                            className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            key={role.roleBindingId}
                            title={`${role.scopeKind}:${role.scopeId} ${role.dataScopeKind}`}
                          >
                            {role.roleCode}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {canUpdateMemberships ? (
                      <button
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        onClick={() => startEditingMember(member)}
                        type="button"
                      >
                        {t('admin.iam.personnel.editDepartments')}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">{t('admin.iam.personnel.readOnly')}</span>
                    )}
                  </td>
                </tr>
              ))}
              {editingMember ? (
                <tr className="border-t border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                  <td colSpan={7} className="px-3 py-3">
                    <p className="mb-2 text-xs font-medium text-slate-500">
                      {t('admin.iam.personnel.editDepartmentsFor', { name: editingMember.displayName })}
                    </p>
                    <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                      {departments.map((department) => (
                        <label className="flex items-center gap-2 text-sm" key={department.departmentId}>
                          <input
                            checked={Boolean(draftDepartmentIds[department.departmentId])}
                            onChange={(event) => {
                              const checked = event.target.checked;
                              setDraftDepartmentIds((current) => ({
                                ...current,
                                [department.departmentId]: checked,
                              }));
                              if (!checked && draftPrimaryId === department.departmentId) {
                                setDraftPrimaryId('');
                              }
                            }}
                            type="checkbox"
                          />
                          <span className="truncate">{department.name}</span>
                          <button
                            className={`ml-auto rounded-full px-2 text-[11px] ${
                              draftPrimaryId === department.departmentId
                                ? 'bg-sky-600 text-white'
                                : 'border border-slate-200 text-slate-500 dark:border-slate-700'
                            }`}
                            disabled={!draftDepartmentIds[department.departmentId]}
                            onClick={() => setDraftPrimaryId(department.departmentId)}
                            type="button"
                          >
                            {t('admin.iam.personnel.primary')}
                          </button>
                        </label>
                      ))}
                    </div>
                    <p className="mt-3 mb-1 text-xs font-medium text-slate-500">
                      {t('admin.iam.personnel.roles')}
                    </p>
                    <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                      {roleCatalog.length === 0 ? (
                        <span className="text-xs text-slate-400">{t('admin.iam.personnel.noRoles')}</span>
                      ) : (
                        roleCatalog.map((role) => (
                          <label className="flex items-center gap-2 text-sm" key={role.roleId}>
                            <input
                              checked={Boolean(draftRoleIds[role.roleId])}
                              onChange={(event) => {
                                const checked = event.target.checked;
                                setDraftRoleIds((current) => ({
                                  ...current,
                                  [role.roleId]: checked,
                                }));
                              }}
                              type="checkbox"
                            />
                            <span className="truncate">{role.code}</span>
                          </label>
                        ))
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
                        disabled={busy}
                        onClick={() => void saveMemberDepartments()}
                        type="button"
                      >
                        {t('admin.iam.personnel.save')}
                      </button>
                      <button
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-700"
                        onClick={() => setEditingMember(null)}
                        type="button"
                      >
                        {t('admin.iam.personnel.cancel')}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>
            {t('admin.iam.personnel.pageInfo', { page, pageSize, total })}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40 dark:border-slate-700"
              disabled={page <= 1 || busy}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              {t('admin.iam.personnel.prev')}
            </button>
            <button
              className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40 dark:border-slate-700"
              disabled={busy || page * pageSize >= total}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              {t('admin.iam.personnel.next')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
