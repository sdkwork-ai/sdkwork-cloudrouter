package types

// OpenAI-compatible open ai chat input audio schema exposed by Claw Router.
type OpenAiChatInputAudio struct {
	Data string `json:"data"`
	Format string `json:"format"`
}
