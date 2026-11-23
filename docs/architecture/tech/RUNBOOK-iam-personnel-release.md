# IAM 人员管理 发布 Runbook（G12）

- 适用：包含迁移 0049/0050/0051 的 IAM 模块发布，以及 `/admin/iam/personnel` 页面首次上线
- 权威：`DATABASE_FRAMEWORK_SPEC.md`、`DEPLOYMENT_SPEC.md`、`MODULE_BIN_SPEC.md`
- 原则：前向修复（forward-fix）优先；任何降级都必须能证明新列对旧应用只读兼容

## 1. 发布前检查（缺一不可）

- [ ] 迁移集与库一致：`sdkwork-iam-db --app-root . status` → `status=clean pending_migrations=0`
- [ ] 无 schema 漂移：`… drift-check` → `drift check passed`
- [ ] 全量备份完成，且**做过一次恢复演练**（`bin/backup.sh create/verify`）
- [ ] `agent.app.config.json` 的 `release.currentVersion` 已 bump（新行为必须新 tag）
- [ ] 应用与契约同步：`api:materialize:openapi` 后 `sdk:generate:*` 的产物已随版本发布
- [ ] 变更窗口与负责人明确；生产变更需 `--yes`

## 2. 迁移特性与回退姿势

| 迁移 | 可逆 | 回退姿势 |
| --- | --- | --- |
| 0049 部门排序/唯一主部门/角色数据范围 | 否 | forward-fix；新列均有默认值，旧应用可继续读写 |
| 0050 部门/任职版本号 | 否 | forward-fix；旧应用写 `version` 默认 0，不读该列 |
| 0051 roster 覆盖索引 | 是 | 有 `.down.sql`，可 `DROP INDEX` |

回退判断：若出现数据错误，先评估「停用新入口 + 回退应用」是否足够；**不要**用重建库或清表处理。

## 3. 发布步骤

1. `sdkwork-iam-db plan`：确认仅包含预期的 0049/0050/0051（或后续新增）；
2. `sdkwork-iam-db migrate`：记录 `applied N migration(s)` 与耗时；
3. `sdkwork-iam-db status` + `drift-check`：必须 clean / passed；
4. 发布应用镜像（`bin/docker-image.sh build` → `bin/docker-deploy.sh install --environment <env>`）；
5. `bin/docker-deploy.sh status --environment <env>` + 健康检查；production 用 `--yes`；
6. 首次访问 `/admin/iam/personnel` 做第 4 节冒烟。

## 4. 冒烟清单（发布后 10 分钟内）

- [ ] 组织下拉可加载；部门树按 `sortOrder` 展示；
- [ ] 拖拽一个部门换父成功；再并发拖同一节点应得到 409 提示并自动刷新；
- [ ] 新建/删除部门：有子部门或活跃成员时删除返回 409 且提示明确；
- [ ] 成员表分页、搜索、导出 CSV 可用；手机号/邮箱为空时显示占位；
- [ ] 多部门编辑：设主部门后保存，刷新后主部门标记唯一；
- [ ] 角色勾选保存后，成员行角色 chips 与重新进入抽屉的状态一致；
- [ ] 不同数据范围的账号看到不同成员集合（至少验证 self / department 两个维度）。

## 5. 观测与告警（首版阈值，按实测校准）

| 指标 | 告警阈值 |
| --- | --- |
| roster P95 延迟 | > 800ms 持续 5 分钟 |
| `iam_department_version_conflict` 比例 | > 1% 请求 |
| 迁移相关启动失败 | 任意一次即告警 |
| `drift` 非 clean | 启动即阻断并告警 |

## 6. 故障处理

- **迁移失败**：回滚应用版本（保留库结构），按报错修迁移后以新版本号前向修复；禁止手改已应用迁移。
- **数据范围疑似错误**：立即停用页面入口（菜单/路由下架），保留审计事件，按 `SDKWORK_*` 权限矩阵复核绑定，再前向修复。
- **性能劣化**：`EXPLAIN (ANALYZE, BUFFERS)` roster 主查询，确认命�� `idx_iam_organization_membership_org_joined` 与 `idx_iam_department_assignment_membership`。

## 7. 关联文档

- 设计与领域模型：[TECH-2026-11-23-iam-personnel-management-design.md](./TECH-2026-11-23-iam-personnel-management-design.md)
- 就绪度门禁与进度台账：[TECH-2026-11-23-iam-personnel-readiness.md](./TECH-2026-11-23-iam-personnel-readiness.md)
