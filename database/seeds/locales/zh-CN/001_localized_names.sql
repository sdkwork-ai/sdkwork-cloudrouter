-- sdkwork:seed-locale zh-CN
-- Localized zh-CN display names for the default admin routing topology
-- account groups. Each locale file only manages its own keys through
-- jsonb_set, so repeated seeds are idempotent and locales never overwrite
-- each other.

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"账号默认分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'standard-group'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"OpenAI 文本分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'openai.text'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"OpenAI 图片分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'openai.image'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"OpenAI 音频分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'openai.audio'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"OpenAI 视频分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'openai.video'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"OpenAI 兼容 文本分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'openai_compatible.text'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"OpenAI 兼容 图片分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'openai_compatible.image'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"OpenAI 兼容 音频分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'openai_compatible.audio'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"Anthropic 文本分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'anthropic.text'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"谷歌 Gemini 文本分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'gemini.text'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"谷歌 Gemini 图片分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'gemini.image'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"谷歌 Gemini 视频分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'gemini.video'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"谷歌 Gemini 音频分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'gemini.audio'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"可灵 图片分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'kling.image'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"可灵 视频分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'kling.video'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"即梦 图片分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'jimeng.image'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"即梦 视频分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'jimeng.video'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"Vidu 图片分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'vidu.image'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"Vidu 视频分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'vidu.video'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"火山引擎 图片分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'volcengine.image'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"火山引擎 视频分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'volcengine.video'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"MiniMax 音乐分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'minimax.music'
  AND deleted_at IS NULL;

UPDATE ai_upstream_account_group
SET group_name_i18n = jsonb_set(group_name_i18n, '{zh-CN}', '"MiniMax 音频分组"'::jsonb, true)
WHERE tenant_id = 100001
  AND organization_id = 0
  AND group_code = 'minimax.audio'
  AND deleted_at IS NULL;
