package types

// OpenAI-compatible vector store file batch object.
type OpenAiVectorStoreFileBatch struct {
	CreatedAt int `json:"created_at"`
	FileCounts OpenAiVectorStoreFileCounts `json:"file_counts"`
	Id string `json:"id"`
	Object string `json:"object"`
	Status string `json:"status"`
	VectorStoreId string `json:"vector_store_id"`
}
