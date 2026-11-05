# 应用根规范符合性审计与补齐（H5 / PC / 小程序 / Flutter）

> 生成：2026-11-05 · 范围：`apps/sdkwork-cloudrouter-{pc,h5,mini-program,flutter-mobile}`
> 权威：`sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md`、`APP_PC_ARCHITECTURE_SPEC.md`、`APP_H5_ARCHITECTURE_SPEC.md`、`MINI_PROGRAM_APP_ARCHITECTURE_SPEC.md`、`FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md`、`APP_ASSETS_SPEC.md`、`COMPONENT_SPEC.md`
> 参照样板：`../sdkwork-doctor/apps/*`（同族应用根的骨架深度）

## 1. 结论

四个应用根在审计前**已经存在且带真实实现**（PC 926 个受版本控制文件 / 44 个包；H5 151 / 8；小程序 136 / 8；Flutter 122 / 7），不是空壳，因此本次按“**补齐规范骨架 + 修可验证缺陷**”执行，未重写任何已有源码。

| 应用根 | 补齐前主要缺口 | 本次结果 |
| --- | --- | --- |
| `sdkwork-cloudrouter-pc` | 无 `bin/`、`sdks/`、`assets/`；`docs/`/`public/`/`scripts/`/`specs/` 已具备 | 新增 15 个文件，骨架补齐 |
| `sdkwork-cloudrouter-h5` | 无 `bin/{ios,android}`、`docs/`、`scripts/`、`sdks/`、`public/README.md`、`specs/README.md`、`assets/` | 新增 18 个文件，骨架补齐 |
| `sdkwork-cloudrouter-mini-program` | 无 `docs/`、`sdks/`、`specs/README.md`、`config/host/`、`assets/`、`project.private.config.json.example`；运行时产物陈旧 | 新增 19 个文件 + 重建运行时产物 |
| `sdkwork-cloudrouter-flutter-mobile` | 无 `analysis_options.yaml`、`docs/`、`scripts/`、`sdks/`、`specs/README.md`、`config/host/`、`assets/` | 新增 20 个文件，骨架补齐 |

合计 **72 个新增文件**（不含修改文件），全部为索引/模板/骨架，无业务逻辑改动。

## 2. 本次补齐内容

### 2.1 通用骨架（四个应用根一致）

- `assets/`：按 `APP_ASSETS_SPEC.md` §3 建 `README.md`、`.gitignore`、`resources/`、`media/{icons,covers,screenshots,previews/video,store}`、`capture/`。媒体目录用 `.gitkeep` 占位，`capture/capture.config.json` 留待启用捕获时生成（未伪造 schema 数据）。
- `sdks/README.md`：声明该应用根不持有独立 SDK authority，只消费仓库级 `sdks/cloudrouter-*-sdk`。
- `specs/README.md`（H5 / 小程序 / Flutter）：本地组件规格索引，含组件表、机器契约、canonical specs、公开导出、运行时配置、验证命令。

### 2.2 平台骨架

- PC：`bin/{README,windows,linux,macos}/README.md`（无 Tauri/Electron/Capacitor 主机包，目录为保留位并写明委派根命令）。
- H5：`bin/{README,ios,android}/README.md`（无 Capacitor 主机包，保留位）；`docs/`、`scripts/`、`public/README.md`。
- 小程序：`config/host/{README,mp-weixin.<env>.example.json ×4}`、`project.private.config.json.example`、`docs/`。
- Flutter：`analysis_options.yaml`（`flutter_lints` 基线 + analyzer 排除 build 产物）、`config/host/{README,flutter.<env>.example.json ×4}`、`docs/`、`scripts/`。

### 2.3 有意的“不复制”决定

- **未创建 `config/browser/runtime-env.*.example.json`**：本仓库已按 `SOURCE_CONFIG_SPEC.md` §4 把浏览器 profile 源放在 `etc/browser/`，`config/` 只保留 host 增补。复制一份会形成第二配置权威，已在该目录 README 中记录。
- **未创建 PC/H5 的 native host 包**：两表面目前只交付浏览器渲染器；`bin/` 平台目录仅为保留位。
- **小程序资产分离**：TabBar 图标仍留在 `src/images/`（WeChat 运行时加载），`assets/` 只承载目录/商店媒体。

## 3. 本次修复

| 问题 | 证据（修复前） | 修复 |
| --- | --- | --- |
| 小程序运行时环境陈旧：`src/runtime/runtime-env.js` 缺少 materialized profile 里的 `SDKWORK_ACCESS_TOKEN` | `node --test apps/sdkwork-cloudrouter-mini-program/tests/mini-program-surface-contract.test.mjs` → `SDKWORK_ACCESS_TOKEN` deep-equal 失败（1 fail） | 用拥有该产物的脚本重建：`node scripts/build-runtime.mjs`（仅 `src/runtime/*` 变化；bundle 差异为 esbuild 字面量归一化与相对路径注释前缀，无语义变化） |
| Flutter 边界测试误报：注释中提到 `cloudrouter_app_sdk` 即被判为“导入生成的传输层” | `flutter-mobile-surface-contract.test.mjs` → `console_usage_service.dart must not import the generated transport` | 把断言从子串匹配改为匹配 `import`/`export` 指令（`GENERATED_TRANSPORT_DIRECTIVE`），保护范围不变、误报消除 |
| H5 / 小程序 / Flutter 的 `component.spec.json` 缺少 `COMPONENT_SPEC.md` §4 要求的 root specs | 三个根分别只有 6 / 9 / 7 条 `canonicalSpecs` | 补齐到 16 / 17 / 17 条（`APPLICATION_SPEC`、`APP_MANIFEST_SPEC`、`FRONTEND_SPEC`、`UI_ARCHITECTURE_SPEC`、架构 UI 规格、`CONFIG_SPEC`、`DEPLOYMENT_SPEC`、语言规格） |

## 4. 验证证据

全部命令在仓库根执行。

| 命令 | 结果 |
| --- | --- |
| `node ../sdkwork-specs/tools/check-apps-directory-index.mjs --root .` | exit 0 · `apps directory index ok` |
| `node ../sdkwork-specs/tools/check-source-config-standard.mjs --root .` | exit 0 · `source config standard passed` |
| `node ../sdkwork-specs/tools/check-browser-runtime-env-standard.mjs --root .` | exit 0 · `standard ok` |
| `node ../sdkwork-specs/tools/check-browser-dist-layout.mjs --root .` | exit 0 · `browser dist layout passed` |
| `node ../sdkwork-specs/tools/check-application-layering.mjs --root .` | exit 0 · `application layering check passed` |
| `node ../sdkwork-specs/tools/check-app-assets-standard.mjs --workspace .` | exit 0 · `23 manifest(s), 0 adopted, 23 legacy` |
| `node ../sdkwork-specs/tools/check-client-host-packages.mjs --root .` | exit 0 · `1 client host package(s) aligned` |
| `node ../sdkwork-specs/tools/check-composition-resolver.mjs --root .` | exit 0 · `Composition resolver check passed` |
| `node ../sdkwork-specs/tools/check-component-api-surface-prefixes.mjs --root .` | exit 0 · `component API surface prefix check passed` |
| `node ../sdkwork-specs/tools/materialize-client-env.mjs --root . --check` | exit 0 · `38 files verified` |
| `node --test apps/sdkwork-cloudrouter-h5/tests/h5-surface-contract.test.mjs` | exit 0 · 10/10 pass |
| `node --test apps/sdkwork-cloudrouter-mini-program/tests/mini-program-surface-contract.test.mjs` | exit 0 · 12/12 pass |
| `node --test apps/sdkwork-cloudrouter-flutter-mobile/tests/flutter-mobile-surface-contract.test.mjs` | exit 0 · 9/9 pass |

## 5. 未闭合项（需决策，本次未改动）

1. **`check-frontend-composition.mjs` / `verify-repo.mjs` 仍有 2 条**：`sdkwork-cloudrouter-pc-admin-upstream` 的 `vendorProtocolCatalog.ts(.test.ts)` 导入 `./generated/vendorCatalogMatrix.generated`。该文件是 `tools/generate-cloudrouter-vendor-catalog.mjs` 生成的**目录数据**，不是 SDK 传输层，但校验器的 `generated` 关键字规则无法区分。修复涉及生成产物归属（改名或移入 `pc-admin-core` 并再导出），按 `AGENTS.md` Human Review Rules 属于“改变生成产物归属”，需人工批准后再做。
2. **`check-app-permission-tiers.mjs --workspace .` 报 31 条**：app-api 消费者操作声明了 `x-sdkwork-permission` 却缺 `x-sdkwork-auth-tier: 3`。属于 API 契约工作面，需按 `PERMISSION_STANDARD_SPEC.md` 决策是否 `--fix` 剥离旧注解，并重新生成 SDK。
3. **`generated/composition.resolved.json` 已陈旧**：`resolve-composition.mjs --root .` 现算结果与已提交文件哈希不同（`2DC4E5…` vs `9D418A…`），差异含其它包（如 `sdkwork-cloudrouter-pc-admin-course`）。本次只补 `canonicalSpecs`，未整体重写该文件；需要一次独立的 `--write` 对齐任务并单独评审 diff。
4. **组件类型词表不一致**：`h5-app-root` / `mini-program-app-root` / `flutter-mobile-app-root` 不在 `COMPONENT_SPEC.md` §4 允许值（`h5-app` / `mini-program-app` / `flutter-app` / `react-app`）内。改名会连带 3 个 `component.spec.json`、3 个 surface 测试断言与组合解析产物，属公开命名变更，需人工评审。
5. **PC 根瘦身未做**：PC 根目录仍有 50+ 个 `*.test.ts(x)`，规范要求归入 `tests/`；`src/bootstrap/` 与 `src/AuthGate.tsx` 缺席，等价职责由 `src/main.tsx` + `src/auth/*` + `src/app-auth/*` 承担。属结构重构，风险高于骨架补齐，本次仅记录。
6. **资产清单未 adopt**：`assets/` 骨架已就位，但 `agent.app.config.json#media` 仍是 legacy 绑定，`capture/capture.config.json` 未生成；adopt 需要真实商店媒体与捕获流程。

## 6. 复核建议

```bash
# 骨架
node ../sdkwork-specs/tools/check-apps-directory-index.mjs --root .
node ../sdkwork-specs/tools/check-app-assets-standard.mjs --workspace .
# 组合（当前仍有第 5 节第 1 条的 2 条历史失败）
node ../sdkwork-specs/tools/check-frontend-composition.mjs --root .
# 表面契约
node --test apps/sdkwork-cloudrouter-h5/tests/h5-surface-contract.test.mjs
node --test apps/sdkwork-cloudrouter-mini-program/tests/mini-program-surface-contract.test.mjs
node --test apps/sdkwork-cloudrouter-flutter-mobile/tests/flutter-mobile-surface-contract.test.mjs
```
