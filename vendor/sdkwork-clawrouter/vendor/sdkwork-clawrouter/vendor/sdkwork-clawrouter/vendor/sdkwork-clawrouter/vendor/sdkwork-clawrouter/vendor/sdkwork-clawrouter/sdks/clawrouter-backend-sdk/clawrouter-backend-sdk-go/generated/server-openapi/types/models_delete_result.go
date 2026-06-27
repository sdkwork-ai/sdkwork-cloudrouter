package types

// Models delete result schema exposed by Claw Router.
type ModelsDeleteResult struct {
	Code string `json:"code"`
	Data AdminDeleteResponse `json:"data"`
	Msg string `json:"msg"`
}
