package types

// Admin model vendor create request schema exposed by Claw Router.
type AdminModelVendorCreateRequest struct {
	Color string `json:"color"`
	Description string `json:"description"`
	Name string `json:"name"`
	Status string `json:"status"`
	VendorCode string `json:"vendorCode"`
}
