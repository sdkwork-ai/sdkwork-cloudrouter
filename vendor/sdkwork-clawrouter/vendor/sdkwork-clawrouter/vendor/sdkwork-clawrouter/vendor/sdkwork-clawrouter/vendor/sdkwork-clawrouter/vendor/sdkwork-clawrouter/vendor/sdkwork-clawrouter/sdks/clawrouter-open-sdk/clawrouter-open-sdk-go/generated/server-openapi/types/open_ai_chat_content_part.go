package types

// OpenAI-compatible open ai chat content part schema exposed by Claw Router.
type OpenAiChatContentPart struct {
	File OpenAiChatFile `json:"file"`
	ImageUrl OpenAiChatImageUrl `json:"image_url"`
	InputAudio OpenAiChatInputAudio `json:"input_audio"`
	Text string `json:"text"`
	Type string `json:"type"`
}
