-- ============================================================
-- Claw Router DDL Script - AI Metering Tables
-- ============================================================
-- 
-- Schema Version: 2.0
-- Module: ai-metering
-- Tables: 2 (ai_usage, ai_usage_trace)
-- Compliance Level: L3 (Financial Grade)
-- 
-- Design Principles:
-- 1. High Cohesion Low Coupling - Tables belong to ai-metering module
-- 2. Industry Standards - Aligned with Stripe/AWS/OpenAI
-- 3. No Legacy Debt - No plus_* tables, no legacy-java-plus-* dependencies
-- 4. Single Ownership - Each table has one clear module owner
-- 5. Production Ready - High performance, high security, L3 compliance
-- 
-- Industry Alignment:
-- - ai_usage: Stripe Usage Records + AWS CloudWatch Metrics
-- - ai_usage_trace: AWS X-Ray + Datadog APM + Jaeger Tracing
-- 
-- ============================================================

-- ============================================================
-- Table: ai_usage (AI Usage Fact Table - Core Billing Data)
-- ============================================================
-- 
-- Description:
-- AI用量事实表 - Claw Router的核心价值表
-- 
-- Responsibilities:
-- - Record all AI call usage facts
-- - Source of truth for billing, settlement, reconciliation
-- - Support L3 financial compliance
-- 
-- Data Flow:
-- 1. router-service writes ai_usage (Claw Router local)
-- 2. Publish UsageRecorded event
-- 3. sdkwork-account subscribes → commerce_account_ledger_entry
-- 
-- Characteristics:
-- - Immutable: append-only, cannot modify
-- - Idempotent: guaranteed by request_id
-- - Complete: contains full request/response/billing info
-- - Traceable: contains trace_id for link tracing
-- 
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_usage (
    -- Identity Fields
    id BIGINT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    
    -- Tenant Isolation
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    user_id BIGINT,
    
    -- Idempotent Tracking
    request_id VARCHAR(128) NOT NULL,
    trace_id VARCHAR(128),
    idempotency_key VARCHAR(128),
    
    -- Channel Info
    group_id BIGINT,
    group_code VARCHAR(64),
    channel_id BIGINT,
    channel_code VARCHAR(64),
    
    -- Provider Info
    provider_id BIGINT,
    provider_code VARCHAR(64),
    
    -- Model Info
    model_vendor VARCHAR(64),
    model_code VARCHAR(128),
    model_family VARCHAR(64),
    
    -- Capability Type
    capability_type INTEGER,
    operation_type INTEGER,
    
    -- Billing Metering (Aligned with Stripe Metering)
    billing_mode INTEGER,
    billing_meter VARCHAR(64),
    input_tokens BIGINT,
    output_tokens BIGINT,
    total_tokens BIGINT,
    reasoning_tokens BIGINT,
    cache_read_tokens BIGINT,
    cache_write_tokens BIGINT,
    
    -- Performance Metrics (Aligned with CloudWatch Metrics)
    duration_ms BIGINT,
    ttft_ms INTEGER,
    upstream_latency_ms INTEGER,
    gateway_latency_ms INTEGER,
    
    -- Amount Fields (Aligned with Stripe Billing)
    upstream_cost DECIMAL(20, 6),
    upstream_currency VARCHAR(10),
    customer_charge DECIMAL(20, 6),
    customer_currency VARCHAR(10),
    settlement_amount DECIMAL(20, 6),
    settlement_currency VARCHAR(10),
    
    -- Settlement Status
    settlement_status INTEGER,
    
    -- Pricing Info
    pricing_id BIGINT,
    pricing_code VARCHAR(64),
    
    -- Streaming/Idempotent/Fallback
    is_streaming BOOLEAN DEFAULT FALSE,
    is_idempotent BOOLEAN DEFAULT FALSE,
    is_fallback BOOLEAN DEFAULT FALSE,
    
    -- Error Info
    error_code VARCHAR(64),
    error_type VARCHAR(64),
    error_message VARCHAR(512),
    
    -- Snapshots (Aligned with AWS Config Snapshots)
    request_snapshot JSONB,
    response_snapshot JSONB,
    
    -- Routing Decision
    routing_log_id BIGINT,
    
    -- Sticky Session
    sticky_key VARCHAR(128),
    
    -- Circuit Breaker
    circuit_state INTEGER,
    
    -- Region
    upstream_region VARCHAR(64),
    client_region VARCHAR(64),
    
    -- Client Info (Desensitized)
    client_ip_hash VARCHAR(128),
    user_agent_hash VARCHAR(128),
    
    -- API Key
    api_key_id BIGINT,
    api_key_prefix VARCHAR(32),
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    settled_at TIMESTAMP WITH TIME ZONE,
    reconciled_at TIMESTAMP WITH TIME ZONE,
    
    -- Lifecycle
    status INTEGER NOT NULL,
    retention_until TIMESTAMP WITH TIME ZONE,
    legal_hold BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    metadata JSONB
);

-- Unique Constraints
CREATE UNIQUE INDEX uk_ai_usage_request ON ai_usage (tenant_id, organization_id, request_id);

-- Performance Indexes
CREATE INDEX idx_ai_usage_tenant_time ON ai_usage (tenant_id, organization_id, created_at, id);
CREATE INDEX idx_ai_usage_group_time ON ai_usage (tenant_id, organization_id, group_id, created_at, id);
CREATE INDEX idx_ai_usage_provider_time ON ai_usage (tenant_id, organization_id, provider_code, created_at, id);
CREATE INDEX idx_ai_usage_model_time ON ai_usage (tenant_id, organization_id, model_code, created_at, id);
CREATE INDEX idx_ai_usage_api_key_time ON ai_usage (tenant_id, organization_id, api_key_id, created_at, id);
CREATE INDEX idx_ai_usage_user_time ON ai_usage (tenant_id, organization_id, user_id, created_at, id);
CREATE INDEX idx_ai_usage_settlement_status ON ai_usage (tenant_id, organization_id, settlement_status, created_at, id);

-- Partitioning (By Month)
-- Note: PostgreSQL requires manual partition management
-- This is a template for creating monthly partitions
-- Example: CREATE TABLE ai_usage_2026_01 PARTITION OF ai_usage FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Comments
COMMENT ON TABLE ai_usage IS 'AI用量事实表 - 核心计费数据（L3金融级别合规）';
COMMENT ON COLUMN ai_usage.id IS '雪花ID（JSON序列化为字符串）';
COMMENT ON COLUMN ai_usage.request_id IS '请求ID（幂等键）';
COMMENT ON COLUMN ai_usage.trace_id IS '分布式追踪ID';
COMMENT ON COLUMN ai_usage.total_tokens IS '总tokens数';
COMMENT ON COLUMN ai_usage.upstream_cost IS '上游成本';
COMMENT ON COLUMN ai_usage.customer_charge IS '客户收费';
COMMENT ON COLUMN ai_usage.settlement_amount IS '结算金额';

-- ============================================================
-- Table: ai_usage_trace (Usage Trace Table - Request Link Log)
-- ============================================================
-- 
-- Description:
-- 用量追踪表 - 请求链路日志
-- 
-- Responsibilities:
-- - Record complete request link information
-- - Support troubleshooting and performance analysis
-- - Provide observability data
-- 
-- Data Flow:
-- 1. router-service writes ai_usage_trace
-- 2. Associated with ai_usage.request_id
-- 3. Support trace_id link tracing
-- 
-- Characteristics:
-- - Observability: support link tracing and performance analysis
-- - Association: associate complete link through trace_id
-- - Timeliness: short-term storage (online retention 3 months)
-- 
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_usage_trace (
    -- Identity Fields
    id BIGINT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    
    -- Tenant Isolation
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    user_id BIGINT,
    
    -- Association Info
    usage_id BIGINT,
    request_id VARCHAR(128) NOT NULL,
    trace_id VARCHAR(128),
    
    -- Channel Info
    group_id BIGINT,
    channel_id BIGINT,
    provider_id BIGINT,
    
    -- Model Info
    model_code VARCHAR(128),
    
    -- Trace Info
    span_id VARCHAR(64) NOT NULL,
    parent_span_id VARCHAR(64),
    span_name VARCHAR(128),
    span_kind INTEGER,
    
    -- Time Info
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_ms BIGINT,
    
    -- HTTP Info
    http_method VARCHAR(16),
    http_url VARCHAR(512),
    http_status_code INTEGER,
    
    -- Error Info
    error BOOLEAN DEFAULT FALSE,
    error_code VARCHAR(64),
    error_message VARCHAR(512),
    
    -- Performance Metrics
    ttft_ms INTEGER,
    tokens_per_second DECIMAL(10, 2),
    first_token_latency_ms INTEGER,
    
    -- Tags
    tags JSONB,
    
    -- Events
    events JSONB,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Lifecycle
    status INTEGER NOT NULL
);

-- Unique Constraints
CREATE UNIQUE INDEX uk_ai_usage_trace_request ON ai_usage_trace (tenant_id, organization_id, request_id, span_id);

-- Performance Indexes
CREATE INDEX idx_ai_usage_trace_trace ON ai_usage_trace (tenant_id, organization_id, trace_id, created_at, id);
CREATE INDEX idx_ai_usage_trace_usage ON ai_usage_trace (tenant_id, organization_id, usage_id, created_at, id);
CREATE INDEX idx_ai_usage_trace_time ON ai_usage_trace (tenant_id, organization_id, created_at, id);

-- Partitioning (By Month)
-- Note: PostgreSQL requires manual partition management
-- This is a template for creating monthly partitions
-- Example: CREATE TABLE ai_usage_trace_2026_01 PARTITION OF ai_usage_trace FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Comments
COMMENT ON TABLE ai_usage_trace IS '用量追踪表 - 请求链路日志（L2合规）';
COMMENT ON COLUMN ai_usage_trace.trace_id IS '分布式追踪ID';
COMMENT ON COLUMN ai_usage_trace.span_id IS 'Span ID';
COMMENT ON COLUMN ai_usage_trace.duration_ms IS '总耗时（毫秒）';

-- ============================================================
-- Data Retention Policy (Recommended)
-- ============================================================
-- 
-- Financial Data (ai_usage):
-- - Online Retention: 12 months
-- - Archive Retention: 5 years (Financial Compliance)
-- 
-- Trace Data (ai_usage_trace):
-- - Online Retention: 3 months
-- - Archive Retention: 1 year
-- 
-- ============================================================

-- ============================================================
-- Security Compliance (L3 Financial Grade)
-- ============================================================
-- 
-- ai_usage Table:
-- - Sensitivity: INTERNAL (Internal Sensitive)
-- - Stores Secret Plaintext: false (No plaintext secrets)
-- - Audit Required: true (Mandatory audit trail)
-- - Append-Only: true (Immutable, cannot modify)
-- 
-- ai_usage_trace Table:
-- - Sensitivity: INTERNAL (Internal Sensitive)
-- - Stores Secret Plaintext: false (No plaintext secrets)
-- - Audit Required: true (Mandatory audit trail)
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
-- - decimal: DECIMAL(20, 6) (High precision for financial amounts)
-- - instant: TIMESTAMP WITH TIME ZONE (UTC timezone)
-- - json: JSONB (PostgreSQL binary JSON for performance)
-- 
-- ============================================================

-- ============================================================
-- Module Ownership Verification
-- ============================================================
-- 
-- Table Ownership:
-- - ai_usage: claw-router-platform (ai-metering module)
-- - ai_usage_trace: claw-router-platform (ai-metering module)
-- 
-- Write Owner:
-- - ai_usage: router-service (Gateway Runtime Service)
-- - ai_usage_trace: router-service (Gateway Runtime Service)
-- 
-- Module Interaction:
-- - Claw Router writes ai_usage (local)
-- - Claw Router writes ai_usage_trace (local)
-- - Claw Router publishes UsageRecorded event
-- - sdkwork-account subscribes event → commerce_account_ledger_entry
-- - No direct write to commerce_* tables
-- 
-- ============================================================