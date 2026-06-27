package types

// OpenAI-compatible open ai stream options schema exposed by Claw Router.
type OpenAiStreamOptions struct {
	IncludeUsage bool `json:"include_usage"`
}
