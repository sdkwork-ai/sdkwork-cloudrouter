package types

// Media resource schema exposed by Claw Router.
type MediaResource struct {
	Access MediaAccess `json:"access"`
	Ai MediaAiProvenance `json:"ai"`
	AltText string `json:"altText"`
	BucketId string `json:"bucketId"`
	Checksum MediaChecksum `json:"checksum"`
	DurationSeconds float64 `json:"durationSeconds"`
	FileName string `json:"fileName"`
	Height int `json:"height"`
	Id string `json:"id"`
	Kind MediaKind `json:"kind"`
	Metadata map[string]JsonValue `json:"metadata"`
	MimeType string `json:"mimeType"`
	ObjectBlobId string `json:"objectBlobId"`
	ObjectKey string `json:"objectKey"`
	ObjectVersion string `json:"objectVersion"`
	Poster MediaResource `json:"poster"`
	PublicUrl string `json:"publicUrl"`
	SizeBytes string `json:"sizeBytes"`
	Source MediaSource `json:"source"`
	Thumbnails []MediaResource `json:"thumbnails"`
	Title string `json:"title"`
	Uri string `json:"uri"`
	Url string `json:"url"`
	Variants []MediaResource `json:"variants"`
	Width int `json:"width"`
}
