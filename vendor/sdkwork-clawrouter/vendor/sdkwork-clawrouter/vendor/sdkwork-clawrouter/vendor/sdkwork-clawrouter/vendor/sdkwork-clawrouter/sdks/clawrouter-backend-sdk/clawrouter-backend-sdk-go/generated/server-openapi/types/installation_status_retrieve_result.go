package types

// Installation status retrieve result schema exposed by Claw Router.
type InstallationStatusRetrieveResult struct {
	Code string `json:"code"`
	Data InstallationStatusResponse `json:"data"`
	Msg string `json:"msg"`
}
