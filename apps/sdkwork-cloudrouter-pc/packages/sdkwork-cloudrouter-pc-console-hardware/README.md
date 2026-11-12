# @sdkwork/cloudrouter-pc-console-hardware — 智能硬件控制台（宿主适配）

Cloud Router **用户控制台**中的「智能硬件」分组，位于**记忆**分组下方。

> 能力归属：设备领域（数据模型、数据库归属、app-api 操作、PC 界面）由 **sdkwork-aiot** 拥有，见
> `sdkwork-aiot/apps/sdkwork-aiot-pc/packages/sdkwork-aiot-pc-console-hardware`。
> 本包只是宿主适配层，不复制设备业务逻辑，也不直接调用管理面 API。

## 1. 本包职责

| 文件 | 职责 |
| --- | --- |
| `src/contribution.ts` | 侧边栏分组（`console.menu.group.hardware`）+ `/console/hardware`、`/console/hardware/firmware` 路由常量与深链解析 |
| `src/cloudRouterHardwareService.ts` | 把 AIoT 控制台端口绑定到 Cloud Router 会话客户端：AIoT **app** 客户端（我的设备/注册/固件/绑定）+ agents app 客户端（智能体选择） |
| `src/HardwareConsoleView.tsx` | 挂载 AIoT 的 `SdkworkHardwareConsole`，注入 i18n 文案、`initialScreen` 深链、`canManage` 权限门控 |
| `src/i18n/**` | `console.hardware.*` / `console.menu.hardware*` 的 en-US + zh-CN 片段 |

## 2. 集成点

- 侧边栏：`sdkwork-cloudrouter-pc-console-shell/src/ConsoleLayout.tsx` 在 `记忆` 分组之后展开 `HARDWARE_CONSOLE_NAV_GROUP`。
- 路由：`src/App.tsx` 以 `/console/hardware/*` 懒加载 `HardwareConsoleView`。
- 权限：`iot.devices.write` 决定注册与智能体绑定入口是否出现；缺权限时 AIoT 控制台显示只读提示。

## 3. 验证

```bash
node scripts/typecheck-owned-sources.mjs
node ../../node_modules/vitest/vitest.mjs run --config packages/sdkwork-cloudrouter-pc-console-hardware/vitest.config.ts
node --import tsx --import ./scripts/css-stub-loader.mjs --test console-layout-runtime.test.ts
node ../sdkwork-specs/tools/verify-repo.mjs --root ../..
```
