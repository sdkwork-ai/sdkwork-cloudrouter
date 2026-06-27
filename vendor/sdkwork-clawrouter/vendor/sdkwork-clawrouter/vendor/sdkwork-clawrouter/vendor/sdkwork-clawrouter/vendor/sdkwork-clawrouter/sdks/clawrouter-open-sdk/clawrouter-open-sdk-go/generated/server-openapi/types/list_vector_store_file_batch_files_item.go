package types

// Item module returned inside the listVectorStoreFileBatchFiles list response.
type ListVectorStoreFileBatchFilesItem struct {
	Created int `json:"created"`
	CreatedAt int `json:"created_at"`
	FileId string `json:"file_id"`
	FileIds []string `json:"file_ids"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
	Object string `json:"object"`
	Status string `json:"status"`
	UsageBytes int `json:"usage_bytes"`
}
