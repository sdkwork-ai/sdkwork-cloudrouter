package types

// OpenAI-compatible open ai text config schema exposed by Cloud Router.
type OpenAiTextConfig struct {
	Format OpenAiResponseFormat `json:"format"`
}
