package types

// Admin api key create request schema exposed by Claw Router.
type AdminApiKeyCreateRequest struct {
	Name string `json:"name"`
	UserId string `json:"userId"`
}
