package types

// Reusable JSON Schema object used by provider tool definitions.
type ProviderJsonSchema struct {
	AdditionalProperties bool `json:"additionalProperties"`
	Description string `json:"description"`
	Enum []ProviderJsonValue `json:"enum"`
	Items interface{} `json:"items"`
	Properties map[string]interface{} `json:"properties"`
	Required []string `json:"required"`
	Type string `json:"type"`
}
