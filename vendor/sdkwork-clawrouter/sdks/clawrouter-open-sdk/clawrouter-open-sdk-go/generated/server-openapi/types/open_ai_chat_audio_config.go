package types

// OpenAI-compatible open ai chat audio config schema exposed by Claw Router.
type OpenAiChatAudioConfig struct {
	Format string `json:"format"`
	Voice string `json:"voice"`
}
