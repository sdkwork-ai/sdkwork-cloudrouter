# Platform Data Model v4.1

> 版本：v4.1  
> 日期：2026-06-20  
> 状态：**现行标准**（greenfield，无生产存量数据）  
> 替代：[17-AppCenter-PlusApp-compatible-design.md](./17-AppCenter-PlusApp-compatible-design.md)、[18-SkillsHub-AgentSkills-PlusCategory-compatible-design.md](./18-SkillsHub-AgentSkills-PlusCategory-compatible-design.md)

## 1. 设计原则

1. **单一事实来源**：每个业务域只保留一套 system-of-record 表，禁止 `plus_*` / `studio_catalog_*` 与 v4.1 表并存或双写。
2. **分类统一**：所有垂直分类写入 `c_category`，用字符串 `category_type` 区分域（如 `app_store`、`skill_market`、`skills_collection`），不再使用 `plus_category.type` 整数或 `group_name`。
3. **应用平台 JSON 优先**：应用媒体、安装包、发布说明等结构化数据保存在 `appstore_app` JSON 列（`resource_list`、`install_config` 等），不为 App Store 单独维护 `platform_asset` / `platform_artifact` / `platform_action`。
4. **技能媒体独立**：Skills Hub 的 asset/artifact/action 使用 `ai_skill_*` 表；技能主数据使用 `ai_agent_skill*`。
5. **内容域统一前缀**：论坛等内容使用 `content_*`（如 `content_forum_post`、`content_reaction`）；课程由 `sdkwork-course` 拥有，使用 `course_*` 前缀。

## 2. 表分层

| 前缀 | 职责 | 代表表 |
| --- | --- | --- |
| `appstore_` | SaaS 应用平台与模板（`sdkwork-appstore`） | `appstore_app`, `appstore_app_template`, `appstore_app_template_version`, `appstore_app_template_usage` |
| `course_` | 课程中心（`sdkwork-course`） | `course_catalog`, `course_section`, `course_lesson`, `course_catalog_link`, `course_application`, `course_comment`, `course_reaction` |
| `c_` | 跨垂直统一分类 | `c_category` |
| `ai_` | 模型路由、技能、MCP | `ai_agent_skill`, `ai_agent_skill_package`, `ai_skill_asset`, `ai_skill_artifact`, `ai_skill_action` |
| `content_` | 社区内容 | `content_forum_post`, `content_comment`, `content_reaction`, `content_favorite` |
| `iam_` / `commerce_` / `ops_` | Appbase 标准域 | 沿用现有 appbase 表，不做 claw-router 替代表 |

## 3. App Store（`appstore_app`）

| 能力 | v4.1 来源 |
| --- | --- |
| 应用主数据 | `appstore_app` |
| 分类 | `c_category`（`category_type = 'app_store'`） |
| 图标/截图/安装包 | `appstore_app.resource_list`、`install_config` 等 JSON |
| 下载量/评分 | **Option A**：`appstore_app.download_count`、`rating_avg`、`rating_count` |
| 开发者 | `iam_user` + `appstore_app` 归属字段 |
| 应用模板 | `appstore_app_template`、`appstore_app_template_version`、`appstore_app_template_usage` |

Admin/App API 契约表名：`appstore_app`、`c_category`（OpenAPI `x-table` 与 frontend-field-contracts `data_sources` 均已对齐）。

## 4. Skills Hub（`ai_agent_skill*`）

| 能力 | v4.1 来源 |
| --- | --- |
| 技能 | `ai_agent_skill` |
| 技能包 | `ai_agent_skill_package` |
| 用户安装 | `ai_user_agent_skill` |
| 分类 | `c_category`（`category_type IN ('skill_market','skills_collection')`） |
| 封面/制品/行为 | `ai_skill_asset`、`ai_skill_artifact`、`ai_skill_action` |

## 5. 内容域（`content_*` 与 `course_*`）

| 旧名 | v4.1 |
| --- | --- |
| `plus_feeds` | `content_forum_post` |
| `plus_comments` | `content_comment` |
| `plus_content_vote` | `content_reaction`（`target_type` / `target_id` / `reaction_type`） |
| `plus_favorite` | `content_favorite` |
| `content_course*` | `course_*`（由 `sdkwork-course` 拥有） |

## 6. 门禁与验证

- **Schema Registry**：`docs/schema-registry/sdkwork-clawrouter.tables.yaml` 不得再注册 v4.1 已退役的 `plus_app`、`plus_category`、`studio_catalog_*`、`platform_*`、`content_course*` 等表。
- **Schema Guardian**：`tools/schema_guardian.py` 的 `V41_PLATFORM_LEGACY_ALIASES` 会扫描 registry、frontend-field-contracts 片段、编译快照、OpenAPI 与 API manifest，禁止引用退役别名（含 `studio_app_template` → `appstore_app_template`）。
- **迁移脚本**：`scripts/migrate-v41-frontend-contract-tables.mjs` 用于一次性替换契约 YAML 中的 legacy 表名。
- **测试**：`database_installer`、`sqlite_app_store_*`、`sqlite_admin_skill_store`、OpenAPI/SDK guardian 必须通过。

## 7. 明确不做

- 不为 App Store 恢复 `platform_asset` / `platform_artifact` / `platform_action` 独立表。
- 不做 legacy Java `plus_*` 双写或投影回写。
- 不在 greenfield 环境保留 `plus_user`（身份事实来源为 `iam_user`）。
