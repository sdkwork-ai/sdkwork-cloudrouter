package types

// Admin prompt binding list response schema exposed by Claw Router.
type AdminPromptBindingListResponse struct {
	Items []AdminPromptBindingItem `json:"items"`
}
