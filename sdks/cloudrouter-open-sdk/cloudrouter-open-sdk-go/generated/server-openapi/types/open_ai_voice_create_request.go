package types

// OpenAI-compatible request to create a voice from a prompt.
type OpenAiVoiceCreateRequest struct {
	Model string `json:"model"`
	Name string `json:"name"`
	Prompt string `json:"prompt"`
	ScriptHint string `json:"script_hint"`
	Type string `json:"type"`
}
