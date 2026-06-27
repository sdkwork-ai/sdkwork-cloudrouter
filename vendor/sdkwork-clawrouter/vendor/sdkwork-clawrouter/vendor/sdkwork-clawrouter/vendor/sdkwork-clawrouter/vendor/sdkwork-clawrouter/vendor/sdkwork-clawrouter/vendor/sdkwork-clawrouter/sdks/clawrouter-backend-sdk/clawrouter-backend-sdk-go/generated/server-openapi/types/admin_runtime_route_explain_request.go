package types

// Admin runtime route explain request schema exposed by Claw Router.
type AdminRuntimeRouteExplainRequest struct {
	ApiCode string `json:"apiCode"`
	ApiKeyId string `json:"apiKeyId"`
	BillingMeter string `json:"billingMeter"`
	Capability string `json:"capability"`
	CatalogKey string `json:"catalogKey"`
	ChannelGroupId string `json:"channelGroupId"`
	Model string `json:"model"`
	ResourceCode string `json:"resourceCode"`
	RouteKey string `json:"routeKey"`
}
