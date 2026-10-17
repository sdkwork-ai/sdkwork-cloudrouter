# 移动端控制台 tabbar 规划与三端完善实施计划

> 状态：**设计定稿（2026-10-17）**，进入实施
> 范围：`apps/sdkwork-cloudrouter-mini-program`、`apps/sdkwork-cloudrouter-h5`、`apps/sdkwork-cloudrouter-flutter-mobile` 三端 + 共享契约层
> 需求原文：按照 sdkwork-specs 规范，完善 miniprogram / H5 / flutter 的开发，反复回归，直到产品功能实现为止；先规划好 tabbar，打造专业的移动端页面和应用。

---

## 0. 单一权威与已核实事实

| 项 | 现状（已核实 + 证据） |
| --- | --- |
| 路由权威 | `apps/sdkwork-cloudrouter-common/packages/sdkwork-cloudrouter-contracts/src/routes.ts`：`CLOUDROUTER_CONSOLE_ROUTES`（signIn `/sign-in` + dashboard `/dashboard` + usage `/usage` + apiKeys `/api-keys` + catalog `/catalog`）；`CLOUDROUTER_CONSOLE_ROUTE_ORDER = [dashboard, usage, apiKeys, catalog]`，**signIn 永不是 tab** |
| 能力权威 | 同包 `capabilities.ts`：`CLOUDROUTER_CONSOLE_CAPABILITIES` 四项，order 10/20/30/40，均 `requiresAuthentication: true`，`permissionScope` 同一 console access |
| 服务权威 | `sdkwork-cloudrouter-service` 单一入口：`loadConsoleOverview` / `loadConsoleUsagePage` / `loadConsoleApiKeyPage` / `loadConsoleCatalogPage`（归一化 + 分页语义已就绪） |
| i18n 权威 | 各端 `*-i18n` 包 `src/i18n/<locale>/cloudrouter/{console,auth}/*.ts` 片段，键位三端一致（`cloudrouter.console.*` / `cloudrouter.auth.signIn.*`） |
| H5 现状 | shell + 4 屏幕已接通 service；**违反 APP_MOBILE_REACT_UI_SPEC §5**：`main` 带 `px-4` 横向 page padding、文档级滚动、tabbar 非 fixed、图标无 filled/outline 区分 |
| MP 现状 | 4 page + app.json tabBar（**纯文字无 iconPath/selectedIconPath**）；dashboard page `rows` 永远为空（`onReload` 写死 `rows: []`）；`.cr-page { padding: 24rpx }` 违反 full-bleed |
| Flutter 现状 | 功能包（screens/services/states/models/copy/routes）齐全但 app 层是 stub：`lib/auth_gate.dart` 只渲染一行占位文本、`lib/bootstrap/routes.dart` 是 `void createRoutes() {}`；4 个屏幕同模版（标题写死小写、状态消息用 `status.name`） |
| 门禁现状 | 三端 surface-contract 测试只断言包结构/路由投影/配置物化，**不断言 tabbar 形态** ⇒ 本轮补齐门禁断言 |

## 1. tabbar 规划（三端同源，单一权威派生）

**权威顺序** = `CLOUDROUTER_CONSOLE_ROUTE_ORDER`；每端 tabbar 必须由该顺序派生，不允许手写第二份顺序。

| # | routeKey | path | zh 标签 | en 标签 | glyph | outline（未选中） | filled（选中） |
|---|----------|------|---------|---------|-------|------------------|----------------|
| 1 | dashboard | `/dashboard` | 概览 | Overview | dashboard | `images/tabbar/dashboard-outline.png` | `images/tabbar/dashboard-filled.png` |
| 2 | usage | `/usage` | 用量 | Usage | receipt | `images/tabbar/usage-outline.png` | `images/tabbar/usage-filled.png` |
| 3 | apiKeys | `/api-keys` | API Key | API Keys | key | `images/tabbar/api-keys-outline.png` | `images/tabbar/api-keys-filled.png` |
| 4 | catalog | `/catalog` | 模型与定价 | Models & Pricing | bar-chart | `images/tabbar/catalog-outline.png` | `images/tabbar/catalog-filled.png` |

图标资产与投影：

- MP：8 张 81×81 PNG 由 `scripts/generate-tabbar-icons.py`（PIL，0–100 逻辑单位 Pen）生成入库；`app.json` 原生槽位 `iconPath`/`selectedIconPath`，色板 outline `#94a3b8` / filled `#38bdf8`。
- H5：lucide 描边图标集（`LayoutDashboard`/`Table2`/`KeyRound`/`BarChart3`），选中态 `fill="currentColor"`、未选中 `fill="none"`——同 glyph 填充差异而非换图标。
- Flutter：`ConsoleTabGlyphIcon` 自绘同一批 glyph（dashboard 2×2 圆角方格、receipt 锯齿底小票、key 圆环+柄+齿、barChart 三升柱+基线），`NavigationDestination(icon: filled=false, selectedIcon: filled=true)`。
- 三端色板统一：outline `#94a3b8`、filled `#38bdf8`（MP 由 `app.json` 的 `color`/`selectedColor` 承载）。

硬约束（三 spec 共同条款，逐条落实）：

1. **filled/outline 同 glyph 区分选中**，禁止只靠颜色区分选中态（APP_FLUTTER_UI_SPEC §5 / APP_MINI_PROGRAM_UI_SPEC §7 / APP_MOBILE_REACT_UI_SPEC §5）。
2. **必须使用平台原生选中图标槽位**：MP `iconPath`/`selectedIconPath`；Flutter `NavigationDestination(icon:/selectedIcon:)`；H5 同 glyph 选中态 `fill="currentColor"`。
3. **tabbar 只出现在 tab 根路由**，可见性在 shell/组合层按路由表一次裁定；二级页面（stack push/详情/创建/设置）不渲染、不预留 tabbar 空间。本控制台无二级页面，signIn 为非 tab 路由单独成屏。
4. **full-bleed**：页面容器禁横向 padding；卡片/区块零外边距通宽；文本密块用自身 0.9rem 内容 inset（H5 token）；通宽块禁外圆角。
5. **H5 滚动收束**：视口 wrapper `100dvh` + `overflow:hidden`；app canvas 是唯一滚动容器（`overflow-y:auto` + `overscroll-behavior:contain`）；tabbar `position:fixed` 在滚动流外；文档级滚动禁用；canvas 滚动条视觉隐藏；canvas 底部 padding = tabbar 高 + safe-area。
6. **状态完备**：loading / empty / error(+retry) / 分页 load-more；列表支持下拉刷新（MP `enablePullDownRefresh` + `onPullDownRefresh`）。

## 2. 三端页面清单（产品功能对齐）

| 能力 | 共享数据入口 | MP 页面 | H5 屏幕 | Flutter 屏幕 |
| --- | --- | --- | --- | --- |
| 概览 | `loadConsoleOverview` | 4 统计卡（请求/Token/花费/错误率）+ 窗口标签 | 已有 4 卡（保留） | 4 统计卡 + 窗口标签 |
| 用量 | `loadConsoleUsagePage` | 记录列表（模型/Token/费用/状态/时间）+ load more + 下拉刷新 | 已有（保留） | 记录列表 + load more |
| API Key | `loadConsoleApiKeyPage` + create/revoke | 列表 + 新建（一次性明文）+ 吊销 | 已有（保留） | 列表 + 吊销（create 保留 SDK gap 显式报错） |
| 模型与定价 | `loadConsoleCatalogPage` | 厂商/模型/输入价/输出价列表 | 已有（保留） | 厂商/模型/输入价/输出价列表 |

Flutter `createApiKey` 的生成 SDK gap（`generatedDartTransportGapReason`）保持显式：UI 显示原因而非静默失败。

## 3. 实施顺序

1. **契约层**：`routes.ts` 增补 tab 描述符权威导出（`CLOUDROUTER_CONSOLE_TABS`：routeKey/path/labelKey/icon glyph/filled-outline 语义），供三端 shell 派生，禁各端手写顺序。
2. **MP**：app.json tabBar 补 8 张 PNG 图标对（outline/filled，脚本生成、入库）；4 页重写为 full-bleed 专业形态（统计卡/列表/状态/下拉刷新）；修 dashboard rows 空映射。
3. **H5**：shell 重构（fixed tabbar + canvas 滚动收束 + full-bleed + filled/outline 图标对）；4 屏幕去横向 padding 适配。
4. **Flutter**：app 层落地（auth gate → signIn 屏 → tabbar 控制台）；`routes.dart` 由 console 包 route contributions 组装路由注册表；4 屏幕专业化（真标题、状态视图、卡片 UI）。
5. **门禁**：三端 surface-contract 测试补 tabbar 断言（顺序同权威、图标槽位存在、signIn 非 tab、filled/outline 成对）。
6. **回归**：`pnpm typecheck` / `pnpm test` / `pnpm build`（MP runtime bundle、H5 vite build）+ `flutter analyze` + `flutter test`，反复修到全绿。

## 4. 验收判据

- [x] 三端 tabbar 顺序与 `CLOUDROUTER_CONSOLE_ROUTE_ORDER` 逐项一致（测试断言）。
- [x] 每端选中/未选中为同 glyph 的 filled/outline 对，且用了平台原生槽位（测试断言）。
- [x] signIn 不是 tab；未登录三端都落在 signIn 屏。
- [x] 4 个能力页在三端都有 loading/empty/error 三态 + 列表分页（MP/H5/Flutter 各至少一条 UI 状态测试或夹具）。
- [x] H5 滚动收束五项（文档 scrollTop=0、tabbar 视口位置恒定、sticky 钉住、末行可见、canvas 滚动条隐藏）有回归测试。
- [x] `pnpm --dir apps/sdkwork-cloudrouter-mini-program test` / `--dir apps/sdkwork-cloudrouter-h5 test` / `flutter test` 全绿；`flutter analyze` 零问题；MP `build:mini-program` 与 H5 `build` 成功。

## 5. 落地结果（回归证据）

| 门禁 | 命令 | 结果 |
| --- | --- | --- |
| 共享契约 | `pnpm --dir apps/sdkwork-cloudrouter-common test` | 9/9（含 tab 权威派生、signIn 非 tab、glyph 唯一） |
| MP 类型 | `pnpm --dir apps/sdkwork-cloudrouter-mini-program typecheck` | 零问题 |
| MP 契约 | `pnpm --dir apps/sdkwork-cloudrouter-mini-program test` | 12/12（新增 tabbar 顺序/图标对/权威派生断言） |
| MP 打包 | `pnpm --dir apps/sdkwork-cloudrouter-mini-program build` | `4 main page(s), 0 subpackage(s), tabBar=on` |
| H5 类型 | `pnpm --dir apps/sdkwork-cloudrouter-h5 typecheck` | 零问题 |
| H5 契约 | `pnpm --dir apps/sdkwork-cloudrouter-h5 test` | 23/23（新增 tabbar 权威、原生槽位、滚动收束断言） |
| H5 打包 | `pnpm --dir apps/sdkwork-cloudrouter-h5 build` | vite 构建成功（1924 模块） |
| Flutter 静态 | `flutter analyze` | `No issues found!` |
| Flutter 测试 | app / commons / shell | 13/13、14/14、8/8 |

顺带修掉的既有缺陷：

1. `flutter-mobile/core/lib/sdk/cloudrouter_app_sdk_clients.dart` 的 `replaceFirst(RegExp(r'/+'), '')` 会连 `http://` 的 `//` 一起吃掉，导致所有合法 base url 判定失败 ⇒ 改为 `^/+`。
2. `apps/sdkwork-cloudrouter-common/package.json` 缺 workspace 依赖声明，`tests/family-contracts.test.ts` 整文件无法加载（`ERR_MODULE_NOT_FOUND`）⇒ 补 `@sdkwork/cloudrouter-contracts` / `-sdk-ports` / `-service` 三条 `workspace:*`。
