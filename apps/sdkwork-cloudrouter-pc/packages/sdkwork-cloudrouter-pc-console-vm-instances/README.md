# @sdkwork/cloudrouter-pc-console-vm-instances — VM 实例控制台（宿主适配）

Cloud Router **用户控制台** 中的「虚拟机」分组，位于**智能硬件**分组下方。

> 能力归属：`sandbox_instance` 虚拟机注册表、生命周期、数据库归属与 app-api 操作由
> **sdkwork-sandbox** 拥有（`/app/v3/api/sandbox/sandbox_instances`）。
> 本包只是 Cloud Router 宿主适配层：不复制生命周期规则，也不直接调用管理面 API。

## 1. 本包职责

| 文件 | 职责 |
| --- | --- |
| `src/contribution.ts` | 侧边栏分组（`console.menu.group.vmInstances`）+ `/console/vm-instances` 路由常量 |
| `src/VmInstancesConsoleView.tsx` | 页面宿主：列表（服务端分页）、状态筛选、创建/编辑抽屉、删除确认 |
| `src/VmInstanceForm.tsx` | 开通/编辑表单：规格信封校验、能力选择、隔离等级、到期时间 |
| `src/vmInstancesModel.ts` | 纯逻辑：规格信封、抽屉草稿、校验码、UTC/本地时间换算、int64 总数解析 |
| `src/i18n/**` | `console.vmInstances.*` / `console.menu.vmInstances*` 的 en-US + zh-CN 片段 |

传输层位于共享包
`@sdkwork/cloudroutes-pc-commons/sandbox-instances-client`，并通过
`@sdkwork/cloudroutes-pc-commons/sdk-clients` 的 `getCloudRouterSandboxAppClient()`
挂载会话鉴权 / 语言 / 身份投影边界。本包不持有裸 HTTP 客户端。

## 2. 数据来源与基址

虚拟机实例列表由调用方身份在服务端强制收窄（无 owner 参数），因此页面无法读取他人实例。

基址解析顺序（与其它依赖 app-api 客户端一致）：
显式传入 → `VITE_SDKWORK_SANDBOX_APP_API_BASE_URL` → 门户 app 基址 →
共享 SDK 根 → 同源 `/app/v3/api`。独立部署（standalone）下若同源未挂载 sandbox
模块，页面会如实显示读取失败与原因，而不是伪装成「没有实例」。

## 3. 集成点

- 侧边栏：`sdkwork-cloudrouter-pc-console-shell/src/ConsoleLayout.tsx` 在「智能硬件」
  分组之后展开 `VM_INSTANCES_CONSOLE_NAV_GROUP`；激活项按**最长匹配**解析。
- 路由：`src/App.tsx` 声明 `vm-instances/*`，按门户懒加载规则拆包。
- i18n：`@sdkwork/cloudrouter-pc-i18n` 将 `vmInstancesConsoleMessages` 合入控制台目录；
  en/zh 键集必须完全一致（合并器在启动时强校验）。

## 4. 验证

```bash
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts
node ../scripts/typecheck-owned-sources.mjs
node --import tsx --import ./scripts/css-stub-loader.mjs --test console-layout-runtime.test.ts
node ../../../sdkwork-specs/tools/check-i18n-standard.mjs --root ../../..
```
