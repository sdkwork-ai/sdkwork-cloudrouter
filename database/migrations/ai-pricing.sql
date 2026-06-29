-- ============================================================
-- Claw Router DDL Script - AI Pricing Tables
-- ============================================================
-- 
-- Schema Version: 2.0
-- Module: ai-pricing
-- Tables: 2 (Pricing Tables)
-- Compliance Level: L2
-- 
-- Design Principles:
-- 1. High Cohesion Low Coupling - ai-pricing module manages pricing tables
-- 2. Industry Standards - Aligned with Stripe Pricing Tables/AWS Pricing Plans
-- 3. No Legacy Debt - No plus_* tables, no legacy-java-plus-* dependencies
-- 4. Single Ownership - Each table has one clear module owner (pricing-service)
-- 5. Production Ready - High performance, high security, L2 compliance
-- 
-- Industry Alignment:
-- - ai_pricing: Stripe Pricing Tables + AWS Pricing Plans
-- - ai_pricing_rule: Stripe Pricing Rules + AWS Pricing Dimensions
-- 
-- ============================================================

-- ============================================================
-- Table: ai_pricing (Pricing Plan - Price Strategy)
-- ============================================================
-- 
-- Description:
-- 定价方案表 - 价格策略
-- 
-- Responsibilities:
-- - Define pricing plan master table
-- - Define default multiplier, markup and price basis
-- - Support multiple pricing modes (multiplier, fixed price, tiered price)
-- 
-- Characteristics:
-- - Multi Pricing Mode: Support multiplier, fixed price, tiered price, expression billing
-- - Flexible Binding: Support binding account, group, tenant or SKU
-- - Price Basis: Support official reference price, access cost price, selling price
-- 
-- Data Flow:
-- 1. pricing-service defines pricing plan
-- 2. ai_usage associates pricing plan through pricing_code
-- 3. ai_pricing_rule provides specific billing rules
-- 4. Calculate final charge amount
-- 
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_pricing (
    -- Identity Fields
    id BIGINT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    
    -- Tenant Isolation
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    
    -- Idempotent Key
    pricing_code VARCHAR(64) NOT NULL,
    idempotency_key VARCHAR(128),
    
    -- Pricing Info
    pricing_name VARCHAR(128),
    pricing_type INTEGER,
    
    -- Price Basis
    base_price_source INTEGER,
    base_price_type INTEGER,
    
    -- Pricing Mode
    pricing_mode INTEGER,
    
    -- Default Multiplier
    default_multiplier DECIMAL(10, 4) DEFAULT 1.0,
    
    -- Default Markup
    default_markup_amount DECIMAL(20, 6),
    default_markup_type INTEGER,
    
    -- Currency
    currency VARCHAR(10),
    
    -- Minimum Charge
    minimum_charge DECIMAL(20, 6),
    
    -- Rounding Mode
    rounding_mode INTEGER,
    
    -- Effective Time
    effective_from TIMESTAMP WITH TIME ZONE,
    effective_to TIMESTAMP WITH TIME ZONE,
    
    -- Binding Scope (Multi-dimensional binding)
    binding_scope_type INTEGER,
    binding_scope_id BIGINT,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    version BIGINT DEFAULT 0,
    
    -- Lifecycle
    status INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    metadata JSONB
);

-- Unique Constraints
CREATE UNIQUE INDEX uk_ai_pricing_code ON ai_pricing (tenant_id, organization_id, pricing_code);

-- Performance Indexes
CREATE INDEX idx_ai_pricing_tenant_status ON ai_pricing (tenant_id, organization_id, pricing_type, status, effective_from, id);
CREATE INDEX idx_ai_pricing_binding ON ai_pricing (tenant_id, organization_id, binding_scope_type, binding_scope_id, status, id);

-- Comments
COMMENT ON TABLE ai_pricing IS '定价方案表 - 价格策略（L2合规）';
COMMENT ON COLUMN ai_pricing.id IS '雪花ID（JSON序列化为字符串）';
COMMENT ON COLUMN ai_pricing.pricing_code IS '定价方案编码（幂等键）';
COMMENT ON COLUMN ai_pricing.pricing_mode IS '定价模式（0=multiplier/1=fixed/2=tiered/3=expression）';
COMMENT ON COLUMN ai_pricing.default_multiplier IS '默认倍率（成本倍率）';
COMMENT ON COLUMN ai_pricing.binding_scope_type IS '绑定作用域类型（0=global/1=tenant/2=org/3=group/4=api_key）';

-- ============================================================
-- Table: ai_pricing_rule (Pricing Rule - Specific Billing Rules)
-- ============================================================
-- 
-- Description:
-- 定价规则表 - 具体计费规则
-- 
-- Responsibilities:
-- - Define pricing rule table
-- - Support multiplier, fixed price, tiered price and expression billing
-- - Support pricing by model, capability, region dimensions
-- 
-- Characteristics:
-- - Multi-dimensional Pricing: Support model, capability, meter, region dimensions
-- - Rule Priority: Support priority-based rule matching
-- - Tiered Pricing: Support tiered billing thresholds and unit price
-- 
-- Data Flow:
-- 1. pricing-service defines pricing rules
-- 2. ai_usage matches pricing rules
-- 3. Calculate final price based on rules
-- 4. Write customer_charge to ai_usage
-- 
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_pricing_rule (
    -- Identity Fields
    id BIGINT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    
    -- Tenant Isolation
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    
    -- Idempotent Key
    rule_code VARCHAR(64) NOT NULL,
    idempotency_key VARCHAR(128),
    
    -- Pricing Plan Association
    pricing_id BIGINT,
    pricing_code VARCHAR(64),
    
    -- Rule Info
    rule_name VARCHAR(128),
    rule_type INTEGER,
    rule_priority INTEGER DEFAULT 0,
    
    -- Match Conditions (Multi-dimensional matching)
    match_model_vendor VARCHAR(64),
    match_model_code VARCHAR(128),
    match_model_family VARCHAR(64),
    match_capability_type INTEGER,
    match_billing_meter VARCHAR(64),
    match_token_kind VARCHAR(64),
    match_upstream_region VARCHAR(64),
    match_client_region VARCHAR(64),
    
    -- Pricing Mode
    pricing_mode INTEGER,
    
    -- Multiplier Pricing
    multiplier DECIMAL(10, 4),
    
    -- Fixed Price
    fixed_price DECIMAL(20, 6),
    fixed_price_unit VARCHAR(64),
    
    -- Tiered Pricing Config
    tier_enabled BOOLEAN DEFAULT FALSE,
    tier_config JSONB,
    
    -- Expression Pricing
    expression_enabled BOOLEAN DEFAULT FALSE,
    expression_formula VARCHAR(512),
    
    -- Currency
    currency VARCHAR(10),
    
    -- Unit Price (For calculation)
    unit_price DECIMAL(20, 6),
    unit_size DECIMAL(20, 6),
    
    -- Minimum Charge
    minimum_charge DECIMAL(20, 6),
    
    -- Rounding Mode
    rounding_mode INTEGER,
    
    -- Effective Time
    effective_from TIMESTAMP WITH TIME ZONE,
    effective_to TIMESTAMP WITH TIME ZONE,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    version BIGINT DEFAULT 0,
    
    -- Lifecycle
    status INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    metadata JSONB
);

-- Unique Constraints
CREATE UNIQUE INDEX uk_ai_pricing_rule_code ON ai_pricing_rule (tenant_id, organization_id, rule_code);

-- Performance Indexes
CREATE INDEX idx_ai_pricing_rule_pricing_priority ON ai_pricing_rule (tenant_id, organization_id, pricing_id, rule_priority, status, id);
CREATE INDEX idx_ai_pricing_rule_model_meter ON ai_pricing_rule (tenant_id, organization_id, match_model_code, match_billing_meter, match_token_kind, status, rule_priority, id);
CREATE INDEX idx_ai_pricing_rule_capability_meter ON ai_pricing_rule (tenant_id, organization_id, match_capability_type, match_billing_meter, match_token_kind, status, rule_priority, id);

-- Comments
COMMENT ON TABLE ai_pricing_rule IS '定价规则表 - 具体计费规则（L2合规）';
COMMENT ON COLUMN ai_pricing_rule.rule_code IS '规则编码（幂等键）';
COMMENT ON COLUMN ai_pricing_rule.pricing_id IS '定价方案ID';
COMMENT ON COLUMN ai_pricing_rule.rule_priority IS '规则优先级（数值越小优先级越高）';
COMMENT ON COLUMN ai_pricing_rule.match_billing_meter IS '计量项（input_tokens/output_tokens/total_tokens等）';
COMMENT ON COLUMN ai_pricing_rule.tier_config IS '阶梯定价配置（JSON格式）';

-- ============================================================
-- Pricing Mode Definitions
-- ============================================================
-- 
-- pricing_mode Values:
-- 0 = multiplier (倍率定价)
--     - Formula: unit_price = base_price * multiplier
--     - Example: base_price = 0.001, multiplier = 1.5, unit_price = 0.0015
-- 
-- 1 = fixed (固定价格)
--     - Formula: unit_price = fixed_price
--     - Example: fixed_price = 0.002, unit_price = 0.002
-- 
-- 2 = tiered (阶梯定价)
--     - Formula: unit_price = tier_config[unit_range]
--     - Example: tier_config = [{"min": 0, "max": 1000000, "price": 0.002}, {"min": 1000000, "max": null, "price": 0.0015}]
-- 
-- 3 = expression (表达式定价)
--     - Formula: unit_price = eval(expression_formula, context)
--     - Example: expression_formula = "base_price * (1 + markup_percentage) * usage_multiplier"
-- 
-- ============================================================

-- ============================================================
-- Tier Config JSON Schema
-- ============================================================
-- 
-- tier_config JSON Format:
-- {
--   "tiers": [
--     {
--       "min": 0,           // Minimum quantity
--       "max": 1000000,     // Maximum quantity (null means unlimited)
--       "price": "0.002",   // Unit price for this tier
--       "currency": "USD"   // Currency
--     },
--     {
--       "min": 1000000,
--       "max": null,
--       "price": "0.0015",
--       "currency": "USD"
--     }
--   ]
-- }
-- 
-- ============================================================

-- ============================================================
-- Billing Meter Definitions
-- ============================================================
-- 
-- Common Billing Meters:
-- - input_tokens: Input token count
-- - output_tokens: Output token count
-- - total_tokens: Total token count (input + output)
-- - reasoning_tokens: Reasoning token count (for OpenAI o1 models)
-- - cache_read_tokens: Cache read token count
-- - cache_write_tokens: Cache write token count
-- - requests: Request count
-- - duration_seconds: Duration in seconds
-- - images: Image count
-- - audio_duration_seconds: Audio duration in seconds
-- - video_duration_seconds: Video duration in seconds
-- 
-- ============================================================

-- ============================================================
-- Security Compliance (L2)
-- ============================================================
-- 
-- All Tables:
-- - Sensitivity: INTERNAL (Internal Sensitive)
-- - Stores Secret Plaintext: false (No plaintext secrets)
-- - Audit Required: true (Mandatory audit trail)
-- 
-- Pricing Data:
-- - Financial sensitivity: Pricing strategy is internal business data
-- - No PII data: No personal identifiable information
-- - Audit trail: All pricing changes must be audited
-- 
-- ============================================================

-- ============================================================
-- Serialization Specification
-- ============================================================
-- 
-- JSON Serialization Rules:
-- - int64: string (e.g., "1234567890")
-- - decimal: string (e.g., "123.456")
-- - instant: iso8601_utc (e.g., "2026-01-01T00:00:00Z")
-- 
-- Database Storage Rules:
-- - int64: BIGINT (PostgreSQL native type)
-- - decimal: DECIMAL(20, 6) for financial amounts, DECIMAL(10, 4) for multipliers
-- - instant: TIMESTAMP WITH TIME ZONE (UTC timezone)
-- - json: JSONB (PostgreSQL binary JSON for performance)
-- 
-- ============================================================

-- ============================================================
-- Module Ownership Verification
-- ============================================================
-- 
-- Table Ownership:
-- - ai_pricing: claw-router-platform (ai-pricing module)
-- - ai_pricing_rule: claw-router-platform (ai-pricing module)
-- 
-- Write Owner:
-- - ai_pricing: pricing-service
-- - ai_pricing_rule: pricing-service
-- 
-- Module Interaction:
-- - ai_usage (ai-metering module) reads pricing data
-- - router-service calculates prices using pricing rules
-- - No cross-module direct write operations
-- 
-- ============================================================

-- ============================================================
-- Performance Optimization
-- ============================================================
-- 
-- Index Strategy:
-- - Tenant Isolation Index: All queries start with tenant_id + organization_id
-- - Pricing Association Index: Query pricing rules by pricing_id
-- - Model Meter Index: Match pricing rules by model_code + billing_meter
-- - Capability Meter Index: Match pricing rules by capability_type + billing_meter
-- - Priority Index: Sort rules by priority for matching
-- 
-- Query Optimization:
-- - Use covering indexes for frequent queries
-- - Use partial indexes for specific conditions
-- - Use composite indexes for multi-column filters
-- 
-- Example Query Pattern:
-- SELECT * FROM ai_pricing_rule
-- WHERE tenant_id = ? AND organization_id = ?
--   AND match_model_code = ?
--   AND match_billing_meter = ?
--   AND status = 0
--   AND effective_from <= NOW() AND effective_to >= NOW()
-- ORDER BY rule_priority ASC
-- LIMIT 1;
-- 
-- ============================================================