package types

// Structured image reference used when JSON image APIs accept URL, file id, inline, or provider-specific image input.
type OpenAiImageReferenceObject struct {
	B64Json string `json:"b64_json"`
	Detail string `json:"detail"`
	FileId string `json:"file_id"`
	MimeType string `json:"mime_type"`
	Url string `json:"url"`
}
