package types

// Admin mcp server update request schema exposed by Claw Router.
type AdminMcpServerUpdateRequest struct {
	CategoryId string `json:"categoryId"`
	Description string `json:"description"`
	Name string `json:"name"`
	ServerKey string `json:"serverKey"`
	Status string `json:"status"`
	Tags []string `json:"tags"`
	Transport string `json:"transport"`
	Visibility string `json:"visibility"`
}
