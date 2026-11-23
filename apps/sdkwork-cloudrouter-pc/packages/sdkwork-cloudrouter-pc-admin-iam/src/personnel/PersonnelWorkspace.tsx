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
  const [createOpen, setCreateOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formParentId, setFormParentId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [nodeMenuId, setNodeMenuId] = useState('');
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formSortOrder, setFormSortOrder] = useState('');
  const [formError, setFormError] = useState('');
  const [codeTouched, setCodeTouched] = useState(false);
  const [creating, setCreating] = useState(false);
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

  const openCreateDepartment = useCallback(() => {
    setFormMode('create');
    setEditingDepartment(null);
    setFormParentId(selectedDepartmentId);
    setFormName('');
    setFormCode('');
    setFormSortOrder('');
    setFormError('');
    setCodeTouched(false);
    setCreateOpen(true);
  }, [selectedDepartmentId]);

  const openCreateChild = useCallback((department: Department) => {
    setFormMode('create');
    setEditingDepartment(null);
    setFormParentId(department.departmentId);
    setFormName('');
    setFormCode('');
    setFormSortOrder('');
    setFormError('');
    setCodeTouched(false);
    setCreateOpen(true);
    setNodeMenuId('');
  }, []);

  const openEditDepartment = useCallback((department: Department) => {
    setFormMode('edit');
    setEditingDepartment(department);
    setFormParentId(department.parentDepartmentId ?? '');
    setFormName(department.name);
    setFormCode(department.code);
    setFormSortOrder('');
    setFormError('');
    setCodeTouched(true);
    setCreateOpen(true);
    setNodeMenuId('');
  }, []);

  const closeCreateDepartment = useCallback(() => {
    if (creating) return;
    setCreateOpen(false);
  }, [creating]);

  const slugCode = useCallback((value: string) => {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug.length >= 2 ? slug.slice(0, 64) : `dept-${Date.now().toString(36)}`;
  }, []);

  const submitCreateDepartment = useCallback(async () => {
    const name = formName.trim();
    const code = formCode.trim() || slugCode(name);
    if (!name) {
      setFormError(t('admin.iam.personnel.fieldRequired'));
      return;
    }
    if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(code)) {
      setFormError(t('admin.iam.personnel.invalidDepartmentCode'));
      return;
    }
    if (!selectedOrganizationId) return;
    setCreating(true);
    setFormError('');
    try {
      const payload: Record<string, unknown> = {
        code,
        name,
        organizationId: selectedOrganizationId,
      };
      const sortOrder = Number(formSortOrder);
      if (formSortOrder.trim() !== '' && Number.isFinite(sortOrder)) {
        payload.sortOrder = Math.max(0, Math.trunc(sortOrder));
      }
      if (formMode === 'edit' && editingDepartment) {
        await service.iam.departments.update(editingDepartment.departmentId, {
          ...payload,
          expectedVersion: editingDepartment.version,
        });
        setCreateOpen(false);
        await loadDepartments(selectedOrganizationId);
      } else {
        if (formParentId) payload.parentDepartmentId = formParentId;
        const created = await service.iam.departments.create(payload);
        const createdId = asText(asRecord(created).departmentId);
        setCreateOpen(false);
        await loadDepartments(selectedOrganizationId);
        if (createdId) setSelectedDepartmentId(createdId);
      }
    } catch (reason) {
      setFormError(reasonMessage(reason));
    } finally {
      setCreating(false);
    }
  }, [
    editingDepartment,
    formCode,
    formMode,
    formName,
    formParentId,
    formSortOrder,
    loadDepartments,
    selectedDepartmentId,
    selectedOrganizationId,
    service,
    slugCode,
    t,
  ]);

  const deleteDepartment = useCallback(
    async (departmentId: string) => {
      setBusy(true);
      setError('');
      try {
        await service.iam.departments.delete(departmentId);
        setDeleteTarget(null);
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

  const openDeleteDepartment = useCallback((department: Department) => {
    setDeleteTarget(department);
    setNodeMenuId('');
  }, []);

  const submitDeleteDepartment = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteDepartment(deleteTarget.departmentId);
  }, [deleteDepartment, deleteTarget]);

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
    <div className="flex min-h-full flex-1 flex-col gap-4 px-4 py-4 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-80 lg:self-stretch" aria-label={t('admin.iam.personnel.directory')}>
        <div className="flex h-full min-h-[24rem] flex-col rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
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
            className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-auto"
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
                  {canCreateDepartments || canDeleteDepartments ? (
                    <div className="relative">
                      <button
                        aria-expanded={nodeMenuId === item.department.departmentId}
                        aria-label={`${t('admin.iam.personnel.actions')} ${item.department.name}`}
                        className="rounded px-1 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        onClick={() =>
                          setNodeMenuId(
                            nodeMenuId === item.department.departmentId
                              ? ''
                              : item.department.departmentId,
                          )
                        }
                        type="button"
                      >
                        ⋯
                      </button>
                      {nodeMenuId === item.department.departmentId ? (
                        <div
                          className="absolute right-0 top-full z-20 w-36 rounded-lg border border-slate-200 bg-white py-1 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900"
                          role="menu"
                        >
                          {canCreateDepartments ? (
                            <button
                              className="block w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                              onClick={() => openCreateChild(item.department)}
                              role="menuitem"
                              type="button"
                            >
                              {t('admin.iam.personnel.createChild')}
                            </button>
                          ) : null}
                          <button
                            className="block w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={() => openEditDepartment(item.department)}
                            role="menuitem"
                            type="button"
                          >
                            {t('admin.iam.personnel.editDepartment')}
                          </button>
                          {canDeleteDepartments ? (
                            <button
                              className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                              onClick={() => openDeleteDepartment(item.department)}
                              role="menuitem"
                              type="button"
                            >
                              {t('admin.iam.personnel.delete')}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {canCreateDepartments ? (
            <button
              className="mt-3 w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={openCreateDepartment}
              type="button"
            >
              + {t('admin.iam.personnel.newDepartment')}
            </button>
          ) : null}

          {createOpen ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closeCreateDepartment();
              }}
            >
              <div
                aria-labelledby="personnel-create-title"
                aria-modal="true"
                className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') closeCreateDepartment();
                }}
                role="dialog"
              >
                <h2 className="text-base font-semibold" id="personnel-create-title">
                  {formMode === 'edit'
                    ? t('admin.iam.personnel.editDepartment')
                    : t('admin.iam.personnel.newDepartment')}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {t('admin.iam.personnel.parentDepartment')}
                  {'：'}
                  {formParentId
                    ? flatDepartments.find(
                        (entry) => entry.department.departmentId === formParentId,
                      )?.department.name ?? formParentId
                    : t('admin.iam.personnel.rootDepartment')}
                </p>
                <form
                  className="mt-4 space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitCreateDepartment();
                  }}
                >
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500">
                      {t('admin.iam.personnel.departmentName')} *
                    </span>
                    <input
                      autoFocus
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                      maxLength={64}
                      onChange={(event) => {
                        const value = event.target.value;
                        setFormName(value);
                        if (!codeTouched) setFormCode(slugCode(value));
                      }}
                      placeholder={t('admin.iam.personnel.departmentName')}
                      value={formName}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500">
                      {t('admin.iam.personnel.departmentCode')} *
                    </span>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-sm dark:border-slate-700 dark:bg-slate-950"
                      maxLength={64}
                      onChange={(event) => {
                        setCodeTouched(true);
                        setFormCode(event.target.value.toLowerCase());
                      }}
                      value={formCode}
                    />
                    <span className="mt-1 block text-[11px] leading-4 text-slate-400">
                      {t('admin.iam.personnel.departmentCodeHint')}
                    </span>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-500">
                      {t('admin.iam.personnel.sortOrderLabel')}
                    </span>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                      inputMode="numeric"
                      onChange={(event) => setFormSortOrder(event.target.value.replace(/[^0-9]/g, ''))}
                      placeholder={t('admin.iam.personnel.sortOrderHint')}
                      value={formSortOrder}
                    />
                  </label>
                  {formError ? (
                    <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                      {formError}
                    </p>
                  ) : null}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700"
                      onClick={closeCreateDepartment}
                      type="button"
                    >
                      {t('admin.iam.personnel.cancel')}
                    </button>
                    <button
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
                      disabled={creating || !formName.trim()}
                      type="submit"
                    >
                      {formMode === 'edit'
                        ? t('admin.iam.personnel.save')
                        : t('admin.iam.personnel.create')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}

          {deleteTarget ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setDeleteTarget(null);
              }}
            >
              <div
                aria-labelledby="personnel-delete-title"
                aria-modal="true"
                className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setDeleteTarget(null);
                }}
                role="dialog"
              >
                <h2 className="text-base font-semibold" id="personnel-delete-title">
                  {t('admin.iam.personnel.deleteDepartmentTitle')}
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {t('admin.iam.personnel.deleteDepartmentConfirm', { name: deleteTarget.name })}
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700"
                    onClick={() => setDeleteTarget(null)}
                    type="button"
                  >
                    {t('admin.iam.personnel.cancel')}
                  </button>
                  <button
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                    disabled={busy}
                    onClick={() => void submitDeleteDepartment()}
                    type="button"
                  >
                    {t('admin.iam.personnel.delete')}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label={t('admin.iam.personnel.member')}>
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
        <div
          aria-busy={busy || loading}
          className="flex min-h-0 flex-1 flex-col overflow-auto rounded-xl border border-slate-200 dark:border-slate-800"
        >
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
                  <td
                    className="h-[calc(100vh-16rem)] min-h-[18rem] px-3 text-center align-middle text-slate-500"
                    colSpan={7}
                  >
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
