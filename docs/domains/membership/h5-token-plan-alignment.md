# H5 会员中心与 PC `/token-plan` 定义对齐

状态：已实现，纳入回归门禁（`apps/sdkwork-cloudrouter-h5/tests/h5-membership-token-plan-alignment.test.mjs`）。

- PC 参考实现：`apps/sdkwork-cloudrouter-pc/src/token-plan/*`（`/token-plan` 公开页 + 控制台会员页共用的 `CloudRouterTokenPlanSurface`）。
- PC 会员定义权威：`@sdkwork/membership-pc-subscription` 的 `subscription-catalog-mapper.ts`（套餐分组、等级 rank、算力积分换算、权益对照表）与 `subscription-catalog-service.ts`（目录/会员状态装配）。
- H5 实现归属：`apps/sdkwork-cloudrouter-h5/packages/sdkwork-cloudrouter-h5-membership`（页面、定义映射、运行时端口）。
- H5 数据面归属：`apps/sdkwork-cloudrouter-h5/packages/sdkwork-cloudrouter-h5-core/src/sdk/commerceServices.ts`（membership / account / order 域服务）。

## 1. 目标

H5 的「会员」必须是 Cloud Router 的 Token Plan 会员定义，而不是通用 VIP 演示：

- 会员等级、套餐、价格、算力积分额度、权益对照必须与 PC `/token-plan` 同源同义；
- 开通 / 续费 / 升级、购买算力积分（Token Bank 充值）、会员兑换码、会员状态与算力积分余额必须走真实域服务；
- 移动端按移动端重做视觉、交互与信息层级，不照搬 PC 版式。

## 2. 对齐前审计（问题）

| 面 | 对齐前 | 问题 |
| --- | --- | --- |
| `/membership` | 挂载 `@sdkwork/membership-mobile-react-subscription` 的 `VipSubscriptionPage` | 硬编码「连续包月/包季/包年 19/53/188 元」与「专属标识/安全防护/优先体验」权益，与 Cloud Router 会员定义无关，且无任何真实数据 |
| `/recharge` | 挂载同包的 `TokenRechargePage` | 硬编码 100/500/1000/5000 演示 SKU、演示优惠券；「购买」只弹 toast，不创建订单 |
| H5 数据面 | 无 | H5 core 未接入 membership / account / order 域服务；没有会员状态、算力积分余额、开通/充值/兑换命令 |

## 3. 对齐后的数据来源

| 数据 | 域服务调用 | 说明 |
| --- | --- | --- |
| 计费周期分组 | `memberships.packageGroups.list` | 每个分组内含该周期的可购套餐（PC 同源） |
| 会员等级 | `memberships.plans.list` | `rank` 1..4 对应基础/高级/巅峰/超级 |
| 权益对照 | `memberships.benefits.list`（planId = 0..4） | 按 rank 取权益，缺失时使用与 PC 相同的静态兜底 |
| 当前会员 | `memberships.current.retrieve`，失败回退 `memberships.current.status.retrieve` | 等级、有效期、剩余天数、等级名 |
| 算力积分余额 | `tokenBank.account.retrieve` | 数值按 1e6 微单位换算（`toSdkworkAccountPointsFromMicro`） |
| 开通/续费/升级 | `memberships.orders.create`（经 `createSdkworkMembershipCheckoutService`） | `action` 由当前 rank 与目标 rank 推导；`paymentProduct = mobile_cashier_h5` |
| 算力积分充值 | `recharges.orders.create`（经 `createSdkworkTokenBankRechargeService`） | `subject = token_bank_recharge`、`targetAsset = token_bank`，金额/到账由服务端定价 |
| 会员兑换 | `orders.couponRedemptions.create`（经 `createSdkworkCouponRechargeService`） | 支持算力积分 / 会员积分 / 订阅 / 余额四类权益 |
| 团队订阅总览 | `memberships.teamSubscription.retrieve` / `.bind` | 组织态、坐席数、超员策略、绑定状态 |
| 团队套餐 | `memberships.packages.list` / `packageGroups.list`（`audience=team`） | 按坐席计价；分组驱动计费周期 |
| 团队席位 | `memberships.teamSeats.list/create/delete`、`.policy.update`、`.reconcile` | 分配/回收/策略/离组同步 |
| 组织与成员 | `iam.organizationMemberships.list`、`iam.organizations.list/tree`、`iam.organizations.members.list` | 自有组织、组织名、成员目录 |
| 组织切换 | `auth.sessions.current.update({organizationId})` | 轮换会话到目标组织并提交新双 token |

支付统一交给 H5 收银台：订单返回的 `cashierUrl`（`/cashier/s1.*` 短链）直接跳转，支付协议由 order/payment 域负责，会员页不自行轮询二维码。

## 4. 定义一致性矩阵

| 定义元素 | PC `/token-plan` | H5 `/membership` |
| --- | --- | --- |
| 等级 → tier key | 1→`pro`、2→`peak`、3→`peak`、4→`super` | 相同 |
| 等级名称 | 基础/高级/巅峰/超级会员（对照表列头另用标准/高级/超级） | 套餐卡与对照表列头统一使用基础/高级/巅峰/超级，同一等级不再出现两种叫法 |
| 计费周期 | 套餐分组（含「5.8折」等折扣标签） | 相同（横向 chip rail） |
| 套餐卡字段 | 价格、原价、周期、算力积分/月、换算规则、权益行、推荐、折扣标签 | 全字段保留（纵向卡片） |
| 月度算力积分 | `pointAmount / 12`（年）、`/ 3`（季）、原值（月），下限 1 | 同一公式 |
| 换算文案 | `¥10 = round(pointAmount / max(price,1) * 10)` 算力积分 | 同一公式 |
| 套餐权益模板 | rank 1/2/3/4 各 5/7/7/7 行 | 相同行与标签 |
| 权益对照表 | 14 行 / 4 分类（算力积分、视频生成、图片生成、全局能力） | 相同行、分类、benefitKey 与兜底顺序 |
| 当前会员状态 | 等级、有效期、剩余天数、状态 | 等级、有效期、剩余天数（Hero 卡） |
| 算力积分余额 | Token Bank `tokenBankAvailable` | Token Bank 可用算力积分 |
| 购买动作 | 开通 / 续费 / 升级 + 收银台 | 相同（移动收银台 `mobile_cashier_h5`） |
| 购买算力积分 | `SdkworkPointsRechargeDialog` | 真实充值套餐 bottom sheet + `/recharge` 独立页 |
| 会员兑换 | `SdkworkCouponRedemptionDialog` | 兑换 bottom sheet + `/recharge` 兑换页签 |
| 未登录 | 目录公开、购买时跳登录 | 目录公开、Hero 显示「去登录」、任何购买/兑换动作跳 `/sign-in` |
| 团队受众切换 | 个人 / 团队 tab | 个人会员 / 团队会员分段控件 |
| 团队订阅总览 | 组织、等级、坐席、有效期、角色、绑定态 | 同字段（团队总览卡） |
| 团队套餐与坐席计价 | 按坐席单价 × 坐席数，`purchase` 传总量 | 同一公式与 action 语义；坐席步进器默认/边界同 PC |
| 团队扩容 | `add_seats` 传新增数 | 同 action/quantity；仅展示当前套餐 |
| 席位目录 | 组织成员 + 坐席状态 + 分配/回收 + 搜索 + 分页 | 同数据与操作（列表 + 下拉加载） |
| 超员策略 | 严格/弹性 + 自动分配开关 | 同字段与默认值 |
| 离组同步 | `teamSeats.reconcile` | 同接口；`revokedCount` 结果提示 |
| 组织绑定 | 未绑定订阅绑定 owner/admin 组织 | 同规则与错误文案 |
| 组织切换 | 登录续期式选择 | 会话轮换（`auth/sessions/current`） |

## 5. 移动端自有设计（有意差异）

- **会员 Hero 卡**：等级、有效期、Token Bank 可用算力积分与三个commerce入口（购买算力积分 / 会员兑换 / 算力积分详情）放进拇指可达的卡片，替代 PC 的标题 + 文字链接。
- **计费周期 chip rail**：水平滚动而不是 PC 居中 tab，保证「5.8折」标签和 44px 点击目标。
- **套餐卡片纵向堆叠**：PC 四列栅格在 390px 宽度不可用；字段一个不少，顺序按「等级 → 价格 → 算力积分 → 权益 → 行动」重排。
- **权益对照**：左侧权益列 sticky + 右侧等级列横向滚动，等级表头即购买入口；PC 宽表格在手机上不可读。列头等级名与套餐卡统一（PC 的对照表把 rank 2/3 叫「标准/高级」，套餐卡却叫「高级/巅峰」，同屏出现两个不同等级名；移动端一等级一名）。
- **算力积分单位**：充值套餐在 wire 上是微单位（1 分 = 1e6），H5 统一换算一次后展示（与 PC 充值弹窗 `sdkworkTokenBankPointsMicroToDecimal` 一致），不再出现 `5,000,000,000` 这类原始值。
- **Bottom sheet 完成交易**：开通、充值、兑换都从底部弹出，不复刻 PC 居中弹窗。
- **当前计划判定**：H5 以 `planRank` 精确比较（PC 仅比较 tier key，导致 rank 2/3 共用 `peak` 时互相误判为「当前计划」）；tier key 比较保留为无 rank 时的兜底。
- **超级会员权益**：H5 拉取 rank 4 的真实权益；PC 只拉 0..3 并对 rank 4 使用硬编码「每月7,499算力积分」兜底。H5 保持数据驱动，数据缺失时显示 `-`。
- **团队/组织会员采用移动端形态**：与 PC 同一套业务规则（团队订阅总览、按坐席计价购买、扩容、席位分配/回收、超员策略、离组同步、未绑定组织绑定），但以「受众切换 + 团队总览卡 + 套餐坐席步进器 + 席位管理列表 + bottom sheet 结算」组织；PC 的团队表格式席位目录与弹窗表单不复刻。
- **组织切换**：H5 调用 IAM `PATCH /auth/sessions/current` 轮换当前会话到目标组织并提交新双 token（共享 TokenManager 即时生效，无需重建客户端、无需重新登录）；PC 使用登录续期式 `organization_selection`，H5 不具备登录续期上下文，因此走会话轮换路径。轮换失败时保留会话并提示「重新登录并选择组织」，不清空登录态。
- **扩容只展示当前套餐**：PC 扩容卡片按套餐全量渲染；H5 在扩容模式下只展示当前订阅套餐（按 `overview.planId` 过滤），避免用户对其它套餐发起必然失败的 `add_seats`。

## 6. 代码落点

| 关注点 | 文件 |
| --- | --- |
| 会员定义映射（等级、周期、积分、权益、对照表） | `apps/sdkwork-cloudrouter-h5/packages/sdkwork-cloudrouter-h5-membership/src/catalog/membershipDefinition.ts` |
| 运行时端口与默认实现 | `.../src/runtime.ts` |
| 会员中心页面 | `.../src/screens/MembershipScreen.tsx`（个人/团队受众切换） |
| 团队会员面 | `.../src/components/TeamMembershipSurface.tsx`、`TeamPlanCards.tsx`、`TeamSeatManagement.tsx`、`TeamCheckoutSheet.tsx` |
| 团队契约与定价 | `.../src/team/teamContract.ts`、`teamPricing.ts`、`teamErrorCopy.ts`、`useTeamMembership.ts` |
| 充值/兑换页面 | `.../src/screens/TokenRechargeScreen.tsx` |
| 移动端组件 | `.../src/components/*.tsx` |
| 域服务数据面 | `apps/sdkwork-cloudrouter-h5/packages/sdkwork-cloudrouter-h5-core/src/sdk/commerceServices.ts` |
| 路由接线 | `apps/sdkwork-cloudrouter-h5/src/routes/CommerceRoutes.tsx` |
| 引导接线 | `apps/sdkwork-cloudrouter-h5/src/bootstrap/sdkClients.ts` |
| 文案（zh-CN / en-US） | `apps/sdkwork-cloudrouter-h5/packages/sdkwork-cloudrouter-h5-i18n/src/i18n/{zh-CN,en-US}/cloudrouter/commerce/membership.ts` |

## 7. 回归门禁

`pnpm test`（H5 应用根）中的 `h5-membership-token-plan-alignment.test.mjs` 锁定：

1. 等级 → tier key 映射与 PC 完全一致；
2. 权益对照的分类、行标签、benefitKey 集合与 PC 完全一致；
3. 套餐权益模板行与 PC 一致；
4. 月度算力积分与换算公式与 PC 一致；
5. H5 运行时调用 membership/account/order 真实接口，且使用 `mobile_cashier_h5`；
6. H5 core 组合 membership/account/order 域服务并被 bootstrap 调用；
7. 会员页面组合了目录、对照、开通、充值、兑换、明细全部步骤；
8. `/membership` `/recharge` 挂载新实现，且不再引用演示版 `VipSubscriptionPage` / `TokenRechargePage`；
9. zh-CN / en-US 文案键集合一致，页面使用的每个键都有文案。

## 8. 验证记录

### 2026-11-25 回归记录

环境：Windows / Node v24.22.3 / pnpm 10.33.0；H5 应用根 `apps/sdkwork-cloudrouter-h5`。

| 命令 | 结果 |
| --- | --- |
| `pnpm --dir apps/sdkwork-cloudrouter-h5 typecheck` | exit 0 |
| `node --test tests/*.test.mjs`（H5 应用根） | 131 tests / 131 pass / 0 fail（含 16 项个人+团队对齐用例） |
| `pnpm build:dev`（canonical browser build，构建前跑 tsc） | PASS → `dist/standalone/dev/` |
| `node ../sdkwork-specs/tools/check-application-layering.mjs --root .` | passed |
| `node ../sdkwork-specs/tools/check-i18n-standard.mjs --root .` | passed（9140 files） |
| `node ../sdkwork-specs/tools/check-browser-dist-layout.mjs --root .` | passed |
| `node ../sdkwork-specs/tools/check-workspace-member-protocol.mjs --root .` | passed |
| `node ../sdkwork-specs/tools/check-dependency-list-completeness.mjs --root .` | ok |
| `pnpm check:pnpm-script-standard` | ok |
| `pnpm check:agent-workflow-standard` | ok |

依赖安装：`pnpm install --prefer-offline --ignore-scripts` 新增 `@sdkwork/cloudrouter-h5-membership`、`@sdkwork/iam-app-sdk` 与 membership/account/order 域服务的 workspace link，并更新 `pnpm-lock.yaml`（同时同步了一条兄弟仓库新增包的 importer，属 workspace glob 一致性回写）。

### 视觉证据（本地静态包 + Playwright mock API，390×844 / 长视口）

抓图脚本为本轮本地工具（未入库）：静态服务 `dist/standalone/dev`，拦截 `/app/v3/api/**` 返回会员目录/会员状态/Token Bank/充值套餐样例数据。

- `.screenshots/h5/membership-token-plan-member.png`（登录态：等级、有效期、算力积分、周期、套餐卡）
- `.screenshots/h5/membership-token-plan-full.png` / `membership-token-plan-full-a.png`（套餐卡 + 权益对照全量）
- `.screenshots/h5/membership-token-plan-guest.png`（未登录：目录可见、Hero 引导登录）
- `.screenshots/h5/membership-token-plan-dark.png`（暗色）
- `.screenshots/h5/membership-checkout-sheet.png`（开通 bottom sheet）
- `.screenshots/h5/recharge-token-bank.png`（充值套餐，微单位已换算）
- `.screenshots/h5/team-membership.png` / `team-membership-full.png`（团队受众：总览、席位管理、成员目录）
- `.screenshots/h5/team-expand-seats.png`（扩容坐席，仅当前套餐）
- `.screenshots/h5/team-checkout-sheet.png`（团队结算 bottom sheet）

`.screenshots/h5/membership*.png`、`recharge*.png` 中 2026-11-13 的旧图为演示版页面（已下线），以本轮 `membership-token-plan-*` / `recharge-token-bank` 为准。

### 已知非本次问题

- `node ../sdkwork-specs/tools/verify-repo.mjs --root .` 仍失败，命中项均为既有问题（h5-core 的 `order-app-sdk` sdkDependencies/权限组合、h5-messages/playground/settings 的 `layerRole`、orders/PC feature 包直接 import 生成 SDK、order-app-sdk 缺 `sdk-manifest.json`）；新包不在失败清单中，上述文件本轮未改动。
- 旧脚本 `pnpm build`（`tsc && vite build`，mode=production）因缺少 `.env.production` 的 public application token 失败，属既有环境前提；本轮以 canonical `pnpm build:dev` 验证构建。
- 移除了一份 2026-11-24 残留的 gitignored `apps/sdkwork-cloudrouter-h5/public/runtime-env.json`（构建产物），否则 `h5-dev-runtime-env` 用例失败；canonical 构建会再次生成，验证结束后已清理。
- 本轮运行标准校验命令时，PC 的 `apps/sdkwork-cloudrouter-pc/.env.standalone.development` 被 materializer 重写（public token 的 `exp` 字段），已用 `git restore --worktree --source=HEAD -- <exact path>` 还原，未纳入本次改动。

## 9. 剩余事项

- 团队/组织会员的 **权限边界**：席位分配、回收、策略、绑定、离组同步都需要 IAM `TEAM_SEAT_MANAGE`；H5 已按 `viewerRole` 只对 owner/admin 展示管理面，但最终以服务端 403 `seat_management_forbidden` 为准。
- **一个组织只能绑定一个团队订阅**，一个账号只能持有一笔未绑定订阅（后端约束）；H5 绑定面板只列出 owner/admin 组织，绑定失败按 reason 展示本地化提示。
- **组织切换会轮换会话**：切换成功后旧 token 失效；页面已用新 token 继续请求。若目标组织不可用（`iam_session_organization_unavailable`），保留会话并展示通用失败提示。
- H5 无独立钱包页，「算力积分详情」以余额 + 规则 + 充值/兑换入口承接；PC 详情弹窗跳转控制台钱包。
- 会员状态在页面加载时读取；支付跳转返回后由收银台页面承接，返回会员中心会重新拉取状态。
