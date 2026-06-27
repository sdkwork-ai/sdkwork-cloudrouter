package types

// OpenAI-compatible request to update vector store file attributes.
type OpenAiVectorStoreFileUpdateRequest struct {
	Attributes map[string]ProviderJsonValue `json:"attributes"`
}
