package types

// OpenAI-compatible multipart request to create a skill.
type OpenAiSkillCreateMultipartRequest struct {
	File string `json:"file"`
	Metadata string `json:"metadata"`
	Name string `json:"name"`
	Package string `json:"package"`
}
