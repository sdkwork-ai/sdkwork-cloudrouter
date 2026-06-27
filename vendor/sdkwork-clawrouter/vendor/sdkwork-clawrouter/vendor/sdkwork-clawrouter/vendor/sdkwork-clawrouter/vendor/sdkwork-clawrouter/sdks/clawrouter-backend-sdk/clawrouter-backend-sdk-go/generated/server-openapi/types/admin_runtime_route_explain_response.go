package types

// Admin runtime route explain response schema exposed by Claw Router.
type AdminRuntimeRouteExplainResponse struct {
	ApiCode string `json:"apiCode"`
	ApiKeyId string `json:"apiKeyId"`
	BillingMeter string `json:"billingMeter"`
	BlockedReasons []AdminRuntimeRouteExplainIssue `json:"blockedReasons"`
	CandidateCount int `json:"candidateCount"`
	Capability string `json:"capability"`
	CatalogKey string `json:"catalogKey"`
	ChannelGroupId string `json:"channelGroupId"`
	GroupCode string `json:"groupCode"`
	Model string `json:"model"`
	PolicyId string `json:"policyId"`
	PolicySnapshotVersion string `json:"policySnapshotVersion"`
	PricingPlanCode string `json:"pricingPlanCode"`
	Ready bool `json:"ready"`
	ResourceCode string `json:"resourceCode"`
	RuleId string `json:"ruleId"`
	SelectedCandidates []AdminRuntimeRouteExplainCandidate `json:"selectedCandidates"`
	Source string `json:"source"`
	Warnings []AdminRuntimeRouteExplainIssue `json:"warnings"`
}
