package types

// Turn responses create result schema exposed by Claw Router.
type TurnResponsesCreateResult struct {
	Code string `json:"code"`
	Data ChatTurnCreateResponse `json:"data"`
	Msg string `json:"msg"`
}
