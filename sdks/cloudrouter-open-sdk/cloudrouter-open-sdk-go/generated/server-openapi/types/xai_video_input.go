package types

// xAI video input for edit and extension requests; provide `url` or `file_id`.
type XaiVideoInput struct {
	FileId string `json:"file_id"`
	Url string `json:"url"`
}
