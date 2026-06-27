package types

// Admin mcp server create request schema exposed by Claw Router.
type AdminMcpServerCreateRequest struct {
	CategoryId string `json:"categoryId"`
	Description string `json:"description"`
	Name string `json:"name"`
	ServerKey string `json:"serverKey"`
	Tags []string `json:"tags"`
	Transport string `json:"transport"`
	Visibility string `json:"visibility"`
}
