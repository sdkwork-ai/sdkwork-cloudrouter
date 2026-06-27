package types

// Admin channel group channel bindings replace request schema exposed by Claw Router.
type AdminChannelGroupChannelBindingsReplaceRequest struct {
	Items []AdminChannelGroupChannelBindingInput `json:"items"`
}
