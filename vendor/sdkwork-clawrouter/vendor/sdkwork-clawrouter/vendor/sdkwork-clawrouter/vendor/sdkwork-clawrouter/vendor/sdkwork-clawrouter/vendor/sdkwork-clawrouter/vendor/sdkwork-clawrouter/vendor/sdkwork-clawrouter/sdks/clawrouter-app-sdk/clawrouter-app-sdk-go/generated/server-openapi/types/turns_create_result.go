package types

// Turns create result schema exposed by Claw Router.
type TurnsCreateResult struct {
	Code string `json:"code"`
	Data ChatTurnCreateResponse `json:"data"`
	Msg string `json:"msg"`
}
