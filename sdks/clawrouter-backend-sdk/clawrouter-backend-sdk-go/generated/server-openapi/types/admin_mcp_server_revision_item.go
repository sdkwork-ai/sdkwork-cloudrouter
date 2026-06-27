package types

// Admin mcp server revision item schema exposed by Claw Router.
type AdminMcpServerRevisionItem struct {
	ArgsJson []string `json:"argsJson"`
	AuthType string `json:"authType"`
	Command string `json:"command"`
	ConfigHash string `json:"configHash"`
	CreatedAt string `json:"createdAt"`
	CreatedBy string `json:"createdBy"`
	DeprecatedAt string `json:"deprecatedAt"`
	EndpointUrl string `json:"endpointUrl"`
	EnvSchema map[string]JsonValue `json:"envSchema"`
	Id string `json:"id"`
	LifecycleStatus string `json:"lifecycleStatus"`
	OrganizationId string `json:"organizationId"`
	PublishedAt string `json:"publishedAt"`
	RetryPolicy map[string]JsonValue `json:"retryPolicy"`
	RevisionNo string `json:"revisionNo"`
	SecretRef string `json:"secretRef"`
	ServerId string `json:"serverId"`
	Status string `json:"status"`
	TenantId string `json:"tenantId"`
	TimeoutMs int `json:"timeoutMs"`
	Transport string `json:"transport"`
	UpdatedAt string `json:"updatedAt"`
	Uuid string `json:"uuid"`
}
