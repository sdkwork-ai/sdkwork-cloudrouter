package types

// OpenAI-compatible request to add items to a conversation (`POST /v1/conversations/{conversation_id}/items`).
type OpenAiConversationItemCreateRequest struct {
	Items []map[string]ProviderJsonValue `json:"items"`
}
