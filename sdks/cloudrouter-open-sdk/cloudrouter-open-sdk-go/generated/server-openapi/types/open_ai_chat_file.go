package types

// OpenAI-compatible open ai chat file schema exposed by Cloud Router.
type OpenAiChatFile struct {
	FileData string `json:"file_data"`
	FileId string `json:"file_id"`
	Filename string `json:"filename"`
}
