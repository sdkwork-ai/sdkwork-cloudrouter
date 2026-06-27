package types

// Admin mcp binding create request schema exposed by Claw Router.
type AdminMcpBindingCreateRequest struct {
	AllowedTools []string `json:"allowedTools"`
	DeniedTools []string `json:"deniedTools"`
	Enabled bool `json:"enabled"`
	OwnerId string `json:"ownerId"`
	OwnerType string `json:"ownerType"`
	PolicyJson map[string]JsonValue `json:"policyJson"`
	Priority int `json:"priority"`
	ServerRevisionId string `json:"serverRevisionId"`
	Status string `json:"status"`
	ToolId string `json:"toolId"`
}
