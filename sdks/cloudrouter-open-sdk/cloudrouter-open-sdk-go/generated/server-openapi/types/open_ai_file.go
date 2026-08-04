package types

// OpenAI-compatible file object.
type OpenAiFile struct {
	Bytes int `json:"bytes"`
	CreatedAt int `json:"created_at"`
	Filename string `json:"filename"`
	Id string `json:"id"`
	Object string `json:"object"`
	Purpose string `json:"purpose"`
	Status string `json:"status"`
	StatusDetails ProviderJsonValue `json:"status_details"`
}
