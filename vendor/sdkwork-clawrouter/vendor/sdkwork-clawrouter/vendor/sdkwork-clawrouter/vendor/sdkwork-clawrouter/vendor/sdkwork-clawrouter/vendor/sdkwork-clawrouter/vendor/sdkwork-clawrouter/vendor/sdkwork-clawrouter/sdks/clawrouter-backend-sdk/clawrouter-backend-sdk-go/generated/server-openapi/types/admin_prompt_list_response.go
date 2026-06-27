package types

// Admin prompt list response schema exposed by Claw Router.
type AdminPromptListResponse struct {
	Items []AdminPromptItem `json:"items"`
}
