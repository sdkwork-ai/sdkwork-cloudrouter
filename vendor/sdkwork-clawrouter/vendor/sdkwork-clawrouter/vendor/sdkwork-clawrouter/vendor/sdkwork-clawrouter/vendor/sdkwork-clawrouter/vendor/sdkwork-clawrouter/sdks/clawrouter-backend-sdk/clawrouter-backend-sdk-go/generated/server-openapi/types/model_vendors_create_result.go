package types

// Model vendors create result schema exposed by Claw Router.
type ModelVendorsCreateResult struct {
	Code string `json:"code"`
	Data AdminModelVendorMutationResponse `json:"data"`
	Msg string `json:"msg"`
}
