package types

// OpenAI-compatible open ai json schema format schema exposed by Claw Router.
type OpenAiJsonSchemaFormat struct {
	Description string `json:"description"`
	Name string `json:"name"`
	Schema OpenAiJsonSchema `json:"schema"`
	Strict bool `json:"strict"`
}
