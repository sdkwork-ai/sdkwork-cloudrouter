package types

// OpenAI-compatible open ai function definition schema exposed by Claw Router.
type OpenAiFunctionDefinition struct {
	Description string `json:"description"`
	Name string `json:"name"`
	Parameters OpenAiJsonSchema `json:"parameters"`
	Strict bool `json:"strict"`
}
