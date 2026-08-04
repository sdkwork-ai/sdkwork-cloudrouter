## 目标

1. **术语统一**：前端中文 UI 中 "API Key" 统一译为「令牌」（用户指定）
2. **国际化优化**：补齐缺失的 i18n 资源 key、统一前端源码中 `t()` 兜底默认值与资源一致，保证中英文文案都走 i18n

## 改动范围（均在 `apps/sdkwork-clawrouter-pc/` 内）

### A. i18n 资源文件 zh 部分 — "API Key / API 密钥 / 密钥" → "令牌"

| 文件 | 要点 |
|---|---|
| `packages/sdkwork-clawrouter-pc-i18n/src/resources/console/api-keys.ts` | 全部 zh 文案（创建/编辑/详情/删除/错误提示/复制密钥/脱敏密钥/搜索占位等约 30+ 处） |
| `.../resources/playground/chat.ts` | 5 处 API Key 文案 |
| `.../resources/admin/rate-limit.ts` | "API 密钥限速配置"、"API Key (前缀)" 等 5 处 |
| `.../resources/shared/common.ts` | 创建密钥/复制 API 密钥/密钥已复制等 5 处（已确认仅用于 API Key 场景） |
| `.../resources/shared/navigation.ts` | 2 处（"生成 API 密钥"、"多个密钥"） |
| `.../resources/console/usage.ts` | 搜索占位、表格列头 2 处 |
| `.../resources/admin/dashboard.ts` | "调用方 (用户/API Key)" |

### B. 补齐缺失 i18n 资源 key（国际化优化）

- **`console.apiKeys.rawToken`**：`CreateKeyDrawer.tsx:200` 使用但资源未定义 → 新增 en: `"API Key"` / zh: `"令牌"`
- **`console.apiKeys.unnamed`**：`apiKeyService.ts:327` 硬编码 `API Key #${id}` 作为未命名 key 显示名 → 新增 en: `"API Key #{{id}}"` / zh: `"令牌 #{{id}}"`；service 不再拼写 fallback，由视图层 `key.displayName || t('console.apiKeys.unnamed', ..., { id })` 格式化（渲染点：`ApiKeysView.tsx:464` 与 `:789`）

### C. 前端源码 `t()` 兜底默认值同步为「令牌」

- `admin-dashboard/src/index.tsx:529`
- `admin-ratelimit/src/index.tsx`：221（规则计数）、466、470、491、552 及 431 注释
- `console-api-keys/src/ApiKeysView.tsx`：6 处错误兜底 + 搜索占位 + "名称 / 密钥" + "正在加载 API Key"
- `console-api-keys/src/CreateKeyDrawer.tsx`：117/119/120（详情/编辑/创建标题）、200（rawToken）
- `console-api-keys/src/usage-details/ApiKeyUsageDetailsDrawer.tsx:133`

### D. admin-upstream 本地 i18n（zh-CN）

- `.../admin-upstream/src/i18n/zh-CN/ai/upstream/accountGroup.ts`：删除确认文案、`API Key ID` → `令牌 ID`
- `.../admin-upstream/src/i18n/zh-CN/ai/upstream/supplier.ts`：`auth.type.apiKey: 'API Key'` → `'令牌'`

### E. 明确不动

- 英文 (en) 资源全部保持 `"API Key"`（用户只指定了中文术语）
- i18n key 标识符（`console.apiKeys.*` 等内部名）
- 非 API Key 的"密钥"：`admin/auth-settings.ts` "密钥引用"（微信 secret）、admin-upstream "凭证密钥"（上游凭证）
- `suppliersPage.tsx:57` `authMethodName: 'API Key'`（提交给后端的可编辑数据值，非 UI 文案）
- `dist/` 构建产物

## 验证

1. `node --import tsx --test api-key-runtime.test.ts i18n-resources-runtime.test.ts admin-ratelimit-runtime.test.ts`（app 根目录）
2. `pnpm --filter @sdkwork/clawrouter-pc-admin-upstream typecheck`
3. 全局复查：`grep -rn "API Key\|API 密钥" apps/sdkwork-clawrouter-pc/packages --include="*.tsx" --include="*.ts"` 仅应剩 en 资源、key 名与数据值