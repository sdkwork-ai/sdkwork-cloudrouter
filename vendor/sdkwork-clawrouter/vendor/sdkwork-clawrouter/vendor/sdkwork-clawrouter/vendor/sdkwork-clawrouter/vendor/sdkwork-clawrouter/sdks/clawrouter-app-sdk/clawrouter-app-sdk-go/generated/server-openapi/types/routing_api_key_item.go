package types

// Routing api key item schema exposed by Claw Router.
type RoutingApiKeyItem struct {
	CopyableKey string `json:"copyableKey"`
	CreatedAt string `json:"createdAt"`
	DisplayKey string `json:"displayKey"`
	Id string `json:"id"`
	Name string `json:"name"`
	Status string `json:"status"`
	TotalUsage string `json:"totalUsage"`
}
