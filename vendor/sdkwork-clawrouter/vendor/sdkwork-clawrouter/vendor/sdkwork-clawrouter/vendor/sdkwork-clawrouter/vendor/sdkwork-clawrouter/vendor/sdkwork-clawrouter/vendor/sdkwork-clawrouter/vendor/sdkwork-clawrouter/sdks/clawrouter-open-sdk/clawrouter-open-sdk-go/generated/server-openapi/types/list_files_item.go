package types

// Item module returned inside the listFiles list response.
type ListFilesItem struct {
	Bytes int `json:"bytes"`
	Created int `json:"created"`
	CreatedAt int `json:"created_at"`
	Filename string `json:"filename"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Object string `json:"object"`
	Purpose string `json:"purpose"`
	Status string `json:"status"`
}
