package types

// OpenAI-compatible open ai chat input audio schema exposed by Cloud Router.
type OpenAiChatInputAudio struct {
	Data string `json:"data"`
	Format string `json:"format"`
}
