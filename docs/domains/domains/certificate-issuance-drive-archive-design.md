# 证书签发能力封装与云盘归档设计

Status: proposed · Owner: cloudrouter-platform · Surface: `/admin/domains/certificates`
关联设计: [admin-domain-center-design.md](admin-domain-center-design.md)
上游权威: `sdkwork-deployments` `PLAN-2026-0003-certificate-hosting-single-and-wildcard.md`

---

## 1. 目标与范围

### 1.1 目标

1. **高内聚低耦合地封装签发能力**：证书能力只有一个归属（`sdkwork-deployments` 控制面），
   对外只暴露「契约 + 端口」；Cloud Router 管理端不实现、不持久化任何证书状态。
2. **验证方式可选择**：申请证书时显式选择「云账号自动验证」或「生成 DNS 校验配置（人工发布）」，
   并支持选择验证类型（DNS-01 / HTTP-01 / 自动）。人工方式在 UI 中给出一条条可复制的 TXT 记录、
   自检结果、有效期倒计时与显式「立即验证」。
3. **签发成功后归档到 sdkwork-drive 专用空间**：新增一个**专用空间**（不是用户个人空间、不与
   其它业务混用），按「证书 → 版本」目录结构保存公开证书文件与清单；归档成功可验证、可重试、
   可在 UI 中直达云盘位置。
4. **把 admin 域名中心的签发流程打磨到极致**：三步向导、订单进度抽屉、手动验证面板、
   归档状态、可解释的禁用项与失败原因。

### 1.2 非目标

| 不做 | 原因 |
| --- | --- |
| 在 Cloud Router 侧新建证书库 | 会与 deployments 的权威聚合产生第二份真相 |
| 托管证书导入（CUSTOM）UI | 契约暂无 CUSTOM 创建操作；私钥由密钥管理通道写入 |
| TLS-ALPN-01 | 与上游 ADR 一致，保持禁用 |
| 云盘空间内直接渲染证书管理页 | 云盘只负责字节与目录，不承担证书生命周期 |
| 把私钥默认写进云盘 | 见 §9.1，默认只归档公开材料 |

---

## 2. 现状审计（含证据）

### 2.1 已实现

| 能力 | 位置 | 说明 |
| --- | --- | --- |
| 管理端证书列表/签发/续期/历史 | [DomainCertificatesPage.tsx:73](<D:/sdkwork-space/sdkwork-cloudrouter/apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-admin-domain/src/pages/DomainCertificatesPage.tsx#L73-L83>) | 单页表格 + `IssueCertificateDialog` |
| 管理端唯一出口 | [domainService.ts:283](<D:/sdkwork-space/sdkwork-cloudrouter/apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-admin-domain/src/domainService.ts#L283-L307>) | 走生成的 `@sdkwork/deployments-app-sdk` |
| 表单校验（通配符禁 HTTP-01） | [domainValidation.ts:341](<D:/sdkwork-space/sdkwork-cloudrouter/apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-admin-domain/src/domainValidation.ts#L331-L360>) | 与契约规则重复实现，需收敛 |
| 证书意图 / 首单 / 续期 | [app.rs:1341](<D:/sdkwork-space/sdkwork-deployments/crates/sdkwork-intelligence-deploy-service/src/app.rs#L1341-L1374>)、[app.rs:84](<D:/sdkwork-space/sdkwork-deployments/crates/sdkwork-intelligence-deploy-service/src/app.rs#L84-L109>) | 创建即请求首单，失败被吞掉仅记日志 |
| CAA 预检 + 开单 | [certificate_renewal.rs:362](<D:/sdkwork-space/sdkwork-deployments/crates/sdkwork-intelligence-deploy-service/src/certificate_renewal.rs#L348-L403>) | 手动与自动续期共用，拒绝不烧配额 |
| 订单 9 态状态机 + 租约 | [tls_control.rs:496](<D:/sdkwork-space/sdkwork-deployments/crates/sdkwork-intelligence-deploy-repository-sqlx/src/tls_control.rs#L484-L644>) | `next_order_transition` 唯一真相，`FOR UPDATE SKIP LOCKED` 领取 |
| 签发执行器 | [certificate_issuance.rs:205](<D:/sdkwork-space/sdkwork-deployments/crates/sdkwork-intelligence-deploy-service/src/certificate_issuance.rs#L196-L378>) | 一次一步推进 + 材料校验入库 |
| 独立签发 worker | [certificate-worker/lib.rs:199](<D:/sdkwork-space/sdkwork-deployments/crates/sdkwork-deploy-certificate-worker/src/lib.rs#L188-L265>) | 默认 15s 轮询、租约 900s、租约必须大于 ACME 超时 |
| ACME 引擎 | [lets_encrypt.rs:125](<D:/sdkwork-space/sdkwork-webserver/crates/sdkwork-webserver-acme-service/src/lets_encrypt.rs#L125-L488>) | 账号复用、双 Pass 挑战、finalize、证据计算、落盘、TXT 回收 |
| 手动 DNS-01 预留 | [dns.rs:711](<D:/sdkwork-space/sdkwork-webserver/crates/sdkwork-webserver-acme-service/src/dns.rs#L704-L722>)、`deploy_certificate_challenge.presentation_*` | 契约与列已就绪，**无任何写入方** |
| 云盘字节写入 | `sdkwork-drive` `DriveUploaderService::upload_bytes` [uploader_service.rs:472](<D:/sdkwork-space/sdkwork-drive/crates/sdkwork-drive-workspace-service/src/application/uploader_service.rs#L472-L541>) | 服务端单次 put + part + complete |
| 同仓既有范例 | appstore `drive_inprocess.rs`、documents `content.rs` | app 拥有的系统空间 + `upload_bytes` 模板 |

### 2.2 缺口

| 编号 | 缺口 | 证据 | 影响 |
| --- | --- | --- | --- |
| G1 | **人工 DNS-01 未实现** | `presentation_record_name/value/expires_at` 只有读映射（[tls_control.rs:1337](<D:/sdkwork-space/sdkwork-deployments/crates/sdkwork-intelligence-deploy-repository-sqlx/src/tls_control.rs#L1330-L1346>)），全仓无写入 | 没有 DNS API 凭据的租户无法签发，尤其是通配符 |
| G2 | **验证方式不可选** | `create_certificate` 只透传 `validationMethod`，无「自动/人工」维度 | 产品承诺与实现不符 |
| G3 | **app-api 读不到挑战** | `TLS_ORDER_CHALLENGES` 只在 backend-api（[paths.rs:24](<D:/sdkwork-space/sdkwork-deployments/crates/sdkwork-routes-deploy-backend-api/src/paths.rs#L24>)） | 管理端无法展示 TXT 记录 |
| G4 | **ACME 引擎不可中断/恢复** | `issue_lets_encrypt` 单函数走完 publish→ready→poll | 人工模式无处等待操作员 |
| G5 | **没有云盘归档** | 证书材料只进 secret store + 本地盘 | 用户拿不到证书文件，只能看元数据 |
| G6 | **首单失败被吞** | [app.rs:102](<D:/sdkwork-space/sdkwork-deployments/crates/sdkwork-intelligence-deploy-service/src/app.rs#L96-L109>) | 「签发了但没有证书」且无原因 |
| G7 | **无订单进度可见性** | app-api 无订单读模型 | UI 只能反复刷新列表 |
| G8 | **CA 账号语义分裂** | `deploy_acme_account` 行 ≠ 引擎账号（`SDKWORK_DEPLOY_ACME_ACCOUNT_ROOT`） | 缺行即签不出，且错误不可解释 |
| G9 | **UI 无轮询/无验证方式选择** | 见 `DomainCertificatesPage` | 一次提交后无反馈闭环 |
| G10 | **标识符上限三处不一致** | 契约 100（[certificate_plan.rs:17](<D:/sdkwork-space/sdkwork-deployments/crates/sdkwork-deploy-contract/src/certificate_plan.rs#L12-L17>)）、DDL `position BETWEEN 0 AND 99`（[0001_deploy_baseline.sql:470](<D:/sdkwork-space/sdkwork-deployments/database/ddl/baseline/postgres/0001_deploy_baseline.sql#L470>)）、引擎 8（[issue.rs:38](<D:/sdkwork-space/sdkwork-webserver/crates/sdkwork-webserver-acme-service/src/issue.rs#L28-L38>)） | 9–100 个标识符能建单，却在签发阶段才失败 |

---

## 3. 设计原则（封装硬规则）

1. **一个能力一个归属**：证书生命周期只属于 `sdkwork-deployments`；Cloud Router 只读契约、只发命令。
2. **领域不依赖外部系统**：证书编排只依赖端口 trait，永不 `use sdkwork_drive_*` / `instant_acme`。
3. **协议引擎与业务编排分离**：ACME 协议细节留在 `sdkwork-webserver-acme-service`；它不认识租户、
   订单、配额、云盘，只认识「一次签发会话」。
4. **纯规则独立可测**：所有决策（scope→标识符、method×presentation 解析、归档目录命名）都是无 I/O
   的纯函数，放在契约 crate，前端与后端共用同一份语义（前端仍以服务端为准）。
5. **一切外部写入幂等**：CA 下单、DNS 记录、云盘文件都带幂等键；重试不产生第二份。
6. **失败必须可解释且不静默**：任何被吞掉的失败都要落稳定错误码并出现在读模型里。

---

## 4. 架构设计

### 4.1 分层与端口

```
Cloud Router PC (apps/sdkwork-cloudrouter-pc)
  packages/sdkwork-cloudrouter-pc-admin-domain
      │  @sdkwork/deployments-app-sdk（生成，唯一出口）
      ▼
sdkwork-deployments  app-api  ──────────────►  backend-api（运营面）
      │
      ▼
DeployService::certificates（应用编排，唯一写者）
      │  纯规则：sdkwork-deploy-contract::certificate_plan
      │
      ├─ CertificateIssuancePort ──► AcmeCertificateIssuance ──► sdkwork-webserver-acme-service
      ├─ CertificateDns01PresenterPort ──► Aliyun / Cloudflare / DNSPod / Manual
      ├─ CertificateAuthorityAuthorizationPort ──► Hickory CAA
      ├─ CertificatePresentationInspectorPort（新增）──► 多解析器 TXT / HTTP 自检
      └─ CertificateArchivePort（新增）──► Drive（进程内 / HTTP）
      │
      ▼
deploy_certificate / _order / _challenge / _version / _archive
      ▲
      │ 租约领取
sdkwork-deploy-certificate-worker（进程隔离）
```

依赖方向只能自上而下；`CertificateArchivePort` 的实现是**独立 crate**，保证 drive 依赖不渗入
证书核心（与 `sdkwork-deploy-drive-port` 同一模式，但语义独立，不复用包上传端口）。

### 4.2 验证方式矩阵

新增维度 `presentationMode ∈ {MANAGED, MANUAL}`，与既有 `validationMethod` 正交：

| method \ presentation | MANAGED（平台自动） | MANUAL（人工发布） |
| --- | --- | --- |
| `DNS_01` | 云账号 API 写入/删除 `_acme-challenge` TXT（**现状已实现**） | **本次新增**：平台只生成记录，操作员在解析商处添加，显式放行后验证 |
| `HTTP_01` | 边缘 webroot 自动写入 `/.well-known/acme-challenge/<token>`（现状） | 不提供：webroot 由平台边缘独占，操作员无法落文件 |
| `AUTO` | 按 scope 解析（通配符→DNS-01，精确名→HTTP-01） | 解析为 `DNS_01` 后再人工发布 |

解析规则（纯函数，扩展 [certificate_plan.rs:189](<D:/sdkwork-space/sdkwork-deployments/crates/sdkwork-deploy-contract/src/certificate_plan.rs#L184-L199>)）：

```text
resolve_presentation(scope, method, requested_mode, availability) -> Result<PresentationPlan>
  1. wildcard + HTTP_01                      -> Err(CERTIFICATE_WILDCARD_REQUIRES_DNS01)
  2. MANUAL   + HTTP_01                      -> Err(CERTIFICATE_MANUAL_REQUIRES_DNS01)
  3. MANUAL   + AUTO                         -> (DNS_01, MANUAL)
  4. MANAGED  + AUTO                         -> 现有 scope 解析
  5. MANUAL   + DNS_01 且无任何 DNS 账号     -> 允许（这正是人工方式存在的理由）
  6. MANAGED  + DNS_01 且无覆盖该 zone 的账号 -> Err(CERTIFICATE_NO_DNS_PROVIDER)（前端提前禁用）
```

前端只是把服务端规则渲染成禁用项与说明，**永远不做最终判定**。

### 4.3 两阶段 ACME 引擎（可中断、可恢复）

现状 `issue_with_challenge` 是一个原子函数；人工方式必须在「挑战已生成」与「开始验证」之间让出
控制权。改造为两阶段，同时把原子方法实现为二者的组合（managed 路径行为不变）：

```rust
// sdkwork-webserver-acme-service
pub struct AcmePresentation {
    pub identifier: String,            // 含 *. 前缀的授权标识
    pub challenge_type: &'static str,  // "dns-01" | "http-01"
    pub record_name: Option<String>,   // DNS-01: _acme-challenge.<base>
    pub record_value: Option<String>,  // DNS-01: base64url(sha256(keyAuth))
    pub challenge_token: Option<String>,// HTTP-01: webroot 文件名
    pub key_authorization_sha256: String,
    pub already_valid: bool,           // 续期命中 CA 授权缓存时无需展示
}

pub struct AcmePreparedOrder {
    pub order_url: String,
    pub directory_url: String,
    pub expires_at: Option<DateTime<Utc>>,
    pub presentations: Vec<AcmePresentation>,
    pub managed_records: Vec<Dns01RecordHandle>, // provider 已写入的，用于回收
}

// 第一阶段：建账号 → newOrder → 拉授权 → 计算展示信息（managed 才写入）
pub async fn prepare_order(&self, …) -> AcmeServiceResult<AcmePreparedOrder>;

// 第二阶段：account.order(order_url) → set_ready → poll_ready → CSR → finalize → 下载
//           结束时（含失败）回收 managed 记录；manual 记录不动
pub async fn complete_order(&self, order_url: &str, …) -> AcmeServiceResult<IssuedCertificateMaterial>;

// 显式放弃（订单取消/过期）
pub async fn abort_order(&self, order_url: &str, records: &[Dns01RecordHandle]) -> AcmeServiceResult<()>;
```

关键约束（均在实现中固化）：

- `instant_acme::Account::order(url)` 可从 URL 恢复订单，所以阶段之间**只需持久化 URL**，
  不需要序列化 `Order`。
- `prepare_order` 不调用 `set_ready`；`complete_order` 才调用——这是人工模式的正确性基础。
- managed 记录的回收从 `Drop` 守卫改为 `complete_order` / `abort_order` 显式回收 + 数据库
  `presentation_ref` 兜底清扫（进程崩溃不再依赖 `Drop`）。
- 保留 `issue_with_challenge` 作为 `prepare + complete` 的薄封装，现有 Pebble 验收不变。

### 4.4 订单持久化与「停放/放行」

不新增订单状态（9 态契约冻结），用列 + 领取谓词表达「等待操作员」：

| 变更 | 定义 |
| --- | --- |
| `deploy_certificate_order.presentation_mode` | `VARCHAR(16) NOT NULL DEFAULT 'MANAGED'`，`CHECK IN ('MANAGED','MANUAL')` |
| `deploy_certificate_order.external_order_url` | `VARCHAR(1024)`，`CHECK (external_order_url IS NULL OR external_order_url ~ '^https://')` |
| `deploy_certificate_order.presentation_ready_at` | `TIMESTAMPTZ`；NULL = 等待操作员放行 |
| `deploy_certificate_challenge.presentation_record_name/value/expires_at` | 列已存在（[0001_deploy_baseline.sql:1522](<D:/sdkwork-space/sdkwork-deployments/database/ddl/baseline/postgres/0001_deploy_baseline.sql#L1513-L1557>)），本次开始写入 |
| `deploy_certificate.presentation_mode` | 证书级默认，创建时写入，续期沿用 |

领取谓词（[tls_control.rs:571](<D:/sdkwork-space/sdkwork-deployments/crates/sdkwork-intelligence-deploy-repository-sqlx/src/tls_control.rs#L564-L583>)）追加一条：

```sql
AND (o.presentation_mode <> 'MANUAL' OR o.presentation_ready_at IS NOT NULL)
```

- `MANUAL` 订单停在 `CHALLENGE_PRESENTING`，`attempt_count` 不再因轮询空转而增长。
- `deadline_at` 对人工订单取 `min(CA 订单过期, now + 72h)`；`presentation_expires_at` 取 CA 授权过期，
  UI 展示倒计时，过期以 `CERTIFICATE_PRESENTATION_EXPIRED` 失败，自动续期按退避重试。
- 「立即验证」命令 = `presentation_ready_at = now()` + 清空 `next_attempt_at`；命令幂等。

### 4.5 手动 DNS-01 时序（含先自检、后问 CA）

```
UI             app-api                 worker                     CA / DNS
 │ 申请(manual)   │                        │                        │
 ├───────────────►│ create + first order   │                        │
 │                ├───────────────────────►│ claim                  │
 │                │                        ├─ prepare_order ───────►│ newOrder/授权
 │                │                        │◄── presentations ──────┤
 │                │                        ├─ 事务：写 order_url + 每标识符 TXT + 停放
 │ 读挑战          │                        │                        │
 ├───────────────►│ GET challenges         │                        │
 │◄── TXT 表 ──────┤                        │                        │
 │ 操作员在解析商添加记录                     │                        │
 │ 立即验证        │                        │                        │
 ├───────────────►│ presentation_ready_at=now()                     │
 │                │                        ├─ 自检：多解析器查 TXT ──►│
 │                │                        │  不匹配 → DNS_RECORD_NOT_VISIBLE，不问 CA
 │                │                        ├─ complete_order ──────►│ set_ready/poll/finalize
 │                │                        ├─ 存版本 + archive outbox│
 │ 轮询订单        │                        │                        │
 ├───────────────►│ 状态/归档状态            │                        │
```

「自检优先」是配额保护的核心：LE 对同一账号同一主机名每小时只有 5 次失败验证，一次盲目的
`set_ready` 就可能浪费其中一次。自检实现为 `CertificatePresentationInspectorPort`：

```rust
async fn inspect_dns_txt(&self, name: &str, expected: &[String]) -> PresentationVisibility;
// { visible: bool, observed: Vec<String>, resolvers: Vec<ResolverReport>, checked_at }
```

复用 `sdkwork-deploy-service-host/src/certificate_caa.rs` 已有的 Hickory 解析器配置（多解析器、
有界超时）；比较使用常量时间相等。HTTP-01（managed）沿用
`verification_file_probe.rs` 的有界 HTTP 客户端，在 `set_ready` 前探一次。

### 4.6 云盘归档

#### 4.6.1 空间与目录

**专用空间**（不改 drive 契约的推荐方案）：

| 属性 | 取值 |
| --- | --- |
| `tenant_id` | 证书所属租户 |
| `owner_subject_type` | `app` |
| `owner_subject_id` | `app:sdkwork-deployments:certificates` |
| `space_type` | `deployment`（既有枚举值） |
| `display_name` | `证书库` / `Certificates` |

这与 appstore/documents 的「app 拥有的系统空间」一致（[drive_inprocess.rs:108](<D:/sdkwork-space/sdkwork-appstore/crates/sdkwork-appstore-service-host/src/integrations/drive_inprocess.rs#L99-L124>)），
按 `(tenant, owner, space_type)` 唯一（[0001_drive_baseline.sql:47](<D:/sdkwork-space/sdkwork-drive/database/ddl/baseline/postgres/0001_drive_baseline.sql#L46-L49>)），
因此**每租户恰好一个、与用户个人空间和包上传空间互不混淆**。

> 升级路径（可选）：若产品要求云盘左侧出现一级「证书库」，则新增 `certificate` 空间类型，
> 需同步 5 处：`sdkwork-drive-workspace-service/domain/space.rs`、`sdkwork-drive-contract/drive/space.rs`、
> DDL 两条 `CHECK`（space/node）+ 新迁移、`storage-backend-api` 的
> `validate_storage_binding_space_type`、`seeds/003_logical_storage_buckets.sql`。

目录布局（同一 `certName` 的多次签发 = 多个版本目录，永不覆盖）：

```
证书库/                                        <- 专用空间
  example.com-3f7c1a9b/                        <- 证书目录：sanitize(certName) + "-" + certId 前 8 位
    v1-2026-11-24T10-22-31Z/                   <- 版本目录：v<versionNo>-<notAfter>
      cert.pem                                 <- 叶子证书
      chain.pem                                <- 中间证书
      root.pem                                 <- 根证书（CA 返回或本地锚）
      fullchain.pem                            <- 叶子优先的整链（TLS 终结器直接可用）
      manifest.json                            <- 机读清单（见下）
    v2-2027-02-22T10-31-04Z/
```

`manifest.json`（稳定 schema，字段与 `deploy_certificate_version` 同源）：

```json
{
  "schemaVersion": 1,
  "certificateId": "…",
  "certificateVersionId": "…",
  "certName": "example.com",
  "orderId": "…",
  "versionNo": 2,
  "caProfile": "LETS_ENCRYPT_PRODUCTION",
  "issuer": "C=US, O=Let's Encrypt, CN=R11",
  "subject": "CN=example.com",
  "identifiers": ["example.com", "*.example.com"],
  "notBefore": "2026-11-24T09:00:00Z",
  "notAfter": "2027-02-22T09:00:00Z",
  "serialSha256": "…",
  "fingerprintSha256": "…",
  "spkiSha256": "…",
  "chainSha256": "…",
  "keyAlgorithm": "ECDSA",
  "bundle": ["cert.pem", "chain.pem", "root.pem", "fullchain.pem"],
  "archivedAt": "2026-11-24T10:22:35Z"
}
```

#### 4.6.2 端口与适配器

```rust
// 新 crate: crates/sdkwork-deploy-certificate-archive-port
#[async_trait]
pub trait CertificateArchivePort: Send + Sync {
    /// 是否已配置（未配置时归档状态为 SKIPPED，而不是失败）
    fn is_configured(&self) -> bool;

    /// 幂等写入一个证书版本的全部文件；返回空间与目录节点标识。
    async fn store_version(
        &self,
        scope: &CertificateArchiveScope,      // tenant_id + acting subject
        request: StoreCertificateVersionBundle,
    ) -> DeployServiceResult<ArchivedCertificateVersion>;

    /// 生成短期下载链接（用于「下载证书」按钮，不暴露长期地址）
    async fn download_url(
        &self,
        scope: &CertificateArchiveScope,
        node_id: &str,
        ttl_seconds: i64,
    ) -> DeployServiceResult<CertificateDownloadUrl>;
}
```

实现三件套（与 `sdkwork-deploy-drive-port` 同构）：

| 适配器 | 场景 | 要点 |
| --- | --- | --- |
| `InProcessCertificateArchive`（默认） | 打包部署，同进程同 PostgreSQL | 用 drive 自己的 `DriveUploaderService::upload_bytes`；写前做租户配额检查与 `writer` 角色校验（照 appstore 模板） |
| `HttpCertificateArchive` | 拆分部署 | 走 drive app-api 生成的 Rust SDK，用服务身份凭据 |
| `MemoryCertificateArchive` | 测试 | 记录调用，断言目录/清单/幂等键 |

#### 4.6.3 事务内 outbox + 有界重试

```sql
CREATE TABLE deploy_certificate_archive (
  id, uuid, tenant_id, certificate_id, certificate_version_id,
  drive_space_id, drive_folder_node_id, drive_manifest_node_id,
  bundle_kind  VARCHAR(8)  NOT NULL DEFAULT 'PUBLIC',  -- PUBLIC | FULL
  status       VARCHAR(16) NOT NULL DEFAULT 'PENDING', -- PENDING|STORING|ARCHIVED|FAILED|SKIPPED
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  last_error_code VARCHAR(64),
  manifest_sha256 VARCHAR(64),
  created_at, updated_at, version,
  CONSTRAINT uk_deploy_certificate_archive_version UNIQUE (certificate_version_id, bundle_kind)
);
```

- `store_certificate_version` 与 archive 行**同一事务**写入 → 版本存在则归档意图必定存在。
- 版本提交后立即尝试一次（30s 有界）；失败只把 `status` 留在 `PENDING` + `next_attempt_at` 退避，
  **绝不让签发失败**。退避：30s → 2m → 10m → 1h → 6h，5 次后 `FAILED`，UI 可手动重试。
- 幂等：`task_id = cert-archive-<versionId>`（drive 按 task 查重），节点 id 由
  `(versionId, kind)` 派生；已存在且 `manifest_sha256` 相同则直接 `ARCHIVED`。
- `archive_status`、`archive_space_id`、`archive_folder_node_id` 进入 `CertificateResponse`。

#### 4.6.4 流水线位置

```
fulfil_certificate_order
  ├─ issue（两阶段）
  ├─ record_challenge_result（→ FINALIZING）
  ├─ store_issued_version  ──┐  同一事务
  │                          └─ INSERT deploy_certificate_archive (PENDING)
  └─ archive_once()          30s 有界；失败不改变签发结果
```

### 4.7 CA 账号语义收敛（消除 G8）

系统里有**两个不同的「账号」**，必须在设计与 UI 中讲清：

1. `deploy_acme_account` 行：租户级的 CA 目录选择（`ca_profile` + `directory_url`），
   用于开单前置与 CAA 匹配；
2. 引擎账号：ACME 私钥与注册结果，存于 `SDKWORK_DEPLOY_ACME_ACCOUNT_ROOT`，按 directory 复用。

修正：

- 首次签发时若租户无 `deploy_acme_account` 行，按配置
  （`SDKWORK_DEPLOY_ACME_PROFILE` + `SDKWORK_DEPLOY_ACME_CONTACT_EMAIL`）**幂等自动创建**该行
  （唯一索引 `(tenant_id, ca_profile, contact_email)` 天然幂等）；
- 关闭自动创建时返回可操作错误码 `CERTIFICATE_ACME_ACCOUNT_REQUIRED`，并附带 backend-api
  创建入口，而不是静默停在 `PENDING`；
- 目录不一致（UI 选 staging、服务端 env 指向 production）在开单时**拒绝**并报
  `CERTIFICATE_CA_DIRECTORY_MISMATCH`，不再「按 A 做 CAA、向 B 下单」。

---

## 5. 契约变更

### 5.1 `sdkwork-deploy-contract`

| 变更 | 说明 |
| --- | --- |
| `ChallengePresentation` 枚举 | `MANAGED` / `MANUAL` |
| `CreateCertificateRequest.presentationMode` | 默认 `MANAGED` |
| `CreateCertificateRequest.archiveBundle` | `PUBLIC`（默认）/ `FULL` / `OFF` |
| `CertificateResponse.presentationMode` | 证书级默认 |
| `CertificateResponse.archiveStatus / archiveSpaceId / archiveFolderNodeId` | 归档读模型 |
| `CertificateResponse.latestOrder` | 精简订单摘要（状态、尝试次数、错误码、截止时间、放行时间） |
| `CertificateChallengeResponse` | 已含 `dnsRecordName/Type/Value/presentationExpiresAt`，补充 `inspection`（自检结果） |
| `CertificateArchiveResponse` | 归档独立读模型（版本、文件清单、云盘位置、尝试次数） |
| `certificate_plan::resolve_presentation` | 新增纯函数 + 稳定错误码 |

新增稳定错误码（`ProblemDetail.code`，数值区间沿用平台分配）：

| 码 | HTTP | 含义 |
| --- | --- | --- |
| `CERTIFICATE_WILDCARD_REQUIRES_DNS01` | 422 | 通配符不能用 HTTP-01 |
| `CERTIFICATE_MANUAL_REQUIRES_DNS01` | 422 | 人工方式只支持 DNS-01 |
| `CERTIFICATE_NO_DNS_PROVIDER` | 422 | 自动方式缺少覆盖该域名的 DNS 账号 |
| `CERTIFICATE_PRESENTATION_PENDING` | 409 | 人工记录尚未放行 |
| `CERTIFICATE_DNS_RECORD_NOT_VISIBLE` | 409 | 自检未查到 TXT（附解析器明细） |
| `CERTIFICATE_PRESENTATION_EXPIRED` | 409 | 挑战/订单过期 |
| `CERTIFICATE_ACME_ACCOUNT_REQUIRED` | 409 | 缺少 CA 账号且未开启自动创建 |
| `CERTIFICATE_CA_DIRECTORY_MISMATCH` | 409 | 请求 CA 与部署目录不一致 |
| `CERTIFICATE_ARCHIVE_UNAVAILABLE` | 503 | 云盘未配置/不可用（归档状态 SKIPPED 或 PENDING） |

### 5.2 app-api（deployments）

| 方法 + 路径 | 用途 |
| --- | --- |
| `POST /app/v3/api/certificates` | 扩展 body（`presentationMode`、`archiveBundle`） |
| `GET /app/v3/api/certificates/{id}` | 扩展读模型（订单摘要、归档状态） |
| `GET /app/v3/api/certificates/{id}/challenges` | **新增**：当前订单挑战 + TXT 指令 + 自检结果 |
| `POST /app/v3/api/certificates/{id}/challenge/verify` | **新增**：放行验证（幂等命令，`data.accepted`） |
| `POST /app/v3/api/certificates/{id}/archive/retry` | **新增**：重试归档（幂等命令） |
| `GET /app/v3/api/certificates/{id}/download?file=fullchain` | **新增**：短期下载链接（`data.item.url` + `expiresAt`） |

约束：命令语义遵循 `API_SPEC §15.4`（`renew` 已是同型先例），成功包 `{code:0,data,traceId}`，
错误 `application/problem+json`。**不新增自定义请求头**。

### 5.3 backend-api

`/backend/v3/api/tls/accounts` 已存在；本次只补一个读模型
`GET /backend/v3/api/certificates/{id}/archives`（运营排查用）。

---

## 6. Cloud Router 管理端改版（打磨重点）

### 6.1 服务层

`domainService.ts` 新增（全部经生成 SDK）：

```ts
listCertificateChallenges(certificateId): Promise<CertificateChallengeList>
verifyCertificateChallenge(certificateId): Promise<{ accepted: boolean; code?: string }>
retryCertificateArchive(certificateId): Promise<CertificateArchive>
certificateDownloadUrl(certificateId, file): Promise<{ url: string; expiresAt: string }>
```

类型全部来自 `@sdkwork/deployments-app-sdk`（[sdk-clients.ts:913](<D:/sdkwork-space/sdkwork-cloudrouter/apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudroutes-pc-commons/src/sdk-clients.ts#L913-L926>)），
不新增手写 DTO；契约变更后先在 deployments 重新生成 SDK，再在本仓 `pnpm install` 与 typecheck。

### 6.2 三步向导（单弹窗，不跳页）

**步骤 1 · 范围与域名**

- 证书名称：按区自动预填（`example.com` / `example.com-wildcard`），实时校验长度与同租户重名。
- 根域名区：只列出可签发的区；空态给「去注册根域名」。
- 范围卡片：`单域名` / `泛域名`；泛域名卡片常驻说明「自动包含根域名（apex），且必须使用 DNS 验证」。
- 标识符选择：仅 `VERIFIED` 主机名可选；未验证项禁用并给原因与跳转；泛域名范围下自动补 apex 并在
  「签发计划」条中回显 `将签发 2 个标识符：*.example.com、example.com`。
- 计划条实时反映服务端计划规则（前端镜像，服务端仍为准）。

**步骤 2 · 验证方式**（本设计新增的核心）

三张卡片，带可用性原因（禁用必须解释，不允许“灰掉没原因”）：

| 卡片 | 可用条件 | 说明文案要点 |
| --- | --- | --- |
| 云账号自动验证（推荐） | 存在覆盖全部标识符的 DNS 账号（证书 pin / 区 pin / 账号中心任一命中） | 平台自动写入并清理 `_acme-challenge` 记录；显示将使用的账号，可改选 |
| 手动添加 DNS 记录 | 恒可用（但仅 DNS-01） | 生成 TXT 记录由你发布；记录有效期内需保持；验证通过后再删除 |
| HTTP-01 自动验证 | 仅单域名；webroot 已配置 | 由边缘自动响应；通配符不可用 |

高级设置（折叠，默认收起）：CA（`Let's Encrypt` / `Let's Encrypt staging`，staging 明确标注
“不受浏览器信任”）、密钥算法（`ECDSA P-256` 推荐 / `RSA 2048`）、续期提前天数（7–90，默认 30，
提示“不少于有效期 1/3”）、自动续期、**归档到云盘**（默认开，显示目标空间「证书库」与目录示例）。

**步骤 3 · 确认**

- 摘要卡：标识符、验证方式（含“自动/手动”）、CA、密钥、续期策略、归档目标。
- 提交按钮 loading + 防重复（沿用 `createIdempotencyParams`）。
- 提交成功后**不结束流程**，直接打开订单抽屉。

### 6.3 订单进度抽屉

状态时间线（9 态映射中文，含失败态与错误码）：

```
已受理 → CA 账号就绪 → 订单已创建 → 挑战准备中 → 等待 CA 验证 → 完成签发 → 版本已保存
```

- **自动方式**：无操作；轮询退避 2s → 5s → 10s（上限 5 分钟），页面隐藏时暂停，可见时恢复。
- **人工方式**：
  - TXT 表：记录名（`_acme-challenge` 相对名 + 所属区）、类型 `TXT`、记录值（等宽、单条复制、
    全部复制）、自检状态（未检查 / 通过 / 未查到）、`presentationExpiresAt` 倒计时。
  - 主按钮「我已添加，立即验证」：先自检 → 失败时高亮具体记录并展示「哪个解析器、看到什么」，
    不向 CA 发请求；成功才放行。
  - 通过后展示「可删除这些记录」清单（复制即用）；**平台绝不代删人工记录**。
  - 过期：说明原因 + 「重新申请」（新订单，不覆盖历史）。
- **归档**：`已归档`（可打开云盘位置）/ `归档中` / `归档失败`（重试按钮，展示稳定错误码）。
- 终态：证书摘要（颁发者、有效期、SAN、SHA-256 指纹）+ 下载（`fullchain.pem` / `chain.pem` /
  `cert.pem` / `manifest.json`）+「在云盘中打开」。

### 6.4 列表页

新增列：`验证方式`（自动·DNS-01 / 手动·DNS-01 / 自动·HTTP-01）、`归档`（状态 + 重试）。
保留列：名称、标识符、CA/来源、范围、状态、有效期、剩余天数、续期、操作。
空态按「注册根域名 → 添加并验证主机名 → 签发证书」三段引导。
删除确认必须说明云盘归档的处理（默认保留归档，删除证书不影响已归档文件；提供“同时删除归档”开关）。

### 6.5 i18n 与可访问性

- 新增文案全部走 `admin.domainCenter.certificates.*`（[domain-center.ts:318](<D:/sdkwork-space/sdkwork-cloudrouter/apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-i18n/src/resources/admin/domain-center.ts#L309-L370>)
  与 zh 段同键），中英成对，键名不重复。
- 倒计时与自检结果用 `aria-live="polite"`；复制按钮有可读名称与成功提示；禁用卡片使用
  `aria-disabled` + 可见原因文本；对话框焦点首落在证书名称、错误时聚焦首个错误字段。

### 6.6 轮询与状态一致性

- 统一 `useCertificateOrderPolling(certificateId)`：指数退避、`AbortSignal` 取消、页面隐藏暂停、
  终态停止；关闭抽屉只停浏览器轮询，**不取消服务端订单**。
- 列表与抽屉共用同一读模型，避免“列表显示成功、抽屉显示进行中”。

---

## 7. 配置项

| 变量 | 作用 | 默认 |
| --- | --- | --- |
| `SDKWORK_DEPLOY_ACME_AUTO_PROVISION_ACCOUNT` | 首次签发自动创建 `deploy_acme_account` 行 | `true` |
| `SDKWORK_DEPLOY_CERTIFICATE_MANUAL_DEADLINE_HOURS` | 人工订单最长等待 | `72`（上限 168） |
| `SDKWORK_DEPLOY_CERTIFICATE_PRESENTATION_CHECK_RESOLVERS` | 自检解析器列表（逗号分隔） | 系统解析器 |
| `SDKWORK_DEPLOY_CERTIFICATE_ARCHIVE` | `drive` / `off` | 未设置视为 `off`（保持诚实：未配置不假装成功） |
| `SDKWORK_DEPLOY_CERTIFICATE_ARCHIVE_BUNDLE` | `PUBLIC` / `FULL` | `PUBLIC` |
| `SDKWORK_DEPLOY_CERTIFICATE_ARCHIVE_SPACE_NAME` | 专用空间显示名 | `证书库` |
| `SDKWORK_DEPLOY_CERTIFICATE_ARCHIVE_MAX_ATTEMPTS` | 归档重试上限 | `5` |

---

## 8. 数据迁移（deployments）

一处新增表 + 三处加列，均为前向兼容（默认值齐全，旧行语义不变）：

```sql
ALTER TABLE deploy_certificate_order
  ADD COLUMN presentation_mode   VARCHAR(16) NOT NULL DEFAULT 'MANAGED',
  ADD COLUMN external_order_url VARCHAR(1024),
  ADD COLUMN presentation_ready_at TIMESTAMPTZ,
  ADD CONSTRAINT chk_..._presentation_mode CHECK (presentation_mode IN ('MANAGED','MANUAL')),
  ADD CONSTRAINT chk_..._external_order_url
      CHECK (external_order_url IS NULL OR external_order_url ~ '^https://');

ALTER TABLE deploy_certificate
  ADD COLUMN presentation_mode VARCHAR(16) NOT NULL DEFAULT 'MANAGED';

CREATE TABLE deploy_certificate_archive ( … );  -- 见 §4.6.3
```

索引：`idx_deploy_certificate_archive_due (status, next_attempt_at, id) WHERE status IN ('PENDING','FAILED')`。

---

## 9. 安全与合规

### 9.1 私钥默认不进云盘

- 默认 `archiveBundle = PUBLIC`：只归档 `cert.pem`／`chain.pem`／`root.pem`／`fullchain.pem`／
  `manifest.json`；私钥继续只存在于密钥封装存储（`secret://deploy/certificate/<uuid>`）。
- `FULL` 需同时满足：部署级开关允许、租户策略显式开启、空间 ACL 仅管理员可读，且每次归档写审计
  事件。**绝不默认开启**，UI 在开启时给出风险提示。
- 无论哪种模式，云盘可见不等于可分发：`download` 返回短期签名 URL（30–300s），不复用长期地址。

### 9.2 其它

- TXT 记录值是公开证明（可展示、可复制），账号密钥与私钥永不进入 API 响应。
- 人工记录由操作员发布，平台**不代删**；平台只在 managed 模式回收自己写入的记录。
- CAA 仍在开单前判定（现状保留）；人工方式不改变 CAA 规则。
- 配额：自检优先可避免浪费 CA 的失败验证额度；`NewOrders`/`ConcurrentOrders` 计数在人工订单上
  按实际下单次数计，不按放行次数计。
- 审计：`certificate.archive.archived` / `.failed` / `.retried`、`challenge.presentation.released`、
  `challenge.verified` / `.rejected`。

---

## 10. 实施路线与验收证据

| 阶段 | 交付 | 验收证据 |
| --- | --- | --- |
| P0 | 契约：`ChallengePresentation`、`resolve_presentation`、错误码、读模型 DTO；**统一标识符上限**（一处常量，契约/DDL/引擎同值） | 契约单测（矩阵 6 条路径 + 错误码唯一性）；DTO 序列化 round-trip；超限请求在 API 层即被拒绝 |
| P1 | 两阶段 ACME 引擎；`issue_with_challenge` 改为组合；managed 回归 | Pebble E2E 现有 HTTP-01/DNS-01 用例全绿；`abort_order` 回收 managed 记录 |
| P2 | 人工 DNS-01：`presentation_mode`/`external_order_url`/`presentation_ready_at`、claim 谓词、挑战持久化、放行命令、自检端口 | Pebble + 手工发布 TXT：订单停在 `CHALLENGE_PRESENTING`；放行后到 `VERSION_STORED`；未发布放行 → 409 且 CA 未收到 `set_ready` |
| P3 | 云盘归档端口 + in-process/HTTP/memory 适配器 + outbox 与重试 | 归档成功文件清单与 `manifest.json` sha256 校验；drive 停机时签发仍成功、归档 `PENDING` 后重试成功；重复执行不产生第二个目录 |
| P4 | app-api：挑战读模型、verify、download、archive retry；证书读模型扩展 | `check-api-operation-patterns.mjs` / `check-api-response-envelope.mjs` 通过；生成 SDK 更新 |
| P5 | Cloud Router 三步向导 + 订单抽屉 + 列表增强 + i18n | 组件/校验单测；`domain-center-runtime.test.ts` 路由与菜单；中英键齐全；typecheck/lint 通过 |
| P6 | CA 账号自动创建与目录一致性校验 | 缺账号首次签发成功；目录不一致报 `CERTIFICATE_CA_DIRECTORY_MISMATCH` |
| P7 | 运营面归档查询 + 审计事件 | backend-api 读模型；审计日志三条事件可见 |

每阶段独立可回滚：P0/P4 只加不改；P1 保留旧入口；P2/P3 由配置开关灰度
（`SDKWORK_DEPLOY_CERTIFICATE_ARCHIVE`、`..._MANUAL`）。

---

## 11. 实施状态（随代码推进更新）

| 项 | 状态 | 证据 |
| --- | --- | --- |
| 两阶段 ACME 引擎（prepare / complete / abort 路径、ManualDns01Presenter 可用） | ✅ 已完成并验证 | `sdkwork-webserver-acme-service` `cargo check` + `cargo test --lib` → 175 passed |
| 验证方式矩阵 `resolve_presentation` + `ChallengePresentation` + 3 个稳定错误码 | ✅ 已完成并验证 | `sdkwork-deploy-contract` 20 passed（含新矩阵用例） |
| 标识符产品上限统一为 8（与引擎一致） | ✅ 已完成并验证 | 同上，含上限用例 |
| 云盘 `certificate` 空间类型（枚举/白名单/迁移/基线/seed） | ✅ 已完成并验证编译 | `sdkwork-drive-workspace-service` + `sdkwork-drive-contract` `cargo check` 通过；`domain_space_rules` 通过 |
| 订单 `presentation_mode` / `external_order_url` / `presentation_ready_at`、`deploy_certificate_archive` 表 | ✅ 迁移与基线已写 | `database/migrations/postgres/0018_*`、`0019_*` + baseline；**待 `db:validate`/`db:init` 实跑** |
| claim 谓词、挑战展示持久化、放行命令、自检端口 | ⬜ 未开始 | 见 §4.4 / §4.5 |
| 归档端口 crate 与 in-process/HTTP 适配器、outbox 重试、worker 排空 | ⬜ 未开始 | 见 §4.6 |
| app-api（challenges / verify / download / archive retry）与证书读模型扩展 | ⬜ 未开始 | 见 §5.2 |
| Admin 三步向导 / 订单抽屉 / 归档列 / i18n | ⬜ 未开始 | 见 §6 |

> 交叉仓库实施注意：`@sdkwork/deployments-app-sdk` 必须先于 Cloud Router UI 变更重新生成；本机 Windows 的 MSVC
> 编译器在 cargo 构建脚本内会触发 `cl.exe D8050`，Rust 验证请用 WSL（`--target x86_64-unknown-linux-gnu`）或 CI。

## 12. 验证命令
```sh
# deployments（Rust）
cargo test -p sdkwork-deploy-contract certificate_plan
cargo test -p sdkwork-intelligence-deploy-service certificate
cargo test -p sdkwork-intelligence-deploy-repository-sqlx --test tls_control_postgres
# Pebble 受控 CA 端到端（需先按 .workbuddy/tmp/pebble/run-e2e.sh 启动）
cargo test -p sdkwork-intelligence-deploy-repository-sqlx --test certificate_issuance_pebble -- --ignored

# webserver（ACME 引擎）
cargo test -p sdkwork-webserver-acme-service

# 契约校验
node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace ../sdkwork-deployments
node ../sdkwork-specs/tools/check-api-response-envelope.mjs --workspace ../sdkwork-deployments

# cloudrouter（本仓）
pnpm --filter @sdkwork/cloudrouter-pc-admin-domain test
pnpm --filter sdkwork-cloudrouter-pc typecheck
node --import tsx --import ./scripts/css-stub-loader.mjs --test domain-center-runtime.test.ts
node ../sdkwork-specs/tools/check-i18n-standard.mjs --root .
node ../sdkwork-specs/tools/check-application-layering.mjs --root .
```

---

## 13. 风险与取舍

| 风险 | 取舍 |
| --- | --- |
| 两阶段引擎改动触及已验收的 managed 路径 | P1 只做「拆分 + 组合」，行为断言与现有 Pebble 用例一一对应；旧入口保留一个版本周期 |
| prepare 与持久化之间进程崩溃 → 多一个 CA 订单 | 顺序固定为「先建单、立即持久化 order_url」，崩溃窗口极小；`attempt_count` 与日志可观测；LE 对相同标识符在途订单会去重 |
| 人工订单长期占着 CA 授权 | 72h 上限 + 过期失败 + 自动续期退避重试；UI 明确倒计时 |
| 云盘不可用 | 归档与签发解耦：签发成功优先，归档失败可见可重试；`off` 时状态 `SKIPPED` 而非失败 |
| 专用空间与个人空间混淆 | app 拥有的系统空间 + 固定 `display_name` + 读模型返回 `spaceId/nodeId`；不进入用户默认空间列表 |
| 前端重复实现规则 | 规则只在契约实现，前端镜像仅用于禁用与提示；服务端拒绝即最终结果 |
| `documents` 空间类型已存在但契约枚举缺失（既有漂移） | 本设计不扩大漂移：优先复用 `deployment` 类型；若引入 `certificate` 类型，同时修正契约枚举 |
