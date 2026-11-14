# 团队订阅（组织 + 坐席）体系设计

状态：已实现（membership 模块 `0004_membership_team_seats` + Cloud Router Token Plan 团队订阅页）

本文说明团队订阅的领域概念、数据关系、购买/开通/分配/回收流程、超员策略与接口契约，作为
Personal 订阅之外的第二种订阅形态的权威说明。

## 1. 领域概念

| 概念 | 归属 | 说明 |
| --- | --- | --- |
| Organization | IAM | 团队/组织，`iam_organization.id` 为文本主键（如 `iamorg_backend_integration`），`tenant_id` 隔离。 |
| Organization Member | IAM | `iam_organization_membership`，`membership_kind ∈ {owner, admin, member}`，`status='active'` 才算有效成员。 |
| Team Plan | Membership | `membership_plan.audience='team'`，按坐席售卖的组织套餐档位。 |
| Team Package | Membership | `membership_package.audience='team'`、`price_unit='seat'`：`price_amount` 是**一个坐席一个计费周期**的单价。 |
| Team Subscription | Membership | `membership_subscription.subject_type='organization'`，`subject_id = organization_id`，`owner_user_id` 为购买人。 |
| Seat | Membership | `membership_seat_assignment`：订阅内的一个许可名额，绑定一个组织成员（user）。 |
| Unlicensed Member | 派生 | 组织成员中没有 active 坐席的人：保留组织访问权限，但不享受订阅权益。 |

### 订阅关系（唯一权威链）

```
tenant_id
  └─ organization (IAM)
       ├─ organization_member (IAM)  ──1:0..1──  seat_assignment (Membership, state='active')
       └─ team_subscription (Membership)  ──1:N── seat_assignment
                                             subject_type='organization'
                                             subject_id=organization_id
                                             owner_user_id=购买人
                                             seats_purchased=已购坐席数
                                             seats_used=active 坐席数
```

- 一个组织同一时刻只有一条“生效”团队订阅被展示（`pending_activation | active | grace_period`，取 `expires_at` 最新）。
- 一个成员在同一订阅内最多持有 1 个 active 坐席；一个坐席号在同一订阅内只能有一个 active 持有者（partial unique index）。
- 回收坐席不删除历史行，而是置 `state='revoked'`，保留坐席流转审计。

## 2. 数据模型

### 2.1 目录（catalog）

`membership_plan`、`membership_package_group`、`membership_package` 新增 `audience ∈ {personal, team}`。
`membership_package` 新增：

| 列 | 含义 |
| --- | --- |
| `price_unit` | `package`（整包价）或 `seat`（按坐席单价） |
| `seat_min` / `seat_max` | 可购买坐席数下限 / 上限 |
| `seat_points_amount` | 每个坐席每个周期发放的会员积分 |

团队目录 seed：`team-starter / team-growth / team-scale` × `monthly / annual`
（¥99/199/399 每坐席每月；¥999/1999/3999 每坐席每年；起购 3/3/5 个坐席）。

### 2.2 订阅（subscription）

`membership_subscription` 新增：

| 列 | 含义 |
| --- | --- |
| `subject_type` | `user`（个人）或 `organization`（团队） |
| `seats_purchased` | 已购坐席数（订单 quantity） |
| `seats_used` | 当前 active 坐席数（事务内维护） |
| `seat_policy` | `strict`（默认，容量硬上限）或 `flex_overflow`（允许超员） |
| `auto_assign_seat` | 新成员是否自动占用空余坐席 |

数据库约束 `ck_membership_subscription_seats` 保证：`seats_purchased >= 1`、`seats_used >= 0`，
且 `strict` 下 `seats_used <= seats_purchased`；`flex_overflow` 下允许超出。

### 2.3 坐席（seat assignment）

`membership_seat_assignment`

| 列 | 说明 |
| --- | --- |
| `subscription_id` / `seat_no` / `user_id` | 坐席绑定关系 |
| `membership_id` / `member_display_name` / `member_email` | 分配时的 IAM 成员快照 |
| `state` | `active` / `revoked` |
| `assigned_by_user_id` / `assigned_at` | 分配人与时间 |
| `revoked_at` / `revoked_reason` / `revoke_actor_user_id` | 回收信息 |

索引：`uk_..._active_user (subscription_id, user_id) WHERE state='active'`、
`uk_..._active_seat (subscription_id, seat_no) WHERE state='active'`。
变更同时写入 `membership_change_log`（`seat_purchase` / `seat_assign` / `seat_revoke` / `seat_policy`）。

## 3. 购买与开通流程

```
Token Plan 团队订阅页
  └─ 选择套餐档位、计费周期（月/年）、坐席数 N（受 seat_min/seat_max 约束）
       └─ Order: POST /app/v3/api/memberships/orders { action:'purchase', packageId, quantity:N }
            ├─ 订单金额 = 坐席单价 × N
            ├─ commerce_order_item.quantity = N，sku_snapshot_json.quantity = N
            └─ 支付成功
                 └─ Membership: FulfillPaidMembershipPurchaseCommand { package_id, seats:N, organization_subject_id }
                      ├─ plan.audience='team' → subject_type='organization', subject_id=组织
                      ├─ seats_purchased=N, seats_used=0, seat_policy='strict', auto_assign_seat=1
                      ├─ 权益额度 = 每坐席额度 × N
                      └─ change_log: seat_purchase {seats:N}
```

- 支付与订单归 Order 模块所有；Membership 只做履约与订阅/坐席状态，保持既有边界。
- 幂等：订单 `Idempotency-Key` + `source_order_id` 重放；重复回调不会重复加坐席。

## 4. 坐席生命周期

| 操作 | 接口 | 规则 |
| --- | --- | --- |
| 查看团队订阅概览 | `GET /app/v3/api/memberships/team/subscription` | 组织来自会话 principal，不接受自定义 header；无订阅返回 200 `hasSubscription=false` |
| 列出组织成员与坐席状态 | `GET /team/seats?page&page_size&q` | 以 IAM active 成员为全集，标记 `active/unassigned` |
| 分配坐席 | `POST /team/seats { userId }` | owner/admin 才可操作；必须是该组织有效成员；strict 满员 → 409 `seat_capacity_exceeded`；分配最小空闲坐席号 |
| 回收坐席 | `DELETE /team/seats/{userId}` | 幂等；不存在 → 404；不允许回收“最后一个 owner 坐席” → 409 `last_seat_owner_required` |
| 调整超员策略 | `PATCH /team/seats/policy` | strict 下 `seats_used > seats_purchased` 时拒绝切换 |
| 加购坐席 | 再次结算同一团队套餐，`quantity=新总坐席数` | 履约按 `GREATEST(seats, seats_used, 1)` 提升 `seats_purchased`，不重置已有坐席 |

### 授权

- 组织与角色均来自 IAM 认证会话（`WebRequestContext.principal()`）；`viewerRole` 读取
  `iam_organization_membership.membership_kind`，`canManageSeats = owner | admin`。
- Membership 对 IAM 组织/成员表是**只读投影**（同库联邦读取），IAM 仍是组织数据的唯一所有者。

## 5. 组织人数超过已购坐席（超员）逻辑

1. **默认 `strict`**：`seats_used >= seats_purchased` 时拒绝新分配，返回
   `409 seat_capacity_exceeded`，前端提示购买更多坐席。
2. **成员仍可留在组织**：未获得坐席的成员是 Unlicensed Member，`overSeat`/`unlicensedMembers`
   由概览接口返回，前端展示“N 位成员待分配坐席”，并给出「分配空闲坐席 / 回收 / 购买坐席」三条动作。
3. **`flex_overflow`**：允许继续分配，`seats_used` 可大于 `seats_purchased`，用于试用期、
   按量对账或企业合同；切换回 `strict` 前必须先补足坐席或回收。
4. **自动分配**：`auto_assign_seat=1` 时，空余坐席可由后续的成员加入/巡检流程自动分配；
   当前实现提供显式分配接口，自动分配策略保存在订阅上供调度器消费。
5. **成员离开组织**：IAM 成员失效后，坐席仍保留在账本中但不再计入 licensed（概览按 active
   成员统计），管理员可回收该坐席；`membership_change_log` 保留完整流转。

## 6. 个人订阅与团队订阅的边界

| 维度 | 个人订阅 | 团队订阅 |
| --- | --- | --- |
| `subject_type` | `user` | `organization` |
| `subject_id` | 用户 id | 组织 id |
| 权益归属 | 购买人 | 组织（按坐席发放，履约记录归属购买人） |
| 坐席 | 隐含 1，不落 seat 行 | 显式 `membership_seat_assignment` |
| 目录 audience | `personal`（默认） | `team` |
| 页面入口 | Token Plan → 个人订阅 | Token Plan → 团队订阅 |

`GET /plans`、`/package_groups`、`/packages` 的 `audience` 默认 `personal`，保证个人订阅页行为不变。

## 7. 关键接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/app/v3/api/memberships/team/subscription` | 团队订阅概览 + 坐席使用 + 超员统计 |
| GET | `/app/v3/api/memberships/team/seats` | 组织成员坐席目录（分页、搜索） |
| POST | `/app/v3/api/memberships/team/seats` | 分配坐席（201） |
| DELETE | `/app/v3/api/memberships/team/seats/{userId}` | 回收坐席（204） |
| PATCH | `/app/v3/api/memberships/team/seats/policy` | 更新超员策略 / 自动分配 |
| GET | `/app/v3/api/memberships/packages?audience=team` | 团队套餐目录（含坐席单价与上下限） |

错误以 `application/problem+json` 返回，`ProblemDetail.reason` 给出稳定业务原因
（`seat_capacity_exceeded`、`seat_already_assigned`、`not_organization_member`、
`seat_management_forbidden`、`team_subscription_inactive`、`last_seat_owner_required`、
`seat_assignment_not_found`、`organization_scope_required`）。

## 8. 初始化数据

- 迁移：`database/migrations/postgres/0004_membership_team_seats.{up,down}.sql`（可回滚）。
- 目录 seed：`database/seeds/common/002_team_catalog.sql`（在 `seed.manifest.json` 注册），
  本地化：`seeds/locales/{zh-CN,en-US}/001_catalog_locale.sql`。
- 应用到开发库：
  ```bash
  cd <sdkwork-membership>
  pnpm db:migrate && pnpm db:seed && pnpm db:status   # status=clean
  ```

## 9. 验证

```bash
cargo test -p sdkwork-membership-repository-sqlx -p sdkwork-membership-service
cargo check -p sdkwork-routes-membership-app-api
node ../sdkwork-specs/tools/check-api-response-envelope.mjs --workspace .
pnpm db:validate && pnpm api:assembly:validate
```

已覆盖：坐席表存在性/索引、`subject_type='organization'` 写入路径、strict 容量守卫、
advisory lock、权益 × 坐席数、IAM 只读投影、团队路由鉴权与 204 语义、目录 seed 数据。
