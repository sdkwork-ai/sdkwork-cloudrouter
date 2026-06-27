package types

// Admin model mapping rule schema exposed by Claw Router.
type AdminModelMappingRule struct {
	BindingType string `json:"bindingType"`
	Bindings []AdminModelMappingRuleBinding `json:"bindings"`
	CreatedAt string `json:"createdAt"`
	Enabled bool `json:"enabled"`
	Id string `json:"id"`
	MappingItems []AdminModelMappingRuleItem `json:"mappingItems"`
	MappingMode string `json:"mappingMode"`
	MatchType string `json:"matchType"`
	SourceVendorCode string `json:"sourceVendorCode"`
	SourceVendorId string `json:"sourceVendorId"`
	TargetVendorCode string `json:"targetVendorCode"`
	TargetVendorId string `json:"targetVendorId"`
	UpdatedAt string `json:"updatedAt"`
}
