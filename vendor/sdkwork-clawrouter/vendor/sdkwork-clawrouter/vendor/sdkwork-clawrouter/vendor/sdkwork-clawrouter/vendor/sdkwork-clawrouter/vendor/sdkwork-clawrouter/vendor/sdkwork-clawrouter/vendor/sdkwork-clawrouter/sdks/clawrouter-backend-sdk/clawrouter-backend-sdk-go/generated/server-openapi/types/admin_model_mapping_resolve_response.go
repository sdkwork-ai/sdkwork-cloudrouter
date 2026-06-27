package types

// Admin model mapping resolve response schema exposed by Claw Router.
type AdminModelMappingResolveResponse struct {
	Matched bool `json:"matched"`
	MatchedBindingType string `json:"matchedBindingType"`
	Rule AdminModelMappingRule `json:"rule"`
	SourceModel string `json:"sourceModel"`
	TargetCatalogKey string `json:"targetCatalogKey"`
	TargetModel string `json:"targetModel"`
	TargetProviderModel string `json:"targetProviderModel"`
	TargetProviderNativeModel string `json:"targetProviderNativeModel"`
	TargetVendorCode string `json:"targetVendorCode"`
}
