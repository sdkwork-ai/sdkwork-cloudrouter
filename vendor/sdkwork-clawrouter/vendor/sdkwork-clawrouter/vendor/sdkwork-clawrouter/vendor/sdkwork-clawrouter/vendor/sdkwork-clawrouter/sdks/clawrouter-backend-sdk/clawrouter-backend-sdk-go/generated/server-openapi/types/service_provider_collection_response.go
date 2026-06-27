package types

// Service provider collection response schema exposed by Claw Router.
type ServiceProviderCollectionResponse struct {
	Items []map[string]JsonValue `json:"items"`
	Page string `json:"page"`
	PageSize string `json:"pageSize"`
	Total string `json:"total"`
}
