package types

// OpenAI-compatible open ai audio translation request schema exposed by Claw Router.
type OpenAiAudioTranslationRequest struct {
	File OpenAiFileReferenceInput `json:"file"`
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	ResponseFormat string `json:"response_format"`
}
