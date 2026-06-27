package types

// Admin prompt binding create request schema exposed by Claw Router.
type AdminPromptBindingCreateRequest struct {
	BindingRole string `json:"bindingRole"`
	Enabled bool `json:"enabled"`
	OwnerId string `json:"ownerId"`
	OwnerType string `json:"ownerType"`
	PolicyJson map[string]JsonValue `json:"policyJson"`
	Priority int `json:"priority"`
	PromptVersionId string `json:"promptVersionId"`
}
