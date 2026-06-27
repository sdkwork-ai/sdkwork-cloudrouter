package types

// OpenAI-compatible upload part object.
type OpenAiUploadPart struct {
	CreatedAt int `json:"created_at"`
	Id string `json:"id"`
	Object string `json:"object"`
	UploadId string `json:"upload_id"`
}
