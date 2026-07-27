-- Canonical default application ingress. Operators own subsequent changes
-- through the service-node Admin surface; repeated seeds never overwrite it.
INSERT INTO ops_gateway_instance (
    id,
    uuid,
    tenant_id,
    organization_id,
    data_scope,
    status,
    created_at,
    updated_at,
    version,
    metadata,
    instance_code,
    deployment_mode,
    ip_address_masked,
    node_name,
    health_status
)
VALUES (
    910000100001,
    'clawrouter-default-standalone-ingress',
    100001,
    0,
    1,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    1,
    '{"schemaVersion":1,"deploymentProfile":"standalone","baseUrl":"http://127.0.0.1:8080/v1","domains":["127.0.0.1:8080","localhost:8080"],"domain":"127.0.0.1:8080","remark":"Default standalone application ingress"}',
    'clawrouter-default-standalone',
    2,
    '127.0.0.1',
    'Default standalone ingress',
    NULL
)
ON CONFLICT(instance_code) DO NOTHING;
