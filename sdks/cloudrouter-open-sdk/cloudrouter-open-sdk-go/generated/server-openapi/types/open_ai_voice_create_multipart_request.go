package types

// OpenAI-compatible multipart request to create a voice.
type OpenAiVoiceCreateMultipartRequest struct {
	File []byte `json:"file"`
	Model string `json:"model"`
	Name string `json:"name"`
	Prompt string `json:"prompt"`
	ScriptHint string `json:"script_hint"`
	Type string `json:"type"`
}
