package types

// Item module returned inside the listContainerFiles list response.
type ListContainerFilesItem struct {
	Bytes int `json:"bytes"`
	Created int `json:"created"`
	CreatedAt int `json:"created_at"`
	Filename string `json:"filename"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
	Object string `json:"object"`
	Status string `json:"status"`
}
