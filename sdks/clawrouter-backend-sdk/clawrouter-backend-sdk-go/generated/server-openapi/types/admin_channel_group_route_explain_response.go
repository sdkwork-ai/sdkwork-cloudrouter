package types

// Admin channel group route explain response schema exposed by Claw Router.
type AdminChannelGroupRouteExplainResponse struct {
	ActiveHealthyBindingCount int `json:"activeHealthyBindingCount"`
	ApiScope []string `json:"apiScope"`
	Capabilities []string `json:"capabilities"`
	ConfiguredResourceAccessCount int `json:"configuredResourceAccessCount"`
	ConfiguredResourceGroupAccessCount int `json:"configuredResourceGroupAccessCount"`
	EffectiveResourceCodes []string `json:"effectiveResourceCodes"`
	IssueCodes []string `json:"issueCodes"`
	Issues []AdminChannelGroupRouteExplainIssue `json:"issues"`
	Ready bool `json:"ready"`
	ResourceCodes []string `json:"resourceCodes"`
	ResourceGroupCodes []string `json:"resourceGroupCodes"`
	RoutableBindingCount int `json:"routableBindingCount"`
	Source string `json:"source"`
}
