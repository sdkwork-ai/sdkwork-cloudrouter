package types

// OpenAI-compatible open ai json schema schema exposed by Claw Router.
type OpenAiJsonSchema struct {
	AdditionalProperties OpenAiJsonSchemaAdditionalProperties `json:"additionalProperties"`
	Description string `json:"description"`
	Enum []ProviderJsonValue `json:"enum"`
	Items interface{} `json:"items"`
	Properties map[string]interface{} `json:"properties"`
	Required []string `json:"required"`
	Type string `json:"type"`
}
