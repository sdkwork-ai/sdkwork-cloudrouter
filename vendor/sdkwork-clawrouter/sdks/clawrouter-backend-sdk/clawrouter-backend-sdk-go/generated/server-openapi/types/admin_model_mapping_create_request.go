package types

// Admin model mapping create request schema exposed by Claw Router.
type AdminModelMappingCreateRequest struct {
	Bindings []AdminModelMappingRuleBindingInput `json:"bindings"`
	Enabled bool `json:"enabled"`
	MappingItems []AdminModelMappingRuleItemInput `json:"mappingItems"`
	MappingMode string `json:"mappingMode"`
	MatchType string `json:"matchType"`
	SourceVendorCode string `json:"sourceVendorCode"`
	SourceVendorId string `json:"sourceVendorId"`
	TargetVendorCode string `json:"targetVendorCode"`
	TargetVendorId string `json:"targetVendorId"`
}
