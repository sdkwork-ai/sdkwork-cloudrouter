package types

// Admin prompt version list response schema exposed by Claw Router.
type AdminPromptVersionListResponse struct {
	Items []AdminPromptVersionItem `json:"items"`
}
