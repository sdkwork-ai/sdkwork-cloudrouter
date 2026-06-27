-- MCP bootstrap seed: platform server categories (stable IDs for install idempotency)

INSERT INTO ai_mcp_server_category (
    id, uuid, tenant_id, organization_id, category_code, name, description,
    parent_id, sort_order, lifecycle_status, version, created_by, updated_by
) VALUES
    (
        910001,
        '01940000-0000-7000-8000-000000000001',
        0,
        0,
        'developer-tools',
        'Developer Tools',
        'IDE, VCS, and software development MCP servers.',
        0,
        10,
        1,
        0,
        0,
        0
    ),
    (
        910002,
        '01940000-0000-7000-8000-000000000002',
        0,
        0,
        'data-analytics',
        'Data & Analytics',
        'Databases, warehouses, and analytics MCP servers.',
        0,
        20,
        1,
        0,
        0,
        0
    ),
    (
        910003,
        '01940000-0000-7000-8000-000000000003',
        0,
        0,
        'productivity',
        'Productivity',
        'Communication, documents, and workflow MCP servers.',
        0,
        30,
        1,
        0,
        0,
        0
    )
ON CONFLICT (tenant_id, category_code) DO NOTHING;
