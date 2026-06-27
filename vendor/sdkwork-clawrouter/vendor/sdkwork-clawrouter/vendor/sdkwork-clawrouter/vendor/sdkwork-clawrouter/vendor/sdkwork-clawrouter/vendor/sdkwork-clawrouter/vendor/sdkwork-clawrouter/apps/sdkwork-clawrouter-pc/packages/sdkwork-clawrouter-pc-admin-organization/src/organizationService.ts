import {
  ensureSdkworkApiSuccess,
  getSdkworkAppbaseBackendSdkClient,
  isRecord,
  readApiData,
  readApiRecord,
  readBoolean,
  readNullableString,
  readNumber,
  readRecordArray,
  readRequiredApiItem,
  readRequiredApiItems,
  readRequiredString,
  readString,
  requiredSafePathSegment,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';

const DEFAULT_PAGE_SIZE = 200;
type AppbaseOperationCommand = Record<string, unknown>;

export type OrganizationStatus = 'active' | 'inactive' | 'archived' | string;

export interface OrganizationTreeNode {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  status: OrganizationStatus;
  kind: string;
  children: OrganizationTreeNode[];
}

export interface OrganizationRecord {
  id: string;
  code: string;
  name: string;
  organizationKind: string;
  parentOrganizationId: string | null;
  status: OrganizationStatus;
  ownerUserId: string | null;
  memberCount: number;
  departmentCount: number;
  sortWeight: number;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentTreeNode {
  id: string;
  code: string;
  name: string;
  organizationId: string;
  parentId: string | null;
  status: OrganizationStatus;
  children: DepartmentTreeNode[];
}

export interface DepartmentRecord {
  id: string;
  code: string;
  name: string;
  organizationId: string;
  parentDepartmentId: string | null;
  status: OrganizationStatus;
  managerUserId: string | null;
  memberCount: number;
  sortWeight: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMemberRecord {
  id: string;
  organizationId: string;
  userId: string;
  displayName: string;
  username: string;
  email: string;
  mobile: string;
  memberKind: string;
  status: OrganizationStatus;
  joinedAt: string;
  createdAt: string;
}

export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  email: string;
  mobile: string;
  gender: string;
  country: string;
  province: string;
  city: string;
  district: string;
  address: string;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentAssignmentRecord {
  id: string;
  departmentId: string;
  membershipId: string;
  userId: string;
  role: string;
  status: OrganizationStatus;
  isPrimary: boolean;
  createdAt: string;
}

export interface PositionRecord {
  id: string;
  code: string;
  name: string;
  organizationId: string;
  departmentId: string | null;
  status: OrganizationStatus;
  rankLevel: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface PositionAssignmentRecord {
  id: string;
  positionId: string;
  membershipId: string;
  userId: string;
  status: OrganizationStatus;
  startedAt: string;
  endedAt: string;
  createdAt: string;
}

export interface RoleRecord {
  id: string;
  code: string;
  name: string;
  status: OrganizationStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleBindingRecord {
  id: string;
  roleId: string;
  principalKind: string;
  principalId: string;
  organizationId: string | null;
  departmentId: string | null;
  scopeKind: string;
  scopeId: string;
  status: OrganizationStatus;
  createdAt: string;
}

export interface PermissionRecord {
  id: string;
  code: string;
  name: string;
  resource: string;
  action: string;
  status: OrganizationStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationDirectoryData {
  organizationTree: OrganizationTreeNode[];
  users: UserRecord[];
  organizations: OrganizationRecord[];
  departmentTree: DepartmentTreeNode[];
  departments: DepartmentRecord[];
  memberships: OrganizationMemberRecord[];
  departmentAssignments: DepartmentAssignmentRecord[];
  positions: PositionRecord[];
  positionAssignments: PositionAssignmentRecord[];
  roles: RoleRecord[];
  roleBindings: RoleBindingRecord[];
  permissions: PermissionRecord[];
}

export interface DirectoryLoadParams {
  pageSize?: number;
  q?: string;
}

export type OrganizationCommand = {
  code?: string;
  name: string;
  organizationKind?: string;
  parentOrganizationId?: string;
  ownerUserId?: string;
  status?: string;
  sortWeight?: number;
};

export type DepartmentCommand = {
  organizationId?: string;
  parentDepartmentId?: string;
  code?: string;
  name?: string;
  managerUserId?: string;
  status?: string;
  sortWeight?: number;
};

export type MembershipCommand = {
  organizationId?: string;
  userId?: string;
  displayName?: string;
  username?: string;
  email?: string;
  mobile?: string;
  memberKind?: string;
  status?: string;
};

export type DepartmentAssignmentCommand = {
  departmentId?: string;
  membershipId?: string;
  userId?: string;
  role?: string;
  status?: string;
  isPrimary?: boolean;
};

export type PositionCommand = {
  organizationId?: string;
  departmentId?: string;
  code?: string;
  name?: string;
  rankLevel?: number;
  description?: string;
  status?: string;
};

export type PositionAssignmentCommand = {
  positionId?: string;
  membershipId?: string;
  userId?: string;
  status?: string;
  startedAt?: string;
  endedAt?: string;
};

export type RoleCommand = {
  code?: string;
  name?: string;
  description?: string;
  status?: string;
};

export type RoleBindingCommand = {
  roleId: string;
  principalKind: string;
  principalId: string;
  organizationId?: string;
  departmentId?: string;
  scopeKind?: string;
  scopeId?: string;
  status?: string;
};

export type PermissionCommand = {
  code?: string;
  name?: string;
  resource?: string;
  action?: string;
  description?: string;
  status?: string;
};

export class OrganizationService {
  static async loadDirectory(params: DirectoryLoadParams = {}): Promise<OrganizationDirectoryData> {
    const backendClient = getSdkworkAppbaseBackendSdkClient();
    const listParams = toListParams(params);

    const usersResult = await backendClient.iam.users.list(listParams);
    ensureSdkworkApiSuccess(usersResult, 'admin.organization.errors.loadUsers');

    const organizationTreeResult = await backendClient.iam.organizations.tree.retrieve();
    ensureSdkworkApiSuccess(organizationTreeResult, 'admin.organization.errors.loadOrganizationTree');

    const organizationsResult = await backendClient.iam.organizations.list(listParams);
    ensureSdkworkApiSuccess(organizationsResult, 'admin.organization.errors.loadOrganizations');

    const departmentTreeResult = await backendClient.iam.departments.tree.retrieve();
    ensureSdkworkApiSuccess(departmentTreeResult, 'admin.organization.errors.loadDepartmentTree');

    const departmentsResult = await backendClient.iam.departments.list(listParams);
    ensureSdkworkApiSuccess(departmentsResult, 'admin.organization.errors.loadDepartments');

    const membershipsResult = await backendClient.iam.organizationMemberships.list(listParams);
    ensureSdkworkApiSuccess(membershipsResult, 'admin.organization.errors.loadMemberships');

    const departmentAssignmentsResult = await backendClient.iam.departmentAssignments.list(listParams);
    ensureSdkworkApiSuccess(departmentAssignmentsResult, 'admin.organization.errors.loadDepartmentAssignments');

    const positionsResult = await backendClient.iam.positions.list(listParams);
    ensureSdkworkApiSuccess(positionsResult, 'admin.organization.errors.loadPositions');

    const positionAssignmentsResult = await backendClient.iam.positionAssignments.list(listParams);
    ensureSdkworkApiSuccess(positionAssignmentsResult, 'admin.organization.errors.loadPositionAssignments');

    const roleBindingsResult = await backendClient.iam.roleBindings.list(listParams);
    ensureSdkworkApiSuccess(roleBindingsResult, 'admin.organization.errors.loadRoleBindings');

    const rolesResult = await backendClient.iam.roles.list(listParams);
    ensureSdkworkApiSuccess(rolesResult, 'admin.organization.errors.loadRoles');

    const permissionsResult = await backendClient.iam.permissions.list(listParams);
    ensureSdkworkApiSuccess(permissionsResult, 'admin.organization.errors.loadPermissions');

    const organizations = readRequiredApiItems(organizationsResult, 'admin.organization.errors.loadOrganizations')
      .map(normalizeOrganization);
    const departments = readRequiredApiItems(departmentsResult, 'admin.organization.errors.loadDepartments')
      .map(normalizeDepartment);

    return {
      organizationTree: normalizeOrganizationTree(organizationTreeResult, organizations),
      users: readRequiredApiItems(usersResult, 'admin.organization.errors.loadUsers')
        .map(normalizeUser),
      organizations,
      departmentTree: normalizeDepartmentTree(departmentTreeResult, departments),
      departments,
      memberships: readRequiredApiItems(membershipsResult, 'admin.organization.errors.loadMemberships')
        .map(normalizeMembership),
      departmentAssignments: readRequiredApiItems(departmentAssignmentsResult, 'admin.organization.errors.loadDepartmentAssignments')
        .map(normalizeDepartmentAssignment),
      positions: readRequiredApiItems(positionsResult, 'admin.organization.errors.loadPositions')
        .map(normalizePosition),
      positionAssignments: readRequiredApiItems(positionAssignmentsResult, 'admin.organization.errors.loadPositionAssignments')
        .map(normalizePositionAssignment),
      roleBindings: readRequiredApiItems(roleBindingsResult, 'admin.organization.errors.loadRoleBindings')
        .map(normalizeRoleBinding),
      roles: readRequiredApiItems(rolesResult, 'admin.organization.errors.loadRoles')
        .map(normalizeRole),
      permissions: readRequiredApiItems(permissionsResult, 'admin.organization.errors.loadPermissions')
        .map(normalizePermission),
    };
  }

  static async createOrganization(input: OrganizationCommand): Promise<OrganizationRecord> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.organizations.create(
      toCommand(input, ['name']),
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.createOrganization');
    return normalizeOrganization(readRequiredApiItem(result, 'admin.organization.errors.organizationMissing'));
  }

  static async updateOrganization(organizationId: string, input: Partial<OrganizationCommand>): Promise<OrganizationRecord> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.organizations.update(
      requiredSafePathSegment(organizationId, 'organizationId'),
      toCommand(input),
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.updateOrganization');
    return normalizeOrganization(readRequiredApiItem(result, 'admin.organization.errors.organizationMissing'));
  }

  static async deleteOrganization(organizationId: string): Promise<void> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.organizations.delete(
      requiredSafePathSegment(organizationId, 'organizationId'),
    );
    ensureDeleteResult(result, 'admin.organization.errors.deleteOrganization');
  }

  static async createDepartment(input: DepartmentCommand): Promise<DepartmentRecord> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.departments.create(
      toCommand(input, ['organizationId', 'name']),
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.createDepartment');
    return normalizeDepartment(readRequiredApiItem(result, 'admin.organization.errors.departmentMissing'));
  }

  static async updateDepartment(departmentId: string, input: Partial<DepartmentCommand>): Promise<DepartmentRecord> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.departments.update(
      requiredSafePathSegment(departmentId, 'departmentId'),
      toCommand(input),
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.updateDepartment');
    return normalizeDepartment(readRequiredApiItem(result, 'admin.organization.errors.departmentMissing'));
  }

  static async deleteDepartment(departmentId: string): Promise<void> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.departments.delete(
      requiredSafePathSegment(departmentId, 'departmentId'),
    );
    ensureDeleteResult(result, 'admin.organization.errors.deleteDepartment');
  }

  static async listDepartments(params: DirectoryLoadParams = {}): Promise<DepartmentRecord[]> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.departments.list(
      toListParams(params),
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.loadDepartments');
    return readRequiredApiItems(result, 'admin.organization.errors.loadDepartments')
      .map(normalizeDepartment);
  }

  static async createMembership(input: MembershipCommand): Promise<OrganizationMemberRecord> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.organizationMemberships.create(
      toCommand(input, ['organizationId', 'userId']),
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.createMembership');
    return normalizeMembership(readRequiredApiItem(result, 'admin.organization.errors.membershipMissing'));
  }

  static async updateMembership(membershipId: string, input: Partial<MembershipCommand>): Promise<OrganizationMemberRecord> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.organizationMemberships.update(
      requiredSafePathSegment(membershipId, 'membershipId'),
      toCommand(input),
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.updateMembership');
    return normalizeMembership(readRequiredApiItem(result, 'admin.organization.errors.membershipMissing'));
  }

  static async deactivateMembership(membershipId: string): Promise<OrganizationMemberRecord> {
    return OrganizationService.updateMembership(membershipId, { status: 'inactive' });
  }

  static async createDepartmentAssignment(input: DepartmentAssignmentCommand): Promise<DepartmentAssignmentRecord> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.departmentAssignments.create(
      toCommand(input, ['departmentId', 'membershipId']),
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.createDepartmentAssignment');
    return normalizeDepartmentAssignment(readRequiredApiItem(result, 'admin.organization.errors.departmentAssignmentMissing'));
  }

  static async updateDepartmentAssignment(assignmentId: string, input: Partial<DepartmentAssignmentCommand>): Promise<DepartmentAssignmentRecord> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.departmentAssignments.update(
      requiredSafePathSegment(assignmentId, 'assignmentId'),
      toCommand(input),
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.updateDepartmentAssignment');
    return normalizeDepartmentAssignment(readRequiredApiItem(result, 'admin.organization.errors.departmentAssignmentMissing'));
  }

  static async deactivateDepartmentAssignment(assignmentId: string): Promise<DepartmentAssignmentRecord> {
    return OrganizationService.updateDepartmentAssignment(assignmentId, { status: 'inactive' });
  }

  static async createPosition(input: PositionCommand): Promise<PositionRecord> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.positions.create(
      toCommand(input, ['organizationId', 'name']),
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.createPosition');
    return normalizePosition(readRequiredApiItem(result, 'admin.organization.errors.positionMissing'));
  }

  static async updatePosition(positionId: string, input: Partial<PositionCommand>): Promise<PositionRecord> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.positions.update(
      requiredSafePathSegment(positionId, 'positionId'),
      toCommand(input),
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.updatePosition');
    return normalizePosition(readRequiredApiItem(result, 'admin.organization.errors.positionMissing'));
  }

  static async deletePosition(positionId: string): Promise<void> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.positions.delete(
      requiredSafePathSegment(positionId, 'positionId'),
    );
    ensureDeleteResult(result, 'admin.organization.errors.deletePosition');
  }

  static async createPositionAssignment(input: PositionAssignmentCommand): Promise<PositionAssignmentRecord> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.positionAssignments.create(
      toCommand(input, ['positionId', 'membershipId']),
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.createPositionAssignment');
    return normalizePositionAssignment(readRequiredApiItem(result, 'admin.organization.errors.positionAssignmentMissing'));
  }

  static async updatePositionAssignment(assignmentId: string, input: Partial<PositionAssignmentCommand>): Promise<PositionAssignmentRecord> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.positionAssignments.update(
      requiredSafePathSegment(assignmentId, 'assignmentId'),
      toCommand(input),
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.updatePositionAssignment');
    return normalizePositionAssignment(readRequiredApiItem(result, 'admin.organization.errors.positionAssignmentMissing'));
  }

  static async deactivatePositionAssignment(assignmentId: string): Promise<PositionAssignmentRecord> {
    return OrganizationService.updatePositionAssignment(assignmentId, { status: 'inactive' });
  }

  static async createRole(input: RoleCommand): Promise<RoleRecord> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.roles.create(
      toCommand(input, ['code', 'name']),
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.createRole');
    return normalizeRole(readRequiredApiItem(result, 'admin.organization.errors.roleMissing'));
  }

  static async updateRole(roleId: string, input: Partial<RoleCommand>): Promise<RoleRecord> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.roles.update(
      requiredSafePathSegment(roleId, 'roleId'),
      toCommand(input),
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.updateRole');
    return normalizeRole(readRequiredApiItem(result, 'admin.organization.errors.roleMissing'));
  }

  static async deleteRole(roleId: string): Promise<void> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.roles.delete(
      requiredSafePathSegment(roleId, 'roleId'),
    );
    ensureDeleteResult(result, 'admin.organization.errors.deleteRole');
  }

  static async bindRole(input: RoleBindingCommand): Promise<RoleBindingRecord> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.roleBindings.create(
      toCommand(input, ['principalKind', 'principalId', 'roleId']),
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.bindRole');
    return normalizeRoleBinding(readRequiredApiItem(result, 'admin.organization.errors.roleBindingMissing'));
  }

  static async deleteRoleBinding(roleBindingId: string): Promise<void> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.roleBindings.delete(
      requiredSafePathSegment(roleBindingId, 'roleBindingId'),
    );
    ensureDeleteResult(result, 'admin.organization.errors.deleteRoleBinding');
  }

  static async createPermission(input: PermissionCommand): Promise<PermissionRecord> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.permissions.create(
      toCommand(input, ['code', 'name']),
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.createPermission');
    return normalizePermission(readRequiredApiItem(result, 'admin.organization.errors.permissionMissing'));
  }

  static async updatePermission(permissionId: string, input: Partial<PermissionCommand>): Promise<PermissionRecord> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.permissions.update(
      requiredSafePathSegment(permissionId, 'permissionId'),
      toCommand(input),
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.updatePermission');
    return normalizePermission(readRequiredApiItem(result, 'admin.organization.errors.permissionMissing'));
  }

  static async deletePermission(permissionId: string): Promise<void> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.permissions.delete(
      requiredSafePathSegment(permissionId, 'permissionId'),
    );
    ensureDeleteResult(result, 'admin.organization.errors.deletePermission');
  }

  static async listRolePermissions(roleId: string, params: DirectoryLoadParams = {}): Promise<PermissionRecord[]> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.roles.permissions.list(
      requiredSafePathSegment(roleId, 'roleId'),
      toListParams(params),
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.loadRolePermissions');
    return readRequiredApiItems(result, 'admin.organization.errors.loadRolePermissions').map(normalizePermission);
  }

  static async grantRolePermission(roleId: string, permissionId: string): Promise<void> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.roles.permissions.create(
      requiredSafePathSegment(roleId, 'roleId'),
      { permissionId: requiredSafePathSegment(permissionId, 'permissionId') },
    );
    ensureSdkworkApiSuccess(result, 'admin.organization.errors.grantRolePermission');
  }

  static async revokeRolePermission(roleId: string, permissionId: string): Promise<void> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.roles.permissions.delete(
      requiredSafePathSegment(roleId, 'roleId'),
      requiredSafePathSegment(permissionId, 'permissionId'),
    );
    ensureDeleteResult(result, 'admin.organization.errors.revokeRolePermission');
  }
}

function toListParams(params: DirectoryLoadParams): { pageSize: number; q?: string } {
  const q = params.q?.trim();
  return {
    pageSize: normalizePageSize(params.pageSize),
    ...(q ? { q } : {}),
  };
}

function normalizePageSize(value: number | undefined): number {
  if (!value || !Number.isFinite(value) || value < 1) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(Math.trunc(value), 500);
}

function normalizeOrganizationTree(result: unknown, organizations: OrganizationRecord[]): OrganizationTreeNode[] {
  const treeItems = readTreeItems(result);
  if (treeItems.length > 0) {
    return treeItems.map(normalizeOrganizationTreeNode);
  }
  return buildOrganizationTreeFromList(organizations);
}

function normalizeDepartmentTree(result: unknown, departments: DepartmentRecord[]): DepartmentTreeNode[] {
  const treeItems = readTreeItems(result);
  if (treeItems.length > 0) {
    return treeItems.map(normalizeDepartmentTreeNode);
  }
  return buildDepartmentTreeFromList(departments);
}

function readTreeItems(result: unknown): unknown[] {
  const data = readApiData(result);
  if (Array.isArray(data)) {
    return data;
  }
  if (!isRecord(data)) {
    return [];
  }
  for (const key of ['items', 'tree', 'roots', 'nodes', 'children']) {
    const value = data[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return Object.keys(data).length > 0 ? [data] : [];
}

function buildOrganizationTreeFromList(organizations: OrganizationRecord[]): OrganizationTreeNode[] {
  const nodeMap = new Map<string, OrganizationTreeNode>();
  for (const organization of organizations) {
    nodeMap.set(organization.id, {
      id: organization.id,
      code: organization.code,
      name: organization.name,
      parentId: organization.parentOrganizationId,
      status: organization.status,
      kind: organization.organizationKind,
      children: [],
    });
  }
  const roots: OrganizationTreeNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function buildDepartmentTreeFromList(departments: DepartmentRecord[]): DepartmentTreeNode[] {
  const nodeMap = new Map<string, DepartmentTreeNode>();
  for (const department of departments) {
    nodeMap.set(department.id, {
      id: department.id,
      code: department.code,
      name: department.name,
      organizationId: department.organizationId,
      parentId: department.parentDepartmentId,
      status: department.status,
      children: [],
    });
  }
  const roots: DepartmentTreeNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function normalizeOrganizationTreeNode(value: unknown): OrganizationTreeNode {
  const item = readRequiredRecord(value, 'Organization tree node is required');
  return {
    id: readEntityId(item),
    code: readString(item, 'code'),
    name: readEntityName(item, 'Organization'),
    parentId: readFirstNullableString(item, ['parentOrganizationId', 'parentId']),
    status: readString(item, 'status', 'active'),
    kind: readFirstString(item, ['organizationKind', 'kind', 'type'], 'organization'),
    children: readRecordArray(item, 'children').map(normalizeOrganizationTreeNode),
  };
}

function normalizeDepartmentTreeNode(value: unknown): DepartmentTreeNode {
  const item = readRequiredRecord(value, 'Department tree node is required');
  return {
    id: readEntityId(item),
    code: readString(item, 'code'),
    name: readEntityName(item, 'Department'),
    organizationId: readFirstString(item, ['organizationId', 'orgId']),
    parentId: readFirstNullableString(item, ['parentDepartmentId', 'parentId']),
    status: readString(item, 'status', 'active'),
    children: readRecordArray(item, 'children').map(normalizeDepartmentTreeNode),
  };
}

function normalizeOrganization(value: unknown): OrganizationRecord {
  const item = readRequiredRecord(value, 'Organization record is required');
  return {
    id: readEntityId(item),
    code: readString(item, 'code'),
    name: readEntityName(item, 'Organization'),
    organizationKind: readFirstString(item, ['organizationKind', 'kind', 'type'], 'organization'),
    parentOrganizationId: readFirstNullableString(item, ['parentOrganizationId', 'parentId']),
    status: readString(item, 'status', 'active'),
    ownerUserId: readNullableString(item, 'ownerUserId'),
    memberCount: readNumber(item, 'memberCount'),
    departmentCount: readNumber(item, 'departmentCount'),
    sortWeight: readNumber(item, 'sortWeight'),
    createdAt: readString(item, 'createdAt'),
    updatedAt: readString(item, 'updatedAt'),
  };
}

function normalizeDepartment(value: unknown): DepartmentRecord {
  const item = readRequiredRecord(value, 'Department record is required');
  return {
    id: readEntityId(item),
    code: readString(item, 'code'),
    name: readEntityName(item, 'Department'),
    organizationId: readFirstString(item, ['organizationId', 'orgId']),
    parentDepartmentId: readFirstNullableString(item, ['parentDepartmentId', 'parentId']),
    status: readString(item, 'status', 'active'),
    managerUserId: readNullableString(item, 'managerUserId'),
    memberCount: readNumber(item, 'memberCount'),
    sortWeight: readNumber(item, 'sortWeight'),
    createdAt: readString(item, 'createdAt'),
    updatedAt: readString(item, 'updatedAt'),
  };
}

function normalizeMembership(value: unknown): OrganizationMemberRecord {
  const item = readRequiredRecord(value, 'Membership record is required');
  const userId = readFirstString(item, ['userId', 'memberUserId']);
  const displayName = readFirstString(item, ['displayName', 'name', 'nickname', 'username'], userId || 'Member');
  return {
    id: readEntityId(item),
    organizationId: readFirstString(item, ['organizationId', 'orgId']),
    userId,
    displayName,
    username: readFirstString(item, ['username', 'userName'], displayName),
    email: readString(item, 'email'),
    mobile: readFirstString(item, ['mobile', 'phone']),
    memberKind: readFirstString(item, ['memberKind', 'kind', 'type'], 'member'),
    status: readString(item, 'status', 'active'),
    joinedAt: readFirstString(item, ['joinedAt', 'createdAt']),
    createdAt: readString(item, 'createdAt'),
  };
}

function normalizeUser(value: unknown): UserRecord {
  const item = readRequiredRecord(value, 'User record is required');
  const id = readEntityId(item);
  const username = readFirstString(item, ['username', 'userName', 'account'], id);
  const displayName = readFirstString(item, ['displayName', 'name', 'nickname', 'title'], username || id);
  return {
    id,
    username,
    displayName,
    email: readString(item, 'email'),
    mobile: readFirstString(item, ['mobile', 'phone']),
    gender: readFirstString(item, ['gender', 'sex']),
    country: readFirstString(item, ['country', 'countryCode', 'countryName', 'nation']),
    province: readFirstString(item, ['province', 'state', 'region']),
    city: readFirstString(item, ['city', 'locality']),
    district: readFirstString(item, ['district', 'county', 'area']),
    address: readFirstString(item, ['address', 'streetAddress', 'addressLine']),
    status: readString(item, 'status', 'active'),
    createdAt: readString(item, 'createdAt'),
    updatedAt: readString(item, 'updatedAt'),
  };
}

function normalizeDepartmentAssignment(value: unknown): DepartmentAssignmentRecord {
  const item = readRequiredRecord(value, 'Department assignment record is required');
  return {
    id: readEntityId(item),
    departmentId: readString(item, 'departmentId'),
    membershipId: readString(item, 'membershipId'),
    userId: readString(item, 'userId'),
    role: readFirstString(item, ['role', 'assignmentRole'], 'member'),
    status: readString(item, 'status', 'active'),
    isPrimary: readBoolean(item, 'isPrimary'),
    createdAt: readString(item, 'createdAt'),
  };
}

function normalizePosition(value: unknown): PositionRecord {
  const item = readRequiredRecord(value, 'Position record is required');
  return {
    id: readEntityId(item),
    code: readString(item, 'code'),
    name: readEntityName(item, 'Position'),
    organizationId: readFirstString(item, ['organizationId', 'orgId']),
    departmentId: readNullableString(item, 'departmentId'),
    status: readString(item, 'status', 'active'),
    rankLevel: readNumber(item, 'rankLevel'),
    description: readString(item, 'description'),
    createdAt: readString(item, 'createdAt'),
    updatedAt: readString(item, 'updatedAt'),
  };
}

function normalizePositionAssignment(value: unknown): PositionAssignmentRecord {
  const item = readRequiredRecord(value, 'Position assignment record is required');
  return {
    id: readEntityId(item),
    positionId: readString(item, 'positionId'),
    membershipId: readString(item, 'membershipId'),
    userId: readString(item, 'userId'),
    status: readString(item, 'status', 'active'),
    startedAt: readString(item, 'startedAt'),
    endedAt: readString(item, 'endedAt'),
    createdAt: readString(item, 'createdAt'),
  };
}

function normalizeRole(value: unknown): RoleRecord {
  const item = readRequiredRecord(value, 'Role record is required');
  return {
    id: readEntityId(item),
    code: readString(item, 'code'),
    name: readEntityName(item, 'Role'),
    status: readString(item, 'status', 'active'),
    description: readString(item, 'description'),
    createdAt: readString(item, 'createdAt'),
    updatedAt: readString(item, 'updatedAt'),
  };
}

function normalizeRoleBinding(value: unknown): RoleBindingRecord {
  const item = readRequiredRecord(value, 'Role binding record is required');
  return {
    id: readEntityId(item),
    roleId: readString(item, 'roleId'),
    principalKind: readFirstString(item, ['principalKind', 'subjectKind'], 'member'),
    principalId: readFirstString(item, ['principalId', 'subjectId']),
    organizationId: readNullableString(item, 'organizationId'),
    departmentId: readNullableString(item, 'departmentId'),
    scopeKind: readFirstString(item, ['scopeKind', 'scopeType'], 'global'),
    scopeId: readString(item, 'scopeId'),
    status: readString(item, 'status', 'active'),
    createdAt: readString(item, 'createdAt'),
  };
}

function normalizePermission(value: unknown): PermissionRecord {
  const item = readRequiredRecord(value, 'Permission record is required');
  return {
    id: readEntityId(item),
    code: readString(item, 'code'),
    name: readEntityName(item, 'Permission'),
    resource: readString(item, 'resource'),
    action: readString(item, 'action'),
    status: readString(item, 'status', 'active'),
    description: readString(item, 'description'),
    createdAt: readString(item, 'createdAt'),
    updatedAt: readString(item, 'updatedAt'),
  };
}

function toCommand<T extends Record<string, unknown>>(input: T, requiredKeys: string[] = []): AppbaseOperationCommand {
  const command = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
  for (const key of requiredKeys) {
    const value = command[key];
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`${key} is required`);
    }
    command[key] = value.trim();
  }
  return command;
}

function ensureDeleteResult(result: unknown, message: string): void {
  ensureSdkworkApiSuccess(result, message);
  const record = readApiRecord(result);
  if ('deleted' in record && readBoolean(record, 'deleted') !== true) {
    throw new Error(message);
  }
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}

function readEntityId(record: ApiRecord): string {
  return readRequiredString(record, 'id', 'Record id is required');
}

function readEntityName(record: ApiRecord, fallback: string): string {
  return readFirstString(record, ['name', 'displayName', 'title'], fallback);
}

function readFirstString(record: ApiRecord, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = readString(record, key).trim();
    if (value) {
      return value;
    }
  }
  return fallback;
}

function readFirstNullableString(record: ApiRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = readNullableString(record, key);
    if (value) {
      return value;
    }
  }
  return null;
}
