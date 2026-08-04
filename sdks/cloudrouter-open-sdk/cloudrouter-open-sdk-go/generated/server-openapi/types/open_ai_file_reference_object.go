package types

// Structured file reference used when a JSON endpoint accepts uploaded, hosted, or inline file input.
type OpenAiFileReferenceObject struct {
	FileData string `json:"file_data"`
	FileId string `json:"file_id"`
	Filename string `json:"filename"`
	MimeType string `json:"mime_type"`
	Url string `json:"url"`
}
