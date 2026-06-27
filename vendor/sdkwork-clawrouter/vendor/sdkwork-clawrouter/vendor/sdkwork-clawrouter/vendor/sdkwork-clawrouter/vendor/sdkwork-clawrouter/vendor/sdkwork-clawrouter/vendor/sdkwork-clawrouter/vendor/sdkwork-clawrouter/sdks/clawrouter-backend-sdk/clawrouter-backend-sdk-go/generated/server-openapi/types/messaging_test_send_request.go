package types

// Messaging test send request schema exposed by Claw Router.
type MessagingTestSendRequest struct {
	Channel string `json:"channel"`
	CountryCode string `json:"countryCode"`
	DeliveryPurpose string `json:"deliveryPurpose"`
	DryRun bool `json:"dryRun"`
	Locale string `json:"locale"`
	SceneCode string `json:"sceneCode"`
	TargetHash string `json:"targetHash"`
	TargetMasked string `json:"targetMasked"`
	TemplateCode string `json:"templateCode"`
	UserSegment string `json:"userSegment"`
	Variables map[string]JsonValue `json:"variables"`
}
