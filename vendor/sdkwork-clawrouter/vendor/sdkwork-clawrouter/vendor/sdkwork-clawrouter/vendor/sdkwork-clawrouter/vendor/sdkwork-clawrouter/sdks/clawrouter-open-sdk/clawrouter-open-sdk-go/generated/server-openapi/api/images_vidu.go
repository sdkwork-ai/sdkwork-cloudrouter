package api

import (
    sdktypes "github.com/sdkwork/clawrouter-open-sdk/types"
    sdkhttp "github.com/sdkwork/clawrouter-open-sdk/http"
)

type ImagesViduApi struct {
    client *sdkhttp.Client
}

func NewImagesViduApi(client *sdkhttp.Client) *ImagesViduApi {
    return &ImagesViduApi{client: client}
}

// Vidu reference to image
func (a *ImagesViduApi) CreateEntV2Reference2image(body sdktypes.ViduReferenceToImageRequest) (sdktypes.ViduImageGenerationTask, error) {
    raw, err := a.client.Post(AiApiPath("/vidu/ent/v2/reference2image"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.ViduImageGenerationTask
        return zero, err
    }
    return decodeResult[sdktypes.ViduImageGenerationTask](raw)
}
