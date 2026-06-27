package types

// Item module returned inside the listSkills list response.
type ListSkillsItem struct {
	Created int `json:"created"`
	CreatedAt int `json:"created_at"`
	Description string `json:"description"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
	Object string `json:"object"`
	Status string `json:"status"`
	Version string `json:"version"`
}
