package types

// An xAI video input or output reference. Provide `url` or `file_id` when used as an input.
type XaiVideoUrl struct {
	Duration int `json:"duration"`
	FileId string `json:"file_id"`
	Url string `json:"url"`
}
