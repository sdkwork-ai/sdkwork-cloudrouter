package types

// OpenAI-compatible open ai response format schema exposed by Claw Router.
type OpenAiResponseFormat struct {
	JsonSchema OpenAiJsonSchemaFormat `json:"json_schema"`
	Type string `json:"type"`
}
