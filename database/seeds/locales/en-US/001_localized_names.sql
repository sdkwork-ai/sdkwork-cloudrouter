-- sdkwork:seed-locale en-US
-- Localized en-US display names for the default admin routing topology
-- account groups. Each locale file only manages its own keys through
-- jsonb_set, so repeated seeds are idempotent and locales never overwrite
-- each other.

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"账号默认分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'standard-group'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"OpenAI Text Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'openai.text'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"OpenAI Image Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'openai.image'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"OpenAI Audio Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'openai.audio'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"OpenAI Video Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'openai.video'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"OpenAI Compatible Text Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'openai_compatible.text'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"OpenAI Compatible Image Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'openai_compatible.image'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"OpenAI Compatible Audio Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'openai_compatible.audio'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"Anthropic Text Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'anthropic.text'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"Gemini Text Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'gemini.text'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"Gemini Image Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'gemini.image'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"Gemini Video Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'gemini.video'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"Gemini Audio Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'gemini.audio'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"Kling Image Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'kling.image'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"Kling Video Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'kling.video'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"Jimeng Image Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'jimeng.image'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"Jimeng Video Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'jimeng.video'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"Vidu Image Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'vidu.image'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"Vidu Video Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'vidu.video'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"Volcengine Image Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'volcengine.image'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"Volcengine Video Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'volcengine.video'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"MiniMax Music Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'minimax.music'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{en-US}', '"MiniMax Audio Group"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'minimax.audio'
  AND deleted_at IS NULL;
