package types

// Admin model vendors response schema exposed by Claw Router.
type AdminModelVendorsResponse struct {
	Items []AdminModelVendorItem `json:"items"`
}
