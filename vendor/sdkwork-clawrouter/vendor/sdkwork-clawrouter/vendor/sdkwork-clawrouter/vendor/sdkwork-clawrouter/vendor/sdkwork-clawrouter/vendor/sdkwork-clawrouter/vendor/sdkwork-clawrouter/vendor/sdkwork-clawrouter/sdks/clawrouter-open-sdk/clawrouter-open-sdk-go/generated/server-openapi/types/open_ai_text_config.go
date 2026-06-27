package types

// OpenAI-compatible open ai text config schema exposed by Claw Router.
type OpenAiTextConfig struct {
	Format OpenAiResponseFormat `json:"format"`
}
