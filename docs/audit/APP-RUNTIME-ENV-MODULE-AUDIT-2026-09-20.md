# 模块级运行时环境标准审计（APP Runtime Env Module Audit）

> 生成：2026-09-20 · 权威：`../../sdkwork-specs/APP_RUNTIME_ENV_SPEC.md`（浏览器附录 BROWSER_RUNTIME_ENV_SPEC）· 门禁：`check-app-runtime-env-workspace`
> 范围：工作区全部含应用目录的 sdkwork-* 仓库（67 个，共 78 个 Vite 浏览器面）

## 结论分桶

| 分桶 | 数量 | 仓库 |
|---|---|---|
| 完全对齐（检查器 0 失败） | 2 | sdkwork-cloudrouter、sdkwork-messaging |
| 仅环境噪音（依赖未装；代码无缺口） | 2 | sdkwork-birdcoder2、sdkwork-documents |
| 存在代码缺口（推广清单） | 63 | sdkwork-account、sdkwork-agents、sdkwork-agentstudio、sdkwork-aiot、sdkwork-appstore、sdkwork-assets、sdkwork-audio、sdkwork-birdcoder、sdkwork-browser、sdkwork-canvas、sdkwork-cms、sdkwork-codebox、sdkwork-comments、sdkwork-community、sdkwork-company、sdkwork-course、sdkwork-customerservice、sdkwork-deployments、sdkwork-dezhou、sdkwork-doudizhu、sdkwork-drive、sdkwork-forum、sdkwork-fs、sdkwork-gameengine、sdkwork-games、sdkwork-generations、sdkwork-github、sdkwork-iam、sdkwork-im、sdkwork-image、sdkwork-knowledgebase、sdkwork-local-router、sdkwork-log、sdkwork-mahjong、sdkwork-mail、sdkwork-mall、sdkwork-manager、sdkwork-mcp、sdkwork-membership、sdkwork-memory、sdkwork-merchandise、sdkwork-models、sdkwork-music、sdkwork-news、sdkwork-notary、sdkwork-order、sdkwork-partner、sdkwork-payment、sdkwork-portal、sdkwork-promotion、sdkwork-prompts、sdkwork-rtc、sdkwork-search、sdkwork-settings、sdkwork-shop、sdkwork-skills、sdkwork-terminal、sdkwork-video、sdkwork-video-cut、sdkwork-voice、sdkwork-web-framework、sdkwork-webserver、sdkwork-xiangqi |

## 逐模块明细

| 模块 | Vite 面 | 其他应用 | 消费形态 | 物化面 | runtime-env.json 残留 | 依赖安装 | 裁决 | 代码缺口 |
|---|---|---|---|---|---|---|---|---|
| sdkwork-account | 0 | 1 | none | 0 | 0 | n | CODE-GAP(1) | No browser surface or scripts/lib contract library imports t |
| sdkwork-agents | 2 | 1 | materializer | 4 | 2 | n | CODE-GAP(2) | work-agents-h …<br>work-agents-pc … |
| sdkwork-agentstudio | 0 | 0 | none | 0 | 0 | n | CODE-GAP(1) | No browser surface or scripts/lib contract library imports t |
| sdkwork-aiot | 2 | 2 | none | 0 | 2 | n | CODE-GAP(3) | No browser surface or scripts/lib contract library imports t<br>work-aiot-h …<br>work-aiot-pc … |
| sdkwork-appstore | 2 | 1 | none | 0 | 2 | n | CODE-GAP(3) | No browser surface or scripts/lib contract library imports t<br>work-appstore-h …<br>work-appstore-pc … |
| sdkwork-assets | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-assets-pc … |
| sdkwork-audio | 0 | 0 | none | 0 | 0 | n | CODE-GAP(1) | No browser surface or scripts/lib contract library imports t |
| sdkwork-birdcoder | 2 | 1 | none | 0 | 2 | n | CODE-GAP(3) | No browser surface or scripts/lib contract library imports t<br>work-birdcoder-h …<br>work-birdcoder-pc … |
| sdkwork-birdcoder2 | 3 | 5 | materializer | 4 | 0 | n | ENV-ONLY | (仅环境) |
| sdkwork-browser | 1 | 1 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-browser-pc … |
| sdkwork-canvas | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-canvas-pc … |
| sdkwork-cloudrouter | 2 | 2 | document+factory | 3 | 0 | Y | OK | — |
| sdkwork-cms | 2 | 0 | none | 0 | 2 | n | CODE-GAP(3) | No browser surface or scripts/lib contract library imports t<br>work-cms-h …<br>work-cms-pc … |
| sdkwork-codebox | 0 | 0 | none | 0 | 0 | n | CODE-GAP(1) | No browser surface or scripts/lib contract library imports t |
| sdkwork-comments | 0 | 0 | none | 0 | 0 | n | CODE-GAP(1) | No browser surface or scripts/lib contract library imports t |
| sdkwork-community | 2 | 0 | none | 0 | 2 | n | CODE-GAP(3) | No browser surface or scripts/lib contract library imports t<br>work-community-h …<br>work-community-pc … |
| sdkwork-company | 2 | 0 | none | 0 | 2 | n | CODE-GAP(3) | No browser surface or scripts/lib contract library imports t<br>work-company-h …<br>work-company-pc … |
| sdkwork-course | 2 | 1 | none | 0 | 2 | n | CODE-GAP(3) | No browser surface or scripts/lib contract library imports t<br>work-course-h …<br>work-course-pc … |
| sdkwork-customerservice | 2 | 0 | none | 0 | 2 | n | CODE-GAP(3) | No browser surface or scripts/lib contract library imports t<br>work-customerservice-h …<br>work-customerservice-pc … |
| sdkwork-deployments | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-deployments-pc … |
| sdkwork-dezhou | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-dezhou-pc … |
| sdkwork-documents | 1 | 0 | document+factory | 0 | 1 | n | ENV-ONLY | (仅环境) |
| sdkwork-doudizhu | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-doudizhu-pc … |
| sdkwork-drive | 1 | 0 | materializer | 1 | 1 | n | CODE-GAP(1) | work-drive-pc … |
| sdkwork-forum | 1 | 1 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-forum-h … |
| sdkwork-fs | 0 | 0 | none | 0 | 0 | n | CODE-GAP(1) | No browser surface or scripts/lib contract library imports t |
| sdkwork-gameengine | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-gameengine-pc … |
| sdkwork-games | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-games-pc … |
| sdkwork-generations | 2 | 0 | none | 0 | 2 | n | CODE-GAP(3) | No browser surface or scripts/lib contract library imports t<br>work-generations-h …<br>work-generations-pc … |
| sdkwork-github | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-github-pc … |
| sdkwork-iam | 1 | 3 | none | 0 | 1 | n | CODE-GAP(3) | No browser surface or scripts/lib contract library imports t<br>work-iam-h …<br>work-iam-mini-program … |
| sdkwork-im | 2 | 3 | materializer | 4 | 2 | n | CODE-GAP(2) | work-im-h …<br>work-im-pc … |
| sdkwork-image | 0 | 0 | none | 0 | 0 | n | CODE-GAP(1) | No browser surface or scripts/lib contract library imports t |
| sdkwork-knowledgebase | 2 | 1 | materializer | 1 | 2 | n | CODE-GAP(2) | work-knowledgebase-h …<br>work-knowledgebase-pc … |
| sdkwork-local-router | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-modelkit-pc … |
| sdkwork-log | 0 | 0 | none | 0 | 0 | n | CODE-GAP(1) | No browser surface or scripts/lib contract library imports t |
| sdkwork-mahjong | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-mahjong-pc … |
| sdkwork-mail | 2 | 1 | none | 0 | 2 | n | CODE-GAP(3) | No browser surface or scripts/lib contract library imports t<br>work-mail-h …<br>work-mail-pc … |
| sdkwork-mall | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-mall-pc … |
| sdkwork-manager | 1 | 0 | materializer | 1 | 1 | n | CODE-GAP(1) | work-manager-pc … |
| sdkwork-mcp | 2 | 0 | none | 0 | 2 | n | CODE-GAP(3) | No browser surface or scripts/lib contract library imports t<br>work-mcp-h …<br>work-mcp-pc … |
| sdkwork-membership | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-membership-pc … |
| sdkwork-memory | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-memory-pc … |
| sdkwork-merchandise | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-merchandise-pc … |
| sdkwork-messaging | 1 | 0 | document+factory | 0 | 1 | Y | OK | — |
| sdkwork-models | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-models-pc … |
| sdkwork-music | 1 | 1 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-music-pc … |
| sdkwork-news | 2 | 0 | none | 0 | 2 | n | CODE-GAP(3) | No browser surface or scripts/lib contract library imports t<br>work-news-h …<br>work-news-pc … |
| sdkwork-notary | 2 | 0 | none | 0 | 2 | n | CODE-GAP(3) | No browser surface or scripts/lib contract library imports t<br>work-notary-h …<br>work-notary-pc … |
| sdkwork-order | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-order-pc … |
| sdkwork-partner | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-partner-pc … |
| sdkwork-payment | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-payment-pc … |
| sdkwork-portal | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-portal-pc … |
| sdkwork-promotion | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-promotion-pc … |
| sdkwork-prompts | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-prompts-pc … |
| sdkwork-rtc | 2 | 1 | none | 0 | 2 | n | CODE-GAP(3) | No browser surface or scripts/lib contract library imports t<br>work-rtc-h …<br>work-rtc-pc … |
| sdkwork-search | 0 | 0 | none | 0 | 0 | n | CODE-GAP(1) | No browser surface or scripts/lib contract library imports t |
| sdkwork-settings | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-settings-pc … |
| sdkwork-shop | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-shop-pc … |
| sdkwork-skills | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-skills-pc … |
| sdkwork-terminal | 1 | 1 | none | 0 | 1 | n | CODE-GAP(3) | No browser surface or scripts/lib contract library imports t<br>work-terminal-h …<br>work-terminal-pc … |
| sdkwork-video | 2 | 0 | none | 0 | 2 | n | CODE-GAP(3) | No browser surface or scripts/lib contract library imports t<br>work-video-h …<br>work-video-pc … |
| sdkwork-video-cut | 0 | 0 | none | 0 | 0 | n | CODE-GAP(1) | No browser surface or scripts/lib contract library imports t |
| sdkwork-voice | 0 | 1 | none | 0 | 0 | n | CODE-GAP(1) | No browser surface or scripts/lib contract library imports t |
| sdkwork-web-framework | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-web-framework-pc … |
| sdkwork-webserver | 2 | 1 | none | 0 | 2 | n | CODE-GAP(3) | No browser surface or scripts/lib contract library imports t<br>work-webserver-h …<br>work-webserver-pc … |
| sdkwork-xiangqi | 1 | 0 | none | 0 | 1 | n | CODE-GAP(2) | No browser surface or scripts/lib contract library imports t<br>work-xiangqi-pc … |

## 缺口分类说明

- **document+factory**：Vite 面经共享工厂消费规范 dev 文档（目标形制）。
- **materializer**：经 etc/client-env.materialization.json 按档案物化 base URL（合规替代路径，运行时走 @sdkwork/sdk-common §6.3 解析器）。
- **none**：既无规范工具消费亦无物化声明——推广时的重点逐仓审计对象。
- **runtime-env.json 残留**：public/ 下的部署时文档构建残留；有 dev shadow 中间件则无害，无则构成 BROWSER_RUNTIME_ENV_SPEC §2-3 的毒化隐患。
- **仅环境噪音**：唯一失败是 @sdkwork/sdk-common 不可解析（checkout 未装依赖）；安装后复评。
