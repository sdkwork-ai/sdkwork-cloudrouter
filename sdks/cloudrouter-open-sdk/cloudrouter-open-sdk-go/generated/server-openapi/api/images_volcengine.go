package api

import (
    sdktypes "github.com/sdkwork/cloudrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/cloudrouter-open-sdk/http"
)

type ImagesVolcengineApi struct {
    client *sdkhttp.Client
}

func NewImagesVolcengineApi(client *sdkhttp.Client) *ImagesVolcengineApi {
    return &ImagesVolcengineApi{client: client}
}

// Volcengine Ark image generation
func (a *ImagesVolcengineApi) CreateApiV3ImagesGeneration(body sdktypes.VolcengineImageGenerationRequest) (sdktypes.VolcengineImageGenerationResponse, error) {
    raw, err := a.client.Post("/volcengine/api/v3/images/generations", body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.VolcengineImageGenerationResponse
        return zero, err
    }
    return decodeResult[sdktypes.VolcengineImageGenerationResponse](raw)
}
