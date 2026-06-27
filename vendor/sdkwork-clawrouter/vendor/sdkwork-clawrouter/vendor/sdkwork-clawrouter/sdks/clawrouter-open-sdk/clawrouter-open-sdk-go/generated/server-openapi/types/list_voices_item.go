package types

// Item module returned inside the listVoices list response.
type ListVoicesItem struct {
	Created int `json:"created"`
	CreatedAt int `json:"created_at"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Object string `json:"object"`
	Status string `json:"status"`
	Text string `json:"text"`
	Url string `json:"url"`
	Voice string `json:"voice"`
}
