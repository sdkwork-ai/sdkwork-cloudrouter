package types

// Runtime event list response schema exposed by Claw Router.
type RuntimeEventListResponse struct {
	Items []RuntimeEventItem `json:"items"`
}
