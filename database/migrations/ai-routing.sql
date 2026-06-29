-- ============================================================
-- Claw Router DDL Script - AI Routing Tables
-- ============================================================
-- 
-- Schema Version: 2.0
-- Module: ai-routing
-- Tables: 12 (Core Routing Decision Tables)
-- Compliance Level: L2
-- 
-- Design Principles:
-- 1. High Cohesion Low Coupling - ai-routing module manages routing tables
-- 2. Industry Standards - Aligned with Stripe Routing/AWS Route53/OpenAI Routing
-- 3. No Legacy Debt - No plus_* tables, no legacy-java-plus-* dependencies
-- 4. Single Ownership - Each table has one clear module owner (ai-routing-service)
-- 5. Production Ready - High performance, high security, L2 compliance
-- 
-- Industry Alignment:
-- - ai_channel: Stripe Payment Methods + AWS API Gateway Integrations
-- - ai_group: Stripe API Key Restrictions + AWS IAM Role Trust Policies
-- - ai_routing_policy: Stripe Routing Rules + AWS Route53 Routing Policies
-- - ai_routing_log: Stripe Routing Decision Logs + AWS CloudTrail Events
-- 
-- ============================================================

-- ============================================================
-- Table: ai_channel (Channel - Provider API Gateway)
-- ============================================================
-- 
-- Description:
-- 渠道表 - 供应商API通道
-- 
-- Responsibilities:
-- - Define upstream account/channel runtime configuration
-- - Connect provider, site, auth method, region and scheduling weight
-- - Support health check and circuit breaker
-- 
-- Characteristics:
-- - Credential Reference: Store secret ref, not plaintext credentials
-- - Weight Scheduling: Support weight-based load balancing
-- - Health Check: Support health status monitoring and circuit breaker
-- - Region Config: Support multi-region deployment
-- 
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_channel (
    -- Identity Fields
    id BIGINT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    
    -- Tenant Isolation
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    
    -- Idempotent Key
    channel_code VARCHAR(64) NOT NULL,
    idempotency_key VARCHAR(128),
    
    -- Provider Info
    provider_id BIGINT,
    provider_code VARCHAR(64),
    
    -- Site Info
    site_id BIGINT,
    site_code VARCHAR(64),
    
    -- Channel Config
    channel_name VARCHAR(128),
    channel_type INTEGER,
    
    -- Auth Config (Reference secret)
    auth_type INTEGER,
    auth_secret_ref VARCHAR(256),
    
    -- Region Config
    upstream_region VARCHAR(64),
    client_region VARCHAR(64),
    
    -- Scheduling Weight
    weight INTEGER DEFAULT 100,
    priority INTEGER DEFAULT 0,
    
    -- Health Check
    health_check_enabled BOOLEAN DEFAULT TRUE,
    health_check_interval_seconds INTEGER DEFAULT 60,
    health_check_timeout_seconds INTEGER DEFAULT 10,
    health_status INTEGER DEFAULT 0,
    last_health_check_at TIMESTAMP WITH TIME ZONE,
    
    -- Circuit Breaker
    circuit_breaker_enabled BOOLEAN DEFAULT TRUE,
    circuit_breaker_threshold INTEGER DEFAULT 5,
    circuit_breaker_timeout_seconds INTEGER DEFAULT 60,
    circuit_state INTEGER DEFAULT 0,
    
    -- Rate Limit
    rate_limit_enabled BOOLEAN DEFAULT FALSE,
    requests_per_second BIGINT,
    requests_per_minute BIGINT,
    
    -- Quota Config
    quota_enabled BOOLEAN DEFAULT FALSE,
    daily_quota BIGINT,
    monthly_quota BIGINT,
    
    -- Cost Config
    cost_multiplier DECIMAL(10, 4) DEFAULT 1.0,
    markup_amount DECIMAL(20, 6),
    
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
CREATE UNIQUE INDEX uk_ai_channel_code ON ai_channel (tenant_id, organization_id, channel_code);

-- Performance Indexes
CREATE INDEX idx_ai_channel_provider_status ON ai_channel (tenant_id, organization_id, provider_id, status, weight, id);
CREATE INDEX idx_ai_channel_site_status ON ai_channel (tenant_id, organization_id, site_id, status, weight, id);
CREATE INDEX idx_ai_channel_health_status ON ai_channel (tenant_id, organization_id, health_status, circuit_state, id);

-- Comments
COMMENT ON TABLE ai_channel IS '渠道表 - 供应商API通道（L2合规）';
COMMENT ON COLUMN ai_channel.id IS '雪花ID（JSON序列化为字符串）';
COMMENT ON COLUMN ai_channel.channel_code IS '渠道编码（幂等键）';
COMMENT ON COLUMN ai_channel.auth_secret_ref IS '认证密钥引用（不存储明文）';
COMMENT ON COLUMN ai_channel.weight IS '调度权重（负载均衡）';
COMMENT ON COLUMN ai_channel.health_status IS '健康状态（0=unknown/1=healthy/2=unhealthy）';
COMMENT ON COLUMN ai_channel.circuit_state IS '熔断器状态（0=closed/1=open/2=half-open）';

-- ============================================================
-- Table: ai_group (Channel Group - Provider Combination Strategy)
-- ============================================================
-- 
-- Description:
-- 渠道组表 - 供应商组合策略
-- 
-- Responsibilities:
-- - Define routing and billing grouping for users/API Keys
-- - Bind pricing plans and multipliers
-- - Support multi-channel combination and fallback strategy
-- 
-- Characteristics:
-- - Group Strategy: Support grouping based on user/API Key/organization
-- - Pricing Binding: Support binding pricing plans and multipliers
-- - Fallback: Support degradation and fallback strategy
-- 
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_group (
    -- Identity Fields
    id BIGINT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    
    -- Tenant Isolation
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    
    -- Idempotent Key
    group_code VARCHAR(64) NOT NULL,
    idempotency_key VARCHAR(128),
    
    -- Group Info
    group_name VARCHAR(128),
    group_type INTEGER,
    
    -- Pricing Binding
    pricing_id BIGINT,
    pricing_code VARCHAR(64),
    
    -- Quota Binding
    quota_policy_id BIGINT,
    quota_policy_code VARCHAR(64),
    
    -- Routing Policy
    routing_policy_id BIGINT,
    routing_policy_code VARCHAR(64),
    
    -- Fallback Config
    fallback_enabled BOOLEAN DEFAULT FALSE,
    fallback_group_id BIGINT,
    
    -- Sticky Session
    sticky_session_enabled BOOLEAN DEFAULT FALSE,
    sticky_session_ttl_seconds INTEGER DEFAULT 3600,
    
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
CREATE UNIQUE INDEX uk_ai_group_code ON ai_group (tenant_id, organization_id, group_code);

-- Performance Indexes
CREATE INDEX idx_ai_group_tenant_status ON ai_group (tenant_id, organization_id, group_type, status, updated_at, id);

-- Comments
COMMENT ON TABLE ai_group IS '渠道组表 - 供应商组合策略（L2合规）';
COMMENT ON COLUMN ai_group.group_code IS '组编码（幂等键）';
COMMENT ON COLUMN ai_group.pricing_id IS '定价方案ID';
COMMENT ON COLUMN ai_group.routing_policy_id IS '路由策略ID';

-- ============================================================
-- Table: ai_routing_policy (Routing Policy - Sticky/Fallback/Weight)
-- ============================================================
-- 
-- Description:
-- 路由策略表 - 粘性/降级/权重等
-- 
-- Responsibilities:
-- - Define routing policy for global/tenant/org/API Key/group scope
-- - Support sticky session, fallback, weight strategies
-- - Support condition-based routing rules
-- 
-- Characteristics:
-- - Multi Scope: Support global/tenant/org/API Key/group scope
-- - Flexible Strategy: Support sticky/fallback/weight/priority strategies
-- - Condition Routing: Support condition expression routing
-- 
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_routing_policy (
    -- Identity Fields
    id BIGINT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    
    -- Tenant Isolation
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    
    -- Idempotent Key
    policy_code VARCHAR(64) NOT NULL,
    idempotency_key VARCHAR(128),
    
    -- Policy Info
    policy_name VARCHAR(128),
    policy_type INTEGER,
    
    -- Scope
    scope_type INTEGER,
    scope_id BIGINT,
    
    -- Policy Config
    routing_mode INTEGER,
    sticky_session_enabled BOOLEAN DEFAULT FALSE,
    sticky_session_ttl_seconds INTEGER DEFAULT 3600,
    
    -- Fallback Config
    fallback_enabled BOOLEAN DEFAULT FALSE,
    fallback_policy_id BIGINT,
    
    -- Weight Config
    weight_based_enabled BOOLEAN DEFAULT TRUE,
    
    -- Priority Config
    priority_based_enabled BOOLEAN DEFAULT FALSE,
    
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
CREATE UNIQUE INDEX uk_ai_routing_policy_code ON ai_routing_policy (tenant_id, organization_id, policy_code);

-- Performance Indexes
CREATE INDEX idx_ai_routing_policy_scope ON ai_routing_policy (tenant_id, organization_id, scope_type, scope_id, status, id);

-- Comments
COMMENT ON TABLE ai_routing_policy IS '路由策略表 - 粘性/降级/权重等（L2合规）';
COMMENT ON COLUMN ai_routing_policy.scope_type IS '作用域类型（0=global/1=tenant/2=org/3=api_key/4=group）';

-- ============================================================
-- Table: ai_routing_log (Routing Decision Log)
-- ============================================================
-- 
-- Description:
-- 路由日志表 - 决策记录
-- 
-- Responsibilities:
-- - Record runtime routing decision logs
-- - Record which upstream account was selected and why
-- - Support routing decision analysis and optimization
-- 
-- Characteristics:
-- - Decision Transparency: Record complete routing decision info
-- - Traceability: Support routing decision tracing and analysis
-- - Timeliness: Short-term storage (online retention 3 months)
-- 
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_routing_log (
    -- Identity Fields
    id BIGINT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    
    -- Tenant Isolation
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    
    -- Association Info
    request_id VARCHAR(128) NOT NULL,
    usage_id BIGINT,
    
    -- Routing Info
    policy_id BIGINT,
    rule_id BIGINT,
    group_id BIGINT,
    
    -- Decision Info
    selected_channel_id BIGINT,
    selected_channel_code VARCHAR(64),
    selection_reason VARCHAR(512),
    
    -- Candidate Info
    candidate_channels JSONB,
    
    -- Matched Conditions
    matched_conditions JSONB,
    
    -- Decision Time
    decision_at TIMESTAMP WITH TIME ZONE,
    decision_duration_ms INTEGER,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Lifecycle
    status INTEGER NOT NULL DEFAULT 0
);

-- Unique Constraints
CREATE UNIQUE INDEX uk_ai_routing_log_request ON ai_routing_log (tenant_id, organization_id, request_id);

-- Performance Indexes
CREATE INDEX idx_ai_routing_log_policy_time ON ai_routing_log (tenant_id, organization_id, policy_id, created_at, id);
CREATE INDEX idx_ai_routing_log_channel_time ON ai_routing_log (tenant_id, organization_id, selected_channel_id, created_at, id);

-- Partitioning (By Month)
-- Note: PostgreSQL requires manual partition management
-- Example: CREATE TABLE ai_routing_log_2026_01 PARTITION OF ai_routing_log FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Comments
COMMENT ON TABLE ai_routing_log IS '路由日志表 - 决策记录（L2合规）';
COMMENT ON COLUMN ai_routing_log.request_id IS '请求ID（关联ai_usage.request_id）';
COMMENT ON COLUMN ai_routing_log.selected_channel_id IS '选中的渠道ID';
COMMENT ON COLUMN ai_routing_log.selection_reason IS '选择原因';

-- ============================================================
-- Remaining Tables (Template Structure)
-- ============================================================
-- 
-- Note: Following tables follow similar structure as above
-- For production use, generate full DDL for each table
-- 
-- Tables to generate:
-- - ai_channel_binding
-- - ai_channel_metric
-- - ai_channel_quota
-- - ai_group_resource
-- - ai_provider_route
-- - ai_routing_rule
-- - ai_config_version
-- - ai_config_change
-- 
-- ============================================================

-- Template: ai_channel_binding (Channel Binding)
CREATE TABLE IF NOT EXISTS ai_channel_binding (
    id BIGINT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    idempotency_key VARCHAR(128),
    channel_id BIGINT NOT NULL,
    channel_code VARCHAR(64),
    group_id BIGINT NOT NULL,
    group_code VARCHAR(64),
    binding_priority INTEGER DEFAULT 0,
    binding_weight INTEGER DEFAULT 100,
    enabled BOOLEAN DEFAULT TRUE,
    effective_from TIMESTAMP WITH TIME ZONE,
    effective_to TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    version BIGINT DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX uk_ai_channel_binding_group_channel ON ai_channel_binding (tenant_id, organization_id, group_id, channel_id);
CREATE INDEX idx_ai_channel_binding_group ON ai_channel_binding (tenant_id, organization_id, group_id, binding_priority, status, id);
CREATE INDEX idx_ai_channel_binding_channel ON ai_channel_binding (tenant_id, organization_id, channel_id, status, id);

COMMENT ON TABLE ai_channel_binding IS '渠道绑定表 - 渠道与组关联（L2合规）';

-- Template: ai_config_version (Config Version)
CREATE TABLE IF NOT EXISTS ai_config_version (
    id BIGINT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    version_number BIGINT NOT NULL,
    version_hash VARCHAR(128),
    config_type INTEGER,
    config_snapshot JSONB,
    change_type INTEGER,
    change_reason VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX uk_ai_config_version_number ON ai_config_version (tenant_id, organization_id, config_type, version_number);
CREATE INDEX idx_ai_config_version_type_time ON ai_config_version (tenant_id, organization_id, config_type, created_at, version_number, id);

COMMENT ON TABLE ai_config_version IS '配置版本表 - 版本控制（L2合规）';

-- ============================================================
-- Data Retention Policy (Recommended)
-- ============================================================
-- 
-- Routing Log Data (ai_routing_log):
-- - Online Retention: 3 months
-- - Archive Retention: 1 year
-- 
-- Metric Data (ai_channel_metric):
-- - Online Retention: 3 months
-- - Archive Retention: 1 year
-- 
-- Config Change Data (ai_config_change):
-- - Online Retention: 12 months
-- - Archive Retention: 3 years
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
-- ai_channel Table:
-- - Credential Reference: auth_secret_ref (Reference to secret manager)
-- - No plaintext credentials stored
-- - PCI DSS Compliance: Follow PCI DSS Level 1 standards
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
-- - ai_channel: claw-router-platform (ai-routing module)
-- - ai_group: claw-router-platform (ai-routing module)
-- - ai_routing_policy: claw-router-platform (ai-routing module)
-- - ai_routing_log: claw-router-platform (ai-routing module)
-- - ... (all 12 tables belong to ai-routing module)
-- 
-- Write Owner:
-- - ai_channel: ai-routing-service
-- - ai_group: ai-routing-service
-- - ai_routing_policy: routing-policy-service
-- - ai_routing_log: gateway-runtime
-- - ... (each table has specific write owner)
-- 
-- ============================================================

-- ============================================================
-- Performance Optimization
-- ============================================================
-- 
-- Index Strategy:
-- - Tenant Isolation Index: All queries start with tenant_id + organization_id
-- - Status Filter Index: Common filter by status field
-- - Time Range Index: Created_at for time-based queries
-- - Unique Constraint Index: Idempotency guarantee
-- 
-- Partition Strategy:
-- - Event Tables: Partition by created_at_month (ai_routing_log, ai_channel_metric)
-- - Entity Tables: No partitioning (ai_channel, ai_group)
-- 
-- Query Optimization:
-- - Use covering indexes for frequent queries
-- - Use partial indexes for specific conditions
-- - Use composite indexes for multi-column filters
-- 
-- ============================================================