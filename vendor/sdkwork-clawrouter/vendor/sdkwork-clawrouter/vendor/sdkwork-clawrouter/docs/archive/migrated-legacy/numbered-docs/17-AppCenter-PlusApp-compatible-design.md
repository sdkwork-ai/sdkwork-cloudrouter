# AppCenter PlusApp 兼容设计

> **已废弃（Deprecated）** — 自 v4.1 起由 [30-platform-data-model-v4.md](./30-platform-data-model-v4.md) 取代。Greenfield 安装仅使用 `platform_app` + `c_category`，不再兼容 Java `plus_app`。

> 版本：0.1
> 日期：2026-04-28
> 适用范围：`apps/sdkwork-clawrouter-pc` 的 `/apps`、`/apps/:id`、首页 AppCenterPreview，以及 Console/Admin 中与 App 管理相关的页面。

## 1. 结论

AppCenter 必须沿用 Java 侧 `PlusApp` 设计体系，数据库主数据表固定为 `plus_app`。`sdkwork-clawrouter` 不再为 AppCenter 新建 `studio_app_*` 三类应用主数据表，避免与 `legacy-java-plus-entity`、`legacy-java-plus-app-api`、`legacy-java-plus-backend-api` 产生双主数据和路径不一致问题。

`studio_catalog_action` 可以继续保留，但定位只能是应用/技能市场的行为事实表，用于下载、收藏、评分、评论等事件和聚合重算；它不是 AppCenter 的应用主数据表。

## 2. 数据源边界

| 能力 | 标准数据源 | 说明 |
| --- | --- | --- |
| 应用基础信息 | `plus_app` | `name`、`description`、`version`、`icon_resource_snapshot`、`access_url`、`status`、`app_type`；API/view model 输出 `icon: MediaResource` |
| 应用分类 | `plus_category` | App Store 分类统一读取 `plus_category` 中 `type=999999`、`group_name=app-store` 的分类树；`plus_app.app_type` 仅保留为应用运行类型/兼容字段，不再作为分类事实来源 |
| 开发者名称 | `plus_user` + `plus_app.user_id` | Java `AppStoreAppService` 优先取 `PlusUser.nickname/username`，兜底取 `installSkill.name` 或 `SDKWork` |
| 图标/封面/截图 | `plus_app.icon_resource_snapshot`、`plus_app.cover_resource_snapshot`、`plus_app.resource_list` | 前端 `image/screenshots` 保持为 `MediaResource` 对象，由适配层从资源列表筛选 cover/screenshot；只在 `<img>`/下载等具体边界解析 URL |
| 平台支持 | `plus_app.platforms`、`plus_app.install_platforms` | 对应前端 `PlatformType` 与 `OS` 筛选能力 |
| 下载包 | `plus_app.install_config` | `AppDetailVO.releases/currentRelease` 已将 install packages 和 release notes 解析为前端下载所需结构 |
| 发布说明 | `plus_app.release_notes` | 对应前端 `whatsNew`、版本号、发布时间、当前版本 |
| 访问/商店/直链 | `plus_app.access_url`、`plus_app.store_url`、`plus_app.download_url` | Web/H5 走访问地址，App 包走下载包或商店地址 |
| 评分/下载/收藏 | `studio_catalog_action` 聚合 | 行为事实可以写入 `studio_catalog_action`，列表展示值由聚合投影提供 |

## 3. Java API 契约

Public AppCenter 走 app-api 标准，返回 `PlusApiResult<T>`，路径固定如下：

| 用途 | Java 路径 | 返回 |
| --- | --- | --- |
| 应用商店列表 | `GET /app/v3/api/app/store` | `PlusApiResult<Page<AppVO>>` |
| 应用商店分类 | `GET /app/v3/api/app/store/categories` | `PlusApiResult<List<AppStoreCategoryVO>>` |
| 应用商店详情 | `GET /app/v3/api/app/store/{appId}` | `PlusApiResult<AppDetailVO>` |

用户自有 App 管理走 app-api 标准，路径固定为 `/app/v3/api/app/manage`：

| 用途 | Java 路径 |
| --- | --- |
| 创建应用 | `POST /app/v3/api/app/manage` |
| 查询自有应用详情 | `GET /app/v3/api/app/manage/{appId}` |
| 更新应用 | `PUT /app/v3/api/app/manage/{appId}` |
| 发布说明 | `GET/PUT /app/v3/api/app/manage/{appId}/release-notes` |
| 发布检查 | `GET /app/v3/api/app/manage/{appId}/publish/readiness` |
| 发布计划 | `GET/PUT /app/v3/api/app/manage/{appId}/publish/plan` |
| 发布预览 | `POST /app/v3/api/app/manage/{appId}/publish/preview` |
| 我的应用 | `GET /app/v3/api/app/manage/my` |
| 项目应用 | `GET /app/v3/api/app/manage/project/{projectId}` |
| 搜索应用 | `GET /app/v3/api/app/manage/search` |

Backend/Admin 走 backend-api 标准，路径沿用 Java：

| 用途 | Java 路径 |
| --- | --- |
| 后台 App CRUD | `/backend/v3/api/app` |
| App 聚合后台能力 | `/backend/v3/api/app/admin` |

因此 `sdkwork-clawrouter` 不能新增 `/appcenter/*`、`/portal/apps/*`、`/claw-router/apps/*` 之类路径。前端服务适配层只能在本地把 Java DTO 转换成现有页面需要的 `App`/`AppRelease` view model，不能要求修改 `apps/sdkwork-clawrouter-pc` 的 UI 视觉设计。

## 4. 前端字段映射

当前前端 `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-app-center/src/data/apps.ts` 的模型如下：

| 前端字段 | Java DTO/数据库来源 | 处理规则 |
| --- | --- | --- |
| `id` | `AppVO.appId` / `plus_app.id` | API 层按 string 输出，避免 JS int64 精度问题 |
| `name` | `AppVO.name` / `plus_app.name` | 直接映射 |
| `developer` | `AppVO.developer` | 由 `PlusUser` 或 `installSkill.name` 补齐 |
| `category` | `AppVO.category` | 由 `plus_category.name` 投影；前端无需改 UI |
| `image` | `icon: MediaResource`、`cover: MediaResource`、`resourceList.cover` | 优先图标资源，再取资源列表首个 cover；view model 保持媒体对象，图片 URL 只在渲染边界读取 |
| `rating` | `studio_catalog_action` 聚合 | 无行为数据时可返回默认空值/0，不写入 `plus_app` |
| `downloads` | `studio_catalog_action` 聚合 | 前端展示文本由适配层格式化，例如 `450k+` |
| `description` | `AppVO.description` / `plus_app.description` | 直接映射 |
| `screenshots` | `plus_app.resource_list` | 筛选 `screenshot`/`preview`/`cover` 资源 |
| `features` | `plus_app.config.features` 或 `installConfig.metadata.features` | 保持 JSON 扩展，避免新增表 |
| `releases[]` | `AppDetailVO.releases/currentRelease` | Java 已由 `releaseNotes + installConfig.packages` 解析 |
| `release.version` | `AppReleaseNote.version` 或 package version | 优先 release note |
| `release.size` | `AppInstallPackage.metadata.sizeText/size` | 由适配层格式化 |
| `release.releaseDate` | `AppReleaseNote.publishedAt` | Web 连续发布可显示 `Continuous` |
| `release.downloadUrl` | `AppInstallPackage.downloadUrl`、`storeUrl`、`downloadUrl`、`accessUrl` | 按平台和包类型解析 |
| `release.whatsNew` | `AppReleaseNote.summary/content/highlights` | 优先 summary，再 content/highlights |

## 5. 数据库调整

Schema Registry 已按以下原则调整：

1. 新增 `plus_app` 作为 `/`、`/apps`、`/apps/:id`、`/console/app`、`/admin/app` 的主数据表。
2. `plus_app.generated_by_this_project=false`，`write_owner=legacy-java-plus-entity`，`compatibility_rule=keep_physical_structure_identical`。
3. 移除 AppCenter 专属 `studio_app_*` 物理表。应用条目、版本、媒体等概念收敛为 `plus_app` 的视图投影，不再建第二套应用表。
4. SkillsHub 同样收敛到 Java AgentSkills 体系，主数据使用 `plus_agent_skill`、`plus_agent_skill_package`、`plus_user_agent_skill`，分类使用 `plus_category`。
5. `studio_catalog_action.target_type` 必须能区分 `APP` 和 `SKILL`，其中 `APP` 的 `target_id` 指向 `plus_app.id`，`SKILL` 的 `target_id` 指向 `plus_agent_skill.id`。

## 6. 实现约束

- 不改变 `apps/sdkwork-clawrouter-pc` 的 UI 视觉设计和页面交互，所有差异由 service adapter 或 DTO mapper 解决。
- AppCenter API 必须与 Java app-api/backend-api 保持路径、响应包裹、字段命名一致，支持从 mock 数据自由切换到 Java SDK。
- `plus_app` 的物理表结构以 `legacy-java-plus-entity` 为准，Rust/Java/TypeScript 只能生成兼容模型，不能在 claw-router 内另起一套 App 表。
- 如果未来需要更复杂的应用市场运营能力，优先扩展 `plus_app.config/resource_list/install_config/release_notes` 的 JSON 契约，或增加独立的行为/投影表；不得再为 AppCenter 新建第二套应用主表。
