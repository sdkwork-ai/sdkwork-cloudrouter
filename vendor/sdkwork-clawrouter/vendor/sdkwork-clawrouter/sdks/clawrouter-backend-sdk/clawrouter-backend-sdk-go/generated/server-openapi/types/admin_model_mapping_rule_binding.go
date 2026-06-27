package types

// Admin model mapping rule binding schema exposed by Claw Router.
type AdminModelMappingRuleBinding struct {
	BindingCode string `json:"bindingCode"`
	BindingId string `json:"bindingId"`
	BindingName string `json:"bindingName"`
	BindingType string `json:"bindingType"`
	CreatedAt string `json:"createdAt"`
	Enabled bool `json:"enabled"`
	Id string `json:"id"`
	SortOrder string `json:"sortOrder"`
	UpdatedAt string `json:"updatedAt"`
}
