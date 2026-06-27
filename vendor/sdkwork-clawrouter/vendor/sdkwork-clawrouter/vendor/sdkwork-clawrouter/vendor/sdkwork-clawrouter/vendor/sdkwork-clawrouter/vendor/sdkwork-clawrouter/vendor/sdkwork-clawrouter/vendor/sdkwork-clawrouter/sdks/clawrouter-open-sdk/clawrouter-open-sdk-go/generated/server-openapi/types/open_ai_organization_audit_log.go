package types

// OpenAI-compatible organization audit log event.
type OpenAiOrganizationAuditLog struct {
	Actor ProviderJsonValue `json:"actor"`
	ApiKeyId string `json:"api_key_id"`
	EffectiveAt int `json:"effective_at"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Object string `json:"object"`
	Project ProviderJsonValue `json:"project"`
	Request ProviderJsonValue `json:"request"`
	Type string `json:"type"`
}
