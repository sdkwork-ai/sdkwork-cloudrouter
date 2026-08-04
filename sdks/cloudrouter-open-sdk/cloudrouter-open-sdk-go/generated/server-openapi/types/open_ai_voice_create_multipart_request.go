package types

// OpenAI-compatible multipart request to create a voice.
type OpenAiVoiceCreateMultipartRequest struct {
	Description string `json:"description"`
	File string `json:"file"`
	Metadata string `json:"metadata"`
	Name string `json:"name"`
}
