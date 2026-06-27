package types

// OpenAI-compatible open ai audio transcription multipart request schema exposed by Claw Router.
type OpenAiAudioTranscriptionMultipartRequest struct {
	File OpenAiBinaryFilePart `json:"file"`
	Language string `json:"language"`
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	ResponseFormat string `json:"response_format"`
}
