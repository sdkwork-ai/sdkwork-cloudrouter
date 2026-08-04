package types

// OpenAI-compatible image output object.
type OpenAiImage struct {
	B64Json string `json:"b64_json"`
	MimeType string `json:"mime_type"`
	RevisedPrompt string `json:"revised_prompt"`
	Url string `json:"url"`
}
