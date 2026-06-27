package types

// Chat conversation item schema exposed by Claw Router.
type ChatConversationItem struct {
	AgentId string `json:"agentId"`
	AgentSessionId string `json:"agentSessionId"`
	CreatedAt string `json:"createdAt"`
	DefaultModel string `json:"defaultModel"`
	DefaultProvider string `json:"defaultProvider"`
	Id string `json:"id"`
	LastMessagePreview string `json:"lastMessagePreview"`
	MemorySpaceId string `json:"memorySpaceId"`
	MessageCount string `json:"messageCount"`
	SourceSurface string `json:"sourceSurface"`
	Status string `json:"status"`
	Title string `json:"title"`
	TurnCount string `json:"turnCount"`
	UpdatedAt string `json:"updatedAt"`
}
