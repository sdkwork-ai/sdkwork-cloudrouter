package types

// An xAI image input: a public URL, a base64 data URL, or an xAI Files API id.
type XaiImageUrl struct {
	FileId string `json:"file_id"`
	Url string `json:"url"`
}
