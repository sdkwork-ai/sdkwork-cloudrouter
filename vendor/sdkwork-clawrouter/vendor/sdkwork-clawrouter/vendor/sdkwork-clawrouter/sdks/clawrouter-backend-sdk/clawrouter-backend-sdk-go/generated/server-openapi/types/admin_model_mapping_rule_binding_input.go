package types

// Admin model mapping rule binding input schema exposed by Claw Router.
type AdminModelMappingRuleBindingInput struct {
	BindingCode string `json:"bindingCode"`
	BindingId string `json:"bindingId"`
	BindingName string `json:"bindingName"`
	BindingType string `json:"bindingType"`
	Enabled bool `json:"enabled"`
	Id string `json:"id"`
}
