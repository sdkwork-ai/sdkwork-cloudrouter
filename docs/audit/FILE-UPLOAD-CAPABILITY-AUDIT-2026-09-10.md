# CloudRouter 文件上传能力全面审计（2026-09-10）

审计目标：确认 CloudRouter 前后端所有文件上传能力是否统一收敛到 `sdkwork-drive`
封装、是否分门别类可维护、是否支持按用户独立统计存储用量、是否支持多 vendor
存储提供商可配置。

结论速览：

- **架构方向正确**：CloudRouter 自身不实现文件存储与上传，Drive App API /
  Admin Storage API 均以联邦贡献方式从上游仓 `../sdkwork-drive` 注入。
- **前端已无影子上传**：不存在自建 `/v1/files`、FormData 文件提交、base64 内联、
  XHR/axios 上传。
- **存在三类实质缺口**：录入型媒体字段仍是 URL 文本框（头像/logo/封面）；
  仓内 8 个 `sdkwork-file-*` 包零接线且枚举与 Drive 现实不符；per-user 存储统计
  在 Drive 侧仅有租户级端点。
- **存在一处破损遗留面**：`/backend/v3/api/storage/*` 治理面读取的
  `object_provider` / `object_bucket` / `storage_quota_policy` /
  `storage_usage_counter` 表在本仓 migration 中**不存在**。

---

## 1. 上传能力的真实归属

| 层 | 归属 | 证据 |
|---|---|---|
| Drive App API `/app/v3/api/drive/*` | 上游 `sdkwork-drive`（联邦贡献） | `crates/sdkwork-routes-cloudrouter-app-api/src/drive_runtime.rs:44-79` |
| Drive Admin Storage `/backend/v3/api/drive/storage/*` | 上游 `sdkwork-drive`（联邦贡献） | `crates/sdkwork-routes-cloudrouter-backend-api/src/routes.rs:901-927` |
| Drive Open API 能力闸门 | CloudRouter 薄壳（仅能力归属判定） | `crates/sdkwork-routes-cloudrouter-drive-open-api/src/lib.rs:13-18`、`crates/sdkwork-cloudrouter-http/src/open_api_capability.rs:161-173` |
| `/v1/files`、`/v1/uploads` | **不是本仓上传实现**，是 OpenAI 透传分类 | `services/sdkwork-cloudrouter-router-service/src/application/invocation/openai_classifier.rs:286-337` |

依赖声明：`Cargo.toml:312` → `../sdkwork-drive/crates/sdkwork-api-drive-assembly`。
合并仅在 PostgreSQL 生效（SQLite/desktop 跳过），见 `drive_runtime.rs:60-79`。

**判定：后端上传归属正确，无需新建实现。**

---

## 2. 前端上传点逐项盘点

### 2.1 已正确接入 Drive SDK

| 上传点 | 位置 | 机制 |
|---|---|---|
| 站点设置二维码（公众号 / 社群） | `apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-admin-site/src/qrCodeUpload.ts:17` | `client.uploader.upload({ uploadProfileCode:'image', scene:'admin_site_settings_qr_code', retention:{mode:'long_term'} })` + `shareLinks.create` |
| Playground 参考图/视频/音频 | `apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-playground/src/pages/Playground.tsx:24-41` | 注入 `getDriveAppSdkClient` 给外部 `@sdkwork/agents-pc/workbench` |
| 存储提供商配置 UI | `apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-admin-storage/src/storageService.ts` | 包装 Drive 自有 PC 包 `sdkwork-drive-pc-admin-storage-providers` |
| 存储配置路由 | `apps/sdkwork-cloudrouter-pc/src/admin/cloudRouterAdminHostMount.tsx:145` | `route('storage/:sectionId?', ...)` 已注册 |

Drive 媒体引用工具（读写与预签名下载）：
`apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudroutes-pc-commons/src/drive-media.ts`
（`uploadResultToDriveMediaResource`、`attachDriveShareToken`、`resolveDriveMediaUrl`、
`useResolvedMediaResourceUrl`；`drive://spaces/<spaceId>/nodes/<nodeId>` URI 形式）。

### 2.2 缺失：录入型媒体字段无上传入口（仍是 URL 文本框）

| 业务面 | 位置 | 现状 |
|---|---|---|
| 用户头像 | `.../sdkwork-cloudrouter-pc-console-user/src/UserView.tsx:116-126`、`userService.ts:57` | 仅展示后端 avatar，**无上传入口** |
| 站点 logo / icon / favicon | `.../sdkwork-cloudrouter-pc-admin-site/src/index.tsx:99-101,183-185` | `TextField` 输入 URL |
| 站点设置模型 | `.../sdkwork-cloudrouter-pc-admin-site/src/SiteSettingsService.ts:16-33` | 5 个字段均为 `CloudRouterMediaResource`，但只有二维码接 Drive |
| 社区圈子头像 / 封面 | `.../sdkwork-cloudrouter-pc-admin-community/src/forms/CircleDrawerForm.tsx:54,86` | 标签直写 "Avatar URL" |
| 社区群二维码 | `.../sdkwork-cloudrouter-pc-admin-community/src/forms/GroupDrawerForm.tsx:38-131` | URL 输入 |
| 会员 / 套餐图标 | `.../sdkwork-cloudrouter-pc-admin-memberships/src/membershipsService.ts:141,963,1064` | `MediaResource`，无上传 UI |
| 分类图标 | `.../sdkwork-cloudroutes-pc-commons/src/admin-category-types.ts:8` | `icon?: CloudRouterMediaResource`，无上传 |

### 2.3 无需上传（本地导出 / 只读渲染）

- Rankings 录屏导出 webm：`.../sdkwork-cloudrouter-pc-rankings/src/Rankings.tsx:361-428`（本地下载）
- CSV / JSON 导出：`.../admin-marketing/src/components/MarketingListView.tsx:281-296`、`.../console-api-keys/src/quick-import/quickImport.ts:420-421`
- 支付二维码渲染：`.../admin-payments/src/components/PaymentTestDialog.tsx:106-107`（服务端给 URL）

### 2.4 外部委托面

- 知识库文档上传：本仓无实现，委托 SDK 层
- 应用图标 / 应用包：委托 `@sdkwork/iam-pc-admin-*`（`.../sdkwork-cloudrouter-pc-admin-iam/src/index.tsx:16-23` 注释明示）
- Playground 附件选择器：位于外部 `@sdkwork/agents-pc/workbench`

---

## 3. 仓内 `sdkwork-file-*` 设计层（8 包）现状

位置：`apps/sdkwork-cloudrouter-common/packages/`

| 包 | 职责 | 接线状态 |
|---|---|---|
| `sdkwork-file-contracts` | 契约、枚举、工厂 | 仅被同族包引用 |
| `sdkwork-file-api-contracts` | 手写 app/backend OpenAPI | 同上 |
| `sdkwork-file-schema` | 25 张表 DDL + RLS + append-only | **无任何引用者** |
| `sdkwork-file-sdk-ports` | 端口接口 | 同族引用 |
| `sdkwork-file-service` | slot 校验 + 配额预留编排 | 同族引用 |
| `sdkwork-file-sdk-adapter` | SDK 适配（宣称包 `@sdkwork/drive-app-sdk`） | **无任何引用者** |
| `sdkwork-file-sdk-generation` | SDK 生成清单 | 仅构建脚本引用 |
| `sdkwork-file-upload-client` | 薄包装 | **无任何引用者** |

**三个应用（common / pc / h5）全部未 import 任何 `@sdkwork/file-*` 包。**

### 3.1 与 Drive 现实的偏差（关键）

| 维度 | file-contracts 声明 | Drive 实际 |
|---|---|---|
| Space 类型 | `user_drive/organization_drive/team_drive/project_drive/app_drive/system_library/shared_drive/trash_space` | `personal/team/knowledge_base/ai_generated/git_repository/deployment/app_upload/im/rtc/notary/website` |
| Node 类型 | `root/folder/file/shortcut/mount/external_link` | `file/folder/shortcut/virtual_reference` |
| Provider 类型 | `aws_s3/cloudflare_r2/cos_s3/local_dev_s3/minio/oss_s3/s3_compatible` | `local_filesystem/s3_compatible/google_cloud_storage/aliyun_oss/tencent_cos/huawei_obs/volcengine_tos` + `custom:*` |
| 路由前缀 | `/app/v3/api/files*`、`/backend/v3/api/storage/*` | Drive 无这些路径；实际为 `/backend/v3/api/drive/storage/*` |
| 上传状态 | 16 态 | `DriveUploadSession.state` 6 态 |
| 用量 DTO | `usedLogicalBytes/usedPhysicalBytes/…` 六维度 | `QuotaSummary{usedBytes, objectCount, quotaBytes}` 仅租户级 |

### 3.2 已对齐可复用的部分

- `FileUploadRetention` ⟷ `UploaderRetentionRequest`（字段与枚举完全一致）
- `FileUploadProfile` 11 值 ⟷ `DriveUploaderProfile` 11 值（完全一致）
- 上传语义字段 `appResourceType/appResourceId/scene/source/originalFileName/contentType/spaceId/parentNodeId/uploadProfileCode` 可映射

### 3.3 生成物缺失

`@sdkwork/file-app-sdk` / `@sdkwork/file-backend-sdk` **从未生成或安装**：
`.../sdkwork-file-sdk-generation/generated/sdks/` 只有 openapi + manifest + README，
无 TS 包，无任何 `package.json` 声明。因此 `sdkwork-file-sdk-adapter` 声明所需的
`SdkworkFileAppSdkClient` 形状（`filesList`/`fileBindingsCreate`/`driveSpacesList`…）
在现实中不存在可用客户端，该适配器不可用。

另：`sdkwork-file-sdk-generation/src/index.ts:119` 的
`SDKWORK_FILE_SDK_ARTIFACT_ROOT = "packages/common/file/…"` 与实际路径
`apps/sdkwork-cloudrouter-common/packages/…` 不一致。

---

## 4. 破损遗留面：`/backend/v3/api/storage/*`

- Handler：`services/sdkwork-cloudrouter-router-service/src/api/admin_storage.rs:147-171`
- Store：`services/sdkwork-cloudrouter-router-service/src/infrastructure/sql/postgres/admin_storage_store.rs`
- 读取表：`storage_default_bucket_policy` JOIN `object_bucket` JOIN `object_provider`；
  `storage_quota_policy` LEFT JOIN `storage_usage_counter`；`storage_reconciliation_run`；`storage_gc_job`
- 端口：`services/sdkwork-cloudrouter-router-service/src/ports/admin_storage_store.rs`

**这些表的 `CREATE TABLE` SQL 在本仓 `database/` 下不存在**（全仓 `*.sql` 检索无命中）。
本仓 `database/` 仅有 AI 计量/计费表（`ai_metering_usage`、`ai_quota_policy`、
`cloudrouter_usage_measurement`），无任何文件存储表。

Drive 侧真实表为 `dr_drive_*`（43 张），含：
`dr_drive_storage_provider`、`dr_drive_storage_provider_binding`、`dr_drive_storage_provider_kind`、
`dr_drive_tenant_quota`、`dr_drive_upload_session/item/part`、`dr_drive_storage_object`、
`dr_drive_space`、`dr_drive_node`。

迁移方向已有工具佐证：`tools/migrate_storage_to_drive_providers.py`（`object_provider`+`object_bucket`
→ `dr_drive_storage_provider`）、`tools/migrate_media_to_drive_schema.py`（移除 `object_*`/`storage_*`）。

**判定：该治理面属历史迁移未完成的死代码，应下线或转由 Drive Admin Storage 承接。**

---

## 5. 多 vendor 存储可配置能力（已具备）

Drive Admin Storage API（`apis/backend-api/drive/drive-admin-storage-api.openapi.json`）提供：

- Provider CRUD + 激活/停用 + 连通性测试 + 凭据轮换
- 默认绑定（`bindings/default`，支持 `bindingScope = tenant | space | space_type`、`storageRootPrefix`）
- Bucket 管理、Objects 管理、provider-kinds 注册表（可启用/停用）

Provider kind 枚举：`local_filesystem`、`s3_compatible`、`google_cloud_storage`、
`aliyun_oss`、`tencent_cos`、`huawei_obs`、`volcengine_tos` + `custom:[a-z0-9_-]{2,32}`。

`credentialRef` 支持 `plain:` / `env:` / `secret:` / `kms:` / `vault:` 前缀。
Capabilities 动态返回 `supportsMultipartUpload`、`supportsPresignedUploadPart`、
`supportsPresignedDownload`、`supportsServerSideEncryption`、`supportedStorageClasses` 等。

**判定：多 vendor 存储体系配置能力完整，前端 UI 已由 Drive PC 包承接。**

---

## 6. per-user 存储统计能力（缺口）

Drive 现有唯一用量端点：

- App：`GET /app/v3/api/drive/quotas/summary` → `QuotaSummary{usedBytes, objectCount, quotaBytes}`
- Backend：`GET|PUT /backend/v3/api/drive/quotas`（`drive.quota.admin`）

**只有租户单维度，无 user / organization / space / app 维度拆分，无 reserve/release 写端点。**

而 `sdkwork-file-schema` 的设计（未落地）恰好定义了所需形态：

- `storage_usage_counter`：`scope_type ∈ {tenant, organization, user, space, app, business_domain}`
  + `used_logical/physical/billable_bytes` + `file/object/version_count`，
  唯一键 `uq_storage_usage_counter_scope (tenant_id, scope_type, scope_id)`
- `storage_usage_ledger`：append-only 幂等账本
- `storage_usage_snapshot`：周期快照 + `ledger_high_watermark_id`
- `storage_quota_policy` + `storage_quota_reservation`

数据可从 Drive 表推导：`dr_drive_space.owner_subject_type/owner_subject_id`（user/org）
→ `dr_drive_node` → `dr_drive_storage_object.content_length`。

---

## 7. 分类建议（面向可管理可维护）

| 类别 | 定义 | 归属 Space 类型 | 上传 profile | 保留策略 |
|---|---|---|---|---|
| A 公开资源文件 | 站点二维码、logo、favicon、社群二维码 | `website` | `image` | `long_term` |
| B 用户私有文件 | 用户头像、个人上传 | `personal` | `avatar` / `generic` | `long_term` |
| C 团队/组织文件 | 社区封面、组织资料 | `team` | `image` | `long_term` |
| D 运营配置资源 | 会员图标、分类图标、供应商 logo | `app_upload` | `image` | `long_term` |
| E AI 生成文件 | 生成图片/视频/音频产物 | `ai_generated` | `image`/`video`/`audio` | 按业务 |
| F 临时文件 | 导入中间件、导出缓存 | `personal` / `app_upload` | `document`/`archive` | `temporary` |

---

## 8. 已实施改造（2026-09-10）

### 8.1 统一上传封装层（新增）

位置：`apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudroutes-pc-commons/src/file-upload/`

| 文件 | 职责 |
|---|---|
| `upload-catalog.ts` | 6 类归类 + 15 个 slot 的唯一真源；每 slot 声明 Drive `uploadProfileCode`、`scene`、`appResourceType/Id`、`source`、MIME 准入、体积上限、保留策略、是否建只读分享链接、媒体种类 |
| `drive-upload.ts` | `uploadCloudRouterFile()`：归类解析 → 准入校验 → `client.uploader.uploadByProfile()` → 媒体引用构造 → 可选分享链接 |
| `use-drive-upload.ts` | `useCloudRouterUpload()` 状态机：进度、错误、取消、重置 |
| `index.ts` | 经 `runtime.ts` 统一导出 |

归类目录（`CLOUDROUTER_UPLOAD_CATEGORIES`）：

| 归类 | 目标空间 | 可见性 | 覆盖 slot |
|---|---|---|---|
| `public_asset` 公开资源文件 | `website` | public | site-logo / site-icon / site-favicon / site-qr-code |
| `user_private` 用户私有文件 | `personal` | private | user-avatar |
| `team_asset` 团队组织文件 | `team` | public | community-circle-avatar / -cover / community-group-qr-code |
| `admin_asset` 运营配置资源 | `app_upload` | public | admin-membership-icon / admin-category-icon / admin-provider-logo |
| `ai_generated` 人工智能生成文件 | `ai_generated` | private | ai-image / ai-video / ai-audio |
| `temporary` 临时文件 | `app_upload` | private | temporary-asset（7 天 TTL，soft_delete） |

### 8.2 Drive 媒体引用增强

`drive-media.ts` 修复与增强：

- 修复 `uploadResultToDriveMediaResource` 硬编码 `kind: 'image'` 的缺陷：改为按
  `contentTypeGroup` / `contentType` 推导（新增 `inferDriveMediaKind`），支持视频/音频/文档。
- 媒体 metadata 增补 `storageProviderId` / `scene` / `source` / `uploadProfileCode` / `contentTypeGroup`，
  并写入 `uploadCategory` / `uploadSlot` 归类信息，便于运营按类检索。
- 新增 `readDriveNodeRef` / `parseDriveMediaUri` / `readDriveMediaReference` / `toDriveMediaReference`：
  支持 `drive://spaces/<spaceId>/nodes/<nodeId>` 引用与「仅接受字符串」的业务字段往返。
- `resolveDriveMediaUrl` 在无预存 token 时按节点补建只读分享链接（按 nodeId 缓存），
  使 drive 引用可独立解析，不再依赖调用方预先写入 shareToken。

### 8.3 已接入的上传入口

| 入口 | 位置 | 变更 |
|---|---|---|
| 站点 Logo / 图标 / Favicon | `sdkwork-cloudrouter-pc-admin-site/src/index.tsx` | 由 URL 文本框改为 Drive 上传（新增通用 `MediaUploadField`） |
| 站点二维码 | 同上 | 收敛到统一层；删除 `qrCodeUpload.ts`（已被目录取代） |
| 社区圈子头像 / 封面 | `sdkwork-cloudrouter-pc-admin-community/src/forms/CircleDrawerForm.tsx` | 由 URL 文本框改为 Drive 上传（新增 `CommunityMediaUploadField`） |
| 社区圈子列表头像 | `.../src/pages/CommunityCirclesPage.tsx` | 修复 MediaResource 直接当 `src` 的类型错误，改用 `useResolvedMediaResourceUrl` |
| 社区服务读写 | `.../src/communityService.ts` | 修复写入侧把 MediaResource 压平成 URL 的缺陷；读写统一走 `toDriveMediaReference` / `readDriveMediaReference` |

### 8.4 空转设计层清理

- 删除 8 个零接线包：`sdkwork-file-api-contracts`、`-contracts`、`-schema`、`-sdk-adapter`、
  `-sdk-generation`、`-sdk-ports`、`-service`、`-upload-client`（共 66 个文件）。
- 删除 `scripts/materialize-file-sdk-artifacts.mjs` 及根 `package.json` 的
  `sdk:file:artifacts:check` / `:write` 两个脚本。
- 用 `node ../sdkwork-specs/tools/resolve-composition.mjs --root . --write` 再生成
  `generated/composition.resolved.json`，`sdkwork-file-` 引用归零。

验证：`tsc --noEmit -p tsconfig.typecheck.json` 对 `file-upload` / `drive-media` /
`admin-site` / `community` 全部无错误（其余报错为该工作区既有的跨仓噪声）。

### 8.5 关键发现：Drive 自动空间映射

`crates/sdkwork-drive-workspace-service/src/application/uploader_service.rs:851`
`resolve_auto_upload_space_profile(scene)`：仅 `rtc` / `im` / `deployment`(+`application-source`)
/ `git-repository` 有专属空间类型，**其余 scene 一律落到 `app_upload`**。

推论：若前端不显式传 `spaceId`，头像/站点资源/社区资源/AI 生成会全部混入同一
`app_upload` 空间，「分门别类」无法只靠前端 scene 实现，需上游扩展映射
（或前端显式创建并传递 `spaceId`）。

另注：非 team 空间的所有者由 Drive 按调用者上下文强制绑定，客户端传
`ownerSubjectType/ownerSubjectId` 必须与 token 上下文一致，否则 403 —— 因此
新建 `personal` / `website` / `ai_generated` 空间时不应传 owner 字段。

## 9. 阻塞项（需跨仓改动）

| 阻塞 | 仓库 | 事实 | 需要 |
|---|---|---|---|
| 用户头像无写入路径 | `sdkwork-iam` | `crates/sdkwork-routes-iam-app-api/src/handlers.rs:2700` `update_current_user` 仅接受 `displayName`/`nickname`/`name`，显式拒绝 `email`/`phone`，其余字段（含 `avatar`）被忽略；`update_current_user_profile` 只更新 `display_name`。`iam_user.avatar_resource_snapshot` 列存在但仅由 Tauri 用户中心写入 | 在 IAM app API 增加头像写入（`users.current.update` 接受并落库 avatar MediaResource） |
| 社区群二维码仅 URL | `sdkwork-community` | `SdkworkCommunityGroupCommand.qrCodes` 为 `{url, description}[]`，字段是 URL 字符串，无法承载 Drive 引用 | 契约改为接受 media resource 或 drive uri |
| 社区圈子头像/封面字段为字符串 | `sdkwork-community` | `SdkworkCommunityCircleCommand.avatar/coverImage` 为 `string`；当前以 `drive://` 引用字符串承载（CloudRouter 侧已兼容往返） | 建议长期改为 media resource |
| per-user 存储统计 | `sdkwork-drive` | 仅有租户级 `GET /app/v3/api/drive/quotas/summary`（`{usedBytes, objectCount, quotaBytes}`）与 `GET|PUT /backend/v3/api/drive/quotas`；表 `dr_drive_tenant_quota` 为租户维度，无 user/org/space/app 维度，无 reserve/release 写端点 | 新增 per-user/per-org/per-space 用量端点与计数（数据可由 `dr_drive_space.owner_subject_*` → `dr_drive_node` → `dr_drive_storage_object.content_length` 聚合） |

## 10. 遗留待办

0. **`pnpm-lock.yaml` 待同步**：`pnpm install --lockfile-only` 在本次沙箱内被删除垫片
   （`genie-trash ... ETIMEDOUT`）阻断，锁文件仍保留 20 条 `sdkwork-file-*` 条目。
   需在沙箱外执行一次 `pnpm install` 使 lockfile 与工作区一致（否则
   `--frozen-lockfile` 的 CI 会失败）。
1. 下线 `/backend/v3/api/storage/*` 遗留治理面：
   `services/sdkwork-cloudrouter-router-service/src/api/admin_storage.rs:147-171`、
   `infrastructure/sql/postgres/admin_storage_store.rs`、`ports/admin_storage_store.rs`
   读取的 `storage_default_bucket_policy` / `object_bucket` / `object_provider` /
   `storage_quota_policy` / `storage_usage_counter` / `storage_reconciliation_run` /
   `storage_gc_job` 在本仓 migration 中均不存在。治理职责应转由 Drive Admin Storage
   (`/backend/v3/api/drive/storage/*`) 承接。
2. `sdkwork-cloudrouter-pc-admin-community/src/forms/GroupDrawerForm.tsx` 的群二维码
   待社区契约放宽后接入 `community-group-qr-code` slot。
3. Playground 参考图/视频/音频的文件选择位于外部 `@sdkwork/agents-pc/workbench`，
   需确认其内部同样调用 `client.uploader.*` 并携带归类信息。
4. 同步更新 `docs/architecture/tech/TECH-2026-05-23-sdkwork-file-platform-*.md` 与
   `docs/superpowers/plans/2026-05-23-sdkwork-file-platform-foundation.md`（已失效的设计文档）。

---
