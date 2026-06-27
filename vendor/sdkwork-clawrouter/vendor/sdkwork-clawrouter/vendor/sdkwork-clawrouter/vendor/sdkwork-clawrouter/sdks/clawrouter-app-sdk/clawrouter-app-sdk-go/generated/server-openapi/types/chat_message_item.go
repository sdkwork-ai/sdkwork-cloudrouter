package types

// Chat message item schema exposed by Claw Router.
type ChatMessageItem struct {
	Content string `json:"content"`
	ConversationId string `json:"conversationId"`
	CreatedAt string `json:"createdAt"`
	Direction string `json:"direction"`
	Id string `json:"id"`
	Model string `json:"model"`
	Provider string `json:"provider"`
	Role string `json:"role"`
	Runtime string `json:"runtime"`
	RuntimeInvocationId string `json:"runtimeInvocationId"`
	Status string `json:"status"`
	TurnId string `json:"turnId"`
	Usage map[string]interface{} `json:"usage"`
	UsageLinkId string `json:"usageLinkId"`
}
