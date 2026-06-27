package types

// Admin ai model update request schema exposed by Claw Router.
type AdminAiModelUpdateRequest struct {
	ApiFormat string `json:"apiFormat"`
	CapabilityIntro string `json:"capabilityIntro"`
	ContextTokens string `json:"contextTokens"`
	Description string `json:"description"`
	DisplayName string `json:"displayName"`
	InputModalities []string `json:"inputModalities"`
	Limitations []string `json:"limitations"`
	MaxOutputTokens string `json:"maxOutputTokens"`
	Modalities []string `json:"modalities"`
	Model string `json:"model"`
	OutputModalities []string `json:"outputModalities"`
	RegionPrices []AdminAiModelRegionPrice `json:"regionPrices"`
	ReleaseStage string `json:"releaseStage"`
	ReplacementModel string `json:"replacementModel"`
	RoutingState string `json:"routingState"`
	ShelfState string `json:"shelfState"`
	Status string `json:"status"`
	SupportedLanguages []string `json:"supportedLanguages"`
	SupportsJsonSchema bool `json:"supportsJsonSchema"`
	SupportsStreaming bool `json:"supportsStreaming"`
	SupportsTools bool `json:"supportsTools"`
	TrainingDataCutoff string `json:"trainingDataCutoff"`
	Type string `json:"type"`
	UseCases []string `json:"useCases"`
	VendorId string `json:"vendorId"`
}
