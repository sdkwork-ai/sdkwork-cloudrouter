import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { ADMIN_MODULES, getAdminModuleMenu } from "./src/adminModuleRegistry.ts";

const portalRoot = new URL("./", import.meta.url);
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

function source(path: string): string {
  return readFileSync(new URL(path, portalRoot), "utf8");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function restoreWindow(): void {
  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    return;
  }
  delete (globalThis as { window?: Window }).window;
}

function sourceSection(sourceCode: string, startMarker: string, endMarker: string): string {
  const start = sourceCode.indexOf(startMarker);
  assert.notEqual(start, -1, `missing source section start: ${startMarker}`);
  const end = sourceCode.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `missing source section end: ${endMarker}`);
  return sourceCode.slice(start, end);
}

test("admin organization is registered under home user management", () => {
  const homeModule = ADMIN_MODULES.find((module) => module.id === "home");
  assert.ok(homeModule, "home admin module must exist");
  assert.ok(
    homeModule.pathPrefixes.includes("/admin/organization"),
    "home admin module must own /admin/organization",
  );

  const homeMenu = getAdminModuleMenu("home");
  const userManagementGroup = homeMenu.groups.find(
    (group) => group.groupKey === "admin.menu.home.userManagement",
  );
  assert.ok(userManagementGroup, "user management group must exist");

  const organizationItem = userManagementGroup.items.find(
    (item) => item.path === "/admin/organization",
  );
  assert.ok(organizationItem, "organization menu item must exist under user management");
  assert.equal(organizationItem.labelKey, "admin.menu.organization");

  const userItemIndex = userManagementGroup.items.findIndex((item) => item.path === "/admin/user");
  const organizationItemIndex = userManagementGroup.items.findIndex(
    (item) => item.path === "/admin/organization",
  );
  assert.equal(organizationItemIndex, userItemIndex + 1, "organization must be placed below users");
});

test("admin organization route and package are wired into the portal", () => {
  const appSource = source("src/App.tsx");
  const packageJson = JSON.parse(source("package.json")) as {
    dependencies?: Record<string, string>;
    workspaces?: string[];
  };
  const typecheckSource = source("tsconfig.typecheck.json");

  assert.match(appSource, /import\('sdkwork-clawrouter-pc-admin-organization'\)/);
  assert.match(appSource, /const OrganizationAdmin = lazyRoute/);
  assert.match(appSource, /<Route path="organization" element={<OrganizationAdmin \/>} \/>/);
  assert.equal(
    packageJson.dependencies?.["sdkwork-clawrouter-pc-admin-organization"],
    "workspace:*",
  );
  assert.ok(
    packageJson.workspaces?.includes("../../../sdkwork-iam/sdks/sdkwork-iam-app-sdk/*-typescript/generated/server-openapi"),
    "portal workspace must include the materialized appbase app SDK package path",
  );
  assert.ok(
    packageJson.workspaces?.includes("../../../sdkwork-iam/sdks/sdkwork-iam-backend-sdk/*-typescript/generated/server-openapi"),
    "portal workspace must include the materialized appbase backend SDK package path",
  );
  assert.match(
    typecheckSource,
    /"@sdkwork\/iam-app-sdk": \[\s*"\.\/src\/typecheck-shims\.d\.ts"/,
  );
  assert.match(
    typecheckSource,
    /"@sdkwork\/iam-backend-sdk": \[\s*"\.\/src\/typecheck-shims\.d\.ts"/,
  );
  assert.ok(
    existsSync(new URL("packages/sdkwork-clawrouter-pc-admin-organization/package.json", portalRoot)),
    "admin organization package must exist",
  );
});

test("admin organization navigation has translated labels", () => {
  const i18nSource = source("packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/core-navigation.ts");

  assert.match(i18nSource, /"admin\.menu\.organization": "Organization"/);
  assert.match(i18nSource, /"admin\.menu\.organization": "组织机构"/);
});

test("admin organization page translations are registered", () => {
  const resourceIndex = source("packages/sdkwork-clawrouter-pc-i18n/src/resources/index.ts");
  const organizationMessages = source("packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/organization.ts");

  assert.match(resourceIndex, /adminOrganizationMessages/);
  assert.match(organizationMessages, /"admin\.organization\.title": "Organization"/);
  assert.match(organizationMessages, /"admin\.organization\.actions\.assignments": "Assignments"/);
  assert.match(organizationMessages, /"admin\.organization\.assignmentDrawer\.description": "Review existing assignments/);
  assert.match(organizationMessages, /"admin\.organization\.panels\.directory": "Organization structure"/);
  assert.match(organizationMessages, /"admin\.organization\.empty\.directory": "No organization structure"/);
  assert.match(organizationMessages, /"admin\.organization\.title": "组织机构"/);
  assert.match(organizationMessages, /"admin\.organization\.actions\.revoke": "撤销"/);
});

test("admin organization service uses appbase backend directory reads and mutations", () => {
  const service = source("packages/sdkwork-clawrouter-pc-admin-organization/src/organizationService.ts");
  const packageJson = JSON.parse(
    source("packages/sdkwork-clawroutes-pc-commons/package.json"),
  ) as { dependencies?: Record<string, string> };
  const sdkBoundary = source("packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts");

  assert.equal(packageJson.dependencies?.["@sdkwork/iam-app-sdk"], "workspace:*");
  assert.equal(packageJson.dependencies?.["@sdkwork/iam-backend-sdk"], "workspace:*");
  assert.match(sdkBoundary, /@sdkwork\/iam-app-sdk/);
  assert.match(sdkBoundary, /@sdkwork\/iam-backend-sdk/);
  assert.match(sdkBoundary, /getSdkworkAppbaseAppSdkClient/);
  assert.match(sdkBoundary, /getSdkworkAppbaseBackendSdkClient/);
  assert.match(service, /getSdkworkAppbaseBackendSdkClient/);
  assert.doesNotMatch(service, /getSdkworkAppbaseAppSdkClient/);
  assert.doesNotMatch(service, /getClawRouterAppSdkClient/);
  assert.doesNotMatch(service, /iamDirectoryApiOperations/);
  assert.doesNotMatch(service, /\bfetch\s*\(/);
  assert.doesNotMatch(service, /\baxios\b/);
  assert.doesNotMatch(service, /\.http\b/);

  for (const token of [
    "iam.users.list",
    "iam.organizations.list",
    "iam.organizations.tree.retrieve",
    "iam.organizations.create",
    "iam.organizations.update",
    "iam.organizations.delete",
    "iam.organizationMemberships.list",
    "iam.organizationMemberships.create",
    "iam.organizationMemberships.update",
    "iam.departments.list",
    "iam.departments.tree.retrieve",
    "iam.departments.create",
    "iam.departments.update",
    "iam.departments.delete",
    "iam.departmentAssignments.list",
    "iam.departmentAssignments.create",
    "iam.departmentAssignments.update",
    "iam.positions.list",
    "iam.positions.create",
    "iam.positions.update",
    "iam.positions.delete",
    "iam.positionAssignments.list",
    "iam.positionAssignments.create",
    "iam.positionAssignments.update",
    "iam.roleBindings.list",
    "iam.roleBindings.create",
    "iam.roleBindings.delete",
    "iam.roles.list",
    "iam.roles.permissions.list",
    "iam.roles.permissions.create",
    "iam.roles.permissions.delete",
    "iam.permissions.list",
  ]) {
    assert.match(service, new RegExp(escapeRegExp(token)), `missing SDK call marker: ${token}`);
  }
});

test("admin organization UI exposes department, position and authorization admin workflows", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /function TreeNodeButton\([\s\S]*onDelete[\s\S]*onEdit/);
  assert.match(sourceCode, /const organization = node\.nodeKind === 'organization'[\s\S]*directory\.organizations\.find\(\(item\) => item\.id === node\.organizationId\)/);
  assert.match(sourceCode, /const department = node\.nodeKind === 'department'[\s\S]*directory\.departments\.find\(\(item\) => item\.id === node\.departmentId\)/);
  assert.match(sourceCode, /\{ kind: 'positionAssignment'; mode: 'edit'; target: PositionAssignmentRecord \}/);
  assert.match(sourceCode, /OrganizationService\.updatePositionAssignment/);
  assert.match(sourceCode, /onAddAssignment=\{\(\) => setDialog\(\{ kind: 'positionAssignment', mode: 'create' \}\)\}/);
  assert.match(sourceCode, /OrganizationService\.grantRolePermission/);
  assert.match(sourceCode, /OrganizationService\.revokeRolePermission/);
  assert.match(sourceCode, /admin\.organization\.actions\.revoke/);
});

test("admin organization keeps the main workspace simple and moves auxiliary assignment operations into dialogs", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");
  const headerSource = source("src/AdminHeader.tsx");
  const assignmentDrawerSource = sourceSection(sourceCode, "function AssignmentDrawer(", "function AuthorizationTab(");
  const authorizationDrawerSource = sourceSection(sourceCode, "function AuthorizationDrawer(", "function TableHeader(");
  const chooseUserModalSource = sourceSection(sourceCode, "function ChooseUserModal(", "function EntityDialog(");

  assert.doesNotMatch(sourceCode, /<SummaryStrip\b/);
  assert.doesNotMatch(sourceCode, /function SummaryStrip\(/);
  assert.doesNotMatch(sourceCode, /const totalAssignments = /);
  assert.doesNotMatch(sourceCode, /assignments=\{visibleDepartmentAssignments\}/);
  assert.doesNotMatch(sourceCode, /assignments=\{visiblePositionAssignments\}/);
  assert.doesNotMatch(sourceCode, /2xl:grid-cols-\[minmax\(0,1fr\)_420px\]/);
  assert.doesNotMatch(
    sourceCode,
    /function MembersTab\([\s\S]*assignments: DepartmentAssignmentRecord\[];/,
    "department assignments should not be a persistent right-side prop in the members workspace",
  );
  assert.doesNotMatch(
    sourceCode,
    /function PositionsTab\([\s\S]*assignments: PositionAssignmentRecord\[];/,
    "position assignments should not be a persistent right-side prop in the positions workspace",
  );
  assert.match(sourceCode, /onAddAssignment=\{\(\) => setDialog\(\{ kind: 'departmentAssignment', mode: 'create' \}\)\}/);
  assert.match(sourceCode, /onAddAssignment=\{\(\) => setDialog\(\{ kind: 'positionAssignment', mode: 'create' \}\)\}/);
  assert.match(sourceCode, /type AssignmentDrawerState = 'departmentAssignments' \| 'positionAssignments';/);
  assert.match(sourceCode, /const \[assignmentDrawer, setAssignmentDrawer\] = useState<AssignmentDrawerState \| null>\(null\);/);
  assert.match(sourceCode, /onManageAssignments=\{\(\) => setAssignmentDrawer\('departmentAssignments'\)\}/);
  assert.match(sourceCode, /onManageAssignments=\{\(\) => setAssignmentDrawer\('positionAssignments'\)\}/);
  assert.match(sourceCode, /<AssignmentDrawer[\s\S]*departmentAssignments=\{visibleDepartmentAssignments\}[\s\S]*positionAssignments=\{visiblePositionAssignments\}/);
  assert.match(sourceCode, /onEditDepartmentAssignment=\{\(target\) => \{[\s\S]*setAssignmentDrawer\(null\);[\s\S]*setDialog\(\{ kind: 'departmentAssignment', mode: 'edit', target \}\);[\s\S]*\}\}/);
  assert.match(sourceCode, /onEditPositionAssignment=\{\(target\) => \{[\s\S]*setAssignmentDrawer\(null\);[\s\S]*setDialog\(\{ kind: 'positionAssignment', mode: 'edit', target \}\);[\s\S]*\}\}/);
  assert.match(sourceCode, /if \(dialog\.kind === 'departmentAssignment'\) \{/);
  assert.match(sourceCode, /if \(dialog\.kind === 'positionAssignment'\) \{/);
  assert.match(assignmentDrawerSource, /onClick=\{onClose\}/);
  assert.match(assignmentDrawerSource, /onClick=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.match(authorizationDrawerSource, /onClick=\{onClose\}/);
  assert.match(authorizationDrawerSource, /onClick=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.match(headerSource, /fixed left-0 right-0 top-0 z-50/);
  assert.match(assignmentDrawerSource, /fixed inset-0 z-\[70\] flex justify-end/);
  assert.match(authorizationDrawerSource, /fixed inset-0 z-\[70\] flex justify-end/);
  assert.match(chooseUserModalSource, /fixed inset-0 z-\[70\] flex items-center justify-center/);
  assert.doesNotMatch(assignmentDrawerSource, /fixed inset-0 z-40/);
  assert.doesNotMatch(authorizationDrawerSource, /fixed inset-0 z-40/);
});

test("admin organization table headers use consistent actions without redundant refresh", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");
  const membersTabSource = sourceSection(sourceCode, "function MembersTab(", "function PositionsTab(");
  const positionsTabSource = sourceSection(sourceCode, "function PositionsTab(", "function AssignmentDrawer(");
  const authorizationTabSource = sourceSection(sourceCode, "function AuthorizationTab(", "function AuthorizationDrawer(");

  for (const componentSource of [membersTabSource, positionsTabSource, authorizationTabSource]) {
    assert.doesNotMatch(componentSource, /isRefreshing/);
    assert.doesNotMatch(componentSource, /onRefresh/);
    assert.doesNotMatch(componentSource, /common\.actions\.refresh/);
    assert.doesNotMatch(componentSource, /RefreshCw/);
    assert.match(componentSource, /HeaderButton/);
  }

  assert.doesNotMatch(sourceCode, /RefreshCw/);
  assert.doesNotMatch(sourceCode, /<MembersTab[\s\S]*isRefreshing=\{loading\}/);
  assert.doesNotMatch(sourceCode, /<MembersTab[\s\S]*onRefresh=\{\(\) => \{ void loadDirectory\(\); \}\}/);
  assert.doesNotMatch(sourceCode, /<PositionsTab[\s\S]*isRefreshing=\{loading\}/);
  assert.doesNotMatch(sourceCode, /<PositionsTab[\s\S]*onRefresh=\{\(\) => \{ void loadDirectory\(\); \}\}/);
  assert.doesNotMatch(sourceCode, /<AuthorizationTab[\s\S]*isRefreshing=\{loading\}/);
  assert.doesNotMatch(sourceCode, /<AuthorizationTab[\s\S]*onRefresh=\{\(\) => \{ void loadDirectory\(\); \}\}/);
  assert.match(sourceCode, /function HeaderButton\(\{ children, disabled, label, onClick, variant = 'secondary' \}/);
  assert.match(sourceCode, /className=\{`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold/);
  assert.match(sourceCode, /variant === 'primary'/);
});

test("admin organization query lives in the left side of right table headers", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");
  const messages = source("packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/organization.ts");
  const pageHeaderSource = sourceSection(sourceCode, "return (", "{actionError ? (");
  const directoryPanelSource = sourceSection(sourceCode, "<Panel", "</Panel>");
  const membersTabSource = sourceSection(sourceCode, "function MembersTab(", "function PositionsTab(");
  const positionsTabSource = sourceSection(sourceCode, "function PositionsTab(", "function AssignmentDrawer(");
  const authorizationTabSource = sourceSection(sourceCode, "function AuthorizationTab(", "function AuthorizationDrawer(");

  assert.doesNotMatch(pageHeaderSource, /<h1\b/);
  assert.doesNotMatch(pageHeaderSource, /admin\.organization\.eyebrow/);
  assert.doesNotMatch(pageHeaderSource, /admin\.organization\.title/);
  assert.doesNotMatch(pageHeaderSource, /<ListSearchControl/);
  assert.doesNotMatch(sourceCode, /onChange=\{\(event\) => setSearch\(event\.target\.value\)\}/);

  assert.doesNotMatch(sourceCode, /const \[directorySearchInput, setDirectorySearchInput\] = useState\(''\);/);
  assert.doesNotMatch(sourceCode, /const \[directorySearch, setDirectorySearch\] = useState\(''\);/);
  assert.doesNotMatch(sourceCode, /const normalizedDirectorySearch = directorySearch\.trim\(\)\.toLowerCase\(\);/);
  assert.doesNotMatch(sourceCode, /const visibleDirectoryTree = useMemo\(/);
  assert.doesNotMatch(sourceCode, /function handleDirectorySearchSubmit/);
  assert.doesNotMatch(sourceCode, /function filterOrganizationDepartmentTree/);
  assert.doesNotMatch(sourceCode, /function DirectorySearchControl/);

  assert.doesNotMatch(directoryPanelSource, /<ListQueryControl/);
  assert.doesNotMatch(directoryPanelSource, /admin\.organization\.search\.directory/);
  assert.match(directoryPanelSource, /nodes=\{combinedDirectoryTree\}/);
  assert.match(directoryPanelSource, /expanded=\{expandedDirectoryNodeIds\.has\(node\.id\)\}/);
  assert.match(directoryPanelSource, /isNodeExpanded=\{\(node\) => expandedDirectoryNodeIds\.has\(node\.id\)\}/);

  assert.match(sourceCode, /const \[listSearchInput, setListSearchInput\] = useState\(''\);/);
  assert.match(sourceCode, /const \[listSearch, setListSearch\] = useState\(''\);/);
  assert.match(sourceCode, /const normalizedListSearch = listSearch\.trim\(\)\.toLowerCase\(\);/);
  assert.match(sourceCode, /function handleListSearchSubmit\(event\?: FormEvent<HTMLFormElement>\): void \{/);
  assert.match(sourceCode, /setListSearch\(listSearchInput\);/);

  assert.match(sourceCode, /<MembersTab[\s\S]*queryLabel=\{t\('common\.actions\.query', 'Query'\)\}[\s\S]*queryPlaceholder=\{t\('admin\.organization\.search\.members', 'Search members\.\.\.'\)\}[\s\S]*queryValue=\{listSearchInput\}/);
  assert.match(sourceCode, /<PositionsTab[\s\S]*queryLabel=\{t\('common\.actions\.query', 'Query'\)\}[\s\S]*queryPlaceholder=\{t\('admin\.organization\.search\.positions', 'Search positions\.\.\.'\)\}[\s\S]*queryValue=\{listSearchInput\}/);
  assert.match(sourceCode, /<AuthorizationTab[\s\S]*queryLabel=\{t\('common\.actions\.query', 'Query'\)\}[\s\S]*queryPlaceholder=\{t\('admin\.organization\.search\.permissions', 'Search permissions\.\.\.'\)\}[\s\S]*queryValue=\{listSearchInput\}/);

  for (const componentSource of [membersTabSource, positionsTabSource, authorizationTabSource]) {
    assert.match(componentSource, /queryLabel: string;/);
    assert.match(componentSource, /queryPlaceholder: string;/);
    assert.match(componentSource, /queryValue: string;/);
    assert.match(componentSource, /onQuery: \(event\?: FormEvent<HTMLFormElement>\) => void;/);
    assert.match(componentSource, /onQueryValueChange: \(value: string\) => void;/);
    assert.match(componentSource, /<TableHeader[\s\S]*query=\{\([\s\S]*<ListQueryControl[\s\S]*onQuery=\{onQuery\}[\s\S]*placeholder=\{queryPlaceholder\}[\s\S]*queryLabel=\{queryLabel\}[\s\S]*value=\{queryValue\}/);
  }

  assert.doesNotMatch(membersTabSource, /title=\{t\('admin\.organization\.members\.title'/);
  assert.doesNotMatch(positionsTabSource, /title=\{t\('admin\.organization\.positions\.title'/);
  assert.doesNotMatch(authorizationTabSource, /title=\{t\('admin\.organization\.permissions\.title'/);
  assert.match(membersTabSource, /header=\{\([\s\S]*<TableHeader[\s\S]*query=\{/);
  assert.match(positionsTabSource, /header=\{\([\s\S]*<TableHeader[\s\S]*query=\{/);
  assert.match(authorizationTabSource, /header=\{\([\s\S]*<TableHeader[\s\S]*query=\{/);

  assert.match(sourceCode, /function TableHeader\(\{ action, query \}: \{ action\?: ReactNode; query\?: ReactNode \}\)/);
  assert.match(sourceCode, /query \? 'justify-between' : 'justify-end'/);
  assert.match(sourceCode, /<div className="w-full shrink-0 sm:w-\[360px\] lg:w-\[420px\]">\{query\}<\/div>/);
  assert.match(sourceCode, /<form className="flex w-full items-center gap-2" onSubmit=\{onQuery\}>/);
  assert.doesNotMatch(sourceCode, /<div className="min-w-\[260px\] flex-1">\{query\}<\/div>/);
  assert.doesNotMatch(sourceCode, /<form className="flex min-w-0 flex-1 items-center gap-2"/);
  assert.match(messages, /"admin\.organization\.search\.members": "Search members\.\.\."/);
  assert.match(messages, /"admin\.organization\.search\.positions": "Search positions\.\.\."/);
  assert.match(messages, /"admin\.organization\.search\.permissions": "Search permissions\.\.\."/);
});

test("admin organization authorization is a permission list with auxiliary role workflows in drawers or dialogs", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");
  const authorizationTabSource = sourceSection(
    sourceCode,
    "function AuthorizationTab(",
    "function AuthorizationDrawer(",
  );

  assert.match(sourceCode, /type AuthorizationDrawerState = 'roles' \| 'rolePermissions' \| 'roleBindings';/);
  assert.match(sourceCode, /const \[authorizationDrawer, setAuthorizationDrawer\] = useState<AuthorizationDrawerState \| null>\(null\);/);
  assert.match(sourceCode, /onManageRoles=\{\(\) => setAuthorizationDrawer\('roles'\)\}/);
  assert.match(sourceCode, /onManageRolePermissions=\{\(\) => setAuthorizationDrawer\('rolePermissions'\)\}/);
  assert.match(sourceCode, /onManageRoleBindings=\{\(\) => setAuthorizationDrawer\('roleBindings'\)\}/);
  assert.match(sourceCode, /<AuthorizationDrawer[\s\S]*activeKind=\{authorizationDrawer\}[\s\S]*rolePermissions=\{rolePermissions\}[\s\S]*bindings=\{visibleRoleBindings\}/);
  assert.match(sourceCode, /onClose=\{\(\) => setAuthorizationDrawer\(null\)\}/);
  assert.match(sourceCode, /setAuthorizationDrawer\(null\);[\s\S]*setDialog\(\{ kind: 'role', mode: 'create' \}\);/);
  assert.match(sourceCode, /setAuthorizationDrawer\(null\);[\s\S]*setDialog\(\{ kind: 'roleBinding', mode: 'create' \}\);/);
  assert.match(sourceCode, /setAuthorizationDrawer\(null\);[\s\S]*setDialog\(\{ kind: 'rolePermission', mode: 'create' \}\);/);

  assert.doesNotMatch(authorizationTabSource, /2xl:grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)\]/);
  assert.doesNotMatch(authorizationTabSource, /admin\.organization\.roles\.title/);
  assert.doesNotMatch(authorizationTabSource, /admin\.organization\.roleBindings\.title/);
  assert.doesNotMatch(authorizationTabSource, /admin\.organization\.rolePermissions\.title/);
  assert.doesNotMatch(authorizationTabSource, /title=\{t\('admin\.organization\.permissions\.title', 'Permissions'\)\}/);
  assert.match(authorizationTabSource, /t\('admin\.organization\.columns\.code', 'Code'\)/);
  assert.match(authorizationTabSource, /t\('admin\.organization\.columns\.resource', 'Resource'\)/);
  assert.match(authorizationTabSource, /t\('admin\.organization\.columns\.action', 'Action'\)/);
});

test("admin organization uses one combined organization and department tree", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /xl:grid-cols-\[340px_minmax\(0,1fr\)\]/);
  assert.doesNotMatch(sourceCode, /xl:grid-cols-\[280px_300px_minmax\(0,1fr\)\]/);
  assert.match(sourceCode, /type OrganizationDirectoryTreeNode =/);
  assert.match(sourceCode, /nodeKind: 'organization'/);
  assert.match(sourceCode, /nodeKind: 'department'/);
  assert.match(sourceCode, /const combinedDirectoryTree = useMemo\(/);
  assert.match(sourceCode, /nodes=\{combinedDirectoryTree\}/);
  assert.match(sourceCode, /title=\{t\('admin\.organization\.panels\.directory', 'Organization structure'\)\}/);
  assert.match(sourceCode, /<section aria-label=\{title\}/);
  assert.doesNotMatch(sourceCode, /title=\{t\('admin\.organization\.panels\.organizations', 'Organizations'\)\}/);
  assert.doesNotMatch(sourceCode, /title=\{t\('admin\.organization\.panels\.departments', 'Departments'\)\}/);
  assert.match(sourceCode, /function handleDirectoryNodeSelect\(node: OrganizationDirectoryTreeNode\): void \{/);
  assert.match(sourceCode, /onClick=\{\(\) => handleDirectoryNodeSelect\(node\)\}/);
  assert.match(sourceCode, /function buildOrganizationDepartmentTree\(/);
  assert.doesNotMatch(sourceCode, /meta: node\.code/);
  assert.doesNotMatch(sourceCode, /meta: node\.organizationId/);
  assert.doesNotMatch(sourceCode, /status=\{node\.status\}/);
  assert.doesNotMatch(sourceCode, /<StatusPill status=\{status\} \/>/);
  assert.doesNotMatch(sourceCode, /status: node\.status/);
  assert.doesNotMatch(sourceCode, /\[node\.name, node\.code, node\.meta, node\.status, node\.nodeKind\]/);
  assert.doesNotMatch(sourceCode, /function filterOrganizationDepartmentTree\(nodes: OrganizationDirectoryTreeNode\[], search: string\): OrganizationDirectoryTreeNode\[]/);
});

test("admin organization and department create dialogs auto-generate optional codes", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");
  const serviceSource = source("packages/sdkwork-clawrouter-pc-admin-organization/src/organizationService.ts");
  const organizationFieldsSource = sourceSection(
    sourceCode,
    "if (dialog.kind === 'organization') {",
    "if (dialog.kind === 'department') {",
  );
  const departmentFieldsSource = sourceSection(
    sourceCode,
    "if (dialog.kind === 'department') {",
    "if (dialog.kind === 'membership') {",
  );

  assert.match(serviceSource, /export type OrganizationCommand = \{[\s\S]*code\?: string;/);
  assert.match(serviceSource, /organizations\.create\(\s*toCommand\(input, \['name'\]\),/);
  assert.match(sourceCode, /function generatedEntityCode\(name: string, fallbackCode: string\): string/);
  assert.match(sourceCode, /const renderedOrganizationCode = organizationCodeTouched[\s\S]*generatedEntityCode\(organizationNameForCode, 'organization'\);/);
  assert.match(sourceCode, /const renderedDepartmentCode = departmentCodeTouched[\s\S]*generatedEntityCode\(departmentNameForCode, 'department'\);/);
  assert.doesNotMatch(organizationFieldsSource, /name="code" required/);
  assert.doesNotMatch(departmentFieldsSource, /name="code" required/);
  assert.match(sourceCode, /code: optionalFormText\(form, 'code'\),[\s\S]*name: requiredFormText\(form, 'name'\),/);
});

test("admin organization tree exposes contextual department CRUD actions", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");
  const organizationMessages = source("packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/organization.ts");

  assert.match(sourceCode, /onCreateChild\?: \(\) => void;/);
  assert.match(
    sourceCode,
    /RowIconButton label=\{t\('admin\.organization\.actions\.addChildDepartment', 'Add child department'\)\} onClick=\{onCreateChild\}>[\s\S]*<Plus className="h-3\.5 w-3\.5" \/>/,
    "each organization or department tree row should expose a contextual add-child department action",
  );
  assert.match(
    sourceCode,
    /<SmallButton label=\{t\('admin\.organization\.actions\.createOrganization', 'Create organization'\)\} onClick=\{\(\) => setDialog\(\{ kind: 'organization', mode: 'create' \}\)\} \/>/,
    "directory panel should use explicit create organization copy instead of generic New",
  );
  assert.match(
    sourceCode,
    /<SmallButton label=\{t\('admin\.organization\.actions\.createDepartment', 'Create department'\)\} onClick=\{\(\) => setDialog\(\{ kind: 'department', mode: 'create' \}\)\} disabled=\{!activeOrganizationIdForRelations\} \/>/,
    "directory panel should use explicit create department copy and require active organization context",
  );
  assert.match(
    sourceCode,
    /onCreateChild=\{organization && isActiveRecord\(organization\)[\s\S]*setActiveOrganizationId\(node\.organizationId\);[\s\S]*setActiveDepartmentId\(''\);[\s\S]*setExpandedDirectoryNodeIds\(\(current\) => expandDirectoryNode\(current, node\.id\)\);[\s\S]*setDialog\(\{ kind: 'department', mode: 'create' \}\);[\s\S]*: department && isActiveRecord\(department\)/,
    "creating a department from an organization row should select that organization and clear the parent department",
  );
  assert.match(
    sourceCode,
    /: department && isActiveRecord\(department\) \? \(\) => \{[\s\S]*setActiveOrganizationId\(node\.organizationId\);[\s\S]*setActiveDepartmentId\(node\.departmentId\);[\s\S]*setExpandedDirectoryNodeIds\(\(current\) => expandDirectoryPath\(current, combinedDirectoryTree, node\.id\)\);[\s\S]*setDialog\(\{ kind: 'department', mode: 'create' \}\);[\s\S]*\} : undefined\}/,
    "creating a department from a department row should use that department as the parent",
  );
  assert.match(
    sourceCode,
    /const defaultParentDepartmentId = dialog\.mode === 'create' \? activeDepartmentIdForRelations : target\?\.parentDepartmentId \?\? '';/,
    "department creation should inherit selected department as parent, while edit keeps the stored parent",
  );
  assert.match(
    sourceCode,
    /SelectField key=\{`department-parent-\$\{departmentOrganizationId\}`\} label=\{t\('admin\.organization\.fields\.parentDepartment', 'Parent department'\)\} name="parentDepartmentId" defaultValue=\{defaultParentDepartmentId\}/,
    "department creation should default the parent selector from the active department context",
  );
  assert.match(organizationMessages, /"admin\.organization\.actions\.createDepartment": "Create department"/);
  assert.match(organizationMessages, /"admin\.organization\.actions\.addChildDepartment": "Add child department"/);
  assert.match(organizationMessages, /"admin\.organization\.actions\.createDepartment": "新建部门"/);
  assert.match(organizationMessages, /"admin\.organization\.actions\.addChildDepartment": "新建子部门"/);
}
);

test("admin organization tree node menus expose professional dropdown and context actions", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");
  const organizationMessages = source("packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/organization.ts");

  assert.match(sourceCode, /type DirectoryNodeMenuState = \{/);
  assert.match(
    sourceCode,
    /const \[directoryNodeMenu, setDirectoryNodeMenu\] = useState<DirectoryNodeMenuState \| null>\(null\);/,
  );
  assert.match(sourceCode, /function openDirectoryNodeMenu\(nodeId: string, mode: DirectoryNodeMenuState\['mode'\], x: number, y: number\): void \{/);
  assert.match(sourceCode, /onContextMenu=\{\(event\) => \{[\s\S]*event\.preventDefault\(\);[\s\S]*openDirectoryNodeMenu\(node\.id, 'context', event\.clientX, event\.clientY\);[\s\S]*\}\}/);
  assert.match(sourceCode, /onOpenMenu=\{\(event\) => \{[\s\S]*const rect = event\.currentTarget\.getBoundingClientRect\(\);[\s\S]*openDirectoryNodeMenu\(node\.id, 'dropdown', rect\.right - DIRECTORY_NODE_MENU_WIDTH, rect\.bottom \+ 6\);[\s\S]*\}\}/);
  assert.match(sourceCode, /RowIconButton label=\{t\('admin\.organization\.actions\.more', 'More actions'\)\} onClick=\{onOpenMenu\}>[\s\S]*<MoreHorizontal className="h-3\.5 w-3\.5" \/>/);
  assert.match(sourceCode, /function DirectoryNodeMenu\(/);
  assert.match(sourceCode, /style=\{\{ left: menuState\.x, top: menuState\.y, width: DIRECTORY_NODE_MENU_WIDTH \}\}/);
  const directoryNodeMenuSource = sourceSection(
    sourceCode,
    "function DirectoryNodeMenu(",
    "function ContextBadge(",
  );
  assert.doesNotMatch(directoryNodeMenuSource, /overflow-auto/);
  assert.doesNotMatch(directoryNodeMenuSource, /max-h-/);
  assert.doesNotMatch(directoryNodeMenuSource, /grid-cols-/);
  assert.doesNotMatch(directoryNodeMenuSource, /height:/);
  assert.match(directoryNodeMenuSource, /space-y-1/);
  assert.match(directoryNodeMenuSource, /w-full/);
  assert.match(directoryNodeMenuSource, /justify-start/);

  for (const key of [
    "admin.organization.actions.selectNode",
    "admin.organization.actions.createChildOrganization",
    "admin.organization.actions.createDepartment",
    "admin.organization.actions.addChildDepartment",
    "admin.organization.actions.addMember",
    "admin.organization.actions.assignMember",
    "admin.organization.actions.createPosition",
    "admin.organization.actions.viewMembers",
    "admin.organization.actions.viewPositions",
    "admin.organization.actions.viewPermissions",
  ]) {
    assert.match(sourceCode, new RegExp(escapeRegExp(key)), `missing menu action key: ${key}`);
    assert.match(organizationMessages, new RegExp(escapeRegExp(`"${key}"`)), `missing i18n key: ${key}`);
  }

  assert.match(sourceCode, /setDialog\(\{ kind: 'organization', mode: 'create', parentOrganizationId: node\.organizationId \}\)/);
  assert.match(sourceCode, /setChooseUserModal\(\{ organizationId: node\.organizationId \}\);/);
  assert.doesNotMatch(sourceCode, /setDialog\(\{ kind: 'membership', mode: 'create' \}\)/);
  assert.match(sourceCode, /setDialog\(\{ kind: 'departmentAssignment', mode: 'create' \}\)/);
  assert.match(sourceCode, /setDialog\(\{ kind: 'position', mode: 'create' \}\)/);
  assert.match(sourceCode, /setActiveTab\('members'\)/);
  assert.match(sourceCode, /setActiveTab\('positions'\)/);
  assert.match(sourceCode, /setActiveTab\('authorization'\)/);
  assert.match(sourceCode, /setConfirmTarget\(buildOrganizationConfirmTarget\(organization, directory, t\)\)/);
  assert.match(sourceCode, /setConfirmTarget\(buildDepartmentConfirmTarget\(department, directory, t\)\)/);
  assert.match(
    sourceCode,
    /const defaultParentOrganizationId = dialog\.mode === 'create' \? dialog\.parentOrganizationId \?\? '' : target\?\.parentOrganizationId \?\? '';/,
    "child organization creation from a node should default the parent organization without changing top-level create",
  );
});

test("admin organization expands the clicked organization branch before department operations", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(
    sourceCode,
    /const \[expandedDirectoryNodeIds, setExpandedDirectoryNodeIds\] = useState<Set<string>>\(\(\) => new Set\(\)\);/,
    "organization directory tree should keep explicit expanded branch state",
  );
  assert.match(
    sourceCode,
    /function handleDirectoryNodeSelect\(node: OrganizationDirectoryTreeNode\): void \{[\s\S]*if \(node\.nodeKind === 'organization'\) \{[\s\S]*setActiveOrganizationId\(node\.organizationId\);[\s\S]*setActiveDepartmentId\(''\);[\s\S]*setExpandedDirectoryNodeIds\(\(current\) => expandDirectoryNode\(current, node\.id\)\);[\s\S]*return;[\s\S]*\}[\s\S]*setActiveOrganizationId\(node\.organizationId\);[\s\S]*setActiveDepartmentId\(node\.departmentId\);[\s\S]*setExpandedDirectoryNodeIds\(\(current\) => expandDirectoryPath\(current, combinedDirectoryTree, node\.id\)\);[\s\S]*\}/,
    "clicking an organization should select and expand that branch; clicking a department should preserve its organization context",
  );
  assert.match(
    sourceCode,
    /isNodeExpanded=\{\(node\) => expandedDirectoryNodeIds\.has\(node\.id\)\}/,
    "tree rendering should use explicit branch state",
  );
  assert.match(
    sourceCode,
    /function renderTree<TNode>\(nodes: TNode\[], renderNode: \(node: TNode, depth: number, hasChildren: boolean, expanded: boolean\) => ReactNode, isNodeExpanded: \(node: TNode\) => boolean, depth = 0\): ReactNode\[] \{[\s\S]*const expanded = children\.length > 0 && isNodeExpanded\(node\);[\s\S]*\.\.\.\(expanded \? renderTree\(children as TNode\[], renderNode, isNodeExpanded, depth \+ 1\) : \[\]\),[\s\S]*\}/,
    "collapsed organization branches must not render nested departments until expanded",
  );
  assert.match(
    sourceCode,
    /function expandDirectoryPath\(current: Set<string>, nodes: OrganizationDirectoryTreeNode\[], targetNodeId: string\): Set<string>/,
    "department selection should expand ancestor organization and department nodes",
  );
  assert.match(sourceCode, /hasChildren=\{node\.children\.length > 0\}/);
  assert.match(sourceCode, /expanded=\{expandedDirectoryNodeIds\.has\(node\.id\)\}/);
  assert.match(sourceCode, /onToggle=\{\(\) => setExpandedDirectoryNodeIds\(\(current\) => toggleDirectoryNode\(current, node\.id\)\)\}/);
  assert.match(sourceCode, /aria-expanded=\{hasChildren \? expanded : undefined\}/);
});

test("admin organization add member uses a dedicated user chooser instead of raw user id input", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");
  const service = source("packages/sdkwork-clawrouter-pc-admin-organization/src/organizationService.ts");
  const chooseUserModalSource = sourceSection(sourceCode, "function ChooseUserModal(", "function EntityDialog(");

  assert.match(service, /export interface UserRecord/);
  assert.match(service, /users: UserRecord\[];/);
  assert.match(service, /const usersResult = await backendClient\.iam\.users\.list\(listParams\);/);
  assert.match(service, /users: readRequiredApiItems\(usersResult, 'admin\.organization\.errors\.loadUsers'\)[\s\S]*\.map\(normalizeUser\)/);
  assert.match(service, /function normalizeUser\(value: unknown\): UserRecord/);
  assert.match(sourceCode, /users: \[],/);
  assert.match(sourceCode, /usersById: Map<string, UserRecord>;/);
  assert.match(sourceCode, /function formatUserLabel\(userId: string \| null \| undefined, lookups: DirectoryLookups\): string/);
  assert.match(sourceCode, /type ChooseUserModalState = \{ organizationId: string; selectionMode\?: ChooseUserSelectionMode \} \| null;/);
  assert.match(sourceCode, /type ChooseUserSelectionMode = 'single' \| 'multiple';/);
  assert.match(sourceCode, /const \[chooseUserModal, setChooseUserModal\] = useState<ChooseUserModalState>\(null\);/);
  assert.match(sourceCode, /function ChooseUserModal\(/);
  assert.match(chooseUserModalSource, /w-full max-w-\[min\(1280px,calc\(100vw-32px\)\)\]/);
  assert.match(chooseUserModalSource, /className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"/);
  assert.match(chooseUserModalSource, /<table className="w-full min-w-0 table-fixed text-left text-sm">/);
  assert.doesNotMatch(chooseUserModalSource, /min-w-\[1080px\]/);
  assert.doesNotMatch(chooseUserModalSource, /className="min-h-0 flex-1 overflow-auto"/);
  assert.match(chooseUserModalSource, /const \[queryInput, setQueryInput\] = useState\(''\);/);
  assert.match(chooseUserModalSource, /const \[query, setQuery\] = useState\(''\);/);
  assert.match(chooseUserModalSource, /function handleUserQuerySubmit\(event\?: FormEvent<HTMLFormElement>\): void \{/);
  assert.match(chooseUserModalSource, /setQuery\(queryInput\);/);
  assert.match(chooseUserModalSource, /<form className="flex w-full items-center gap-2 sm:w-\[420px\]" onSubmit=\{handleUserQuerySubmit\}>/);
  assert.match(chooseUserModalSource, /onChange=\{\(event\) => setQueryInput\(event\.target\.value\)\}/);
  assert.match(chooseUserModalSource, /value=\{queryInput\}/);
  assert.match(chooseUserModalSource, /<button[\s\S]*type="submit"[\s\S]*\{t\('common\.actions\.query', 'Query'\)\}[\s\S]*<\/button>/);
  assert.match(sourceCode, /selectionMode = 'multiple'/);
  assert.match(sourceCode, /onChooseUsers: \(users: UserRecord\[]\) => void \| Promise<void>;/);
  assert.match(sourceCode, /const \[selectedUserIds, setSelectedUserIds\] = useState<Set<string>>\(\(\) => new Set\(\)\);/);
  assert.doesNotMatch(sourceCode, /const isMultipleSelection = selectionMode === 'multiple';/);
  assert.match(sourceCode, /function toggleSelectedUser\(userId: string\): void/);
  assert.match(sourceCode, /if \(selectionMode === 'single'\) \{[\s\S]*return current\.has\(userId\) \? new Set<string>\(\) : new Set<string>\(\[userId\]\);[\s\S]*\}/);
  assert.match(sourceCode, /async function handleChooseSelectedUsers\(\): Promise<void>/);
  assert.match(sourceCode, /await onChooseUsers\(selectedUsers\);/);
  assert.match(sourceCode, /type="checkbox"[\s\S]*checked=\{selectedUserIds\.has\(user\.id\)\}/);
  assert.match(chooseUserModalSource, /<th className="w-24 px-4 py-3 whitespace-nowrap">\{t\('admin\.organization\.chooseUser\.selection', 'Selection'\)\}<\/th>[\s\S]*<th className="px-4 py-3">\{t\('admin\.organization\.columns\.member', 'Member'\)\}<\/th>/);
  assert.match(chooseUserModalSource, /<tr key=\{user\.id\} className=\{`cursor-pointer/);
  assert.match(chooseUserModalSource, /onClick=\{\(\) => toggleSelectedUser\(user\.id\)\}/);
  assert.match(chooseUserModalSource, /onClick=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.match(chooseUserModalSource, /selectedUserIds\.has\(user\.id\) \? 'bg-blue-50\/80 dark:bg-blue-500\/10' : 'hover:bg-slate-50 dark:hover:bg-white\/5'/);
  assert.doesNotMatch(chooseUserModalSource, /admin\.organization\.columns\.actions/);
  assert.doesNotMatch(chooseUserModalSource, /admin\.organization\.actions\.selectUser/);
  assert.doesNotMatch(chooseUserModalSource, /<td className="px-4 py-3 text-right">/);
  assert.match(sourceCode, /HeaderButton label=\{t\('admin\.organization\.chooseUser\.confirmSelection', 'Add selected'\)\} onClick=\{handleChooseSelectedUsers\} disabled=\{isBusy \|\| selectedUserIds\.size === 0\} variant="primary"/);
  assert.match(sourceCode, /t\('admin\.organization\.chooseUser\.selectedCount', '\{\{count\}\} selected', \{ count: selectedUserIds\.size \}\)/);
  assert.match(sourceCode, /colSpan=\{7\}/);
  assert.match(sourceCode, /function availableUsersForMembership\(/);
  assert.match(sourceCode, /function userSearchLabels\(user: UserRecord\): string\[]/);
  assert.match(sourceCode, /<ChooseUserModal[\s\S]*departmentAssignments=\{directory\.departmentAssignments\}[\s\S]*existingMembers=\{directory\.memberships\}[\s\S]*onChooseUsers=\{handleChooseUsers\}[\s\S]*organizationId=\{chooseUserModal\.organizationId\}[\s\S]*targetDepartmentId=\{chooseUserModal\.departmentId\}[\s\S]*selectionMode=\{chooseUserModal\.selectionMode \?\? 'multiple'\}[\s\S]*users=\{directory\.users\}/);
  assert.match(sourceCode, /type ChooseUserModalState = \{ organizationId: string; departmentId\?: string; selectionMode\?: ChooseUserSelectionMode \} \| null;/);
  assert.match(sourceCode, /async function handleChooseUsers\(users: UserRecord\[]\): Promise<void>/);
  assert.match(sourceCode, /const targetDepartmentId = chooseUserModal\.departmentId;/);
  assert.match(sourceCode, /const membership = await ensureOrganizationMemberForUser\(user, chooseUserModal\.organizationId, directory\.memberships\);/);
  assert.match(sourceCode, /if \(targetDepartmentId\) \{[\s\S]*await ensureDepartmentAssignmentForMember\(targetDepartmentId, membership, directory\.departmentAssignments\);[\s\S]*\}/);
  assert.match(sourceCode, /async function ensureOrganizationMemberForUser\([\s\S]*existingMemberships: OrganizationMemberRecord\[],[\s\S]*\): Promise<OrganizationMemberRecord>/);
  assert.match(sourceCode, /const activeMembership = findOrganizationMembershipForUser\(existingMemberships, organizationId, user\.id, \{ activeOnly: true \}\);/);
  assert.match(sourceCode, /const inactiveMemberMembership = findOrganizationMembershipForUser\(existingMemberships, organizationId, user\.id, \{ memberKind: 'member' \}\);/);
  assert.match(sourceCode, /return OrganizationService\.updateMembership\(inactiveMemberMembership\.id, \{[\s\S]*status: 'active',[\s\S]*\}\);/);
  assert.match(sourceCode, /async function ensureDepartmentAssignmentForMember\([\s\S]*existingAssignments: DepartmentAssignmentRecord\[],[\s\S]*\): Promise<void>/);
  assert.match(sourceCode, /const existingAssignment = findDepartmentAssignmentForMember\(existingAssignments, departmentId, membership, 'member'\);/);
  assert.match(sourceCode, /if \(existingAssignment && isActiveRecord\(existingAssignment\)\) \{[\s\S]*return;[\s\S]*\}/);
  assert.match(sourceCode, /await OrganizationService\.updateDepartmentAssignment\(existingAssignment\.id, \{ status: 'active' \}\);/);
  assert.match(sourceCode, /await OrganizationService\.createDepartmentAssignment\(\{[\s\S]*departmentId,[\s\S]*membershipId: membership\.id,[\s\S]*role: 'member',[\s\S]*status: 'active',[\s\S]*\}\);/);
  assert.match(sourceCode, /function StatusPill\(\{ status, t \}: \{ status: string; t: TranslationFunction \}\)/);
  assert.match(sourceCode, /function formatStatusLabel\(status: string, t: TranslationFunction\): string/);
  assert.match(sourceCode, /return t\(`admin\.organization\.status\.\$\{normalizedStatus\}`, fallbackStatusLabel\(normalizedStatus\)\);/);
  assert.match(chooseUserModalSource, /<StatusPill status=\{user\.status\} t=\{t\} \/>/);
  assert.match(
    sourceCode,
    /return OrganizationService\.createMembership\(\{[\s\S]*organizationId,[\s\S]*userId: user\.id,[\s\S]*displayName: user\.displayName,[\s\S]*username: user\.username,[\s\S]*email: user\.email,[\s\S]*mobile: user\.mobile,[\s\S]*memberKind: 'member',[\s\S]*status: 'active',[\s\S]*\}\);/,
  );
  assert.match(sourceCode, /onAddMember=\{\(\) => setChooseUserModal\(\{ organizationId: activeOrganizationIdForRelations \}\)\}/);
  assert.match(sourceCode, /setChooseUserModal\(\{ organizationId: node\.organizationId, departmentId: node\.nodeKind === 'department' \? node\.departmentId : undefined \}\);/);
  assert.match(
    sourceCode,
    /if \(dialog\.kind === 'membership'\) \{[\s\S]*if \(dialog\.mode !== 'edit' \|\| !target\) \{[\s\S]*return null;[\s\S]*\}[\s\S]*SelectField[\s\S]*name="status"[\s\S]*\}/,
    "membership edit can keep lifecycle fields but member creation should happen through ChooseUserModal",
  );
  assert.match(sourceCode, /function readMembershipUpdateCommand\(form: FormData, fallbackOrganizationId: string\): Partial<MembershipCommand>/);
  assert.match(sourceCode, /const input = readMembershipUpdateCommand\(form, activeOrganizationId\);/);
  assert.doesNotMatch(sourceCode, /setDialog\(\{ kind: 'membership', mode: 'create' \}\)/);
  assert.doesNotMatch(sourceCode, /OrganizationService\.createMembership\(input\)/);
  assert.doesNotMatch(sourceCode, /function readMembershipCommand\(form: FormData, fallbackOrganizationId: string\): MembershipCommand/);
  assert.doesNotMatch(sourceCode, /userId: requiredFormText\(form, 'userId'\)/);
  assert.doesNotMatch(sourceCode, /function availableDirectoryUserOptions\(/);
  assert.doesNotMatch(sourceCode, /membership-user-/);
  assert.doesNotMatch(
    sourceCode,
    /TextField label=\{t\('admin\.organization\.fields\.userId'/,
    "member creation should select from appbase users instead of typing raw user IDs",
  );
});

test("admin organization user records keep professional optional profile fields from appbase", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");
  const service = source("packages/sdkwork-clawrouter-pc-admin-organization/src/organizationService.ts");
  const messages = source("packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/organization.ts");

  for (const field of ["gender", "country", "province", "city", "district", "address"]) {
    assert.match(service, new RegExp(`${field}: string;`), `missing UserRecord field ${field}`);
  }

  assert.match(service, /gender: readFirstString\(item, \['gender', 'sex'\]\)/);
  assert.match(service, /country: readFirstString\(item, \['country', 'countryCode', 'countryName', 'nation'\]\)/);
  assert.match(service, /province: readFirstString\(item, \['province', 'state', 'region'\]\)/);
  assert.match(service, /city: readFirstString\(item, \['city', 'locality'\]\)/);
  assert.match(service, /district: readFirstString\(item, \['district', 'county', 'area'\]\)/);
  assert.match(service, /address: readFirstString\(item, \['address', 'streetAddress', 'addressLine'\]\)/);

  assert.match(sourceCode, /function formatUserRegion\(user: UserRecord \| null \| undefined\): string/);
  assert.match(sourceCode, /function formatUserGender\(user: UserRecord \| null \| undefined, t: TranslationFunction\): string/);
  assert.match(sourceCode, /function userForMember\(member: OrganizationMemberRecord, lookups: DirectoryLookups\): UserRecord \| null/);
  assert.match(sourceCode, /memberUserRegion\(member, lookups\)/);
  assert.match(sourceCode, /memberUserAddress\(member, lookups\)/);
  assert.match(sourceCode, /memberUserGender\(member, lookups, t\)/);
  assert.match(sourceCode, /t\('admin\.organization\.columns\.region', 'Region'\)/);
  assert.match(sourceCode, /t\('admin\.organization\.columns\.gender', 'Gender'\)/);
  assert.match(sourceCode, /t\('admin\.organization\.columns\.address', 'Address'\)/);
  assert.match(sourceCode, /t\('admin\.organization\.gender\.male', 'Male'\)/);
  assert.match(sourceCode, /t\('admin\.organization\.gender\.female', 'Female'\)/);
  assert.match(messages, /"admin\.organization\.columns\.region": "Region"/);
  assert.match(messages, /"admin\.organization\.columns\.gender": "Gender"/);
  assert.match(messages, /"admin\.organization\.columns\.address": "Address"/);
  assert.match(messages, /"admin\.organization\.chooseUser\.title": "Choose user"/);
  assert.match(messages, /"admin\.organization\.chooseUser\.selectedCount": "\{\{count\}\} selected"/);
});

test("admin organization UI deactivates members and assignment lifecycle records", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");
  const service = source("packages/sdkwork-clawrouter-pc-admin-organization/src/organizationService.ts");

  assert.match(sourceCode, /\| \(\{ kind: 'membership' \} & ConfirmTargetBase\)/);
  assert.match(sourceCode, /\| \(\{ kind: 'departmentAssignment' \} & ConfirmTargetBase\)/);
  assert.match(sourceCode, /\| \(\{ kind: 'positionAssignment' \} & ConfirmTargetBase\)/);
  assert.match(sourceCode, /onDeactivateMember=\{\(target\) => setConfirmTarget\(\{ kind: 'membership', id: target\.id, label: formatMemberLabel\(target\.id, target\.userId, lookups\) \}\)\}/);
  assert.doesNotMatch(sourceCode, /onDeactivateAssignment=\{/, "assignment lifecycle actions should not be mounted in persistent side cards");
  assert.match(sourceCode, /onDeactivateDepartmentAssignment=\{\(target\) => setConfirmTarget\(\{ kind: 'departmentAssignment', id: target\.id, label: formatMemberLabel\(target\.membershipId, target\.userId, lookups\) \}\)\}/);
  assert.match(sourceCode, /onDeactivatePositionAssignment=\{\(target\) => setConfirmTarget\(\{ kind: 'positionAssignment', id: target\.id, label: formatPositionLabel\(target\.positionId, lookups\) \}\)\}/);
  assert.match(sourceCode, /OrganizationService\.deactivateMembership\(target\.id\)/);
  assert.match(sourceCode, /OrganizationService\.deactivateDepartmentAssignment\(target\.id\)/);
  assert.match(sourceCode, /OrganizationService\.deactivatePositionAssignment\(target\.id\)/);
  assert.match(sourceCode, /admin\.organization\.actions\.deactivate/);
  assert.match(service, /static async deactivateMembership\(membershipId: string\)/);
  assert.match(service, /static async deactivateDepartmentAssignment\(assignmentId: string\)/);
  assert.match(service, /static async deactivatePositionAssignment\(assignmentId: string\)/);
  assert.match(service, /OrganizationService\.updateMembership\(membershipId, \{ status: 'inactive' \}\)/);
  assert.match(service, /OrganizationService\.updateDepartmentAssignment\(assignmentId, \{ status: 'inactive' \}\)/);
  assert.match(service, /OrganizationService\.updatePositionAssignment\(assignmentId, \{ status: 'inactive' \}\)/);
  assert.doesNotMatch(service, /organizationMemberships\.delete/);
  assert.doesNotMatch(service, /departmentAssignments\.delete/);
  assert.doesNotMatch(service, /positionAssignments\.delete/);
});

test("admin organization position assignment form submits full lifecycle dates", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /<TextField label=\{t\('admin\.organization\.fields\.startedAt', 'Started at'\)\} name="startedAt"/);
  assert.match(sourceCode, /<TextField label=\{t\('admin\.organization\.fields\.endedAt', 'Ended at'\)\} name="endedAt"/);
  assert.match(
    sourceCode,
    /function readPositionAssignmentCommand\(form: FormData\): PositionAssignmentCommand \{[\s\S]*startedAt: optionalFormText\(form, 'startedAt'\),[\s\S]*endedAt: optionalFormText\(form, 'endedAt'\),[\s\S]*\}/,
  );
});

test("admin organization UI resolves relationship names and scopes context choices", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /const lookups = useMemo\(\(\) => buildDirectoryLookups\(directory\), \[directory\]\);/);
  assert.match(sourceCode, /const departmentsForActiveOrganization = useMemo\(/);
  assert.match(sourceCode, /const membersForActiveOrganization = useMemo\(/);
  assert.match(sourceCode, /const positionsForActiveContext = useMemo\(/);
  assert.match(sourceCode, /function buildDirectoryLookups\(/);
  assert.match(sourceCode, /function formatMemberLabel\(/);
  assert.match(sourceCode, /function formatDepartmentLabel\(/);
  assert.match(sourceCode, /function formatPositionLabel\(/);
  assert.match(sourceCode, /function formatRoleLabel\(/);
  assert.match(sourceCode, /lookups=\{lookups\}/);
  assert.match(sourceCode, /membersForActiveOrganization\.filter\(\(item\) =>/);
  assert.match(sourceCode, /activeMembersForActiveOrganization=\{activeMembersForActiveOrganization\}/);
  assert.match(sourceCode, /const membershipIdsForDepartment = useMemo\(/);
  assert.match(sourceCode, /const userIdsForDepartment = useMemo\(/);
  assert.match(sourceCode, /const positionsForActiveContext = useMemo\(/);
  assert.match(sourceCode, /activePositionsForActiveContext=\{activePositionsForActiveContext\}/);
  assert.match(sourceCode, /formatRoleLabel\(binding\.roleId, lookups\)/);
  assert.doesNotMatch(sourceCode, />\{assignment\.userId \|\| assignment\.membershipId\}</);
  assert.doesNotMatch(sourceCode, />\{assignment\.departmentId\}</);
  assert.doesNotMatch(sourceCode, />\{position\.departmentId \|\| '-'\}</);
  assert.doesNotMatch(sourceCode, />\{assignment\.positionId\}</);
  assert.doesNotMatch(sourceCode, />\{binding\.roleId\}</);
});

test("admin organization UI renders visible relationship labels instead of only raw ids", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /const visibleMemberships = filterBySearchWithLabels\(/);
  assert.match(sourceCode, /membersForActiveOrganization\.filter\(\(item\) =>/);
  assert.match(sourceCode, /const visibleDepartmentAssignments = filterBySearchWithLabels\(/);
  assert.match(sourceCode, /activeDepartmentAssignmentsForContext,/);
  assert.match(sourceCode, /const visiblePositionAssignments = filterBySearchWithLabels\(/);
  assert.match(sourceCode, /directory\.positionAssignments\.filter\(isActiveRecord\)/);
  assert.match(sourceCode, /const visibleRoleBindings = filterBySearchWithLabels\(/);
  assert.match(sourceCode, /directory\.roleBindings\.filter\(\(item\) => roleBindingBelongsToContext/);
  assert.doesNotMatch(sourceCode, /assignments=\{visibleDepartmentAssignments\}/);
  assert.doesNotMatch(sourceCode, /assignments=\{visiblePositionAssignments\}/);
  assert.match(sourceCode, /function filterBySearchWithLabels<T>\(/);
  assert.match(sourceCode, /memberDisplayName\(member, lookups\)/);
  assert.match(sourceCode, /formatMemberLabel\(assignment\.membershipId, assignment\.userId, lookups\)/);
  assert.match(sourceCode, /formatPositionLabel\(assignment\.positionId, lookups\)/);
  assert.match(sourceCode, /formatPrincipalLabel\(binding\.principalKind, binding\.principalId, lookups\)/);
  assert.match(sourceCode, /formatRoleBindingScopeLabel\(binding, lookups\)/);
  assert.doesNotMatch(sourceCode, /bindings=\{visibleRoleBindings\}[\s\S]*label: target\.principalId/);
});

test("admin organization owner and manager fields are selected from members", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /function userOptions\(/);
  assert.match(sourceCode, /function membersForOrganization\(/);
  assert.match(sourceCode, /const ownerMembers = membersForOrganization\(/);
  assert.match(sourceCode, /const membersForDepartmentOrganization = membersForOrganization\(/);
  assert.match(
    sourceCode,
    /SelectField label=\{t\('admin\.organization\.fields\.ownerUserId', 'Owner'\)\} name="ownerUserId"[\s\S]*userOptions\(ownerMembers, lookups, target\?\.ownerUserId\)/,
  );
  assert.doesNotMatch(
    sourceCode,
    /SelectField label=\{t\('admin\.organization\.fields\.managerUserId', 'Manager'\)\} name="managerUserId"[\s\S]*userOptions\(managerMembers, lookups, target\?\.managerUserId\)/,
    "department manager options should follow the currently selected organization",
  );
  assert.match(
    sourceCode,
    /SelectField key=\{`department-manager-\$\{departmentOrganizationId\}`\} label=\{t\('admin\.organization\.fields\.managerUserId', 'Manager'\)\} name="managerUserId"[\s\S]*userOptions\(membersForDepartmentOrganization, lookups, target\?\.managerUserId\)/,
  );
  assert.doesNotMatch(
    sourceCode,
    /TextField label=\{t\('admin\.organization\.fields\.ownerUserId'/,
    "organization owner should be selected from known members",
  );
  assert.doesNotMatch(
    sourceCode,
    /TextField label=\{t\('admin\.organization\.fields\.managerUserId'/,
    "department manager should be selected from known members",
  );
});

test("admin organization forms recompute organization-scoped options when organization changes", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.doesNotMatch(sourceCode, /const \[membershipOrganizationId, setMembershipOrganizationId\] = useState\(/);
  assert.match(sourceCode, /const \[departmentOrganizationId, setDepartmentOrganizationId\] = useState\(/);
  assert.match(sourceCode, /const \[positionOrganizationId, setPositionOrganizationId\] = useState\(/);
  assert.doesNotMatch(sourceCode, /const membersForMembershipOrganization = membersForOrganization\(activeMemberships, membershipOrganizationId\);/);
  assert.match(sourceCode, /const membersForDepartmentOrganization = membersForOrganization\(activeMemberships, departmentOrganizationId\);/);
  assert.match(sourceCode, /const departmentsForDepartmentOrganization = departmentsForOrganization\(activeDepartments, departmentOrganizationId\);/);
  assert.match(sourceCode, /const departmentsForPositionOrganization = departmentsForOrganization\(activeDepartments, positionOrganizationId\);/);
  assert.match(sourceCode, /function departmentsForOrganization\(departments: DepartmentRecord\[], organizationId: string \| null \| undefined\): DepartmentRecord\[]/);
  assert.doesNotMatch(sourceCode, /onChange=\{setMembershipOrganizationId\}/);
  assert.doesNotMatch(sourceCode, /availableDirectoryUserOptions\(directory\.users, membersForMembershipOrganization, lookups, membershipOrganizationId, target\?\.userId\)/);
  assert.match(
    sourceCode,
    /SelectField label=\{t\('admin\.organization\.fields\.organization', 'Organization'\)\} name="organizationId" required defaultValue=\{target\?\.organizationId \|\| activeOrganizationIdForRelations\} options=\{organizationOptions\(activeOrganizations, lookups, target\?\.organizationId \|\| activeOrganizationIdForRelations\)\} onChange=\{setDepartmentOrganizationId\}/,
  );
  assert.match(
    sourceCode,
    /userOptions\(membersForDepartmentOrganization, lookups, target\?\.managerUserId\)/,
  );
  assert.match(
    sourceCode,
    /departmentParentOptions\(departmentsForDepartmentOrganization, target\?\.id, lookups, t\)/,
  );
  assert.doesNotMatch(
    sourceCode,
    /departmentParentOptions\(departmentsForActiveOrganization, target\?\.id, lookups, t\)/,
    "department parent options should follow the organization selected in the department form",
  );
  assert.match(
    sourceCode,
    /SelectField label=\{t\('admin\.organization\.fields\.organization', 'Organization'\)\} name="organizationId" required defaultValue=\{target\?\.organizationId \|\| activeOrganizationIdForRelations\} options=\{organizationOptions\(activeOrganizations, lookups, target\?\.organizationId \|\| activeOrganizationIdForRelations\)\} onChange=\{setPositionOrganizationId\}/,
  );
  assert.match(
    sourceCode,
    /departmentOptions\(departmentsForPositionOrganization, lookups, target\?\.departmentId\)/,
  );
  assert.doesNotMatch(sourceCode, /key=\{`membership-user-\$\{membershipOrganizationId\}`\}/);
  assert.match(
    sourceCode,
    /key=\{`department-manager-\$\{departmentOrganizationId\}`\}/,
  );
  assert.match(
    sourceCode,
    /key=\{`department-parent-\$\{departmentOrganizationId\}`\}/,
  );
  assert.match(
    sourceCode,
    /key=\{`position-department-\$\{positionOrganizationId\}`\}/,
  );
  assert.match(
    sourceCode,
    /key=\{`department-assignment-member-\$\{departmentAssignmentDepartmentId\}`\}/,
  );
  assert.match(
    sourceCode,
    /key=\{`position-assignment-member-\$\{positionAssignmentPositionId\}`\}/,
  );
});

test("admin organization assignment pickers stay inside active organization context", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /const activeMembersForActiveOrganization = useMemo\(/);
  assert.match(sourceCode, /const activeDepartmentAssignmentsForContext = useMemo\(/);
  assert.match(sourceCode, /const activeDepartmentsForActiveOrganization = useMemo\(/);
  assert.match(sourceCode, /const organizationsForActiveContext = useMemo\(/);
  assert.match(sourceCode, /function isActiveRecord\(record: \{ status\?: string \}\): boolean/);
  assert.match(sourceCode, /membersForActiveOrganization\.filter\(isActiveRecord\)/);
  assert.match(sourceCode, /departmentsForActiveOrganization\.filter\(isActiveRecord\)/);
  assert.match(sourceCode, /directory\.organizations\.filter\(isActiveRecord\)/);
  assert.match(sourceCode, /departmentAssignments\.filter\(isActiveRecord\)/);
  assert.match(sourceCode, /activeDepartmentsForActiveOrganization=\{activeDepartmentsForActiveOrganization\}/);
  assert.match(sourceCode, /organizationsForActiveContext=\{organizationsForActiveContext\}/);
  assert.match(sourceCode, /const activeMemberships = directory\.memberships\.filter\(isActiveRecord\);/);
  assert.match(sourceCode, /const activeDepartments = directory\.departments\.filter\(isActiveRecord\);/);
  assert.match(sourceCode, /const membersForSelectedPosition = membersForPositionAssignment\(activeMemberships, directory\.departmentAssignments, directory\.positions, positionAssignmentPositionId, activeOrganizationIdForRelations\);/);
  assert.match(
    sourceCode,
    /function membersForPositionAssignment\([\s\S]*members: OrganizationMemberRecord\[],[\s\S]*departmentAssignments: DepartmentAssignmentRecord\[],[\s\S]*positions: PositionRecord\[],[\s\S]*positionId: string \| null \| undefined,[\s\S]*fallbackOrganizationId: string \| null \| undefined,[\s\S]*\): OrganizationMemberRecord\[]/,
  );
  assert.match(sourceCode, /const position = positionId \? positions\.find\(\(item\) => item\.id === positionId\) : undefined;/);
  assert.match(sourceCode, /item\.departmentId === position\.departmentId && isActiveRecord\(item\)/);
  assert.match(
    sourceCode,
    /SelectField key=\{`position-assignment-member-\$\{positionAssignmentPositionId\}`\} label=\{t\('admin\.organization\.fields\.member', 'Member'\)\} name="membershipId" required defaultValue=\{target\?\.membershipId \?\? ''\} options=\{availablePositionAssignmentMemberOptions\(membersForSelectedPosition, directory\.positionAssignments, positionAssignmentPositionId, lookups, target\?\.membershipId, target\?\.userId\)\}/,
  );
  assert.match(
    sourceCode,
    /SelectField label=\{t\('admin\.organization\.fields\.department', 'Department'\)\} name="departmentId" required defaultValue=\{departmentAssignmentDepartmentId\} options=\{departmentOptions\(activeDepartmentsForActiveOrganization, lookups, target\?\.departmentId\)\}/,
  );
});

test("admin organization member creation excludes users that are already active members", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /function availableUsersForMembership\(/);
  assert.match(sourceCode, /existingMembers: OrganizationMemberRecord\[]/);
  assert.match(sourceCode, /departmentAssignments: DepartmentAssignmentRecord\[] = \[],/);
  assert.match(sourceCode, /targetDepartmentId\?: string \| null,/);
  assert.match(sourceCode, /const blockedUserIds = targetDepartmentId/);
  assert.match(sourceCode, /activeDepartmentAssignmentUserIds\(departmentAssignments, targetDepartmentId\)/);
  assert.match(sourceCode, /item\.organizationId === organizationId && isActiveRecord\(item\) && item\.userId/);
  assert.match(
    sourceCode,
    /const availableUsers = availableUsersForMembership\(users, existingMembers, organizationId, departmentAssignments, targetDepartmentId\);/,
  );
  assert.match(sourceCode, /function activeDepartmentAssignmentUserIds\(/);
  assert.match(sourceCode, /item\.departmentId === departmentId && isActiveRecord\(item\) && item\.userId/);
  assert.match(sourceCode, /users\.filter\(\(item\) => !blockedUserIds\.has\(item\.id\)\)/);
  assert.doesNotMatch(
    sourceCode,
    /directoryUserOptions\(directory\.users, lookups, target\?\.userId\)/,
    "member creation must not offer users already active in the selected organization",
  );
});

test("admin organization assignment creation excludes duplicate active assignments", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /function availableDepartmentAssignmentMemberOptions\(/);
  assert.match(sourceCode, /function availablePositionAssignmentMemberOptions\(/);
  assert.match(sourceCode, /existingAssignments: DepartmentAssignmentRecord\[]/);
  assert.match(sourceCode, /existingAssignments: PositionAssignmentRecord\[]/);
  assert.match(sourceCode, /item\.departmentId === departmentId && isActiveRecord\(item\) && item\.membershipId/);
  assert.match(sourceCode, /item\.positionId === positionId && isActiveRecord\(item\) && item\.membershipId/);
  assert.match(sourceCode, /item\.departmentId === departmentId && isActiveRecord\(item\) && item\.userId/);
  assert.match(sourceCode, /item\.positionId === positionId && isActiveRecord\(item\) && item\.userId/);
  assert.match(
    sourceCode,
    /members\.filter\(\(item\) => item\.id === keepMembershipId \|\| item\.userId === keepUserId \|\| \(!blockedMembershipIds\.has\(item\.id\) && !blockedUserIds\.has\(item\.userId\)\)\)/,
    "department assignment duplicate prevention should also block records that only carry userId",
  );
  assert.match(
    sourceCode,
    /members\.filter\(\(item\) => item\.id === keepMembershipId \|\| item\.userId === keepUserId \|\| \(!blockedMembershipIds\.has\(item\.id\) && !blockedUserIds\.has\(item\.userId\)\)\)/,
    "position assignment duplicate prevention should also block records that only carry userId",
  );
  assert.match(
    sourceCode,
    /const \[departmentAssignmentDepartmentId, setDepartmentAssignmentDepartmentId\] = useState\(/,
  );
  assert.match(
    sourceCode,
    /options=\{availableDepartmentAssignmentMemberOptions\(activeMembersForActiveOrganization, directory\.departmentAssignments, departmentAssignmentDepartmentId, lookups, target\?\.membershipId, target\?\.userId\)\}/,
  );
  assert.match(
    sourceCode,
    /onChange=\{setDepartmentAssignmentDepartmentId\}/,
  );
  assert.match(
    sourceCode,
    /const \[positionAssignmentPositionId, setPositionAssignmentPositionId\] = useState\(/,
  );
  assert.match(
    sourceCode,
    /options=\{availablePositionAssignmentMemberOptions\(membersForSelectedPosition, directory\.positionAssignments, positionAssignmentPositionId, lookups, target\?\.membershipId, target\?\.userId\)\}/,
  );
  assert.doesNotMatch(
    sourceCode,
    /availablePositionAssignmentMemberOptions\(membersForActiveDepartment, directory\.positionAssignments, positionAssignmentPositionId/,
    "position assignment member options should follow the selected position, not the page-selected department",
  );
  assert.match(
    sourceCode,
    /onChange=\{setPositionAssignmentPositionId\}/,
  );
  assert.doesNotMatch(
    sourceCode,
    /SelectField label=\{t\('admin\.organization\.fields\.member', 'Member'\)\} name="membershipId" required defaultValue=\{target\?\.membershipId \?\? ''\} options=\{memberOptions\(activeMembersForActiveOrganization, lookups, target\?\.membershipId, target\?\.userId\)\}/,
    "department assignment must not offer members already actively assigned to the selected department",
  );
});

test("admin organization assignment forms align default selections with member filtering state", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(
    sourceCode,
    /const initialDepartmentAssignmentDepartmentId = dialog\.kind === 'departmentAssignment'\s+\? dialog\.target\?\.departmentId \|\| activeDepartmentIdForRelations\s+: activeDepartmentIdForRelations;/,
    "department assignment should initialize filtering from the actual default department",
  );
  assert.match(
    sourceCode,
    /const \[departmentAssignmentDepartmentId, setDepartmentAssignmentDepartmentId\] = useState\(initialDepartmentAssignmentDepartmentId\);/,
  );
  assert.match(
    sourceCode,
    /SelectField label=\{t\('admin\.organization\.fields\.department', 'Department'\)\} name="departmentId" required defaultValue=\{departmentAssignmentDepartmentId\} options=\{departmentOptions\(activeDepartmentsForActiveOrganization, lookups, target\?\.departmentId\)\}/,
  );
  assert.match(
    sourceCode,
    /const initialPositionAssignmentPositionId = dialog\.kind === 'positionAssignment'\s+\? dialog\.target\?\.positionId \?\? activePositionsForActiveContext\[0\]\?\.id \?\? ''\s+: activePositionsForActiveContext\[0\]\?\.id \?\? '';/,
    "position assignment should initialize filtering from the actual default position",
  );
  assert.match(
    sourceCode,
    /const \[positionAssignmentPositionId, setPositionAssignmentPositionId\] = useState\(initialPositionAssignmentPositionId\);/,
  );
  assert.match(
    sourceCode,
    /SelectField label=\{t\('admin\.organization\.fields\.position', 'Position'\)\} name="positionId" required defaultValue=\{positionAssignmentPositionId\} options=\{positionOptions\(activePositionsForActiveContext, lookups, target\?\.positionId\)\}/,
  );
  assert.doesNotMatch(
    sourceCode,
    /defaultValue=\{target\?\.departmentId \|\| activeDepartmentId\} options=\{departmentOptions\(activeDepartmentsForActiveOrganization, lookups, target\?\.departmentId\)\}/,
    "department assignment defaultValue must not drift from the state used to filter member options",
  );
  assert.doesNotMatch(
    sourceCode,
    /defaultValue=\{target\?\.positionId \?\? ''\} options=\{positionOptions\(activePositionsForActiveContext, lookups, target\?\.positionId\)\}/,
    "position assignment defaultValue must not drift from the state used to filter member options",
  );
});

test("admin organization relation forms default to active departments only", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(
    sourceCode,
    /const activeDepartmentIdForRelations = activeDepartmentsForActiveOrganization\.some\(\(item\) => item\.id === activeDepartmentId\)\s+\? activeDepartmentId\s+: activeDepartmentsForActiveOrganization\[0\]\?\.id \|\| '';/,
    "new relationship forms should not inherit an inactive selected department",
  );
  assert.match(sourceCode, /activeDepartmentIdForRelations=\{activeDepartmentIdForRelations\}/);
  assert.match(sourceCode, /activeDepartmentIdForRelations: string;/);
  assert.match(
    sourceCode,
    /const \[roleBindingScopeKind, setRoleBindingScopeKind\] = useState\(activeDepartmentIdForRelations \? 'department' : 'organization'\);/,
  );
  assert.match(
    sourceCode,
    /const initialDepartmentAssignmentDepartmentId = dialog\.kind === 'departmentAssignment'\s+\? dialog\.target\?\.departmentId \|\| activeDepartmentIdForRelations\s+: activeDepartmentIdForRelations;/,
  );
  assert.match(
    sourceCode,
    /<SelectField key=\{`position-department-\$\{positionOrganizationId\}`\} label=\{t\('admin\.organization\.fields\.department', 'Department'\)\} name="departmentId" defaultValue=\{target\?\.departmentId \?\? activeDepartmentIdForRelations\}/,
  );
  assert.match(
    sourceCode,
    /<SelectField label=\{t\('admin\.organization\.fields\.department', 'Department'\)\} name="departmentId" required defaultValue=\{roleBindingDepartmentId\} options=\{departmentOptions\(activeDepartmentsForActiveOrganization, lookups, roleBindingDepartmentId\)\} onChange=\{setRoleBindingDepartmentId\}/,
  );
  assert.match(
    sourceCode,
    /const submitResult = await submitDialog\(dialog, form, activeOrganizationIdForRelations, activeDepartmentIdForRelations\);/,
  );
  assert.match(sourceCode, /setCreatedDirectorySelection\(submitResult\);/);
  assert.match(sourceCode, /function setCreatedDirectorySelection\(result: OrganizationDialogSubmitResult\): void/);
  assert.match(sourceCode, /setActiveOrganizationId\(result\.item\.id\);/);
  assert.match(sourceCode, /setExpandedDirectoryNodeIds\(\(current\) => expandDirectoryNode\(current, `organization:\$\{result\.item\.id\}`\)\);/);
  assert.match(sourceCode, /setActiveDepartmentId\(result\.item\.id\);/);
  assert.match(sourceCode, /const withOrganization = expandDirectoryNode\(current, `organization:\$\{result\.item\.organizationId\}`\);/);
  assert.match(sourceCode, /expandDirectoryPath\(withOrganization, combinedDirectoryTree, `department:\$\{result\.item\.parentDepartmentId\}`\)/);
  assert.match(sourceCode, /return expandDirectoryNode\(withParentDepartment, `department:\$\{result\.item\.id\}`\);/);
  assert.match(
    sourceCode,
    /departmentId: optionalFormText\(form, 'departmentId'\),/,
    "position form should respect explicit None instead of falling back to the page-selected department",
  );
  assert.doesNotMatch(
    sourceCode,
    /departmentId: optionalFormText\(form, 'departmentId'\) \|\| fallbackDepartmentId \|\| undefined/,
    "optional position department must not be reintroduced by fallback",
  );
});

test("admin organization UI keeps context coherent and guides role binding principals", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /if \(activeDepartmentId && !departmentsForActiveOrganization\.some\(\(item\) => item\.id === activeDepartmentId\)\)/);
  assert.match(sourceCode, /setActiveDepartmentId\(''\);/);
  assert.match(sourceCode, /const \[roleBindingPrincipalKind, setRoleBindingPrincipalKind\] = useState\('member'\);/);
  assert.match(sourceCode, /const roleBindingRawPrincipalOptions = principalOptions\(/);
  assert.match(sourceCode, /const roleBindingPrincipalOptions = availableRoleBindingPrincipalOptions\(/);
  assert.match(sourceCode, /function principalOptions\(/);
  assert.match(sourceCode, /function principalKindOptions\(/);
  assert.match(sourceCode, /onChange=\{setRoleBindingPrincipalKind\}/);
  assert.match(sourceCode, /name="principalId" required options=\{roleBindingPrincipalOptions\}/);
  assert.doesNotMatch(
    sourceCode,
    /TextField label=\{t\('admin\.organization\.fields\.principalId'/,
    "role binding principal should be selected from resolved directory options",
  );
});

test("admin organization keeps tree navigation independent and grants the selected role by default", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /nodes=\{combinedDirectoryTree\}/);
  assert.doesNotMatch(sourceCode, /visibleDirectoryTree/);
  assert.doesNotMatch(sourceCode, /normalizedDirectorySearch/);
  assert.doesNotMatch(sourceCode, /function filterOrganizationDepartmentTree\(nodes: OrganizationDirectoryTreeNode\[], search: string\): OrganizationDirectoryTreeNode\[]/);
  assert.doesNotMatch(sourceCode, /function expandVisibleDirectoryNodes\(current: Set<string>, nodes: OrganizationDirectoryTreeNode\[]\): Set<string> \{/);
  assert.match(sourceCode, /isNodeExpanded=\{\(node\) => expandedDirectoryNodeIds\.has\(node\.id\)\}/);
  assert.match(sourceCode, /expanded=\{expandedDirectoryNodeIds\.has\(node\.id\)\}/);
  assert.match(sourceCode, /activeRoleId=\{activeRoleId\}/);
  assert.match(sourceCode, /activeRoleId: string;/);
  assert.match(sourceCode, /defaultValue=\{activeRoleId\}/);
  assert.match(sourceCode, /SelectField label=\{t\('admin\.organization\.fields\.role', 'Role'\)\} name="roleId" required defaultValue=\{activeRoleId\} options=\{roleOptions\}/);
});

test("admin organization role binding scope and principal controls avoid stale selections", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /key=\{`role-binding-principal-\$\{roleBindingRoleId\}-\$\{roleBindingPrincipalKind\}-\$\{roleBindingScopeKind\}-\$\{roleBindingScopeId\}`\}/);
  assert.match(sourceCode, /const \[roleBindingScopeKind, setRoleBindingScopeKind\] = useState\(activeDepartmentIdForRelations \? 'department' : 'organization'\);/);
  assert.match(sourceCode, /const \[roleBindingRoleId, setRoleBindingRoleId\] = useState\(activeRoleId\);/);
  assert.match(sourceCode, /const \[roleBindingDepartmentId, setRoleBindingDepartmentId\] = useState\(activeDepartmentIdForRelations\);/);
  assert.match(sourceCode, /function scopeKindOptions\(t: TranslationFunction\): SelectOption\[]/);
  assert.match(sourceCode, /name="scopeKind" defaultValue=\{roleBindingScopeKind\} options=\{scopeKindOptions\(t\)\} onChange=\{setRoleBindingScopeKind\}/);
  assert.match(sourceCode, /roleBindingScopeKind === 'organization' \? \(/);
  assert.match(sourceCode, /roleBindingScopeKind === 'department' \? \(/);
  assert.match(sourceCode, /name="roleId" required defaultValue=\{roleBindingRoleId\} options=\{roleOptions\} onChange=\{setRoleBindingRoleId\}/);
  assert.doesNotMatch(
    sourceCode,
    /TextField label=\{t\('admin\.organization\.fields\.scopeKind'/,
    "role binding scope kind should be selected from safe options",
  );
  assert.match(sourceCode, /const requestedScopeKind = optionalFormText\(form, 'scopeKind'\);/);
  assert.match(sourceCode, /const departmentId = requestedScopeKind === 'department'/);
  assert.match(sourceCode, /scopeKind: departmentId \? 'department' : 'organization'/);
});

test("admin organization role binding creation excludes duplicate active bindings", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /function availableRoleBindingPrincipalOptions\(/);
  assert.match(sourceCode, /existingBindings: RoleBindingRecord\[]/);
  assert.match(sourceCode, /const roleBindingRawPrincipalOptions = principalOptions\(/);
  assert.match(sourceCode, /const roleBindingScopeId = roleBindingScopeKind === 'department' \? roleBindingDepartmentId : activeOrganizationIdForRelations;/);
  assert.match(
    sourceCode,
    /const roleBindingPrincipalOptions = availableRoleBindingPrincipalOptions\(roleBindingRawPrincipalOptions, directory\.roleBindings, roleBindingRoleId, roleBindingPrincipalKind, roleBindingScopeKind, roleBindingScopeId\);/,
  );
  assert.match(sourceCode, /const blockedPrincipalIds = new Set\(/);
  assert.match(sourceCode, /item\.roleId === roleId/);
  assert.match(sourceCode, /item\.principalKind === principalKind/);
  assert.match(sourceCode, /roleBindingEffectiveScopeKind\(item\) === scopeKind/);
  assert.match(sourceCode, /roleBindingEffectiveScopeId\(item\) === scopeId/);
  assert.match(sourceCode, /isActiveRecord\(item\)/);
  assert.match(sourceCode, /options\.filter\(\(option\) => !blockedPrincipalIds\.has\(option\.value\)\)/);
  assert.match(sourceCode, /function roleBindingEffectiveScopeKind\(binding: RoleBindingRecord\): string/);
  assert.match(sourceCode, /function roleBindingEffectiveScopeId\(binding: RoleBindingRecord\): string/);
});

test("admin organization role bindings use active context principals and required scopes", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(
    sourceCode,
    /const roleBindingRawPrincipalOptions = principalOptions\([\s\S]*roleBindingPrincipalKind,[\s\S]*organizationsForActiveContext,[\s\S]*activeDepartmentsForActiveOrganization,[\s\S]*activeMembersForActiveOrganization,[\s\S]*lookups,[\s\S]*\);/,
  );
  assert.match(
    sourceCode,
    /SelectField label=\{t\('admin\.organization\.fields\.organization', 'Organization'\)\} name="organizationId" required defaultValue=\{activeOrganizationIdForRelations\} options=\{organizationOptions\(organizationsForActiveContext, lookups, activeOrganizationIdForRelations\)\}/,
  );
  assert.match(
    sourceCode,
    /SelectField label=\{t\('admin\.organization\.fields\.department', 'Department'\)\} name="departmentId" required defaultValue=\{roleBindingDepartmentId\} options=\{departmentOptions\(activeDepartmentsForActiveOrganization, lookups, roleBindingDepartmentId\)\} onChange=\{setRoleBindingDepartmentId\}/,
  );
  assert.doesNotMatch(
    sourceCode,
    /principalOptions\([\s\S]*directory\.organizations,[\s\S]*departmentsForActiveOrganization,[\s\S]*membersForActiveOrganization,/,
    "role binding principal options must not include cross-organization or inactive principals",
  );
  assert.doesNotMatch(
    sourceCode,
    /emptyOption\(t\)\.concat\(organizationSelectOptions\)/,
    "role binding organization scope should be required and scoped to the active organization",
  );
  assert.doesNotMatch(
    sourceCode,
    /roleBindingScopeKind === 'department' \? \([\s\S]*emptyOption\(t\)\.concat\(departmentOptions\(departmentsForActiveOrganization/,
    "role binding department scope should be required and scoped to active departments",
  );
});

test("admin organization assignment dialogs only offer active positions, roles and permissions", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /const activePositionsForActiveContext = useMemo\(/);
  assert.match(sourceCode, /const activeRolesForAssignment = useMemo\(/);
  assert.match(sourceCode, /const activePermissionsForAssignment = useMemo\(/);
  assert.match(sourceCode, /directory\.positions\.filter\(isActiveRecord\)\.filter/);
  assert.match(sourceCode, /directory\.roles\.filter\(isActiveRecord\)/);
  assert.match(sourceCode, /directory\.permissions\.filter\(isActiveRecord\)/);
  assert.match(sourceCode, /activePositionsForActiveContext=\{activePositionsForActiveContext\}/);
  assert.match(sourceCode, /activeRolesForAssignment=\{activeRolesForAssignment\}/);
  assert.match(sourceCode, /activePermissionsForAssignment=\{activePermissionsForAssignment\}/);
  assert.match(
    sourceCode,
    /const roleOptions = activeRolesForAssignment\.map\(\(item\) => \(\{ value: item\.id, label: formatRoleLabel\(item\.id, lookups\) \}\)\);/,
  );
  assert.match(sourceCode, /function availableRolePermissionOptions\(/);
  assert.match(sourceCode, /existingRolePermissions: PermissionRecord\[]/);
  assert.match(sourceCode, /const grantedPermissionIds = new Set\(existingRolePermissions\.map\(\(item\) => item\.id\)\);/);
  assert.match(sourceCode, /const availablePermissionOptions = availableRolePermissionOptions\(activePermissionsForAssignment, rolePermissions, lookups\);/);
  assert.match(
    sourceCode,
    /SelectField label=\{t\('admin\.organization\.fields\.position', 'Position'\)\} name="positionId" required defaultValue=\{positionAssignmentPositionId\} options=\{positionOptions\(activePositionsForActiveContext, lookups, target\?\.positionId\)\}/,
  );
  assert.match(
    sourceCode,
    /SelectField label=\{t\('admin\.organization\.fields\.permission', 'Permission'\)\} name="permissionId" required options=\{availablePermissionOptions\}/,
  );
  assert.doesNotMatch(
    sourceCode,
    /name="permissionId" required options=\{permissionOptions\}/,
    "role permission grants should not offer permissions already granted to the selected role",
  );
}
);

test("admin organization role binding list stays in the selected organization boundary", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /function roleBindingBelongsToContext\(/);
  assert.match(sourceCode, /const activeMembershipIdsForOrganization = useMemo\(/);
  assert.match(sourceCode, /const activeUserIdsForOrganization = useMemo\(/);
  assert.match(
    sourceCode,
    /directory\.roleBindings\.filter\(\(item\) => roleBindingBelongsToContext\(item, effectiveOrganizationId, activeDepartmentId, departmentIdsForOrganization, activeMembershipIdsForOrganization, activeUserIdsForOrganization\)\)/,
  );
  assert.match(
    sourceCode,
    /binding\.principalKind === 'member' && activeMembershipIdsForOrganization\.has\(binding\.principalId\)/,
  );
  assert.match(
    sourceCode,
    /binding\.principalKind === 'user' && activeUserIdsForOrganization\.has\(binding\.principalId\)/,
  );
  assert.doesNotMatch(
    sourceCode,
    /return item\.organizationId === effectiveOrganizationId \|\| item\.scopeId === effectiveOrganizationId \|\| !item\.organizationId;/,
    "role bindings without organizationId must still be checked against department or scope context",
  );
});

test("admin organization permission grants require an active selected role", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");
  const authorizationTabSource = sourceSection(
    sourceCode,
    "function AuthorizationTab(",
    "function AuthorizationDrawer(",
  );

  assert.match(
    sourceCode,
    /onGrantPermission=\{\(\) => \{[\s\S]*if \(!activeRoleId\) \{[\s\S]*return;[\s\S]*\}[\s\S]*setAuthorizationDrawer\(null\);[\s\S]*setDialog\(\{ kind: 'rolePermission', mode: 'create' \}\);[\s\S]*\}\}/,
    "grant permission should not open the dialog without a selected role",
  );
  assert.match(
    sourceCode,
    /<SmallButton label=\{t\('admin\.organization\.actions\.grant', 'Grant'\)\} onClick=\{onGrantPermission\} disabled=\{!selectedRoleId\} \/>/,
    "role permission drawer grant action should require a selected role",
  );
  assert.match(
    sourceCode,
    /activeKind === 'rolePermissions'[\s\S]*<SmallButton label=\{t\('admin\.organization\.actions\.grant', 'Grant'\)\} onClick=\{onGrantPermission\} disabled=\{!selectedRoleId\} \/>/,
  );
  assert.doesNotMatch(authorizationTabSource, /admin\.organization\.actions\.grant/);
  assert.doesNotMatch(
    sourceCode,
    /<SmallButton label=\{t\('admin\.organization\.actions\.grant', 'Grant'\)\} onClick=\{onGrantPermission\} \/>/,
    "every permission grant entry point should be disabled when no role is selected",
  );
});

test("admin organization relation actions require active operational context", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(
    sourceCode,
    /const activeOrganizationIdForRelations = activeOrganization && isActiveRecord\(activeOrganization\) \? activeOrganization\.id : '';/,
    "relationship create flows should only inherit an active selected organization",
  );
  assert.match(
    sourceCode,
    /<SmallButton label=\{t\('admin\.organization\.actions\.createDepartment', 'Create department'\)\} onClick=\{\(\) => setDialog\(\{ kind: 'department', mode: 'create' \}\)\} disabled=\{!activeOrganizationIdForRelations\} \/>/,
    "department creation should be disabled without an active organization",
  );
  assert.match(sourceCode, /canAddMember=\{Boolean\(activeOrganizationIdForRelations\)\}/);
  assert.match(sourceCode, /canAddAssignment=\{Boolean\(activeOrganizationIdForRelations && activeDepartmentIdForRelations && activeMembersForActiveOrganization\.length > 0\)\}/);
  assert.match(sourceCode, /canCreate=\{Boolean\(activeOrganizationIdForRelations\)\}/);
  assert.match(sourceCode, /canAddAssignment=\{Boolean\(activeOrganizationIdForRelations && activePositionsForActiveContext\.length > 0 && activeMembersForActiveOrganization\.length > 0\)\}/);
  assert.match(sourceCode, /canBindRole=\{Boolean\(activeRoleId && activeOrganizationIdForRelations\)\}/);
  assert.match(
    sourceCode,
    /<HeaderButton label=\{t\('admin\.organization\.actions\.addMember', 'Add member'\)\} onClick=\{onAddMember\} disabled=\{!canAddMember\} variant="primary">/,
  );
  assert.match(
    sourceCode,
    /<HeaderButton label=\{t\('admin\.organization\.actions\.assign', 'Assign'\)\} onClick=\{onAddAssignment\} disabled=\{!canAddAssignment\} \/>/,
  );
  assert.match(
    sourceCode,
    /<HeaderButton label=\{t\('admin\.organization\.actions\.createPosition', 'Create position'\)\} onClick=\{onCreate\} disabled=\{!canCreate\} variant="primary">/,
  );
  assert.match(
    sourceCode,
    /<SmallButton label=\{t\('admin\.organization\.actions\.bindRole', 'Bind'\)\} onClick=\{onBindRole\} disabled=\{!canBindRole\} \/>/,
  );
}
);

test("admin organization relationship forms use active organization options and fallbacks", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /const activeOrganizations = useMemo\(\s+\(\) => directory\.organizations\.filter\(isActiveRecord\),\s+\[directory\.organizations\],\s+\);/);
  assert.doesNotMatch(
    sourceCode,
    /const organizationSelectOptions = organizationOptions\(directory\.organizations, lookups\);/,
    "relationship forms should not offer inactive organizations for new assignments",
  );
  assert.match(
    sourceCode,
    /const submitResult = await submitDialog\(dialog, form, activeOrganizationIdForRelations, activeDepartmentIdForRelations\);/,
    "submit fallbacks should use the active organization relationship context",
  );
  assert.match(sourceCode, /activeOrganizationIdForRelations=\{activeOrganizationIdForRelations\}/);
  assert.match(sourceCode, /activeOrganizationIdForRelations: string;/);
  assert.doesNotMatch(sourceCode, /dialog\.kind === 'membership' \? dialog\.target\?\.organizationId \|\| activeOrganizationIdForRelations : activeOrganizationIdForRelations/);
  assert.match(
    sourceCode,
    /dialog\.kind === 'department' \? dialog\.target\?\.organizationId \|\| activeOrganizationIdForRelations : activeOrganizationIdForRelations/,
  );
  assert.match(
    sourceCode,
    /dialog\.kind === 'position' \? dialog\.target\?\.organizationId \|\| activeOrganizationIdForRelations : activeOrganizationIdForRelations/,
  );
  assert.match(
    sourceCode,
    /organizationOptions\(activeOrganizations, lookups, target\?\.organizationId \|\| activeOrganizationIdForRelations\)/,
    "editing should keep the current organization while new records use active organizations only",
  );
  assert.match(
    sourceCode,
    /const roleBindingScopeId = roleBindingScopeKind === 'department' \? roleBindingDepartmentId : activeOrganizationIdForRelations;/,
  );
  assert.match(
    sourceCode,
    /organizationOptions\(organizationsForActiveContext, lookups, activeOrganizationIdForRelations\)/,
  );
}
);

test("admin organization role binding table exposes lifecycle status", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /<th className="px-4 py-3">\{t\('admin\.organization\.columns\.status', 'Status'\)\}<\/th>/);
  assert.match(sourceCode, /<td className="px-4 py-3"><StatusPill status=\{binding\.status\} t=\{t\} \/><\/td>/);
  assert.match(sourceCode, /<BusinessStateTableRow colSpan=\{5\} kind="empty" title=\{t\('admin\.organization\.empty\.roleBindings', 'No role bindings'\)\} \/>/);
}
);

test("admin organization destructive actions show dependency counts and block unsafe deletes", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");
  const confirmDialog = source("packages/sdkwork-clawroutes-pc-commons/src/components/ConfirmDialog.tsx");

  assert.match(sourceCode, /type ConfirmDependency = \{ count: number; label: string \};/);
  assert.match(sourceCode, /blocked\?: boolean/);
  assert.match(sourceCode, /function buildOrganizationConfirmTarget\(organization: OrganizationRecord, directory: OrganizationDirectoryData, t: TranslationFunction\): ConfirmTarget/);
  assert.match(sourceCode, /function buildDepartmentConfirmTarget\(department: DepartmentRecord, directory: OrganizationDirectoryData, t: TranslationFunction\): ConfirmTarget/);
  assert.match(sourceCode, /function buildPositionConfirmTarget\(position: PositionRecord, directory: OrganizationDirectoryData, t: TranslationFunction\): ConfirmTarget/);
  assert.match(sourceCode, /function buildRoleConfirmTarget\(role: RoleRecord, directory: OrganizationDirectoryData, rolePermissions: PermissionRecord\[], t: TranslationFunction\): ConfirmTarget/);
  assert.match(sourceCode, /function buildPermissionConfirmTarget\(permission: PermissionRecord, rolePermissions: PermissionRecord\[], t: TranslationFunction\): ConfirmTarget/);
  assert.match(sourceCode, /function activeOrganizationDependencies\(organizationId: string, directory: OrganizationDirectoryData, t: TranslationFunction\): ConfirmDependency\[]/);
  assert.match(sourceCode, /function activeDepartmentDependencies\(departmentId: string, directory: OrganizationDirectoryData, t: TranslationFunction\): ConfirmDependency\[]/);
  assert.match(sourceCode, /function activePositionDependencies\(positionId: string, directory: OrganizationDirectoryData, t: TranslationFunction\): ConfirmDependency\[]/);
  assert.match(sourceCode, /function activeRoleDependencies\(roleId: string, directory: OrganizationDirectoryData, rolePermissions: PermissionRecord\[], t: TranslationFunction\): ConfirmDependency\[]/);
  assert.match(sourceCode, /function activePermissionDependencies\(permissionId: string, rolePermissions: PermissionRecord\[], t: TranslationFunction\): ConfirmDependency\[]/);
  assert.match(sourceCode, /onDelete=\{organization\s+\?\s+\(\) => setConfirmTarget\(buildOrganizationConfirmTarget\(organization, directory, t\)\)\s+:\s+department \? \(\) => setConfirmTarget\(buildDepartmentConfirmTarget\(department, directory, t\)\) : undefined\}/);
  assert.match(sourceCode, /onDelete=\{\(target\) => setConfirmTarget\(buildPositionConfirmTarget\(target, directory, t\)\)\}/);
  assert.match(sourceCode, /onDeleteRole=\{\(target\) => setConfirmTarget\(buildRoleConfirmTarget\(target, directory, rolePermissions, t\)\)\}/);
  assert.match(sourceCode, /onDeletePermission=\{\(target\) => setConfirmTarget\(buildPermissionConfirmTarget\(target, rolePermissions, t\)\)\}/);
  assert.match(sourceCode, /directory\.roleBindings\.filter\(\(item\) => item\.roleId === roleId && isActiveRecord\(item\)\)\.length/);
  assert.match(sourceCode, /rolePermissions\.some\(\(item\) => item\.id === permissionId\)/);
  assert.match(sourceCode, /confirmDisabled=\{isConfirmBlocked\(confirmTarget\)\}/);
  assert.match(sourceCode, /function isConfirmBlocked\(target: ConfirmTarget\): boolean/);
  assert.match(sourceCode, /admin\.organization\.confirm\.blockedDescription/);
  assert.match(sourceCode, /admin\.organization\.confirm\.dependencies/);
  assert.match(confirmDialog, /confirmDisabled\?: boolean/);
  assert.match(confirmDialog, /disabled=\{isBusy \|\| confirmDisabled\}/);
});

test("admin organization form fields use controlled enterprise options", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /function organizationKindOptions\(t: TranslationFunction, keepValue\?: string \| null\): SelectOption\[]/);
  assert.match(sourceCode, /function memberKindOptions\(t: TranslationFunction, keepValue\?: string \| null\): SelectOption\[]/);
  assert.match(sourceCode, /function departmentAssignmentRoleOptions\(t: TranslationFunction, keepValue\?: string \| null\): SelectOption\[]/);
  assert.match(
    sourceCode,
    /SelectField label=\{t\('admin\.organization\.fields\.kind', 'Kind'\)\} name="organizationKind" defaultValue=\{target\?\.organizationKind \|\| 'company'\} options=\{organizationKindOptions\(t, target\?\.organizationKind\)\}/,
  );
  assert.match(
    sourceCode,
    /SelectField label=\{t\('admin\.organization\.fields\.memberKind', 'Member kind'\)\} name="memberKind" defaultValue=\{target\.memberKind \|\| 'member'\} options=\{memberKindOptions\(t, target\.memberKind\)\}/,
  );
  assert.match(
    sourceCode,
    /SelectField label=\{t\('admin\.organization\.fields\.role', 'Role'\)\} name="role" defaultValue=\{target\?\.role \|\| 'member'\} options=\{departmentAssignmentRoleOptions\(t, target\?\.role\)\}/,
  );
  assert.doesNotMatch(
    sourceCode,
    /TextField label=\{t\('admin\.organization\.fields\.kind', 'Kind'\)\} name="organizationKind"/,
    "organization kind should use a controlled select instead of raw text",
  );
  assert.doesNotMatch(
    sourceCode,
    /TextField label=\{t\('admin\.organization\.fields\.role', 'Role'\)\} name="role"/,
    "department assignment role should use a controlled select instead of raw text",
  );
});

test("admin organization parent selectors prevent self or descendant loops", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /function organizationParentOptions\(organizations: OrganizationRecord\[], targetId: string \| null \| undefined, lookups: DirectoryLookups, t: TranslationFunction\): SelectOption\[]/);
  assert.match(sourceCode, /function departmentParentOptions\(departments: DepartmentRecord\[], targetId: string \| null \| undefined, lookups: DirectoryLookups, t: TranslationFunction\): SelectOption\[]/);
  assert.match(sourceCode, /function collectDescendantIds<T extends \{ id: string \}>\(/);
  assert.match(sourceCode, /const excludedIds = collectDescendantIds\(organizations, targetId, 'parentOrganizationId'\);/);
  assert.match(sourceCode, /const excludedIds = collectDescendantIds\(departments, targetId, 'parentDepartmentId'\);/);
  assert.match(
    sourceCode,
    /options=\{organizationParentOptions\(directory\.organizations, target\?\.id, lookups, t\)\}/,
  );
  assert.match(
    sourceCode,
    /options=\{departmentParentOptions\(departmentsForDepartmentOrganization, target\?\.id, lookups, t\)\}/,
  );
});

test("admin organization member table is enriched from appbase users", () => {
  const sourceCode = source("packages/sdkwork-clawrouter-pc-admin-organization/src/index.tsx");

  assert.match(sourceCode, /const visibleMemberships = filterBySearchWithLabels\(/);
  assert.match(sourceCode, /function memberDisplayName\(member: OrganizationMemberRecord, lookups: DirectoryLookups\): string/);
  assert.match(sourceCode, /function memberContactPrimary\(member: OrganizationMemberRecord, lookups: DirectoryLookups\): string/);
  assert.match(sourceCode, /function memberContactSecondary\(member: OrganizationMemberRecord, lookups: DirectoryLookups\): string/);
  assert.match(sourceCode, /formatMemberLabel\(member\.id, member\.userId, lookups\)/);
  assert.match(sourceCode, /memberContactPrimary\(member, lookups\)/);
  assert.match(sourceCode, /memberContactSecondary\(member, lookups\)/);
  assert.match(sourceCode, /memberDisplayName\(member, lookups\)/);
  assert.doesNotMatch(
    sourceCode,
    /\{member\.displayName\}<\/div>/,
    "member rows should not rely only on membership displayName when appbase user data is available",
  );
});

test("admin organization service calls appbase backend directory reads and write methods", async () => {
  const { clearStoredAppSessionToken } = await import("./packages/sdkwork-clawroutes-pc-commons/src/app-session-token.ts");
  const { resetClawRouterSdkClients } = await import("./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts");
  const { OrganizationService } = await import(
    "./packages/sdkwork-clawrouter-pc-admin-organization/src/organizationService.ts"
  );

  const originalFetch = globalThis.fetch;
  const captured: Array<{ body: string; method: string; url: string }> = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    enumerable: true,
    value: {
      __CLAWROUTER_ENV__: {
        VITE_CLAWROUTER_APP_API_BASE_URL: "/app/v3/api",
        VITE_CLAWROUTER_BACKEND_API_BASE_URL: "/backend/v3/api",
        VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL: "https://appbase.example.com/backend/v3/api",
      },
      dispatchEvent: () => true,
    },
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    captured.push({
      body: typeof init?.body === "string" ? init.body : "",
      method: init?.method ?? "GET",
      url,
    });
    return new Response(
      JSON.stringify({
        code: "2000",
        message: "ok",
        requestId: "00000000-0000-0000-0000-000000000000",
        data: {
          items: [],
          item: {
            id: "org-1",
            code: "hq",
            name: "Headquarters",
            organizationKind: "company",
            status: "active",
          },
          deleted: true,
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
  clearStoredAppSessionToken();
  resetClawRouterSdkClients();

  try {
    await OrganizationService.loadDirectory();
    await OrganizationService.createOrganization({ name: "Headquarters" });
    await OrganizationService.updateDepartment("dept-1", { name: "Research" });
    await OrganizationService.deletePosition("pos-1");
    await OrganizationService.bindRole({ principalKind: "member", principalId: "mem-1", roleId: "role-1" });

    assert.equal(captured[0].url, "https://appbase.example.com/backend/v3/api/iam/users?page_size=200");
    assert.equal(captured[0].method, "GET");
    assert.equal(captured[1].url, "https://appbase.example.com/backend/v3/api/iam/organizations/tree");
    assert.equal(captured[1].method, "GET");
    assert.equal(captured[2].url, "https://appbase.example.com/backend/v3/api/iam/organizations?page_size=200");
    assert.equal(captured[2].method, "GET");
    assert.equal(captured[3].url, "https://appbase.example.com/backend/v3/api/iam/departments/tree");
    assert.equal(captured[3].method, "GET");
    assert.equal(captured[4].url, "https://appbase.example.com/backend/v3/api/iam/departments?page_size=200");
    assert.equal(captured[4].method, "GET");
    assert.equal(captured[5].url, "https://appbase.example.com/backend/v3/api/iam/organization_memberships?page_size=200");
    assert.equal(captured[5].method, "GET");
    assert.equal(captured[6].url, "https://appbase.example.com/backend/v3/api/iam/department_assignments?page_size=200");
    assert.equal(captured[6].method, "GET");
    assert.equal(captured[7].url, "https://appbase.example.com/backend/v3/api/iam/positions?page_size=200");
    assert.equal(captured[7].method, "GET");
    assert.equal(captured[8].url, "https://appbase.example.com/backend/v3/api/iam/position_assignments?page_size=200");
    assert.equal(captured[8].method, "GET");
    assert.equal(captured[9].url, "https://appbase.example.com/backend/v3/api/iam/role_bindings?page_size=200");
    assert.equal(captured[9].method, "GET");
    assert.equal(captured[10].url, "https://appbase.example.com/backend/v3/api/iam/roles?page_size=200");
    assert.equal(captured[10].method, "GET");
    assert.equal(captured[11].url, "https://appbase.example.com/backend/v3/api/iam/permissions?page_size=200");
    assert.equal(captured[11].method, "GET");

    assert.equal(captured[12].url, "https://appbase.example.com/backend/v3/api/iam/organizations");
    assert.equal(captured[12].method, "POST");
    assert.deepEqual(JSON.parse(captured[12].body), { name: "Headquarters" });
    assert.equal(captured[13].url, "https://appbase.example.com/backend/v3/api/iam/departments/dept-1");
    assert.equal(captured[13].method, "PATCH");
    assert.deepEqual(JSON.parse(captured[13].body), { name: "Research" });
    assert.equal(captured[14].url, "https://appbase.example.com/backend/v3/api/iam/positions/pos-1");
    assert.equal(captured[14].method, "DELETE");
    assert.equal(captured[15].url, "https://appbase.example.com/backend/v3/api/iam/role_bindings");
    assert.equal(captured[15].method, "POST");
    assert.deepEqual(JSON.parse(captured[15].body), {
      principalKind: "member",
      principalId: "mem-1",
      roleId: "role-1",
    });
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkClients();
    globalThis.fetch = originalFetch;
    restoreWindow();
  }
});

test("appbase backend SDK inherits the verified same-origin backend base URL", async () => {
  const { clearStoredAppSessionToken } = await import("./packages/sdkwork-clawroutes-pc-commons/src/app-session-token.ts");
  const {
    createSdkworkAppbaseBackendSdkClient,
    resetClawRouterSdkClients,
  } = await import("./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts");

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    enumerable: true,
    value: {
      __CLAWROUTER_ENV__: {
        VITE_CLAWROUTER_BACKEND_API_BASE_URL: "/backend/v3/api",
      },
    },
  });
  clearStoredAppSessionToken();
  resetClawRouterSdkClients();

  try {
    assert.doesNotThrow(() => createSdkworkAppbaseBackendSdkClient());
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkClients();
    restoreWindow();
  }
});
