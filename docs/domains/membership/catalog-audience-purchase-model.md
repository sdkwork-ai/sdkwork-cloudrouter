# 套餐与会员：受众 × 购买方式分类设计

状态：已实现（membership 后台管理契约 + Cloud Router 管理端会员中心）

本文是「套餐与会员」目录分类的权威说明。管理端 `/admin/memberships/plans` 的信息架构、
membership 后台管理接口的读模型与写入契约、以及方案购买方式的推导规则，都以本文为准。

## 1. 问题

调整前，同一个会员目录存在三套互不对齐的分类口径：

| 口径 | 出现位置 | 问题 |
| --- | --- | --- |
| `category`（`token` / `community`） | 管理端方案、分组、套餐页面筛选 | 这是**产品体系**，与「卖给谁」「怎么计费」无关，却长期占据唯一分类位 |
| `audience`（`personal` / `team`） | 仅存在于 app 目录读模型（`/app/v3/api/memberships/*`） | 管理端读模型不回传、不筛选、不可写；管理员看不到也改不了个人/企业归属 |
| `billing_cycle`（`once` / `day` / … / `year`） | 仅存在于套餐与分组 | 管理端创建套餐时由时长**猜测**，且从不返回 `once`，导致「一次性购买」只能靠 seed SQL 产生 |

由此产生四个具体缺陷：

1. 管理端无法区分个人方案与企业方案，方案列表只有「体系」一个维度。
2. 管理端创建的企业套餐会被写成 `personal`（`membership_package.audience` 默认值），
   与企业方案不自洽，购买后无法按组织履约。
3. 管理端创建的分组 `billing_cycle` 被忽略，一律由时长反推，`one_time` 选项实际无效。
4. 套餐与方案的分类互相不可见，方案列表无法回答「这个方案是订阅还是一次性购买」。

## 2. 分类模型

会员目录由两个正交维度构成，二者都已经是数据模型中的既有事实，本次只是把它们
**在管理端暴露、校验、并作为信息架构的主轴**。

### 2.1 受众（卖给谁）

| 值 | 含义 | 履约形态 |
| --- | --- | --- |
| `personal` | 个人会员 | `membership_subscription.subject_type='user'`，隐含 1 个许可 |
| `team` | 企业会员 | `subject_type='organization'`，按坐席授权（`membership_seat_assignment`） |

受众是**方案（plan）的属性**：一个方案只卖给一种受众。包分组（package group）与套餐
（package）继承该受众，服务端在写套餐时以分组为权威并校验与方案一致。

### 2.2 购买方式（怎么计费）

购买方式**不是存储字段**，而是由售卖该方案的套餐周期推导：

| 周期 | 归类 |
| --- | --- |
| `month` / `quarter` / `year` | 订阅（到期续费） |
| `once` | 一次性购买（单次结算，不续费） |
| `day` / `week` | 一次性购买（预付费短周期，不自动续费） |

推导结果：

| 套餐周期覆盖 | 购买方式 |
| --- | --- |
| 只含订阅周期 | `subscription` |
| 只含一次性周期 | `one_time` |
| 两者都有 | `mixed`（订阅 + 一次性购买） |
| 没有任何套餐 | `unlisted`（未上架，方案存在但不可购买） |

> 规则：购买方式永远不被写入方案表。若把它落库，就会与真实套餐产生第二个真相，
> 出现「方案标称订阅、套餐只有一次性」这类无法自动修复的不一致。

### 2.3 四象限

受众 × 购买方式构成管理端的一级导航：

|  | 订阅 | 一次性购买 |
| --- | --- | --- |
| **个人** | 个人订阅（按月/季/年续费） | 个人一次性购买（单次结算） |
| **企业** | 企业订阅（按坐席续费） | 企业一次性购买（按坐席单次结算） |

四象限与 `plan.audience` + 推导出的购买方式一一对应；`mixed` 方案同时出现在订阅与
一次性两个视图中（隐藏任一侧都会让目录看起来缺失）。

## 3. 数据模型映射

| 目录行 | 分类字段 | 说明 |
| --- | --- | --- |
| `membership_plan` | `audience`（权威）、`category`（体系） | 方案决定受众；`rank` 决定等级顺序 |
| `membership_package_group` | `audience`（权威）、`billing_cycle`（声明值） | 分组是受众的继承源，也是套餐周期的声明值 |
| `membership_package` | `audience`（继承）、`recurrence_cycle`（权威） | 套餐的 `recurrence_cycle` 是购买方式的最终依据 |
| `membership_subscription` | `subject_type` | 由所购方案受众决定，不由请求方决定 |

`membership_package.audience` 由服务端在创建/更新时从所属分组读取并校验：
分组、方案、套餐三者的 `audience` 必须一致，否则返回 400，而不是写入一条不可购买的套餐。

## 4. 后台契约变更（membership backend-api）

| 变更 | 位置 |
| --- | --- |
| 新增 `MembershipAudience` 枚举（`personal` / `team`） | OpenAPI `components.schemas` |
| 方案、分组、套餐读模型新增 `audience` | `AdminMembershipPlanItem` / `AdminMembershipPackageGroupItem` / `AdminMembershipPackageItem` |
| 方案读模型新增 `packageCount`、`billingCycles` | `AdminMembershipPlanItem`（目录覆盖度） |
| 套餐读模型新增 `billingCycle` | `AdminMembershipPackageItem`（购买方式依据） |
| 方案、分组写入新增 `audience` | `AdminMembershipPlanMutation` / `AdminMembershipPackageGroupMutation` |
| 套餐写入新增可选 `billingCycle` | `AdminMembershipPackageMutation`（缺省按时长推导，且永不推导为 `once`） |
| 方案、分组、套餐列表新增 `audience` 查询参数 | `GET /backend/v3/api/memberships/{plans,package_groups,packages}` |
| 方案列表新增 `purchase_model` 查询参数（`subscription` / `one_time`） | `GET /backend/v3/api/memberships/plans` |
| 目录枚举参考新增 `audiences` | `GET /backend/v3/api/memberships/meta/catalog` |

`purchase_model` 在服务端用存在性子查询实现（`EXISTS` 一个周期属于该购买方式的在用套餐），
因此**分页与总数保持真实**：`mixed` 方案同时命中两个取值，`unlisted` 方案不命中任何取值。
把购买方式留给前端按当前页过滤会让「共 N 个方案」和翻页失真，这也是它必须进契约的原因。

兼容性：

- `audience` 缺省时按 `personal` 处理，历史调用方行为不变。
- 套餐 `billingCycle` 缺省时按 `durationDays` 推导（`>=365`→`year`，`>=90`→`quarter`，
  `>=30`→`month`，`>=7`→`week`，否则 `day`），**永不推导为 `once`**：一次性购买是商业决策，
  必须显式声明。
- 分组 `billingCycle` 改为使用请求值（此前被忽略），并校验词表；历史 `one_time` 拼写
  在前端归一为 `once`，数据库 CHECK 只接受 `once`。

`billingCycles` 聚合口径：取该方案下非 `disabled` 套餐的
`COALESCE(NULLIF(recurrence_cycle,''), 所属分组 billing_cycle)` 去重集合，按
`once → day → week → month → quarter → year` 规范化排序。

## 5. 管理端信息架构

### 5.1 会员中心目录收敛

调整前会员中心的目录组有四个入口：方案、**套餐分组**、套餐、**VIP 套餐**。其中
`/admin/memberships/vipPackages` 是 `membership_package` 上**第二份完全相同的列表**
（同一接口、同一数据、无任何过滤差异），只是换了一套文案。这正是「同一个目录两套分类」
的来源：操作者不知道该在哪一页维护价格。

现在目录组只保留三个概念，一一对应数据模型：

| 菜单 | 路由 | 负责 |
| --- | --- | --- |
| 会员方案 | `/admin/memberships/plans` | 等级、权益、受众、购买方式（派生） |
| 套餐价格 | `/admin/memberships/packages` | 方案 × 周期 × 价格 |
| 计费周期 | `/admin/memberships/packageGroups` | 周期容器，决定订阅/一次性 |

`vipPackages` 仅作为历史深链保留：路由仍可访问，但渲染的是唯一的套餐价格目录，
菜单入口已移除，页面与文案（34 个 key × 2 locale）一并删除。

### 5.2 页面结构

`/admin/memberships/plans` 由四个区块组成，自上而下收窄：

1. **四象限导航**：受众 × 购买方式。点击进入象限；再次点击已选象限回到全部。
   象限与下方分段筛选器共用同一份状态，不会互相矛盾。未筛选购买方式时，每张卡片显示
   该象限的方案数；已按购买方式筛选时卡片不显示计数 —— 服务端已把结果收窄到单一购买方式，
   其余象限此时的数字没有意义，显示会误导。
2. **筛选工具条**：受众分段、购买方式分段、方案体系下拉、状态下拉、结果计数、
   三个覆盖度胶囊（订阅 / 一次性 / 暂无套餐）、重置。
3. **方案表**：方案（等级徽标 + 编码）、受众、体系、购买方式、计费周期、套餐数、权益数、
   状态、更新时间、操作（编辑 / 停止售卖）。
4. **分页**：服务端分页，筛选条件（受众 / 购买方式 / 体系 / 状态）全部参与查询，
   所以页码、总数与筛选结果始终一致。

表格按受众分组展示（受众筛选为「全部」时插入分组表头，显示方案数与含订阅套餐的方案数），
组内按 `rank` 排序，并提供「新建个人方案 / 新建企业方案」入口。

抽屉表单：

- 受众作为一等字段（个人 / 企业 二选一，附履约差异说明）。
- 编码创建时可编辑、编辑时只读（编码是订单与权益引用的方案标识）。
- 编辑态以只读方式展示「售卖覆盖」：购买方式徽标、套餐数、周期 chips，并提示前往套餐维护。
- 权益编辑器保留原有结构化行编辑能力。

套餐与分组页面同步获得受众维度：

- 分组页：受众筛选 + 受众列 + 表单受众字段（分组受众是套餐受众的继承源）。
- 套餐页：受众筛选 + 受众列 + 表单「购买方式」下拉（一次性 / 按天 / 按周 / 按月 / 按季 / 按年），
  使「一次性购买」可以通过界面创建，而不再只能依赖 seed。

## 6. 边界与不变量

| 不变量 | 保障方式 |
| --- | --- |
| 购买方式只有一个真相 | 由套餐 `recurrence_cycle` 推导，不落库 |
| 套餐受众 = 分组受众 = 方案受众 | 服务端写套餐时校验，不一致返回 400 |
| 方案受众不可在有在售套餐时被改 | 服务端 `plan_audience_change_conflicts` 拒绝（400），抽屉表单同步锁定该控件并说明原因 |
| 一次性购买不可被隐式创建 | 契约与前端均不把时长推导为 `once` |
| `mixed` 方案不丢失 | 订阅视图与一次性视图都保留 |
| 未上架方案可见 | `unlisted` 单独计数，套餐数列高亮为 0 |
| 象限计数不撒谎 | 只在「受众=全部 且 购买方式=全部」时显示；任一分类筛选生效后隐藏，宁可不显示也不显示 0 |
| 筛选与分页一致 | 受众 / 购买方式 / 体系 / 状态全部在服务端查询中生效 |
| 停止售卖 = 软删除 | `DELETE` 置 `disabled`，历史订阅仍可解析方案 |
| 目录一概念一入口 | 会员中心目录只有方案 / 套餐价格 / 计费周期；`vipPackages` 仅为历史深链 |

## 7. 验证

```bash
# membership 仓库
cargo fmt -- --check
cargo test -p sdkwork-membership-repository-sqlx -p sdkwork-routes-membership-backend-api -p sdkwork-membership-service
node ../sdkwork-specs/tools/validate-api-assembly.mjs --root .
node ../sdkwork-specs/tools/check-api-response-envelope.mjs --workspace .
node sdks/sdkwork-membership-backend-sdk/bin/generate-sdk.mjs   # 契约 → SDK 再生成

# cloudrouter 仓库（PC 管理端）
node scripts/typecheck-owned-sources.mjs
node --import tsx --test admin-membership-plans-runtime.test.ts
pnpm exec vitest run admin-membership-plans.dom.test.tsx --config vite.config.ts --configLoader native --mode standalone.development --pool vmThreads
node ../sdkwork-specs/tools/check-i18n-standard.mjs --root .
node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .
```

分类纯函数（`planTaxonomy.ts`）覆盖：购买方式推导、周期规范化、`mixed` 双向可见、
受众/体系/购买方式组合筛选、概览与分组一致性、四象限完整性。
服务层用例覆盖：方案与套餐列表发送 `audience` 参数、创建方案必带 `audience`、
停止售卖走 `DELETE /memberships/plans/{id}`。
