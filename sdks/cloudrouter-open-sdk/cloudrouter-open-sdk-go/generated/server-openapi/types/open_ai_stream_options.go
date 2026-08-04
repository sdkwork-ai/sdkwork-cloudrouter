package types

// OpenAI-compatible open ai stream options schema exposed by Cloud Router.
type OpenAiStreamOptions struct {
	IncludeUsage bool `json:"include_usage"`
}
