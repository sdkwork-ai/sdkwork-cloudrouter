package types

// Messaging collection response schema exposed by Claw Router.
type MessagingCollectionResponse struct {
	Items []map[string]JsonValue `json:"items"`
	Page string `json:"page"`
	PageSize string `json:"pageSize"`
	Total string `json:"total"`
}
