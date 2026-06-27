package types

// Messaging route simulation request schema exposed by Claw Router.
type MessagingRouteSimulationRequest struct {
	Channel string `json:"channel"`
	CountryCode string `json:"countryCode"`
	DeliveryPurpose string `json:"deliveryPurpose"`
	Locale string `json:"locale"`
	SceneCode string `json:"sceneCode"`
	UserSegment string `json:"userSegment"`
}
