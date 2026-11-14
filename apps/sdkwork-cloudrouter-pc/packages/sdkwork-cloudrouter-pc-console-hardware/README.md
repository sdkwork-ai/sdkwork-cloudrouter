# @sdkwork/cloudrouter-pc-console-hardware — 智能硬件控制台（宿主适配）

Cloud Router **用户控制台**中的「智能硬件」分组，位于**记忆**分组下方。

> 能力归属：设备领域（数据模型、数据库归属、app-api 操作、PC 界面）由 **sdkwork-aiot** 拥有，见
> `sdkwork-aiot/apps/sdkwork-aiot-pc/packages/sdkwork-aiot-pc-console-hardware`。
> 本包只是宿主适配层，不复制设备业务逻辑，也不直接调用管理面 API。

## 1. 本包职责

| 文件 | 职责 |
| --- | --- |
| `src/contribution.ts` | 侧边栏分组（`console.menu.group.hardware`）+ `/console/hardware/devices`、`/console/hardware/firmware` 路由常量与深链解析 |
| `src/cloudRouterHardwareService.ts` | 把 AIoT 控制台端口绑定到 Cloud Router 会话客户端：AIoT **app** 客户端（我的设备/注册/固件/绑定）+ agents app 客户端（智能体选择） |
| `src/HardwareConsoleView.tsx` | 按 URL 渲染 AIoT 的对应页面（设备页 / 固件页），注入 i18n 文案、`onNavigate` 真实路由跳转、`canManage` 权限门控 |
| `src/i18n/**` | `console.hardware.*` / `console.menu.hardware*` 的 en-US + zh-CN 片段 |

## 2. 集成点

- 侧边栏：`sdkwork-cloudrouter-pc-console-shell/src/ConsoleLayout.tsx` 在 `记忆` 分组之后展开 `HARDWARE_CONSOLE_NAV_GROUP`；激活项按**最长匹配**解析，`/console/hardware/firmware` 不会同时点亮 `/console/hardware/devices`。
- 路由：`src/App.tsx` 声明 `hardware/devices`、`hardware/firmware` 两条路由（`hardware` 重定向到设备页，外加 `hardware/*` 兼容旧深链），两条路由渲染**不同页面**。
- 权限：`iot.devices.write` 决定注册、改名与智能体绑定入口是否出现；缺权限时设备页显示只读提示。
- 宿主构建（两条必须同时成立，否则页面在宿主里不可用）：
  - `src/index.css` 必须 `@source` 覆盖 `sdkwork-aiot` 的页面目录。Tailwind v4 不会自动扫描项目根之外的仓库；漏扫时 AIoT 的倒置主色对（`bg-zinc-900 dark:bg-zinc-100` + `text-white dark:text-zinc-900`）只会生成一半，按钮/页签文字与底色同色而不可见。
  - `vite.config.ts` 的 `server.fs.allow` 必须包含 `sdkwork-aiot` 仓库根目录。该包按 workspace 源码解析，不在根内时 dev server 直接 403。
  - 回归守卫：`vite-config-runtime.test.ts` 的 `Smart Hardware console sibling pages are served in dev and scanned by the CSS build`。

## 3. 验证

```bash
node scripts/typecheck-owned-sources.mjs
node ../../node_modules/vitest/vitest.mjs run --config packages/sdkwork-cloudrouter-pc-console-hardware/vitest.config.ts
node --import tsx --import ./scripts/css-stub-loader.mjs --test console-layout-runtime.test.ts
node ../sdkwork-specs/tools/verify-repo.mjs --root ../..
```
