package types

// OpenAI-compatible upload object.
type OpenAiUpload struct {
	Bytes int `json:"bytes"`
	CreatedAt int `json:"created_at"`
	ExpiresAt int `json:"expires_at"`
	File OpenAiFile `json:"file"`
	Filename string `json:"filename"`
	Id string `json:"id"`
	Object string `json:"object"`
	Purpose string `json:"purpose"`
	Status string `json:"status"`
}
