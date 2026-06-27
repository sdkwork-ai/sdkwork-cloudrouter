package types

// Chat turn create request schema exposed by Claw Router.
type ChatTurnCreateRequest struct {
	AgentId string `json:"agentId"`
	AgentSessionId string `json:"agentSessionId"`
	Message string `json:"message"`
	Metadata map[string]JsonValue `json:"metadata"`
	Mode string `json:"mode"`
	Model string `json:"model"`
	Provider string `json:"provider"`
}
