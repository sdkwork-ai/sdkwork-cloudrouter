package types

// OpenAI-compatible open ai audio translation multipart request schema exposed by Claw Router.
type OpenAiAudioTranslationMultipartRequest struct {
	File OpenAiBinaryFilePart `json:"file"`
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	ResponseFormat string `json:"response_format"`
}
