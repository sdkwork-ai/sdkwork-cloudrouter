> Migrated from `docs/18-SkillsHub-AgentSkills-PlusCategory-compatible-design.md` on 2026-06-24.
> Owner: SDKWork maintainers

> **已废弃（Deprecated）** — 自 v4.1 起由 [30-platform-data-model-v4.md](./30-platform-data-model-v4.md) 取代。Greenfield 安装使用 `ai_agent_skill*` + `c_category`，不再兼容 `plus_agent_skill` / `plus_category`。

> 版本：0.1
> 日期：2026-04-28
> 范围：`apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-skills-hub`、`legacy-java-plus-app-api`、`legacy-java-plus-backend-api`、`legacy-java-plus-entity`

## 1. 结论

SkillsHub 不再设计独立的技能主数据表。技能、技能包、用户安装状态必须沿用 Java 侧 AgentSkills 设计体系：

- 技能主数据：`plus_agent_skill`，Java Entity 为 `com.sdkwork.spring.ai.plus.entity.skill.PlusAgentSkill`。
- 技能包/集合：`plus_agent_skill_package`，Java Entity 为 `com.sdkwork.spring.ai.plus.entity.skill.PlusAgentSkillPackage`。
- 用户技能安装与配置：`plus_user_agent_skill`，Java Entity 为 `com.sdkwork.spring.ai.plus.entity.skill.PlusUserAgentSkill`。
- 技能分类：`plus_category`，Java Entity 为 `com.sdkwork.spring.ai.plus.entity.category.PlusCategory`。

分类必须参考 Java `PlusCategory` 体系，SkillsHub 只读取 `CategoryType.SKILLS` 和 `CategoryType.SKILLS_COLLECTION`。前端 UI 视觉设计不做任何改变，所有差异通过 API adapter 和 view model mapping 处理。

## 2. API 契约

app 端 API 固定走 Java `legacy-java-plus-app-api` 已有路径，返回 `PlusApiResult<T>`：

| 能力 | 路径 |
| --- | --- |
| 技能分类 | `GET /app/v3/api/skills/categories` |
| 技能包列表 | `GET /app/v3/api/skills/packages` |
| 技能包详情 | `GET /app/v3/api/skills/packages/{packageId}` |
| 技能市场列表 | `GET /app/v3/api/skills` |
| 我的技能 | `GET /app/v3/api/skills/my` |
| 技能详情 | `GET /app/v3/api/skills/{skillId}` |
| 技能评论 | `GET /app/v3/api/skills/{skillId}/reviews` |
| 创建技能 | `POST /app/v3/api/skills` |
| 更新技能 | `PUT /app/v3/api/skills/{skillId}` |
| 发布技能 | `POST /app/v3/api/skills/{skillId}/publish` |
| 提交审核 | `POST /app/v3/api/skills/{skillId}/submit-review` |
| 下架技能 | `POST /app/v3/api/skills/{skillId}/offline` |
| 启用技能 | `POST /app/v3/api/skills/{skillId}/enable` |
| 禁用技能 | `POST /app/v3/api/skills/{skillId}/disable` |
| 用户配置 | `PUT /app/v3/api/skills/{skillId}/config` |

backend 管理端 API 固定走 Java `legacy-java-plus-backend-api` 已有路径，返回 `PlusApiResult<T>`：

| 能力 | 路径 |
| --- | --- |
| 技能管理 | `/backend/v3/api/skill` |
| 技能分页 | `POST /backend/v3/api/skill/list` |
| 技能全量 | `POST /backend/v3/api/skill/list/all` |
| 技能详情 | `GET /backend/v3/api/skill/{id}` |
| 发布/下架 | `POST /backend/v3/api/skill/{id}/publish`、`POST /backend/v3/api/skill/{id}/offline` |
| 启用/禁用 | `POST /backend/v3/api/skill/{id}/enable`、`POST /backend/v3/api/skill/{id}/disable` |
| 推荐位 | `POST /backend/v3/api/skill/{id}/feature` |
| 审核 | `POST /backend/v3/api/skill/{id}/review/submit`、`POST /backend/v3/api/skill/{id}/review/approve`、`POST /backend/v3/api/skill/{id}/review/reject` |
| 批量审核 | `POST /backend/v3/api/skill/review/batch/approve`、`POST /backend/v3/api/skill/review/batch/reject` |
| 技能包管理 | `/backend/v3/api/skill/package` |
| 分类管理 | `/backend/v3/api/category`、`/backend/v3/api/category/list`、`/backend/v3/api/category/list/all`、`/backend/v3/api/category/get_tree` |

## 3. 数据结构

### 3.1 `plus_agent_skill`

用途：SkillsHub 的技能主数据和市场状态事实。

关键字段：

| 字段 | 用途 |
| --- | --- |
| `skill_key` | 技能机器标识，租户和组织内唯一 |
| `name`、`summary`、`description` | 列表和详情文案 |
| `icon_resource_snapshot`、`cover_resource_snapshot` | 列表图和详情主图的 `MediaResource` 快照；API/view model 输出 `icon`、`cover` 对象 |
| `category_id` | 指向 `plus_category.id` |
| `package_id` | 指向 `plus_agent_skill_package.id` |
| `provider` | 技能提供者/开发者补充信息 |
| `version`、`runtime`、`entrypoint`、`manifest_url` | 运行时、镜像和 manifest 入口 |
| `license_name` | 许可证展示 |
| `source_type`、`market_status`、`visibility`、`review_status` | 来源、市场、可见性、审核状态 |
| `install_count`、`rating_avg`、`rating_count` | Java 契约内的聚合字段 |
| `tags`、`capabilities` | 标签和能力列表，`capabilities` 映射前端 `features` |
| `config_schema`、`default_config` | 配置 schema 和默认配置；portal 展示扩展进入 `default_config.portal` |
| `latest_published_at` | 最新发布时间，用于 `Newest` 排序和详情更新时间 |

市场列表默认过滤：

- `enabled = true`
- `visibility = PUBLIC`
- `review_status = APPROVED`
- `market_status = PUBLISHED`

### 3.2 `plus_agent_skill_package`

用途：技能包、集合、分组和聚合展示上下文。前端当前是技能卡片列表，但 app API 已支持 package 列表和详情，数据库设计必须保留此层以兼容 Java 双端 API。

关键字段：`package_key`、`name`、`summary`、`description`、`icon_media_resource_id`、`icon_object_blob_id`、`icon_resource_snapshot`、`cover_media_resource_id`、`cover_object_blob_id`、`cover_resource_snapshot`、`category_id`、`enabled`、`featured`、`sort_weight`、`tags`、`latest_published_at`。API/view model 输出 `icon`、`cover` 为 `MediaResource` 对象。

### 3.3 `plus_user_agent_skill`

用途：当前用户对技能的安装、启用、配置和使用状态。

关键字段：`user_id`、`skill_id`、`enabled`、`config`、`installed_at`、`last_enabled_at`、`last_used_at`、`used_count`。

唯一约束：`tenant_id + organization_id + user_id + skill_id`。

### 3.4 `plus_category`

用途：技能分类的唯一事实来源。`/skills-hub` 的分类筛选不再使用自由文本 category 表达，必须通过 `plus_agent_skill.category_id -> plus_category.id` 解析。

技能分类约束：

- 技能条目分类：`CategoryType.SKILLS`。
- 技能包/合集分类：`CategoryType.SKILLS_COLLECTION`。
- 列表展示名称：`plus_category.name`。
- 稳定编码：`plus_category.code`。
- 分类图标：`plus_category.icon`。
- 层级树：`parent_id`、`path`、`sort_weight`。

## 4. 前端字段映射

`apps/sdkwork-clawrouter-pc` 现有 `Skill` view model 必须保持不变：

| 前端字段 | 后端来源 |
| --- | --- |
| `id` | `SkillVO.skillId` / `PlusAgentSkill.id` |
| `name` | `name` |
| `developer` | `SkillVO.authorName`，缺省时使用 `provider` |
| `description` | `description` |
| `category` | `SkillVO.categoryName` / `PlusCategory.name` |
| `image` | `cover` 媒体资源，缺省时使用 `icon` 媒体资源 |
| `rating` | `ratingAvg` |
| `downloads` | `installCount` 格式化 |
| `features` | `capabilities` |
| `lastUpdated` | `latestPublishedAt`，缺省时使用 `updatedAt` |
| `clawhubImage` | `defaultConfig.portal.clawhubImage`，缺省时由 `manifestUrl` 的 manifest 解析 |
| `version` | `version` |
| `size` | `defaultConfig.portal.sizeText` |
| `license` | `licenseName` |
| `frameworks` | `defaultConfig.portal.frameworks` 或 `tags` 中的 framework namespace |
| `screenshots` | `defaultConfig.portal.screenshots`，缺省时使用 `cover` 媒体资源 |

推荐的 `default_config.portal` 结构：

```json
{
  "portal": {
    "clawhubImage": "clawhub.io/sdkwork/data-analysis:v2.1.0",
    "sizeText": "1.2 GB",
    "frameworks": ["Python", "Pandas", "Scikit-learn"],
    "screenshots": [
      "https://cdn.example.com/skills/data-analysis/screen-1.png"
    ]
  }
}
```

## 5. 行为事实与聚合

`studio_catalog_action` 继续保留，但只作为行为事实表：

- `target_type = SKILL` 时，`target_id` 指向 `plus_agent_skill.id`。
- 下载、安装、收藏、评分、评论都可以追加写入行为事实。
- `plus_agent_skill.install_count/rating_avg/rating_count` 是 Java AgentSkills 契约内的高频聚合字段，可以由行为事实重算校准。
- 不允许再新增第二套 SkillsHub 主数据表来保存名称、分类、版本、封面、评分等核心事实。

## 6. 前端覆盖检查

当前 SkillsHub 页面需求覆盖如下：

| 页面能力 | 数据来源 |
| --- | --- |
| 列表搜索 | `/app/v3/api/skills?keyword=`，匹配 `name/summary/description/provider` |
| 分类筛选 | `/app/v3/api/skills/categories` + `categoryId` |
| 下载量排序 | `install_count` |
| 评分排序 | `rating_avg` |
| 最新排序 | `latest_published_at` / `updated_at` |
| 详情页标题、开发者、说明 | `SkillVO` |
| 详情页安装命令 | `default_config.portal.clawhubImage` 或 `manifest_url` manifest |
| 详情页 features | `capabilities` |
| 详情页 frameworks/screenshots/size | `default_config.portal` |
| Get/Install 状态 | `plus_user_agent_skill` |

## 7. 实现边界

- 不改变 `apps/sdkwork-clawrouter-pc` 当前 UI 视觉设计。
- 不改变 Java 已有 API 路径；Rust、TypeScript、Java SDK 只消费 app/backend 生成 SDK。
- 不在 claw-router 新建与 AgentSkills 重名或同义的技能主数据表。
- 分类只认 `PlusCategory`，不在 SkillsHub 使用自由文本分类作为事实来源。
- portal 展示扩展字段可以进入 `default_config.portal`，但必须有 adapter 层转换成当前前端 `Skill` view model。

