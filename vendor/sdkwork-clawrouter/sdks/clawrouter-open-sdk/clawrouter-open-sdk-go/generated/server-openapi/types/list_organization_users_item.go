package types

// Item module returned inside the listOrganizationUsers list response.
type ListOrganizationUsersItem struct {
	Created int `json:"created"`
	CreatedAt int `json:"created_at"`
	Email string `json:"email"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
	Object string `json:"object"`
	ProjectId string `json:"project_id"`
	Role string `json:"role"`
	Status string `json:"status"`
}
