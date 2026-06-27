package types

// Item module returned inside the listBatches list response.
type ListBatchesItem struct {
	Created int `json:"created"`
	CreatedAt int `json:"created_at"`
	Endpoint string `json:"endpoint"`
	ErrorFileId string `json:"error_file_id"`
	Id string `json:"id"`
	InputFileId string `json:"input_file_id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Object string `json:"object"`
	OutputFileId string `json:"output_file_id"`
	Status string `json:"status"`
}
