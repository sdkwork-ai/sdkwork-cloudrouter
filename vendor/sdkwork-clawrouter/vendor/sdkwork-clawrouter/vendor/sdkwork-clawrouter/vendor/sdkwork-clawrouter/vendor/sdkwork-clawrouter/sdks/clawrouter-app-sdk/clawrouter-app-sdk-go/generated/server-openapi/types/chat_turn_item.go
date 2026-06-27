package types

// Chat turn item schema exposed by Claw Router.
type ChatTurnItem struct {
	AgentId string `json:"agentId"`
	AgentSessionId string `json:"agentSessionId"`
	ConversationId string `json:"conversationId"`
	CreatedAt string `json:"createdAt"`
	Id string `json:"id"`
	Model string `json:"model"`
	Provider string `json:"provider"`
	Status string `json:"status"`
	UpdatedAt string `json:"updatedAt"`
}
