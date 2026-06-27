package types

// Admin channel group channel bindings response schema exposed by Claw Router.
type AdminChannelGroupChannelBindingsResponse struct {
	Items []AdminChannelGroupChannelBindingItem `json:"items"`
}
