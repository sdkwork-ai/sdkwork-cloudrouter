package types

// Model catalog page schema exposed by Claw Router.
type ModelCatalogPage struct {
	Groups []map[string]interface{} `json:"groups"`
	Items []map[string]JsonValue `json:"items"`
	PageInfo PageInfo `json:"pageInfo"`
}
