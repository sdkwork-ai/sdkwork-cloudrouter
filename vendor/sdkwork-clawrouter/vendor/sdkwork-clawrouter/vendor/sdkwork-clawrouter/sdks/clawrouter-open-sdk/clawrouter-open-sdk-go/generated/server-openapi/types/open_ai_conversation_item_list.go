package types

// OpenAI-compatible open ai conversation item list schema exposed by Claw Router.
type OpenAiConversationItemList struct {
	Data []OpenAiConversationItem `json:"data"`
	FirstId string `json:"first_id"`
	HasMore bool `json:"has_more"`
	LastId string `json:"last_id"`
	Object string `json:"object"`
}
