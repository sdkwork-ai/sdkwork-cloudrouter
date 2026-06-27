package types

// Admin prompt create request schema exposed by Claw Router.
type AdminPromptCreateRequest struct {
	CategoryId string `json:"categoryId"`
	Description string `json:"description"`
	Name string `json:"name"`
	PromptKey string `json:"promptKey"`
	PromptType string `json:"promptType"`
	Tags []string `json:"tags"`
	Visibility string `json:"visibility"`
}
