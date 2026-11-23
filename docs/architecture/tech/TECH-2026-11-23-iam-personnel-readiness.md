# IAM 人员管理 商业化交付就绪度门禁（Gap & Acceptance）

- 日期：2026-11-23
- 关系：补充 [人员管理设计](./TECH-2026-11-23-iam-personnel-management-design.md)（该文描述目标形态与 P1–P3 已落地部分）
- 结论先行：当前是**功能纵切面**（前端页面 + IAM 接口 + 迁移已合并，类型/契约校验通过），**尚不满足商业化交付**。下列 G1–G12 是按门禁排序的差距清单，每项给出验收口径；P4/P5/P6 为建议实施顺序。

## 成熟度判定

| 维度 | 现状 | 商业化要求 |
| --- | --- | --- |
| 功能完整度 | 树/成员/多部门/角色已可用；岗位内联编辑、分页检索 UI、批量操作缺 | 全流程闭环 + 批量/导入导出 |
| 正确性验证 | 仅 `cargo check` / TS typecheck / 既有单测 | PG 集成测试覆盖迁移与并发、契约测试、E2E |
| 数据安全 | 角色数据范围字段已持久化，行级过滤无消费方 | 数据范围语义落到查询层 + 隔离测试 |
| 可运维性 | 迁移未在库上执行；无回滚演练 | 迁移演练、drift 门禁、回滚预案 |
| 性能 | roster 为 LATERAL 聚合，未 EXPLAIN、未压测 | 索引验证 + 大组织压测 + 游标分页 |
| 可观测性 | 审计写入；无指标/SLO | 关键路径指标 + 告警 + runbook |

## 门禁清单

### G1 迁移上线与回滚（阻断级）
- 0049 仅折叠入库，未在任何 PostgreSQL 上执行；需 `db:plan → db:migrate → db:drift:check` 全绿，并对含脏主部门数据的库验证归一化语句。
- 锁窗口评估：`ALTER TABLE` 在 `iam_department`/`iam_role_binding` 上取表锁，需给出生产窗口与 `lock_timeout` 实测。
- 回滚：迁移声明 `forward-fix`，需写明降级方案（保留新列、应用回退到旧版本时的兼容读）。
- 验收：预发库迁移 + 应用启动 drift 通过 + 旧版本应用仍可读写（新列默认值兼容）。

### G2 并发与一致性（阻断级）
- 部门换父/排序与「批量改部门」都无乐观锁版本校验；并发拖拽可能互相覆盖同级序号。
- 建议：`iam_department` 增加 `version`，`departments.update` 接受 `expectedVersion`，冲突返回 409；批量任职按成员维度加行锁（`SELECT ... FOR UPDATE`）。
- 验收：并发用例（两请求同时 move 同一子树）一个成功一个 409，无脏路径。

### G3 授权语义闭环（阻断级）
- `data_scope_kind` 已写入但无消费方：`department/department_and_children` 尚未在数据查询中生效。
- 建议：在 roster/列表等数据读取处按绑定数据范围过滤；补 `rbac_scope` 单测（过期、部门作用域、deny 优先）。
- 验收：授权 `department` 范围的成员只能看到该部门数据；过期授权立即失效；deny 覆盖 allow。

### G4 安全与隔离（阻断级）
- 缺跨租户隔离测试（部门/任职/角色绑定）；缺成员敏感字段（phone/email）脱敏策略与字段级权限。
- 建议：租户 A token 访问租户 B 部门/成员必须 404/403；按 `iam.users.read` 或专用权限决定 phone/email 可见性。
- 验收：隔离用例全绿；脱敏开关生效且有审计。

### G5 主部门/岗位业务规则（高）
- 删除部门、成员离职、组织迁移时的任职与岗位悬挂未定义。
- 建议：删除部门前校验 active 任职并返回明确 409；离职自动关闭任职（`effective_to`）；主岗位唯一性已有索引，需补业务校验错误码。
- 验收：规则用例 + 错误码文档。

### G6 岗位完整能力（高）
- 页面缺岗位内联编辑（`positionAssignments`），岗位目录 CRUD 未在页面暴露，`positions.list` 不返回 `departmentId/rankLevel`。
- 验收：可改岗位、可换岗位保留历史；一人多岗主岗唯一。

### G7 列表/检索/分页（高）
- 页面写死 `pageSize: 200`，无分页 UI、无排序、无导出；超过 200 的成员静默截断。
- 验收：服务端分页 + 游标、总数可见、排序、导出 CSV（权限控制）。

### G8 前端工程质量（中）
- 缺错误边界、骨架屏、空态引导、行内编辑并发提示；拖拽键盘提示未在 UI 文案中说明。
- 验收：断网/超时/401 有可恢复提示；Lighthouse a11y 无阻断项。

### G9 测试矩阵（高）
- Rust：PG 集成测试（迁移、move 环校验、path/closure 重建、批量任职 diff、roster 聚合）。
- 前端：页面组件测试（mock service）+ 组合元数据测试 + E2E（登录→选组织→拖拽→改部门→授权）。
- 验收：CI 中上述用例稳定通过。

### G10 性能与容量（高）
- roster 三个 LATERAL 聚合在万人组织下的耗时未知；需 EXPLAIN 与索引复核（`idx_iam_department_assignment_department`、`idx_iam_role_binding_principal`）。
- 验收：P95 < 300ms（1000 部门/1 万成员样本），无 N+1。

### G11 企业 SaaS 能力（中）
- 批量导入成员（CSV/SCIM）、组织/部门模板、审批流、自定义字段、租户级配额与限流未覆盖。
- 验收：按商业版本裁剪后形成明确能力清单，未实现项在 UI 隐藏而非静默失败。

### G12 交付物与运维（中）
- 缺发布说明、迁移 runbook、值班手册、SLO 与告警阈值。
- 验收：上线检查单（迁移/回滚/验证/回退）可被他人独立执行。

## 建议实施顺序

1. **P4（阻断项收敛）**：G1 迁移演练 + G2 并发版本号 + G3 数据范围消费 + G4 隔离/脱敏测试。
2. **P5（功能补全）**：G6 岗位编辑 + G7 分页/检索/导出 + G5 业务规则。
3. **P6（工程质量）**：G9 测试矩阵 + G10 性能 + G8 前端打磨 + G11/G12 交付物。

每阶段以「门禁用例通过 + 文档更新 + 提交」为完成定义；未过门禁不得宣称商业化就绪。

## 进度台账（按目标轮次更新）

| 门禁 | 状态 | 证据 |
| --- | --- | --- |
| G2 并发乐观锁 | ✅ 完成 | 迁移 0050 + `expectedVersion`/409 + 前端携带与失败刷新（`57fb9dc0`、`8e0dec1a`、`4119fd77`） |
| G5 业务规则 | 🟡 部分 | 删除部门守卫（子部门/active 任职 409，`e4deb6d0`）；离职与组织迁移规则待做 |
| G7 分页检索 | 🟡 部分 | roster 服务端分页 + pageInfo + 重置页（`ebb91784`）；排序/CSV 导出待做 |
| G3 数据范围 | 🟡 接线完成，待 PG 用例 | 解析器/遗留语义/装载器（`7141d67f`、`da7dc6aa`、`8665e140`）；roster 谓词按 tenant/organization/department(+children)/self 强制（`27f78dd0`）；尚缺真库集成用例 |
| G4 隔离/脱敏 | ⏳ | 无跨租户用例、无字段级可见性 |
| G1 迁移演练 | 🟡 前向 + 重放通过，回滚待做 | 真库 `plan → migrate → status → drift-check` exit 0；**重放 migrate 应用 0 条**，`status=clean pending_migrations=0`，证明迁移账本幂等；仍缺旧应用兼容/回滚演练与预发证据 |
| G6/G8–G12 | ⏳ | 见上文清单 |

### G3 落地方案（下一轮执行口径）

在 roster 与成员列表读取前解析调用方的有效绑定（`rbac_scope` 已有查询），取 `data_scope_kind` 的最高约束并转成 SQL 谓词：

- `tenant` → 无附加谓词；`organization` → `m.organization_id = $org`；
- `department` / `department_and_children` → 成员任职部门命中绑定部门（含闭包下级）；
- `self` → `m.user_id = caller`；
- 多个绑定取并集，`deny` 先于 `allow`；
- 解析失败 fail-closed（返回空集），并记录审计事件。

验收：单测覆盖 5 种 scope 的谓词生成 + 一个跨租户 404 用例。

### G3 接线前的语义修正（本轮发现）

`resolve_data_scope` 现已把未知值与 `scope` 都收敛到 `SelfOnly`，这对**未知值**是正确
的 fail-closed，但对 `scope` 是错的：`data_scope_kind='scope'` 的既有行（迁移 0049 之前
创建、迁移默认值）语义是"与绑定自身 scope 一致"，可能是 tenant 或 organization 级。
若直接接入 roster，会把所有存量管理员权限收窄成"只看自己"，属于严重误拒。

因此接线顺序必须是：

1. 解析调用方的 allow 绑定行 `(scope_kind, scope_id, data_scope_kind)`；
2. `data_scope_kind='scope'` 先按 `scope_kind` 展开：`tenant`→Tenant、
   `organization`→Organization、`department`→Department，再交给
   `resolve_data_scope` 取最宽；
3. 谓词（组织维度已在 handler 前置限定）：

```sql
AND ($8::text IS NULL OR $8 = 'organization'
     OR ($8 = 'self' AND m.user_id = $10)
     OR ($8 IN ('department', 'department_and_children') AND EXISTS (
          SELECT 1 FROM iam_department_assignment dsa
           WHERE dsa.tenant_id = m.tenant_id
             AND dsa.organization_id = m.organization_id
             AND dsa.organization_membership_id = m.id
             AND dsa.status = 'active'
             AND (dsa.department_id = ANY($9)
                  OR ($8 = 'department_and_children' AND dsa.department_id IN (
                       SELECT c.descendant_department_id FROM iam_department_closure c
                        WHERE c.tenant_id = m.tenant_id
                          AND c.organization_id = m.organization_id
                          AND c.ancestor_department_id = ANY($9)))))))
```

4. 绑定解析失败或权限码缺失 → 返回空集并写审计，不降级为全量。




## 未经评审不得越过的红线

- 不手改生成 SDK；契约变更走 OpenAPI 权威 + 生成器。
- 迁移以新号码forward-fix，不回改历史迁移。
- 权限/隔离类改动需安全评审；生产迁移需变更窗口与回滚演练。
