package types

// Chat turn create response schema exposed by Claw Router.
type ChatTurnCreateResponse struct {
	Messages []ChatMessageItem `json:"messages"`
	Turn ChatTurnItem `json:"turn"`
}
