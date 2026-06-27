package types

// Admin model mappings response schema exposed by Claw Router.
type AdminModelMappingsResponse struct {
	Items []AdminModelMappingRule `json:"items"`
}
