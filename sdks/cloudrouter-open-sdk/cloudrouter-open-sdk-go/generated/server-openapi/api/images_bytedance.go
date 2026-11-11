package api

import (
    sdktypes "github.com/sdkwork/cloudrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/cloudrouter-open-sdk/http"
)

type ImagesBytedanceApi struct {
    client *sdkhttp.Client
}

func NewImagesBytedanceApi(client *sdkhttp.Client) *ImagesBytedanceApi {
    return &ImagesBytedanceApi{client: client}
}

// ByteDance Seedream image generation
func (a *ImagesBytedanceApi) CreateApiV3ImagesGeneration(body sdktypes.BytedanceImageGenerationRequest) (sdktypes.BytedanceImageGenerationResponse, error) {
    raw, err := a.client.Post("/bytedance/api/v3/images/generations", body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.BytedanceImageGenerationResponse
        return zero, err
    }
    return decodeResult[sdktypes.BytedanceImageGenerationResponse](raw)
}
