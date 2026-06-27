package types

// Item module returned inside the listVideos list response.
type ListVideosItem struct {
	Created int `json:"created"`
	CreatedAt int `json:"created_at"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Model string `json:"model"`
	Object string `json:"object"`
	Status string `json:"status"`
	Url string `json:"url"`
	Video ProviderJsonValue `json:"video"`
}
