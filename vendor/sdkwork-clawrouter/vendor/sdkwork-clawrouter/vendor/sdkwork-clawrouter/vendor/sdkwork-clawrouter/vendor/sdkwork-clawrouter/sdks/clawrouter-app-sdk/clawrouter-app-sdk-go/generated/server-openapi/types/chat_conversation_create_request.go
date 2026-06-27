package types

// Chat conversation create request schema exposed by Claw Router.
type ChatConversationCreateRequest struct {
	AgentId string `json:"agentId"`
	AgentSessionId string `json:"agentSessionId"`
	DefaultModel string `json:"defaultModel"`
	DefaultProvider string `json:"defaultProvider"`
	MemorySpaceId string `json:"memorySpaceId"`
	Metadata map[string]JsonValue `json:"metadata"`
	SourceSurface string `json:"sourceSurface"`
	Title string `json:"title"`
}
