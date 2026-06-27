package api

import (
    sdktypes "github.com/sdkwork/clawrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/clawrouter-open-sdk/http"
)

type ImagesApi struct {
    client *sdkhttp.Client
}

func NewImagesApi(client *sdkhttp.Client) *ImagesApi {
    return &ImagesApi{client: client}
}

// Create image edit
func (a *ImagesApi) CreateEdit(body sdktypes.OpenAiImageEditRequest) (sdktypes.OpenAiImageList, error) {
    raw, err := a.client.Post(AiApiPath("/images/edits"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiImageList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiImageList](raw)
}

// Create image
func (a *ImagesApi) CreateGeneration(body sdktypes.OpenAiImageGenerationRequest) (sdktypes.OpenAiImageList, error) {
    raw, err := a.client.Post(AiApiPath("/images/generations"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiImageList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiImageList](raw)
}

// Create image variation
func (a *ImagesApi) CreateVariation(body sdktypes.OpenAiImageVariationRequest) (sdktypes.OpenAiImageList, error) {
    raw, err := a.client.Post(AiApiPath("/images/variations"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.OpenAiImageList
        return zero, err
    }
    return decodeResult[sdktypes.OpenAiImageList](raw)
}
