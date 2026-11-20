# 应用中心「应用模板库 → 脚手架」重构记录

- 日期：2026-11-21
- 范围：`sdkwork-cloudrouter`（应用中心管理端）、`sdkwork-deployments`（Deploy scaffold 权威）、`sdkwork-appstore`（脚手架引用与文档对齐）、`sdkwork-specs`（工厂标准的落地状态证据）
- 结论：应用中心模板库已整体切换为**应用脚手架（Application Scaffold）**；Deploy 对外契约与 `deploy_application_scaffold*` 数据库设计对齐；SDK 重新生成；CloudRouter、Deployments PC/H5/小程序消费方同步迁移；契约、类型、单测与门禁通过。

## 1. 契约对齐（Deploy app-api / backend-api）

| 领域 | 目标 |
| --- | --- |
| 脚手架 CRUD | `/app/v3/api/scaffolds`、`/backend/v3/api/scaffolds`；operationId `scaffolds.*` |
| 脚手架版本 | `/app/v3/api/scaffolds/{scaffoldUuid}/versions`；operationId `scaffolds.versions.*` |
| 分类 | `/app/v3/api/scaffold_categories`、`/backend/v3/api/scaffold_categories`；operationId `scaffolds.categories.*` |
| 市场浏览/安装 | `/app/v3/api/marketplace/scaffolds`；operationId `marketplace.scaffolds.*` |
| 权限 | `deploy.scaffolds.read/write`、`deploy.scaffoldCategories.read/write`、`deploy.marketplaceScaffolds.read` |
| 保留契约 | 数据库列与线字段 `templateKey` / `templateType` / `templateVersion`（`deploy_application_scaffold` 的稳定身份）；订单主题 `app_template`；审计动作 `app.template.install` |

破环性变更与迁移表记录在 `sdkwork-deployments/apis/CHANGELOG.md`。Deploy 为 pre-launch，直接切换，不保留旧别名。

## 2. 数据库与后端实现

- 数据库保持 `deploy_application_scaffold` / `_category` / `_version` 权威，无需新增迁移。
- Rust 契约、服务、仓储、路由模块重命名为 scaffold 词汇：
  - `sdkwork-deploy-contract::scaffold_market`
  - `sdkwork-intelligence-deploy-repository-sqlx::scaffold_market`
  - `sdkwork-intelligence-deploy-service::{scaffold_install, scaffold_market_access}`
  - `sdkwork-routes-deploy-app-api::scaffold_market_routes`
- OpenAPI YAML、materialized JSON、route manifest、SDK 生成输入全部重新物化。
- 付费安装校验函数改为 `verify_paid_application_scaffold_order`，订单主题仍为 `app_template`。

## 3. 应用中心前端

- 路由：
  - 运营菜单入口保持需求指定的 `/admin/applications/templates`，直接渲染**脚手架库**；`template-reviews` / `template-categories` 同样直接渲染脚手架审核/分类页。
  - 脚手架词汇别名：`/admin/applications/scaffolds`、`/admin/applications/scaffold-reviews`、`/admin/applications/scaffold-categories` 渲染同一套页面。
  - 两条路径均不经过重定向，避免出现"打开旧 URL 看不到新页面"的验收歧义。
- 菜单：`admin.menu.appCenter.scaffoldsGroup` / `scaffolds` / `scaffoldReviews` / `scaffoldCategories`。
- 页面/组件重命名：`ApplicationScaffoldManagementPage`、`ApplicationScaffoldCategoryPage`、`ScaffoldReviewQueuePage`、`ApplicationScaffoldPanel`、`ApplicationScaffoldFormDrawer`、`ApplicationScaffoldVersionsDrawer`、`ApplicationScaffoldCategoryPanel`、`ScaffoldCategoryFormDrawer`、`ScaffoldReviewDrawer`。
- 视图模型使用 `scaffoldKey` / `scaffoldType` / `scaffoldUuid`；服务层把数据库对齐的 `templateKey` / `templateType` 线字段映射为脚手架视图模型。
- 新增「使用脚手架创建应用」抽屉：填写应用名称/可选 slug 后调用 `marketplace.scaffolds.install`，创建独立部署应用；面板新增形态列。
- 概览/分析/权限/分类导入导出全部切换为 scaffold 词汇；分类导出 kind 为 `scaffold-categories`。

## 4. Deployments 消费方

- PC：`@sdkwork/deployments-pc-admin-app-templates` → `@sdkwork/deployments-pc-admin-scaffolds`；admin registry、marketplace console、i18n、资源键同步。
- H5：marketplace service / i18n / 测试迁移到 `client.app.scaffolds.*` 与 `client.app.marketplace.scaffolds.*`。
- 小程序：catalog 路径改为 `scaffold_categories` / `marketplace/scaffolds` / `scaffolds`；订单中心路径与 `app_template` 主题保持不变。
- 三个 app 的 `agent.app.config.json` 权限清单更新为 scaffold 权限。
- Vite 增加 TypeScript-first 解析顺序，避免被 `generated/server-openapi/src/*.js` 历史构建残留遮蔽。
- Agent skills 与 API map 由生成器重新产出。

## 5. Appstore 对齐

- appstore 源码已不存在第二套脚手架/模板族；仅更新目录服务测试与注释中的 Deploy 路径为 `/app/v3/api/scaffolds`。
- 数据库文档/注册表统一为 `appstore_application_listing_price`（与 0007 迁移后的物理名一致）。
- appstore 仍**不**发布 listing-price 金额/币种契约；见 §7。

## 6. 验证证据

| 门禁 | 结果 |
| --- | --- |
| `cargo test -p sdkwork-deploy-contract -p sdkwork-intelligence-deploy-service -p sdkwork-routes-deploy-app-api -p sdkwork-routes-deploy-backend-api --lib` | 26 + 129 + 3 passed |
| `cargo test -p sdkwork-routes-deploy-backend-api --test backend_route_manifest` | 3 passed |
| `cargo test -p sdkwork-routes-appstore-catalog-app-api --test route_manifest` | 3 passed |
| `node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .` | passed |
| `node ../sdkwork-specs/tools/check-api-response-envelope.mjs --workspace .` | passed |
| `node --test tests/contract/openapi-materialization.contract.test.mjs` | passed |
| `pnpm --dir sdks/...-app-sdk-typescript typecheck` / backend | passed |
| `pnpm --dir apps/sdkwork-deployments-pc exec tsc -p tsconfig.json --noEmit`（本仓包） | 0 个本仓错误 |
| `pnpm --dir apps/sdkwork-deployments-pc exec vitest run`（scaffold 相关 3 文件） | 13 passed |
| H5 marketplace vitest | 8 passed |
| 小程序 `pnpm test` / `pnpm typecheck` | 8 passed / 0 |
| `node ../sdkwork-specs/tools/verify-repo.mjs --root .`（Deploy） | passed |
| `check-application-layering.mjs`（CloudRouter / Deploy） | passed |
| `check-i18n-standard.mjs`（CloudRouter / Deploy） | passed |
| CloudRouter `pnpm typecheck`（owned sources） | passed |
| CloudRouter admin-application tsc | 0 errors |
| CloudRouter scaffold 单测（7 文件） | 28 passed |
| `admin-sidebar-runtime.test.ts` | 8 passed |
| `check-application-factory-standard.mjs --root . --workspace ..` | 5 组、0 失败 |
| `check:agent-skills` / `check:agent-skills-sdk` | passed |
| `test:agent-skills-sdk` | 13 passed |
| Appstore `verify-repo` / layering / Rust naming | passed（gateway 改走 assembly 集成点、workspace registry 同步） |

## 7. 已知剩余项（非本次引入）

1. **Appstore listing-price 权威**：`appstore_application_listing` 仍只有 `pricing_model` / `commerce_product_id`，没有价格金额/币种字段或 API。Deploy 的 scaffold 价格仍是付费/免费判定并直连 `commerce_order`；要收口需 appstore 先发布 listing-price 契约。已记录在 `APPLICATION_FACTORY_DEPLOYMENT_SPEC.md` §13。
2. **CloudRouter `verify-repo` 预置失败（与本重构无关）**：H5 既有 `frontend-adapter` layerRole、feature 包直连生成 SDK、order-app-sdk 元数据缺失等历史项。Appstore 的两项已在本轮修复（gateway 改走 assembly 集成点 + workspace registry 同步），`verify-repo` 已通过。
3. **小程序路由文件名**：页面仍是 `pages/my-templates/`，内容与 API 已切换为脚手架；重命名原生页面目录会改变小程序路由，需产品确认后单独迁移。
