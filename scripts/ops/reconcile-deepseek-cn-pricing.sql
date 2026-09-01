-- ============================================================================
-- reconcile-deepseek-cn-pricing.sql
-- ----------------------------------------------------------------------------
-- 部署库数据补齐：为 deepseek/deepseek-v4-flash（及 v4-pro）的指定上游
-- supplier/account 补齐 cn 侧（CNY）upstream cost 价格栈，并把 pricing plan
-- 的币种/最低消费/默认加价与价格币种对齐（或置 0），消除跨币种引发的
-- "money currency mismatch" / "cost price not found" 类 503/502。
--
-- 用法（psql，在部署库执行；先按实际环境修改变量）：
--   psql "$DATABASE_URL" \
--     -v supplier_code="'supplier-d7b1d3867c202b7f'" \
--     -v account_id="351306608665444352" \
--     -v input_cny="1.500000" \
--     -v output_cny="4.500000" \
--     -v cache_read_cny="0.050000" \
--     -f scripts/ops/reconcile-deepseek-cn-pricing.sql
--
-- 说明：
--   * 上游成本价（upstream cost）是采购价，由运营决定；下方默认值取官方
--     cn 现行低谷（off-peak）零售价作为起点，务必替换为真实采购成本。
--   * 脚本幂等：价格书/费率行按唯一键 upsert，可重复执行。
--   * 手动写入 pricing_rate 后，内存快照在下次刷新时自动加载；如需立即
--     生效，可在后台触发一次 catalog/价格快照刷新。
-- ============================================================================

\set ON_ERROR_STOP 1

-- ---------------------------------------------------------------------------
-- 0) 变量默认值（若未通过 -v 传入）
-- ---------------------------------------------------------------------------
\if :{?supplier_code}
\else
  \set supplier_code "'supplier-d7b1d3867c202b7f'"
\endif
\if :{?account_id}
\else
  \set account_id '351306608665444352'
\endif
\if :{?input_cny}
\else
  \set input_cny '1.500000'
\endif
\if :{?output_cny}
\else
  \set output_cny '4.500000'
\endif
\if :{?cache_read_cny}
\else
  \set cache_read_cny '0.050000'
\endif

-- 模型清单：flash 与 pro 一起补齐（可按需删减）
CREATE TEMP TABLE _models (catalog_key text PRIMARY KEY, model_id text, display text);
INSERT INTO _models VALUES
  ('deepseek/deepseek-v4-flash', 'deepseek-v4-flash', 'DeepSeek V4 Flash'),
  ('deepseek/deepseek-v4-pro',   'deepseek-v4-pro',   'DeepSeek V4 Pro');

-- ---------------------------------------------------------------------------
-- 1) 诊断：当前该 supplier/account 的 upstream cost 分布（region/币种/计费项）
-- ---------------------------------------------------------------------------
\echo '=== [1] 现有 upstream cost 行（目标 supplier/account）==='
SELECT b.price_book_code, b.price_side, r.region_code, r.currency_code,
       r.meter_code, r.catalog_key, r.unit_price, r.rate_variant, r.effective_from, r.effective_to
FROM pricing_rate r
JOIN pricing_price_book b ON b.tenant_id = r.tenant_id AND b.organization_id = r.organization_id AND b.id = r.price_book_id
WHERE r.provider_code = :supplier_code
  AND r.account_id = :account_id
  AND r.catalog_key LIKE 'deepseek/deepseek%'
  AND r.deleted_at IS NULL
ORDER BY r.catalog_key, r.meter_code, r.region_code;

-- ---------------------------------------------------------------------------
-- 2) 幂等补齐 cn/CNY upstream cost 价格栈
-- ---------------------------------------------------------------------------
\echo '=== [2] upsert cn(CNY) upstream cost 价格栈 ==='

-- 2a) 价格书：cn 区 upstream_cost 侧一本书（按 side/vendor/region，跨模型共用；
--     与官方同步器按 (book_code, vendor, region) 建书的语义一致）
INSERT INTO pricing_price_book (
    id, uuid, tenant_id, organization_id, data_scope, status, metadata,
    namespace_code, price_book_code, price_book_version, price_side,
    source_system, vendor_code, region_code, source_catalog_version,
    source_hash, lifecycle_state, currency_code, effective_from, effective_to, activated_at
)
VALUES (
    -990000000000000001::bigint,                                -- 运维负号 id 段，避免与雪花 id 冲突
    -- uuid 为 64 字符：两次 md5 拼接凑满 64
    md5('ops:book:models.deepseek.cn.upstream_cost') || md5('ops:book:models.deepseek.cn.upstream_cost'),
    0, 0, 0, 1, '{}'::jsonb,
    'ops', 'models.deepseek.cn.upstream_cost', 'ops-1', 'upstream_cost',
    'ops', 'deepseek', 'cn', 'ops',
    encode(sha256(convert_to('models.deepseek.cn.upstream_cost', 'UTF8')), 'hex'),
    'active', 'CNY', '2026-08-16T00:00:00Z', NULL, CURRENT_TIMESTAMP
)
ON CONFLICT (tenant_id, organization_id, namespace_code, price_book_code, vendor_code, region_code)
WHERE lifecycle_state = 'active' AND deleted_at IS NULL
DO NOTHING;

-- 2b) 费率行：input / output / cache-read，region=cn，currency=CNY
INSERT INTO pricing_rate (
    id, uuid, tenant_id, organization_id, price_book_id, rate_code, rate_hash,
    product_code, product_kind, product_display_name,
    operation_code, operation_kind, operation_display_name, meter_code, meter_display_name,
    quantity_kind, unit_code, vendor_code, provider_code, account_id, region_code,
    resource_type, resource_code, catalog_key, api_format, endpoint_code,
    billability, charge_timing, calculation_mode, quantity_aggregation,
    unit_size, unit_price, minimum_quantity, quantity_step, currency_code,
    conditions, tiers, formula, priority, rate_variant, schedule,
    effective_from, effective_to, source_url, source_observed_at
)
SELECT
    (-990000000000000000 - m.ord * 10 - (CASE m.meter WHEN 'llm_input_token' THEN 1 WHEN 'llm_output_token' THEN 2 ELSE 3 END))::bigint,
    md5('ops:rate:' || m.catalog_key || ':' || m.meter || ':upstream:cn:' || :supplier_code || ':' || :account_id)
        || md5('ops:rate:' || m.catalog_key || ':' || m.meter || ':upstream:cn:' || :supplier_code || ':' || :account_id),
    0, 0,
    (SELECT id FROM pricing_price_book
      WHERE tenant_id = 0 AND organization_id = 0
        AND namespace_code = 'ops' AND price_book_code = 'models.deepseek.cn.upstream_cost'
        AND vendor_code = 'deepseek' AND region_code = 'cn' AND lifecycle_state = 'active'
        AND deleted_at IS NULL LIMIT 1),
    'deepseek/' || m.model_id || '#upstream-cn-' || m.meter,
    encode(sha256(convert_to('deepseek/' || m.model_id || '|upstream|cn|' || m.meter || '|' || :supplier_code || '|' || :account_id, 'UTF8')), 'hex'),
    'models.deepseek.chat', 'model_api', m.display || ' Chat',
    'inference.generate', 'inference', 'Inference Generate', m.meter,
    CASE m.meter WHEN 'llm_input_token' THEN 'Input tokens' WHEN 'llm_output_token' THEN 'Output tokens' ELSE 'Cache read tokens' END,
    'token', 'token', 'deepseek', :supplier_code, :account_id, 'cn',
    'model', m.model_id, 'deepseek/' || m.model_id, 'openai', NULL,
    'chargeable', 'usage_reported', 'per_unit', 'sum',
    1000000,
    CASE m.meter WHEN 'llm_input_token' THEN :input_cny WHEN 'llm_output_token' THEN :output_cny ELSE :cache_read_cny END,
    0, 1, 'CNY',
    '[]'::jsonb, '[]'::jsonb, NULL, 100, 'standard', NULL,
    '2026-08-16T00:00:00Z', NULL,
    'https://api-docs.deepseek.com/zh-cn/quick_start/pricing', CURRENT_TIMESTAMP
FROM (
    SELECT m.catalog_key, m.model_id, m.display, mm.meter,
           row_number() OVER (ORDER BY m.catalog_key, mm.meter) AS ord
    FROM _models m
    CROSS JOIN (VALUES ('llm_input_token'), ('llm_output_token'), ('llm_cache_read_token')) AS mm(meter)
) m
ON CONFLICT (tenant_id, organization_id, price_book_id, rate_code) WHERE deleted_at IS NULL
DO UPDATE SET
    unit_price = EXCLUDED.unit_price,
    currency_code = EXCLUDED.currency_code,
    rate_hash = EXCLUDED.rate_hash,
    region_code = EXCLUDED.region_code,
    provider_code = EXCLUDED.provider_code,
    account_id = EXCLUDED.account_id,
    effective_to = EXCLUDED.effective_to,
    status = 1,
    updated_at = CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- 3) plan / 默认加价规则币种对齐（幂等：目标=与 cn/CNY 价格一致或置 0）
-- ---------------------------------------------------------------------------
\echo '=== [3] pricing plan 币种与最低消费对齐 ==='

-- 3a) 把现行生效的 "standard" plan 币种对齐为 CNY 并把最低消费置 0
--     （避免最低消费跨币种比较；本脚本仅处理 standard，其他 plan 请按需复核）
UPDATE cloudrouter_pricing_plan
SET currency_code = 'CNY',
    minimum_charge_amount = 0,
    updated_at = CURRENT_TIMESTAMP
WHERE deleted_at IS NULL
  AND status = 1
  AND plan_code = 'standard'
  AND effective_from <= CURRENT_TIMESTAMP
  AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
  AND (currency_code <> 'CNY' OR minimum_charge_amount <> 0);

-- 3b) 默认加价规则（multiplier_markup，无维度限定）markup_amount 置 0，
--     与价格币种解耦——加价由 multiplier 表达即可
UPDATE cloudrouter_pricing_rule
SET markup_amount = 0,
    updated_at = CURRENT_TIMESTAMP
WHERE deleted_at IS NULL
  AND status = 1
  AND formula_mode = 'multiplier_markup'
  AND product_code IS NULL AND operation_code IS NULL
  AND meter_code IS NULL AND provider_code IS NULL
  AND region_code IS NULL AND catalog_key IS NULL
  AND markup_amount <> 0;

-- ---------------------------------------------------------------------------
-- 4) 复核：cn/CNY 上游成本是否已就位
-- ---------------------------------------------------------------------------
\echo '=== [4] 复核 cn(CNY) upstream cost 行 ==='
SELECT r.catalog_key, r.meter_code, r.region_code, r.currency_code,
       r.unit_price, r.rate_variant, r.status
FROM pricing_rate r
JOIN pricing_price_book b ON b.tenant_id = r.tenant_id AND b.organization_id = r.organization_id AND b.id = r.price_book_id
WHERE r.provider_code = :supplier_code
  AND r.account_id = :account_id
  AND r.catalog_key LIKE 'deepseek/deepseek%'
  AND r.region_code = 'cn' AND r.currency_code = 'CNY'
  AND r.deleted_at IS NULL
ORDER BY r.catalog_key, r.meter_code;
