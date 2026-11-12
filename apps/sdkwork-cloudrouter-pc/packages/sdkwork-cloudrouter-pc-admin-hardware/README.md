# @sdkwork/cloudrouter-pc-admin-hardware — 智能硬件中心 (Smart Hardware Center)

Cloud Router 后台管理中的 AIoT 管理域：在 `sdkwork-cloudrouter` 的 admin 壳内提供产品 / 物模型、设备台账、设备配置（影子配置）、固件 OTA、事件与运行时治理能力。界面与业务规则由本包拥有，传输与鉴权由宿主注入，数据来自 `sdkwork-aiot` 拥有的 AIoT 管理 API（`/backend/v3/api/iot/...`）。

## 1. 分层与集成契约

```
sdkwork-aiot  ──(owner)──▶  @sdkwork/aiot-backend-sdk
                                   ▲  type-only port
cloudroutes-pc-commons ──(build)──▶│  getSdkworkAiotBackendSdkClient()
        │                          │
        └──(inject at startup)──▶ @sdkwork/cloudrouter-pc-admin-core/sdk
                                   ▲
                    configureAiotAdminBackendClient(client)
                                   ▲
        src/admin/hardwareSdkHostWiring.ts (host startup)
                                   ▲
        @sdkwork/cloudrouter-pc-admin-hardware  (this package)
```

- **SDK 所有权**：AIoT 管理 API 由 `sdkwork-aiot` 拥有。Cloud Router 只消费其生成 SDK，不复制契约、不手写 HTTP。
- **端口归属**：生成 SDK 的类型与客户端句柄只在 `@sdkwork/cloudrouter-pc-admin-core/sdk` 出现；本包（feature package）不直接引用生成 SDK 模块（`verify-repo` 分层规则）。
- **传输装配**：`@sdkwork/cloudroutes-pc-commons/sdk-clients#getSdkworkAiotBackendSdkClient` 复用同一套基址链（显式参数 → `VITE_SDKWORK_AIOT_BACKEND_API_BASE_URL` → portal backend → 同源 `/backend/v3/api`）与共享的会话鉴权、`Accept-Language` 传播、身份投影清洗边界。
- **注入时机**：`src/main.tsx` 在渲染前调用 `configureCloudRouterHardwareBackendSdkClient()`；未注入时服务层抛错而不是静默降级为匿名请求。
- **模块装配**：本包导出 `contribution`（模块定义、三级菜单、路由记录、权限提示），宿主 `adminModuleRegistry` / `adminRoutePermissionHints` / `cloudRouterAdminHostMount` 只做展开，不复制条目。

## 2. 能力矩阵（已落地，全部对应真实 API）

| 界面 | 路由 | AIoT 管理 API | 运营动作 |
| --- | --- | --- | --- |
| 硬件总览 | `/admin/hardware` | devices / products / firmware_rollouts / events / runtime.capacity | 健康分布、覆盖度、升级状态、容量快照；单面板失败不阻断驾驶舱 |
| 产品管理 | `/admin/hardware/products` | `iot/products` | 建/改/删；绑定硬件、协议、能力模型（引用选择器） |
| 硬件方案 | `/admin/hardware/hardware-profiles` | `iot/hardware_profiles` | 芯片家族、硬件类别、运行时、连接、安全、OTA 策略 |
| 协议方案 | `/admin/hardware/protocol-profiles` | `iot/protocol_profiles` | 允许的传输 / 消息类型、能力桥接 |
| 能力模型 | `/admin/hardware/capability-models` | `iot/capability_models` | 物模型：能力定义 + 每设备配置 Schema（JSON 守卫校验） |
| 设备台账 | `/admin/hardware/devices` | `iot/devices` | 注册、改状态、删除；产品/健康度过滤 |
| 设备详情 | `/admin/hardware/devices/:deviceId` | devices.retrieve / capabilities / sessions / credentials / commands / twin / settings | 会话断开、凭据签发与吊销、命令取消、孪生期望态下发 |
| 设备配置 | `/admin/hardware/device-settings` | devices.settings(+history/rollback) / device_settings.bulk_update | 单设备 Schema 表单、只提交变更、`revision` 乐观并发、修订回滚、批量下发（全有或全无） |
| 固件资产 | `/admin/hardware/firmware-artifacts` | `iot/firmware_artifacts` | 版本 + SHA-256 + 签名 + 目标芯片/运行时 + 二进制来源 |
| 升级批次 | `/admin/hardware/firmware-rollouts` | `iot/firmware_rollouts` | 目标策略（productId / chipFamily / deviceIds）+ 生命周期 |
| 事件中心 | `/admin/hardware/events` | `iot/events` | 协议层上下行流量、消息类型、适配器 |
| 协议适配器 | `/admin/hardware/protocol-adapters` | `iot/protocol_adapters` | 适配器作用域、传输、编解码器、硬件家族 |
| 运行容量 | `/admin/hardware/runtime` | `iot/runtime/capacity` | 会话/并发上界、租约、发件箱重试、死信、背压 |

### 工程约束（已实现）

- **int64 全程字符串**：`deviceId` / `productId` / `revision` 等标识在映射层保持 `string`，不转 `number`（API_SPEC §13.6）。
- **乐观并发**：配置保存与回滚都携带 `expectedRevision`；`40901` / HTTP 409 被归类为 `revisionConflict`，页面自动重载最新修订并提示。
- **幂等**：设备、凭据、固件资产、升级批次的写操作统一附带 `Idempotency-Key`（`iot-*-create` 前缀）。
- **只提交变更**：设备配置表单与加载值做差异比较，未变更项不进 wire；清除覆盖项以 `null` 表达（契约语义）。
- **零中文直写**：所有用户可见文案走 `admin.hardware.*` i18n 键（en-US + zh-CN 同键同占位符）。
- **错误可本地化**：服务层只返回稳定原因键（`conflict` / `validation` / `revisionConflict` / `forbidden` / `unauthorized` / `notFound` / `unavailable`），文案由界面解析。

## 3. 行业对齐与演进规划

参考 AWS IoT Core、Azure IoT Hub、阿里云物联网平台、Tuya/涂鸦 IoT 的商业化控制台分层，本模块的成熟度与后续路线：

**P0（本次交付）** 产品/物模型 → 设备注册 → 凭据 → 会话 → 命令 → 孪生 → 配置（Schema + 修订 + 回滚 + 批量）→ 固件元数据与批次 → 事件 → 适配器 → 容量。这一层已可支撑"设备接入 + 远程配置 + 固件灰度"的商业闭环。

**P1（建议下一迭代）**

- 设备分组 / 空间（家庭、门店、项目）与标签体系，支撑按空间聚合的运营视图与批量策略。
- 固件批次进度看板：成功率、失败原因分布、按芯片/版本的分桶，以及自动暂停闸门（失败率阈值）。
- 命令下发表单：从能力模型 `commands` 生成入参表单，替代当前的只读命令列表 + 取消。
- 告警规则与静默：把 `events` 的 `semanticType` / `messageClass` 沉淀为规则，支持阈值、静默窗口、通知渠道（复用 admin notify）。

**P2（商业化深化）**

- 计量与计费挂钩：设备在线时长、消息条数、OTA 流量按产品/租户出账（对接 membership / pricing）。
- 多租户与数据隔离视图：按 tenant / organization 维度切分设备与凭据，管理端显示作用域。
- 合规与审计：设备凭据签发/吊销、配置变更、固件发布的不可变审计流（对接 IAM audit）。
- 边缘节点运维：网关子设备拓扑、边缘节点健康与离线补传策略（对接 `sdkwork-aiot` 边缘运行时）。

## 4. 验证

```bash
# 包内契约测试（映射、配置差异、幂等参数、错误分类、菜单↔路由一致性、i18n 键完备）
node node_modules/vitest/vitest.mjs run --config packages/sdkwork-cloudrouter-pc-admin-hardware/vitest.config.ts

# 应用级类型与分层门禁
node scripts/typecheck-owned-sources.mjs
node ../sdkwork-specs/tools/verify-repo.mjs --root ../..
node ../sdkwork-specs/tools/check-application-layering.mjs --root ../..

# 路由/菜单/权限/i18n 回归
node --import tsx --import ./scripts/css-stub-loader.mjs --test \
  admin-sidebar-runtime.test.ts sdk-composition-standard.test.mjs i18n-resources-runtime.test.ts
```

## 5. 目录

```
src/
  contribution.ts            模块/菜单/路由/权限记录（宿主展开的唯一来源）
  hardware.ts                域模型与 wire 映射（含配置差异与校验纯函数）
  hardwareService.ts         AIoT 管理 API 服务层（幂等键、错误归类、乐观并发）
  resources.ts               六个资源型界面的声明式描述
  components/                ResourceBrowser + 配置编辑器 + 设计原语
  pages/                     总览、台账、详情、配置、固件、事件、适配器、容量
  i18n/{en-US,zh-CN}/aiot/hardware/hardware.ts
```
