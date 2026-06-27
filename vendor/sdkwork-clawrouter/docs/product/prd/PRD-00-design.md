> Migrated from `docs/00-设计文档索引.md` on 2026-06-24.
> Owner: SDKWork maintainers

> 版本：v0.1
> 日期：2026-04-28 
> 依据：`DATABASE_SPEC.md`、`apps/sdkwork-clawrouter-pc`、`legacy-java-plus-backend-api` 与 `legacy-java-plus-app-api` API 标准、 

## 1. 文档集

| 文档 | 目标 |
| --- | --- |
| [01-PRD-sdkwork-clawrouter.md](./01-PRD-sdkwork-clawrouter.md) | 产品定位、目标用户、产品面、功能范围、版本路线和验收标准 |
| [02-技术架构设计.md](./02-技术架构设计.md) | 总体架构、运行面、分层、状态真值、主链路和架构决策 |
| [03-技术选型.md](./03-技术选型.md) | 后端、网关、前端、数据库、缓存、部署、观测、安全组件选型 |
| [04-模块规划.md](./04-模块规划.md) | public、console、admin、gateway、domain、worker、ops 模块边界 |
| [05-数据库设计.md](./05-数据库设计.md) | 数据库标准、存量表兼容、新建表前缀、核心表契约、索引和演进策略 |
| [06-API-Gateway与接口标准设计.md](./06-API-Gateway与接口标准设计.md) | `/v1/*` 网关兼容面、`/backend/v3/api` 管理面、`/app/v3/api` 用户面 |
| [07-性能设计.md](./07-性能设计.md) | 热路径、缓存、流式、异步、容量、压测与 SLO 门槛 |
| [08-安全设计.md](./08-安全设计.md) | 身份、授权、密钥、租户隔离、审计、合规和供应链安全 |
| [09-部署架构设计.md](./09-部署架构设计.md) | 本地桌面、Server、Docker、K8S 四种部署方式与发布治理 |
| [10-API路径一致性与自由切换架构.md](./10-API路径一致性与自由切换架构.md) | Java app/backend API 路径一致性、base URL 切换和多部署自由切换标准 |
| [11-数据契约与核心表设计.md](./11-数据契约与核心表设计.md) | 存量 `plus_*` 表复用边界、新增核心表字段契约、索引、留存、事件一致性和 CI 门禁 |
| [12-前端功能模块与数据库表结构映射.md](./12-前端功能模块与数据库表结构映射.md) | 当前 portal 前端 public/console/admin 模块分析、模块到表映射、完整逻辑表结构清单 |
| [13-页面级数据结构覆盖与SchemaRegistry落地设计.md](./13-页面级数据结构覆盖与SchemaRegistry落地设计.md) | portal 每个页面到事实表/投影表/API 面的覆盖矩阵、页面级验收口径和 Schema Registry 落地规则 |
| [14-数据结构细节复核与补强记录.md](./14-数据结构细节复核与补强记录.md) | 基于前端 service/interface/mock data 的字段级复核、缺口修正、表契约补强和 DDL 生成前检查清单 |
| [30-platform-data-model-v4.md](./30-platform-data-model-v4.md) | **现行** v4.1 平台/分类/技能/内容表命名与 greenfield 数据模型（替代 docs/17、docs/18 的 Plus 兼容方案） |
| [schema-registry/sdkwork-clawrouter.tables.yaml](./schema-registry/sdkwork-clawrouter.tables.yaml) | 机器可校验表契约注册表，约束新增表前缀、API 面、页面覆盖、字段、索引、安全和生命周期 |

## 2. 本轮核心裁决

1. `sdkwork-clawrouter` 不按旧版多个前端应用继续拆分，产品面统一到 `apps/sdkwork-clawrouter-pc`，内部通过 public、console、admin 三个路由域隔离。
2. 推荐采用“Rust-first Modular Runtime + Java-compatible API Contract + Generated SDK Boundary”的架构路线。`sdkwork-clawrouter` 的 gateway、app-api、admin-api、worker 和 product runtime 均以 Rust services 为主实现，Java app/backend 模块作为路径、OpenAPI、SDK 和既有实体兼容标准。
3. Admin 控制台 API 必须走 `legacy-java-plus-backend-api` 标准，路径前缀为 Java `com.sdkwork.backend.api.ApiPaths.API_PREFIX`，即 `/backend/v3/api`，返回 `PlusApiResult<T>`，权限模型按后台角色和管理能力控制。
4. Console、public portal、用户自助 API 必须走 `legacy-java-plus-app-api` 标准，路径前缀为 Java `com.sdkwork.app.api.ApiPaths.API_PREFIX`，即 `/app/v3/api`，返回 `PlusApiResult<T>`，用户上下文和资源归属在服务层强校验。
5. OpenAI 兼容网关 API 保持 `/v1/*`，不得包装 `PlusApiResult<T>`，必须保持第三方 SDK 可直接调用。
6. App/Backend 公共业务路径不得额外插入 `/claw-router`、`/router`、`/sdkwork` 等产品或部署命名空间；新增能力必须先进入 Java app-api/backend-api 的 controller、OpenAPI 和生成 SDK。
7. 用户、VIP、account、优惠券、积分充值、订单、支付、退款、发票等交易账户域必须复用 `legacy-java-plus-entity` 中既有 `plus_*` 表结构，不在 claw-router 中创建替代表。
8. 新建 claw-router 专属表必须遵守 `DATABASE_SPEC.md`，采用业务前缀：`ai_`、`integration_`、`iam_`、`commerce_`、`studio_`、`content_`、`ops_` 等，禁止使用 `claw_`、`router_`、`sdkwork_` 作为新业务表第一段前缀。
9. 本地桌面、Server、Docker、K8S 必须是同一套核心能力的不同装配，不允许出现四套不同业务逻辑；API 自由切换只能通过 base URL resolver 完成。
10. 数据库实现必须先过数据契约评审：`ai_usage_fact` 是用量事实，`commerce_usage_settlement` 是结算桥接，`plus_account_history` 才是最终账户流水事实。
11. 前端模块不能反向污染数据库命名；public、console、admin 只是使用者，不能产生 `console_`、`admin_`、产品名或部署名前缀表。

## 3. 三种架构路线对比

| 路线 | 描述 | 优点 | 风险 | 结论 |
| --- | --- | --- | --- | --- |
| A. Rust-first Modular Runtime | Rust services 承载 `/v1/**`、`/app/v3/api/**`、`/backend/v3/api/**`、worker 和 product runtime；Java-compatible app/backend 只作为 API/SDK/实体兼容标准 | 性能、部署、代码边界和长期演进最统一；适合全新应用无技术债目标 | 需要补齐 Rust app/admin handler、SDK 生成和 persistence 实现 | 推荐作为 P0/P1 主线 |
| B. Rust Gateway + Java-compatible Remote Business | Rust 承载 `/v1/**`，部分 app/backend business 通过 generated SDK 调用远端 Java-compatible 服务 | 迁移风险低，能短期复用既有业务能力 | 容易长期形成双运行时，需要严格限制为过渡形态 | 作为迁移桥接路线 |
| C. Desktop-local 优先轻量版 | 以本地 SQLite、内置 provider、前端桌面壳为主，server/kubernetes 能力后置 | 本地部署快，个人体验好 | 容易偏离 SaaS/企业级标准、API 和表结构治理 | 只作为 `desktop` profile，不作为总体架构 |

## 4. 后续实施建议

1. 先冻结本文档集中的架构、API、数据和部署约束。
2. 再拆分实现计划：后端模块、数据库契约与迁移、API SDK、前端服务替换、部署脚本、观测与安全门禁。
3. 新建表先写 YAML/Markdown 表契约，再生成 DDL、ORM、DTO 和 OpenAPI。
4. 前端不得继续长期使用 mock service，console/admin/public 均应迁移到生成 SDK；切换部署目标时只能切换 SDK base URL。
5. 第一阶段交付目标应是“Rust-first 标准化可部署 MVP”，再做多 Region、复杂策略、行业高级能力和更深入的压测优化。

## 5. 补充文档索引

| 文档 | 目标 |
| --- | --- |
| [15-new-api-sub2api价格体系对比与ClawRouter定价设计.md](./15-new-api-sub2api价格体系对比与ClawRouter定价设计.md) | 对比 new-api/sub2api 的价格体系，定义官方价、供应商价、客户价、定价方案、规则、阶梯与统一计量模型 |
| [16-前端代码契约复核与数据设计覆盖检查.md](./16-前端代码契约复核与数据设计覆盖检查.md) | 基于 portal 当前前端代码的路由、service/interface 和 mock data 反向复核数据库设计覆盖情况与本轮修正记录 |
| [17-AppCenter-PlusApp-compatible-design.md](./17-AppCenter-PlusApp-compatible-design.md) | **已废弃** — 见 [30-platform-data-model-v4.md](./30-platform-data-model-v4.md)；历史 Java PlusApp/plus_app 兼容设计 |
| [18-SkillsHub-AgentSkills-PlusCategory-compatible-design.md](./18-SkillsHub-AgentSkills-PlusCategory-compatible-design.md) | **已废弃** — 见 [30-platform-data-model-v4.md](./30-platform-data-model-v4.md)；历史 AgentSkills/PlusCategory 兼容设计 |
| [19-Finance-Trade-Java-compatible-design.md](./19-Finance-Trade-Java-compatible-design.md) | 支付、订单、退款、发票、账户、优惠券、VIP 等金融交易域按 Java 既有 Entity 和 API 标准复用，避免重复建模 |
| [20-schema-guardian-quality-gate.md](./20-schema-guardian-quality-gate.md) | 将 Java-first、L0 legacy、禁止同义表、SkillsHub 表替换等数据标准固化为可执行质量门禁 |
| [21-schema-compiler-postgres-ddl.md](./21-schema-compiler-postgres-ddl.md) | 将 Schema Registry 编译为 PostgreSQL DDL，并提供生成文件漂移检查，确保数据契约可以落库 |
| [22-domain-type-generator.md](./22-domain-type-generator.md) | 从 Schema Registry 的 `domain_names` 生成 Java/Rust/TypeScript/OpenAPI 领域枚举，保证 `ModelVendor`、`BillingMeter` 等多端一致 |
| [23-schema-manifest.md](./23-schema-manifest.md) | 将 Schema Registry 编译为机器可读 Manifest，统一输出表、路由、API surface、owner、字段、索引、安全和生命周期元数据 |
| [24-openapi-schema-components.md](./24-openapi-schema-components.md) | 从 Schema Registry 生成 OpenAPI component schemas，统一 app/backend/SDK/前端使用的字段序列化标准 |
| [25-frontend-contract-guardian.md](./25-frontend-contract-guardian.md) | 将 portal 实际路由与页面关键字段需求固化为可执行契约，持续校验 Schema Manifest 是否完整满足前端页面 |
| [26-java-legacy-contract-audit.md](./26-java-legacy-contract-audit.md) | 将 Java-owned `plus_*` 表实体映射与声明列生成审计产物，防止 claw-router fork 或替代 Java 主表结构 |
| [27-rust-runtime-and-sdk-integration-standard.md](./27-rust-runtime-and-sdk-integration-standard.md) | 固化 Rust runtime、Java-compatible app/backend API 路径、generated SDK 边界和 portal 不改 UI 的接入标准 |
| [28-architecture-standard-guardian.md](./28-architecture-standard-guardian.md) | 将 Rust-first 架构和技术选型裁决固化为可执行文档守卫，防止核心文档回退到旧路线 |
| [29-rust-backend-module-standard.md](./29-rust-backend-module-standard.md) | 固化 Rust 后端分包、Hexagonal architecture 模块形态、高性能和安全边界，并接入可执行守卫 |
| [32-sdkwork-models-standard.md](./32-sdkwork-models-standard.md) | 定义独立 `sdkwork-models` 模型目录、vendor 分目录、JSON 契约、多语言 SDK 标准、ClawRouter 导入和子模块更新规则 |

