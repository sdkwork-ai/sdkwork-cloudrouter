package types

// OpenAI-compatible multipart request to create a reusable video character.
type OpenAiVideoCharacterMultipartRequest struct {
	Description string `json:"description"`
	File string `json:"file"`
	Image string `json:"image"`
	Metadata string `json:"metadata"`
	Name string `json:"name"`
}
