package types

// OpenAI-compatible open ai audio transcription request schema exposed by Claw Router.
type OpenAiAudioTranscriptionRequest struct {
	File OpenAiFileReferenceInput `json:"file"`
	Language string `json:"language"`
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	ResponseFormat string `json:"response_format"`
}
