# 收银台短 ID 方案（已实现）

状态：**已实现，回归验证中**。URL 格式保持不变：`{cashierBaseUrl}/cashier/{segment}`。

## 1. 结果

| 形态 | 示例 | 长度 | QR |
|---|---|---|---|
| 旧 v1 签名令牌 | `/cashier/v1.eyJ0ZW5hbnRJZCI6...` | ~460 | v16–17（85×85） |
| 新短 ID | `/cashier/s1.9tK3mQ7xR2pL8sV4nB6yH1` | **64** | v4–5（33–37） |

- 路径、域名、query 结构**不变**，只把路径段换成 `s1.` + 22 字符短 ID。
- 真实 v1 签名 token（约 421 字符）只存在服务端：铸造时生成，AES-256-GCM 加密后写入映射表；
  请求到达时按短 ID 取回、解密，再走原有验签/支付流程。
- 密钥/epoch 体系保留：支付中心「收银台密钥」页的租户签名密钥、set/reveal/rotate、
  previous-secret 宽限期全部不变；短链加密密钥从该签名密钥派生。
- 旧 `v1.` 链接和旧 `orderId?outTradeNo=` 链接继续可用。

## 2. 数据模型

`commerce_payment_cashier_link`（迁移 `0006_payment_cashier_link`）：

| 列 | 说明 |
|---|---|
| `short_id` | 22 字符 base64url，主键；URL 里带 `s1.` 前缀 |
| `tenant_id` / `order_id` | 绑定订单 |
| `token_id` | 真实 token 的 jti（审计/幂等） |
| `key_epoch` | 铸造时的租户 epoch，解密用 |
| `token_ciphertext` | 真实 token 的 AES-256-GCM 密文（密钥 = HKDF(租户签名密钥, tenant+epoch, purpose=cashier-short-link)） |
| `status` | `active` / `revoked` / `expired` |
| `expires_at` | 与 token 一致：15 分钟 |

- 同一 `(tenant, order)` 只保留一个 active 行（部分唯一索引），QR 重铸/重试复用同一短 ID。
- DB/缓存只有密文；拿到数据库但没有租户签名密钥无法还原 token。
- 过期行由 payment 补偿 worker 每轮清理（保留 1 天审计）；铸造前也会把过期 active 行标记为 `expired`。

## 3. 铸造

`payment` 仓储 `cashier_link::mint_cashier_short_link_postgres`：

1. 同订单已有有效短链 → 直接复用。
2. 否则 `resolve_cashier_token_mint_material` 取租户当前签名密钥 + epoch（首次自动 provision）。
3. 用现有 `mint_cashier_token_with_secret` 生成 v1 token。
4. 用签名密钥派生短链加密密钥，加密 token，写入行。
5. 返回 `s1.<22>`，由 `cashier_url_for_token` 拼成 `/cashier/s1.<22>`。

接入点：

- 标准订单支付富化：`owner_order_checkout::mint_cashier_token_for_outcome` → 返回短段。
- provider 不可用回退：`cashier_token::apply_cashier_capability_to_outcome` → 短段。
- 会员 H5：`membership_router::apply_cashier_short_link` → 短段。
- app-template / recharge 仍用现有短旧链接 + H5 换取（不是长 token）。
- 控制台/测试二维码读 `cashierUrl`，自然变成短链。

## 4. 解析

订单 app-api `cashier_router::verify_request_token`：

- `v1.` → 原 `verify_cashier_token_from_store`。
- `s1.` → `resolve_cashier_short_link_token_postgres` 查行、解密 → 仍用
  `verify_cashier_token_from_store` 验签 → claims → 原视图/建支付/状态逻辑。
- 裸 UUID → 原 legacy 换取/登录流程。

IAM 微信匿名授权 `oauth_wechat_payment.rs`：

- `s1.` → 查映射行 + 用 IAM 已安装的 `cashier_signing_key_cipher` 解出租户签名密钥 →
  解密真实 token → 原 `verify_cashier_token_for_cashier`。
- openid 绑定、cookie、epoch 逻辑不变。

H5：

- `capabilityToken.ts` 的 `isCashierCapabilityToken` 同时接受 `v1.` 与 `s1.`（22 字符校验）。
- 路由/深链/匿名收银台页不变；页面把段直接传给 SDK，服务端解析。

## 5. 密钥与轮换

- 签名密钥由支付中心管理（DB 加密存储，部署 KEK 为 `SDKWORK_COMMERCE_CASHIER_TOKEN_SECRET`）。
- 短链加密密钥从该签名密钥派生；行内 `key_epoch` 固定。
- 轮换/设置后保留 previous secret（1 小时宽限）；短链 TTL 15 分钟，解析时依次尝试
  current + previous，旧短链在宽限内仍可用。
- 管理端「收银台密钥」页（set/reveal/rotate/停用）不变；短链不会绕过它。

## 6. 安全 / 幂等

- 短 ID 128 bit；真实 token 加密落库；URL 无订单号/金额；TTL 15 分钟；可撤销。
- 短链复用保证同一订单 tokenId 稳定，支付幂等键（tokenId + method）不变。
- 旧 v1 链接继续验签；旧 legacy 链接继续换取；不破坏现有部署。
- 建议边缘对 `/cashier/` 与 `/app/v3/api/cashier/` 限流，并对日志路径脱敏。

## 7. 代码落点

| 仓库 | 文件 |
|---|---|
| sdkwork-utils | `commerce_cashier_token.rs`：`s1.` 前缀/22 长度校验、`generate_cashier_short_link_id`、`derive/encrypt/decrypt_cashier_short_link_*`、测试 |
| sdkwork-payment | `database/migrations/postgres/0006_*`、baseline/registry/schema、`cashier_link.rs`、`owner_order_checkout.rs`、`cashier_token.rs`、`cashier_link` 清理接入 `payment-compensation-worker` |
| sdkwork-order | `cashier_router.rs`（解析 `s1.`）、`membership_router.rs`（铸造短链） |
| sdkwork-iam | `oauth_wechat_payment.rs`（解析 `s1.`） |
| sdkwork-cloudrouter | `capabilityToken.ts`（接受 `s1.`）+ H5 测试 |

## 8. 验证

- utils：23 passed（含短链段格式、加解密、tenant/epoch 隔离）。
- payment repository：85 passed（含短链 URL ≤ 64 断言）。
- order app-api：membership 13 + cashier 11 passed；`cargo check` 通过。
- IAM app-api：`cargo check` 通过；全量测试运行中（首轮因 D 盘空间不足链接失败，清理后重跑）。
- H5 cashier 路由：8 passed（含 `s1.` 直接渲染匿名收银台）。
- payment DB framework：passed；migration/baseline/registry 一致。
- H5 typecheck：通过。

## 9. 发布注意

- 应用 `0006_payment_cashier_link` 迁移；payment/order/IAM/H5 同时发布。
- 新订单二维码自动变短；已打印的旧 v1/legacy 链接继续可用。
- 若支付中心尚未配置租户签名密钥，首次铸造会自动 provision（或由「收银台密钥」页设置）。
- 管理端密钥页轮换后，旧短链在 previous 宽限内仍可用；超过宽限且未过期的旧短链会失效（正常 TTL 15 分钟覆盖）。
