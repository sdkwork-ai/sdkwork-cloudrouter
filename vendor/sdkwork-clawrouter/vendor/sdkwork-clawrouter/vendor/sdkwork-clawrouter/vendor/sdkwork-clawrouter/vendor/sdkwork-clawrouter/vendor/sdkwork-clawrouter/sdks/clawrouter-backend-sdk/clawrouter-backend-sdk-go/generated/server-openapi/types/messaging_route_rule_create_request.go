package types

// Messaging route rule create request schema exposed by Claw Router.
type MessagingRouteRuleCreateRequest struct {
	Channel string `json:"channel"`
	CountryCode string `json:"countryCode"`
	DeliveryPurpose string `json:"deliveryPurpose"`
	FailoverPolicy map[string]JsonValue `json:"failoverPolicy"`
	Locale string `json:"locale"`
	Priority int `json:"priority"`
	RuleCode string `json:"ruleCode"`
	SceneCode string `json:"sceneCode"`
	Targets []map[string]interface{} `json:"targets"`
	UserSegment string `json:"userSegment"`
}
