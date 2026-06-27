package types

// Templates list result schema exposed by Claw Router.
type TemplatesListResult struct {
	Code string `json:"code"`
	Data MessagingCollectionResponse `json:"data"`
	Msg string `json:"msg"`
}
