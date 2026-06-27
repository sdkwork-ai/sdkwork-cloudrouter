package types

// Admin mcp server revision create request schema exposed by Claw Router.
type AdminMcpServerRevisionCreateRequest struct {
	ArgsJson []string `json:"argsJson"`
	AuthType string `json:"authType"`
	Command string `json:"command"`
	EndpointUrl string `json:"endpointUrl"`
	EnvSchema map[string]JsonValue `json:"envSchema"`
	RetryPolicy map[string]JsonValue `json:"retryPolicy"`
	RevisionNo string `json:"revisionNo"`
	SecretRef string `json:"secretRef"`
	TimeoutMs int `json:"timeoutMs"`
	Transport string `json:"transport"`
}
