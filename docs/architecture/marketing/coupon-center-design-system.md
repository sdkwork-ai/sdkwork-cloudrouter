# 优惠券中心视觉与交互规范（Admin）

> 状态：v1 评审稿 · 2026-11-10
> 适用范围：`apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-admin-marketing`（13 页 / 8 抽屉）
> 依据：`FRONTEND_SPEC` §设计系统（112、344）、`FRONTEND_CODE_SPEC` §组件（139）、`I18N_SPEC`、`UI_ARCHITECTURE_SPEC`
> 结论先行：**视觉不统一不是"配色问题"，是三件事没被约束——页面骨架、数据展示规则、反馈与确认。** 本规范把这三件事定死，页面按它回归。

---

## 1. 现状诊断（代码级，非主观）

| # | 现象 | 证据 | 影响 |
|---|---|---|---|
| V1 | 页面骨架不统一：`MarketingListView` 内自带标题/描述，而 `OffersPage` 又在外层渲染标题 + KPI 条 | `MarketingListView.tsx:232-235` vs `OffersPage.tsx` 头部 | 同一产品里出现两种"页头"，滚动时标题位置跳动 |
| V2 | 工具栏按钮是手写 `<button>`，每个页面样式各写一遍（圆角/边框/内距/hover 各不相同） | `MarketingListView.tsx:265-283`、各 Page 内联按钮 | 视觉密度不一致，无法随主题演进 |
| V3 | 时间格式化只识别 ISO（含 `T`）；后端管理端 SQL 直接 `CAST(... AS TEXT)`，会返回 `2026-11-10 09:12:00` 或带 offset 的形态 | `MarketingListView.tsx:459-464`；`promotion_admin_management.rs` 的 `CAST` 投影 | 部分页面把时间**原样**显示成字符串，中英混排 |
| V4 | 金额格式化把非整数当 0 处理：`Number("5.00")` → `5.00` 非整数 → 显示 `0.05`；`"5.5"` → 显示 `-` | `marketingService.ts` `formatMarketingAmountMinor`；`formatMoneyMinorUnits` 语义 | **100 倍错标**与"金额消失"，财务口径不可用 |
| V5 | 金额标签硬编码 `(CNY)`，与页面上的币种选择器并存 | `OfferDetailDrawer.tsx:136-137`、创建表单 | 非 CNY 券被标错币种 |
| V6 | 无限库存以 `0` 存储，表格与导出都显示 `0`，只有详情抽屉显示 `∞` | `marketingService.ts:340-341`；`CouponStocksPage.tsx` | 运营误判"没有库存" |
| V7 | 空态是居中一行灰字；错误态同时出现"顶部红条 + 状态面板"两份 | `MarketingListView.tsx:227-231, 368-371` | 重复信息、层级混乱 |
| V8 | 表格：表头 `text-slate-500` 与正文同字号；数字列右对齐但无等宽数字；长 id 不截断 | 同上 `373-405` | 数字跳动、表格在 1280px 下溢出 |
| V9 | 破坏性操作（启停用、删除）用原生 `window.confirm/alert`，且启停用**无确认** | `OffersPage.tsx:66-93`、`CampaignsPage.tsx:71-88` | 误点即影响线上券；错误无 traceId |
| V10 | 引用名称只取首页 200 条，取不到就显示裸 id；加载失败被吞掉 | `usePromotionReferences.ts:18-19,42-44` | 列表在规模化后大面积出现裸 id，且无任何提示 |
| V11 | 状态徽标语义不统一：同一 `active` 在券/库存/批次/领取记录里含义不同，颜色却相同 | `MarketingDrawer.tsx` 的 status badge | 运营把"券已领取"看成"券已生效" |
| V12 | 术语漂移：菜单 Offers / 页面 Coupon Offers / 按钮 Create Coupon / 实体 offer | `adminModuleRegistry.ts:374-391`、`OffersPage.tsx` | 培训成本，操作误判 |

---

## 2. 设计语言（强制）

### 2.1 令牌（沿用 Tailwind 语义类，不新造十六进制）

| 类别 | 令牌 |
|---|---|
| 页面背景 | `bg-white dark:bg-slate-950`（容器）/ `bg-slate-50 dark:bg-white/[0.02]`（区块） |
| 边框 | `border-slate-200 dark:border-white/10`；分隔线 `border-slate-100 dark:border-white/5` |
| 文本 | 主 `text-slate-900 dark:text-white`；次 `text-slate-600 dark:text-slate-300`；弱 `text-slate-500 dark:text-slate-400`；占位 `text-slate-400` |
| 品牌强调 | `lobster-500`（聚焦环、选中态），仅用于交互态，不用于大面积填充 |
| 语义色 | 成功 `emerald-600/10`；警告 `amber-500`；危险 `red-600`；信息 `sky-500` —— 只用 `-50/10` 填充 + `-600/-400` 文字 |
| 圆角 | 控件 `rounded-md`；卡片/面板 `rounded-lg`；徽标 `rounded-full` |
| 阴影 | 面板 `shadow-sm`；浮层 `shadow-lg`（仅抽屉/菜单） |
| 间距 | 4 的倍数；页面纵向 `gap-4`，表单行 `gap-3`，控件内距 `px-3 py-1.5` |
| 字号 | 页标题 `text-base font-semibold`；区块标题 `text-sm font-semibold`；正文/表格 `text-sm`；辅助 `text-xs`；表头 `text-xs font-medium uppercase tracking-wide` |
| 数字 | 所有数量/金额/百分比列加 `tabular-nums`；右对齐 |
| 时间 | 统一 `YYYY-MM-DD HH:mm`（本地时区），悬停显示完整含秒与时区 |

### 2.2 页面骨架（唯一形态）

```
PageHeader     标题(text-base font-semibold) + 说明(text-sm 弱色) + 右侧主操作(1 个 primary)
KpiStrip       可选，3–5 个指标，等宽、tabular-nums、标签 text-xs
FilterBar      搜索 + 状态 + 时间范围（如有）  ——  左侧筛选，右侧 批量操作/导出/刷新
ContentPanel   AdminTableShell：sticky 表头 + 行 hover + 空/错/载入三态在表体内
Pagination     左下 行数/区间，右下 页码 + 跳页
```

- **页头只允许出现一次**：由 `MarketingListView` 负责；页面不得再渲染第二个标题。
- 主操作每页至多 1 个（`Create …`）；其余进 `More` 菜单或工具栏次级按钮。

### 2.3 表格解剖

| 部分 | 规则 |
|---|---|
| 表头 | `text-xs uppercase tracking-wide text-slate-500`，`sticky top-0`，背景不透明（避免滚动穿透） |
| 行 | 高 44px；`border-b border-slate-100 dark:border-white/5`；hover `bg-slate-50/70 dark:bg-white/[0.03]` |
| 首列 | 主标识（名称/码号），`font-medium`，长文本 `truncate` + `title` |
| 数字列 | 右对齐 + `tabular-nums`；缺省显示 `—`（em dash，不是 `-`） |
| 状态列 | 统一 `StatusBadge`，语义由**域**决定（见 2.6） |
| 操作列 | 右对齐；≤2 个直接展示，更多收进 `More`；危险操作标红且需确认 |
| 空态 | `BusinessStateTableRow kind="empty"`：图标 + 标题 + 一句说明 + 可选主操作 |
| 载入 | 首次载入用骨架行；刷新用表头下方 2px 进度条 + `aria-busy`，不清空旧数据 |
| 错误 | 表体内 `kind="error"` + 重试按钮 + `traceId`（可复制）；**不再另外渲染红条** |

### 2.4 抽屉（详情/创建/编辑）

- 宽度：创建/编辑 `min(720px, 92vw)`；详情 `min(640px, 92vw)`。
- 结构固定：`Header(标题 + 关闭)` / `Body(分节 Section，每节 表单网格 2 列)` / `Footer(取消 + 主操作，sticky)`。
- 校验：字段级错误贴在字段下方（`text-xs text-red-600`），提交级错误在 Footer 上方一条 `InlineAlert`。
- 关闭保护：有未保存修改时，关闭需二次确认。
- 焦点：打开聚焦首个可编辑控件，`Esc` 关闭，焦点环可见；Tab 不逃逸。

### 2.5 反馈与确认

| 场景 | 形态 |
|---|---|
| 成功（创建/启停/删除/导出） | 顶部 `InlineAlert tone=success`，3 秒自动消失，可手动关；**不使用 toast**（commons 无 toast 原语，保持单一体系） |
| 失败 | `InlineAlert tone=danger`，含人类可读原因 + 可复制的 `traceId` |
| 破坏性操作 | `ConfirmDialog`（commons）`tone="danger"`，按钮文案写清后果与对象（券名/批次号/张数） |
| 长任务（生成 5000 张码） | 提交前确认（数量 + 库存余量 + 预计影响），提交后禁用按钮并显示进行中 |
| 明文导出 | 二次确认 + 展示行数 + 安全提示（已实现，保留） |

### 2.6 状态语义（按域，不共用一套颜色）

| 域 | 值 | 语义 | 颜色 |
|---|---|---|---|
| offer / stock / code | `active` | 生效中 | emerald |
| | `disabled` | 已停用 | slate |
| code batch | `generating` / `ready` / `failed`(待实现) | 生成中 / 可用 / 失败 | sky / emerald / red |
| user coupon | `claimed` | 已领取，未使用 | sky |
| | `redeemed` | 已核销 | emerald |
| | `expired` / `voided` / `cancelled` / `disabled` | 失效族 | slate / red |
| discount application | `applied` / `settled` / `released` / `rolled_back` | 已占用 / 已结算 / 已释放 / 已回滚 | sky / emerald / slate / amber |

> 规则：同一颜色不得同时表达"可用"和"已用"。徽标必须带文字，不能只靠颜色区分（无障碍）。

### 2.7 文案与术语

| 概念 | 统一英文 | 统一中文 | 禁用 |
|---|---|---|---|
| 活动 | Campaign | 活动 | Promotion（页面名） |
| 优惠规则 | Offer | 优惠 | Coupon Offer / Promotion |
| 库存池 | Coupon Stock | 券库存 | Stock Pool |
| 券码批次 | Code Batch | 券码批次 | Batch（单独使用） |
| 券码 | Code | 券码 | Coupon Code（与钱包券混用） |
| 钱包券 / 领取记录 | Claimed Coupon | 领取记录 / 我的券 | User Coupon（UI 文案） |
| 核销记录 | Redemption / Usage | 核销记录 | Discount Application（UI 文案） |

- 所有用户可见文案必须走 i18n（`admin.marketing.*`），不得硬编码（含 `0 = unlimited` 这类提示）。
- 数字/金额/时间必须带单位或格式（见 2.8）。

### 2.8 数字、金额、时间

| 类型 | 规则 |
|---|---|
| 计数 | 千分位；缺省 `—`；无限 `∞`（`stock_type=unlimited`） |
| 金额 | 一律显示 `minor → major` 转换后的两位小数 + ISO 币种；**非整数输入不得静默 ÷100**，改为原样展示并记 `console.warn`（防 100×） |
| 百分比 | 一位小数 + `%`；核销率 = redeemed / issued |
| 时间 | 入参可能为 RFC3339 或 `YYYY-MM-DD HH:MM:SS`（后端管理端 `CAST` 投影）或带 offset；统一解析 → 本地 `YYYY-MM-DD HH:mm`；不可解析则原样展示并加 `title` 说明 |
| 空值 | 统一 `—`，不用 `-` / `N/A` / 空白 |

---

## 3. 页面级目标（按商业价值排序）

| 优先级 | 页面 | 本轮/下轮要做的事 |
|---|---|---|
| P0 | Offers / Coupon Stocks | 唯一页头；主操作 1 个；**编辑券**（复用创建表单 + `version` 乐观锁）；库存对账条（issued/claimed/redeemed/available/locked + 漂移提示）；无限显示 `∞` |
| P0 | Codes / Batch Codes | 码详情抽屉（脱敏 + 揭示需权限与留痕，S2 后端就绪后接入）；批次头部改为 `codeBatches.retrieve`（不再扫前 200 条）；空态给"生成券码"操作 |
| P0 | User Coupons | 状态词表已修；补"作废/延长/重发"入口（S5 后端就绪后启用）；行内展示券码脱敏 + 复制反馈 |
| P1 | Discount Applications / Coupon Ledger | 金额单位与时间格式统一；按券/订单筛选；对账视图 |
| P1 | Campaigns / Distribution Tasks | 编辑带 `version`；发放结果下钻与重试（S1 后）；状态筛选 |
| P2 | Referral 三页 | 枚举标签化、修死搜索、去硬编码英文、裸 id 回退提示 |
| P2 | Overview | 可点击下钻、时间范围、失败时不整块消失 |

---

## 4. 无障碍与键盘

- 所有交互元素可 Tab 到达，焦点环 `focus-visible:ring-2 ring-lobster-500`；不得 `outline-none` 而无替代。
- 表格：`<th scope="col">`；排序/筛选按钮 `aria-pressed` / `aria-expanded`。
- 状态与错误：`role="status"` / `role="alert"`；载入时容器 `aria-busy="true"`。
- 抽屉与确认框：`role="dialog"` + `aria-modal` + 标题/描述关联 + 焦点陷阱 + 打开时聚焦首控件 + `Esc` 关闭。
- 颜色不是唯一信号：状态徽标必须含文字；危险按钮必须有文字（图标按钮需 `aria-label`）。

---

## 5. 与设计系统收敛（下一阶段）

后台目前同时存在三套视觉来源：`@sdkwork/cloudroutes-pc-commons`（本仓库既有原语：`BusinessState*`、`AdminTableShell`、`BottomPagination`、`ConfirmDialog`、`CopyButton`）、`@sdkwork/ui-pc-react`（平台设计系统，**marketing 包尚未接入**）、以及页面内联 Tailwind。

收敛顺序（不一次性大改）：

1. 本规范落地：所有页面只用 commons 原语 + 规范化的 Tailwind 令牌。
2. 把 `Button / Input / Select / Badge / Table / Dialog / Toaster` 从 `@sdkwork/ui-pc-react` 引入 marketing 包（需在 `package.json` 增加 `workspace:*` 依赖并验证主题一致）。
3. 删除页面内联按钮/输入样式，只保留布局类。

每一步都必须 `pnpm typecheck` + 营销包测试 + i18n 检查通过后才进入下一步。

---

## 6. 验收清单（每页回归时逐条勾）

- [ ] 页头唯一，标题/说明层级正确，主操作 ≤1
- [ ] 搜索/状态/刷新/导出在一条工具栏内，间距一致
- [ ] 表头 sticky、字号/大小写/颜色一致，数字列 `tabular-nums` 右对齐
- [ ] 空/载入/错误三态在表体内，无重复提示，错误含 `traceId`
- [ ] 时间按 2.8 渲染（三种后端形态都能解析）
- [ ] 金额/计数按 2.8 渲染（无 100×、无限为 `∞`、空为 `—`）
- [ ] 状态徽标按域语义（2.6），带文字
- [ ] 破坏性操作走 `ConfirmDialog`，文案含对象与后果
- [ ] 所有文案走 i18n，zh/en 键齐备
- [ ] 键盘可完成主流程；焦点可见；抽屉/对话框焦点陷阱正确
- [ ] 1280×800 下无横向滚动；长 id/长名称截断并有 `title`
