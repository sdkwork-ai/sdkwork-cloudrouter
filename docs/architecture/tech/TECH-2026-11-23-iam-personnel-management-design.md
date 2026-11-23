# IAM 人员管理（Personnel Management）设计

- 状态：P1 + P2 + P2b + P3 首版均已落地（sdkwork-iam `e181951f`、`9c55a59c`、`bbf34b74`、`13e69cb1`）；剩余 P3b
- 日期：2026-11-23
- 范围：Cloud Router 管理端「身份目录 → 人员管理」页面 + IAM 模块（`sdkwork-iam`）数据模型与 API 扩展
- 关联：`TECH-2026-11-18-admin-enterprise-center.md`（管理端信息架构）、`sdkwork-specs/IAM_SPEC.md`、`sdkwork-specs/DATABASE_FRAMEWORK_SPEC.md`、`sdkwork-specs/API_SPEC.md`

## 1. 目标

在 `身份目录` 中新增 `人员管理`，用「左树右表」完成组织/部门与人员的日常维护：

1. 左侧：组织树 + 部门树。一个租户下多个组织，每个组织下多级部门；支持组织/部门 CRUD，支持拖拽改变父级与同级顺序。
2. 右侧：选中组织/部门后的成员列表，列包含姓名、所在部门（可多部门）、邮箱、手机号、岗位、角色、操作。操作支持改角色、改岗位、设置权限、调整部门（一个成员可属于多个部门）。

设计原则：组织/部门是**组织单元**，成员是**任职关系**（membership），部门是**多对多任职**，岗位与角色分离，权限走 RBAC + 数据范围，所有历史可追溯。

## 2. 现状（证据）

数据模型归 `sdkwork-iam` 所有，Cloud Router 只做组合；因此"完善后端数据库设计"必须改 `sdkwork-iam` 的 schema 与 API，Cloud Router 侧只增加页面与组合元数据。

| 能力 | 现状 | 证据 |
| --- | --- | --- |
| 多组织 / 组织树 / 组织排序 | 已有（`parent_organization_id` + `iam_organization_closure` + `sort_order`） | `sdkwork-iam/database/ddl/baseline/postgres/0001_iam_baseline.sql:55-88`、`:1566` |
| 部门树 | 已有（`parent_department_id` + `path` + `iam_department_closure`） | 同上 `:108-134` |
| 部门排序 | **缺失**（`iam_department` 无 `sort_order`，列表/树按 `name,id`） | 同上 `:108-123`；`crates/sdkwork-routes-iam-backend-api/src/management.rs:1069` |
| 部门拖拽换父 | **缺失**（`departments.update` 白名单不接受 `parentDepartmentId`，无环校验，`path`/closure 不重建） | `crates/sdkwork-routes-iam-backend-api/src/directory_crud.impl.rs:1-34`、`:1955-1964` |
| 一个成员多部门 | 已有（`iam_department_assignment` 每行一个"成员×部门"） | baseline `:136-151` |
| 主部门唯一性 | **未约束**（可能出现多条 `is_primary=1`） | baseline `:144` |
| 岗位 | 已有目录 + 任职表，但任职挂在"部门任职"上 | baseline `:153-182` |
| 角色绑定 | 已有，作用域仅 `tenant`/`organization`，`condition_json` 未使用 | baseline `:326-341`；`crates/sdkwork-iam-bootstrap/src/rbac_scope.rs:24-29` |
| 数据范围（data scope） | **缺失**（无字段、无解析） | 同上 |
| 成员手机号 | `iam_user.phone` 存在但任何成员查询都不投影 | baseline `:190`；`management.rs:996-1005` |
| 成员花名册（人+部门+岗位+角色一体） | **缺失** | 仅有 app-api `organizations.members.list`（无 phone/部门/岗位/角色，且 email 受角色限制） |
| 列表按组织/部门过滤 | **后端按上下文组织过滤，不是查询参数**；生成 SDK 只序列化 `page/page_size/cursor/sort/q`，`organizationId` 被静默丢弃 | `management.rs:986,1054,1973`；`sdks/sdkwork-iam-backend-sdk/.../generated/server-openapi/src/api/iam.ts:1194-1221` |
| 前端复用组件 | IAM 自带组织/部门结构工作区（单组织、无拖拽、按部门看任职） | `apps/sdkwork-iam-pc/packages/sdkwork-iam-pc-admin-organization/src/pages/OrganizationStructureWorkspace.tsx` |
| 拖拽库 | 未安装；现有拖拽为原生 HTML5 | `packages/sdkwork-cloudroutes-pc-commons/src/components/CascadeCategoryManager.tsx:177-215` |

## 3. 领域模型（对齐行业实践）

```
Tenant 1 ── * Organization ── * Department (tree: parent_department_id + closure + path + sort_order)
                                   │
User 1 ── * OrganizationMembership ── * DepartmentAssignment ── 1 Position? (PositionAssignment)
  (tenant,org,user,kind)              (成员在部门任职, 唯一主部门)      │
                                   └── * RoleBinding (role + scope[org|department] + data scope + 有效期)
Position 目录: (tenant, org, department?, code, name, position_kind, rank_level)
Role ── * RolePermission ── Permission
```

关键语义（行业惯例，Workday / 飞书 / 钉钉同构）：

- **组织 ≠ 部门**：组织是法人/业务边界（已有），部门是内部单元。页面左树顶层是组织，子层是部门。
- **任职关系**：`organization_membership` 表示"某人在某组织内是成员"；`department_assignment` 表示"某人挂在哪几个部门"。多部门 = 多条 assignment，其中恰有一条 `is_primary=1`（主部门），其余为兼岗。
- **岗位随部门任职**：岗位不是人的全局属性，而是"在某个部门担任某岗位"。`position_assignment` 挂在 `department_assignment` 上，保证"研发部-后端工程师"和"架构组-技术委员"可并存。
- **角色 ≠ 岗位**：岗位是职务（业务语义），角色是权限集合（安全语义）。给成员"设置权限"实际是给 `role_binding` 选角色 + 作用域 + 数据范围 + 有效期。
- **数据范围**：决定同一个角色能看到哪些数据（本人、本部门、本部门及下级、本组织、全租户）。这是"设置权限"的必要组成部分，否则只能控制功能、不能控制数据。
- **历史可追溯**：任职/岗位/授权都用 `effective_from`/`effective_to` 表达生效区间，变更关闭旧行而不是物理删除；审计写 `iam_audit_event`（沿用现有 `directory_create_with_audit`）。

### 3.1 业务不变量

1. 一个 membership 在同一组织内最多一条 active 主部门任职（数据库部分唯一索引强制）。
2. 一个 department_assignment 最多一条 active 主岗位任职（同上）。
3. 部门树无环；换父必须同时重算 `path` 与 `iam_department_closure`，且在同一事务内完成。
4. `sort_order` 只在同一 `parent_department_id` 下比较；重排时服务端按"目标位置 → 之后同级 +1"规整，允许空号。
5. `role_binding` 的 `scope_kind=department` 必须与成员所在部门一致，禁止跨组织授权。
6. 删除部门/组织只做软删除（`status='disabled'`），存在 active 子部门或 active 成员任职时拒绝（409 + 明确错误码）。

## 4. 数据库设计（`sdkwork-iam`，迁移 0049）

当前迁移头为 `0048_iam_login_follow_qr.up.sql`，下一个可用号为 **0049**。本迁移只加列/索引，不新增表，因此不需要改 `contract/schema.yaml`、`table-registry.json`、`sql-scope.json` 的表清单，也不改 `IamTables`。新增列/索引需要折叠进 baseline 并在 `tests/static/governance/iam-database-init-standard.test.mjs` 的 `FOLDED_BLOCK_ORDER` 追加一项。

### 4.1 迁移文件

`database/migrations/postgres/0049_iam_department_ordering_and_member_scope.up.sql`

```sql
-- sdkwork:migration
-- id: 0049_iam_department_ordering_and_member_scope
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Personnel management ("人员管理") needs three facts the schema cannot
--   express today: (1) sibling ordering for departments so the left tree can be
--   reordered by drag-and-drop; (2) a database-enforced "exactly one primary
--   department per membership" and "one primary position per department
--   assignment" invariant; (3) a data scope and effective window on role
--   bindings so "设置权限" can grant a role over a department subtree for a
--   bounded period. Additive columns plus partial unique indexes; no table is
--   created, dropped, or renamed.
-- reversible: false
-- rollback: forward-fix (the normalization below collapses duplicate primary
--   assignments; dropping the columns would not restore the cleared flags, and
--   DATABASE_FRAMEWORK_SPEC.md section 7.1 forbids lossy down migrations)
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 120s

BEGIN;

ALTER TABLE iam_department
    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_iam_department_sibling_order
    ON iam_department (tenant_id, organization_id, parent_department_id, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_iam_department_path
    ON iam_department (tenant_id, organization_id, path);

ALTER TABLE iam_role_binding
    ADD COLUMN IF NOT EXISTS data_scope_kind TEXT NOT NULL DEFAULT 'scope',
    ADD COLUMN IF NOT EXISTS effective_from TEXT,
    ADD COLUMN IF NOT EXISTS effective_to TEXT;

ALTER TABLE iam_role_binding
    ADD CONSTRAINT chk_iam_role_binding_data_scope_kind
    CHECK (data_scope_kind IN ('scope', 'self', 'department',
                               'department_and_children', 'organization', 'tenant'));

ALTER TABLE iam_role_binding
    ADD CONSTRAINT chk_iam_role_binding_effective_window
    CHECK (effective_to IS NULL OR effective_from IS NULL
           OR effective_to >= effective_from);

CREATE INDEX IF NOT EXISTS idx_iam_role_binding_principal
    ON iam_role_binding (tenant_id, principal_kind, principal_id,
                         scope_kind, scope_id, status);

CREATE INDEX IF NOT EXISTS idx_iam_department_assignment_department
    ON iam_department_assignment (tenant_id, organization_id, department_id,
                                  status, user_id);

-- Normalize pre-existing duplicate primaries before enforcing the invariant.
-- Keep the earliest active primary (stable by created_at, id) and clear the
-- rest; this is idempotent and never deletes an assignment.
UPDATE iam_department_assignment a
   SET is_primary = 0,
       updated_at = a.updated_at
 WHERE a.is_primary = 1
   AND a.status = 'active'
   AND EXISTS (
       SELECT 1
         FROM iam_department_assignment b
        WHERE b.tenant_id = a.tenant_id
          AND b.organization_id = a.organization_id
          AND b.organization_membership_id = a.organization_membership_id
          AND b.status = 'active'
          AND b.is_primary = 1
          AND (b.created_at, b.id) < (a.created_at, a.id));

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_department_assignment_primary
    ON iam_department_assignment (tenant_id, organization_id, organization_membership_id)
    WHERE is_primary = 1 AND status = 'active';

UPDATE iam_position_assignment a
   SET is_primary = 0,
       updated_at = a.updated_at
 WHERE a.is_primary = 1
   AND a.status = 'active'
   AND EXISTS (
       SELECT 1
         FROM iam_position_assignment b
        WHERE b.tenant_id = a.tenant_id
          AND b.organization_id = a.organization_id
          AND b.department_assignment_id = a.department_assignment_id
          AND b.status = 'active'
          AND b.is_primary = 1
          AND (b.created_at, b.id) < (a.created_at, a.id));

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_position_assignment_primary
    ON iam_position_assignment (tenant_id, organization_id, department_assignment_id)
    WHERE is_primary = 1 AND status = 'active';

COMMIT;
```

说明：

- 只加列/索引，`database.manifest.json`、`contract/*.json`、`sql-scope.json` 均不变；`database/README.md:9` 的"65 张表"是既有陈旧描述，不在本迁移内顺手改（避免与迁移混在一起，另开修复）。
- `iam_department.sort_order` 与 `iam_organization.sort_order` 对齐；列表/树排序改为 `sort_order, name, id`。
- 主部门唯一性用**部分唯一索引**表达，比应用层校验更可靠；迁移内先做幂等归一化，防止脏数据导致建索引失败。
- `data_scope_kind` 默认 `scope`（与绑定的作用域一致），现有行语义不变；`effective_from/to` 为空表示长期有效。

### 4.2 读模型（不建新表）

花名册聚合查询（组织内成员 + 部门 + 岗位 + 角色）走一条带聚合的查询，避免前端 N+1：

```sql
-- 入参: $1 tenant_id, $2 organization_id, $3 department_id(可空), $4 q, $5 page_size, $6 offset
SELECT m.id                AS membership_id,
       m.user_id,
       COALESCE(NULLIF(m.display_name, ''), u.display_name) AS display_name,
       m.employee_no, u.email, u.phone, m.membership_kind, m.status, m.joined_at,
       COALESCE(dept.departments, '[]'::jsonb) AS departments,
       COALESCE(pos.positions,  '[]'::jsonb) AS positions,
       COALESCE(role.roles,     '[]'::jsonb) AS roles,
       COUNT(*) OVER() AS total
  FROM iam_organization_membership m
  JOIN iam_user u ON u.id = m.user_id AND u.tenant_id = m.tenant_id
  LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
                   'departmentId', d.id, 'name', d.name,
                   'isPrimary', da.is_primary = 1,
                   'assignmentId', da.id) ORDER BY da.is_primary DESC, d.sort_order, d.name) AS departments
          FROM iam_department_assignment da
          JOIN iam_department d
            ON d.id = da.department_id AND d.tenant_id = da.tenant_id
           AND d.organization_id = da.organization_id
         WHERE da.tenant_id = m.tenant_id
           AND da.organization_id = m.organization_id
           AND da.organization_membership_id = m.id
           AND da.status = 'active'
           AND ($3::text IS NULL OR da.department_id = $3)
       ) dept ON TRUE
  LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
                   'positionId', p.id, 'name', p.name, 'code', p.code,
                   'departmentId', da.department_id,
                   'isPrimary', pa.is_primary = 1) ORDER BY pa.is_primary DESC, p.name) AS positions
          FROM iam_department_assignment da
          JOIN iam_position_assignment pa
            ON pa.department_assignment_id = da.id AND pa.tenant_id = da.tenant_id
           AND pa.organization_id = da.organization_id
          JOIN iam_position p ON p.id = pa.position_id AND p.tenant_id = pa.tenant_id
         WHERE da.tenant_id = m.tenant_id
           AND da.organization_id = m.organization_id
           AND da.organization_membership_id = m.id
           AND da.status = 'active' AND pa.status = 'active'
       ) pos ON TRUE
  LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
                   'roleBindingId', rb.id, 'roleId', r.id, 'roleCode', r.code,
                   'scopeKind', rb.scope_kind, 'scopeId', rb.scope_id,
                   'dataScopeKind', rb.data_scope_kind, 'effect', rb.effect,
                   'effectiveTo', rb.effective_to) ORDER BY r.code) AS roles
          FROM iam_role_binding rb
          JOIN iam_role r ON r.id = rb.role_id AND r.tenant_id = rb.tenant_id
         WHERE rb.tenant_id = m.tenant_id
           AND rb.organization_id = m.organization_id
           AND rb.principal_kind = 'organization_membership'
           AND rb.principal_id = m.id
           AND rb.status = 'active'
           AND (rb.effective_to IS NULL OR rb.effective_to > to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSOF'))
       ) role ON TRUE
 WHERE m.tenant_id = $1
   AND m.organization_id = $2
   AND m.status = 'active'
   AND ($3::text IS NULL OR dept.departments IS NOT NULL)
   AND ($4::text IS NULL OR LOWER(COALESCE(NULLIF(m.display_name,''), u.display_name)) LIKE $4
        OR LOWER(COALESCE(u.email,'')) LIKE $4 OR COALESCE(u.phone,'') LIKE $4)
 ORDER BY m.joined_at DESC NULLS LAST, m.id
 LIMIT $5 OFFSET $6;
```

`departmentId + includeDescendants=true` 时，把 `$3` 换成部门闭包的 descendant 子查询（`iam_department_closure`），不递归应用层。

## 5. API 合同（`sdkwork-iam` backend-api，`/backend/v3/api/iam`）

统一 `sdkwork-v3` 信封（`{code,data,traceId}`），新增/变更操作补齐**typed schema**（现有目录操作仍是 `additionalProperties: true`，新操作的 DTO 必须显式定义，交由生成器产出类型）。

| 操作 | 方法/路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| `departments.list` | `GET /departments?organization_id=&q=&page…` | `iam.departments.read` | 新增 `organization_id`（snake_case，API_SPEC §13）；缺省回退上下文组织（兼容现有调用） |
| `departments.tree.retrieve` | `GET /departments/tree?organization_id=` | `iam.departments.read` | 新增 `organization_id`；节点含 `sortOrder`、`departmentKind`、`path` |
| `departments.update` | `PATCH /departments/{departmentId}` | `iam.departments.update` | 扩展：body 接受 `parentDepartmentId`（null=根，缺省=不动）与 `sortOrder`；命中树字段时走专用事务——校验同组织/非自身/非后代（closure），重写子树 `path`、重建跨边界 closure、规整同级 `sort_order`，并写审计。错误 `iam_department_parent_cycle`(400)、`iam_department_parent_not_found`(400)。与 `organizations.update` 的换父语义保持一致，不新增操作 |
| `organizationMemberships.list` | `GET /organization_memberships?organization_id=&department_id=&q=` | `iam.memberships.read` | 新增 `organization_id`/`department_id`；响应补 `phone`、`employeeNo`、`joinedAt`、`isPrimary` |
| `organizationMemberships.roster.list` | `GET /organization_memberships/roster?organization_id=&department_id=&include_descendants=&q=&page…` | `iam.memberships.read` | 已落地。一次返回人+多部门+岗位+角色（角色按有效期过滤），`department_id` 走部门闭包包含下级 |
| `organizationMemberships.departments.update` | `PUT /organization_memberships/{membershipId}/departments` | `iam.memberships.update` | 已落地。body `{organizationId, departments:[{departmentId,isPrimary}]}`；事务化 diff：新增/复活、关闭缺失项（`effective_to`）、保证唯一主部门（>1 报 400；全未标记时第一条为主）。岗位走 `position_assignments`，不在本操作内 |
| `roleBindings.list` | `GET /role_bindings?organizationId=&principalKind=&principalId=&includeExpired=` | `iam.role_bindings.read` | 新增过滤；响应补 `dataScopeKind`、`effectiveFrom/To` |
| `roleBindings.create` | `POST /role_bindings` | `iam.role_bindings.create` | body 增 `dataScopeKind`、`effectiveFrom/To`；`scopeKind=department` 时校验部门属于该组织 |
| `positions.create/update/list` | `/positions…` | `iam.positions.*` | 补 `rankLevel`（create 当前忽略）、`departmentId`（update/list 当前缺失），供"改岗位"选择器 |
| `positionAssignments.create/update` | `/position_assignments…` | `iam.assignments.create/update` | 支持换岗位：旧行 `status='inactive'` + `effective_to`，新行写入 |

兼容性：

- 现有调用不带新参数时行为不变（上下文组织兜底）。
- `departments.update` 保持原语义；换父只经 `departments.move`，避免 PATCH 语义过载。
- SDK：`sdkwork-iam-backend-sdk`/`app-sdk` 由 `pnpm api:materialize:openapi` + `pnpm sdk:generate:*` 从 OpenAPI 权威重新生成，**不手改生成物**；Cloud Router 通过 workspace 链接自动获得新方法。修复 `organizationId` 被丢弃的关键是 OpenAPI 参数补齐，而不是前端拼参数。

## 6. 交互设计（对齐专业后台）

### 6.1 布局

```
┌──────────────────────────────┬────────────────────────────────────────────────┐
│ 身份目录 · 人员管理           │ 研发中心 / 后端组        [搜索] [筛选] [+ 添加成员] │
│ [搜索组织/部门]               │ 共 128 人                                      │
│ ▼ 研发中心            ⋯      │ ┌────────────────────────────────────────────┐ │
│   ▼ 后端组            ⋯      │ │姓名│部门│邮箱│手机│岗位│角色│操作               │ │
│      平台小组         ⋯      │ │张三│后端组(主)、架构组│…│…│后端工程师│管理员│编辑   │ │
│   ▶ 产品部            ⋯      │ │…                                           │ │
│ ▼ 交付中心            ⋯      │ └────────────────────────────────────────────┘ │
│ [+ 新建组织]                 │ [分页]                                         │
└──────────────────────────────┴────────────────────────────────────────────────┘
```

- 左树顶层：组织（含"未分部门"虚拟节点用于展示未分配成员）；组织节点可展开加载部门。
- 节点悬浮操作：新建同级/子级、重命名、删除、查看成员。组织节点额外提供"组织设置"跳转。
- 右表标题显示当前路径（组织 / 部门），面包屑可点击切换；默认展示所选部门**含下级**。
- 列可排序（姓名/加入时间），列宽可调；手机号/邮箱脱敏开关（按权限）。

### 6.2 拖拽（树）

- 拖拽语义：拖到节点**中部** = 换父（reparent）；拖到**上/下边缘** = 同级重排（before/after）。
- 交互反馈：目标节点显示插入线或高亮；非法目标（拖入自身或后代、跨组织）禁用并显示提示。
- 持久化：`PATCH /departments/{id}`（`parentDepartmentId` + `sortOrder`）；乐观更新，失败回滚并 toast；成功后刷新该子树。
- 无鼠标可用性：节点聚焦后 `Alt+↑/↓` 同级移动、`Alt+←/→` 升降级（等价的 API 调用），保证键盘可达；`aria-grabbed`/`aria-dropeffect` 或按钮替代方案二选一，实施时以 WCAG 2.1 拖拽替代要求为准。
- 移动端：不做拖拽，提供"移动到…"菜单。

### 6.3 成员表

- 列：姓名（头像+花名+工号）、部门（主部门加粗 + `+N` 兼岗）、邮箱、手机号、岗位（多岗位逗号分隔）、角色（chips + "更多"）、状态、操作。
- 操作列：`编辑`（抽屉）、`改部门`、`改岗位`、`设置权限`、`...`（停用/移出）。
- 空态：部门无人时给出"添加成员/从其他部门调入"两个动作；错误态给出 `traceId` 与重试。
- 批量：勾选后批量改部门、批量授权（P2）。

### 6.4 成员抽屉

分 4 个分区，保存按分区提交（避免一次大表单）：

1. **基础信息**：姓名、工号、邮箱、手机号（编辑用户资料需 `iam.users.update`，只读降级）。
2. **部门任职**：多选部门，指定主部门；每行可挂岗位（下拉取自组织岗位目录）。保存 = `departments.replace`。
3. **角色与权限**：角色多选 + 作用域（组织/部门）+ 数据范围（本人/本部门/本部门及下级/本组织/全租户）+ 有效期；保存 = `roleBindings` diff。
4. **审计**：最近变更（`iam_audit_event` 只读）。

### 6.5 权限矩阵

| 区域 | 读取 | 编辑 |
| --- | --- | --- |
| 组织 | `iam.organizations.read` | `iam.organizations.create/update/delete` |
| 部门 | `iam.departments.read` | `iam.departments.create/update/delete` |
| 成员/任职 | `iam.memberships.read`、`iam.assignments.read` | `iam.memberships.update`、`iam.assignments.create/update` |
| 岗位 | `iam.positions.read` | `iam.positions.create/update/delete`、`iam.assignments.*` |
| 角色/权限 | `iam.role_bindings.read`、`iam.roles.read` | `iam.role_bindings.create/delete` |

无权限时按钮隐藏而非禁用（与现有 IAM 工作区一致），路由级由 `IAM_ADMIN_PERMISSION_HINTS` 兜底。

### 6.6 i18n 与无障碍

- 文案键前缀 `admin.iam.personnel.*`（zh-CN/en-US 同步；`check-i18n-standard` 校验键对齐）。
- 树节点带 `aria-level`/`aria-expanded`；拖拽有键盘替代；表格行操作按钮有 `aria-label`；焦点环可见；错误通过 `role="alert"` 播报。

## 7. 前端落点（Cloud Router PC）

- 页面归属：`apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-admin-iam/src/personnel/`
  - `PersonnelWorkspace.tsx`（左右布局 + 数据编排）
  - `PersonnelTree.tsx`（组织/部门树 + 原生 HTML5 拖拽，参考 `CascadeCategoryManager`）
  - `MemberTable.tsx`、`MemberDrawer.tsx`、`DepartmentDrawer.tsx`
  - `personnelController.ts`（唯一数据入口，基于 `getCloudRouterIamAdminService()`）
  - `personnelMessages.ts` + 两个 locale 文件
- 组合元数据（4 处，均在本包/宿主）：
  1. `IAM_ADMIN_MENU` 的 `admin.menu.iam.directory` 组增加 `{ path: '/admin/iam/personnel', labelKey: 'admin.menu.iam.personnel', icon: UsersRound }`；
  2. `IAM_ADMIN_ROUTE_RECORDS` 增加 `{ path: 'iam/personnel', requiredPermission: 'iam.memberships.read' }`；
  3. `IAM_ADMIN_PERMISSION_HINTS` 增加 `{ pathPrefix: '/admin/iam/personnel', requiredPermission: 'iam.memberships.read' }`（必须与路由记录同权限，`sdk-composition-standard.test.mjs:395-404` 会校验）；
  4. `cloudRouterAdminHostMount.tsx` 的 `IAM_ADMIN_ROUTE_ELEMENTS` + `lazyAdminRoute` + `index.tsx` 导出 `CloudRouterIamPersonnelAdmin`。
- 依赖：不引入拖拽库（原生 HTML5 已足够）；表格/抽屉/树复用 `@sdkwork/ui-pc-react` 现有组件；分页复用 `CatalogPagination`。
- 不在 UI 内拼 HTTP、不手写 auth header；全部经 `SdkworkIamService`。

## 8. 分阶段交付

| 阶段 | 内容 | 验证 |
| --- | --- | --- |
| P0（本设计） | 评审 schema 迁移 + API 增量 | 本文档 review |
| P1 | 迁移 0049 + fold + ledger；`departments.update` 换父/排序；`sortOrder`/`phone` 投影；组织/部门范围过滤 | `check-database-framework-standard`、`cargo check -p sdkwork-routes-iam-backend-api`、OpenAPI materialize |
| P2 | `organizationMemberships.roster.list`、`departments.update`（批量任职）、`roleBindings` 数据范围/有效期 | 已落地；契约校验通过（见 §10） |
| P3 | 前端页面（树+拖拽+成员表+抽屉）+ 组合元数据 + i18n | `pnpm typecheck`、`admin-sidebar-runtime.test.ts`、`sdk-composition-standard.test.mjs`、i18n/layering |
| P4 | SDK 重新生成、契约测试、a11y 回归 | `pnpm sdk:generate:*`、`check-api-operation-patterns`、`check-api-response-envelope` |

已知既有红项（与本设计无关，实施时需区分，不得当成回归）：`check:sql-scope` 12 条既有违规；`iam-database-init-standard.test.mjs` 的 19-vs-30 折叠账本；Cloud Router `sdk-composition-standard.test.mjs:317` 的 73-vs-70 陈旧计数。

## 9. 已确认决策

1. **跨仓实施**：已授权本会话直接修改 `sdkwork-iam`（schema/API 属主）并提交，先落 P1 后端，前端页面在下一阶段。
2. **岗位模型**：维持"岗位随部门任职"（`position_assignment` 挂在 `department_assignment` 上），不改岗位表结构。
3. **权限模型**：采用"角色 + 数据范围 + 有效期"（迁移 0049 提供字段；`roleBindings` 的写入/解析随 P2 落地）。
4. **组织范围**：允许左树展开多组织、按组织懒加载部门；列表接口以显式 `organizationId` 查询参数为准，缺省回退上下文组织。

## 10. 未完事项（P3）

- 已落地（P2）：`GET /organization_memberships/roster`（`organizationMemberships.roster.list`，人+多部门+岗位+角色 + 有效窗口过滤，支持 `organization_id`/`department_id`/`include_descendants`）与 `PUT /organization_memberships/{id}/departments`（`organizationMemberships.departments.update`，事务化批量任职 + 唯一主部门）。
- 已落地（P2b）：`roleBindings.create` 接受 `dataScopeKind`/`effectiveFrom/To` 并校验；`rbac_scope` 按有效期 fail-closed，部门作用域按成员在该部门的有效任职解析；数据范围字段已持久化并对外投影。
- 待落地（P3b）：成员抽屉里的角色/岗位编辑（调用 `roleBindings`/`positionAssignments`）、搜索/分页/批量、a11y 与页面级 vitest 用例。
