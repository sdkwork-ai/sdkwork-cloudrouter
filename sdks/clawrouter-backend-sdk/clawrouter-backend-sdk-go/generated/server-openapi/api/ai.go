package api

import (
    "encoding/json"
    "fmt"
    "net/url"
    "strings"
    sdktypes "github.com/sdkwork/clawrouter-backend-sdk/types"
    sdkhttp "github.com/sdkwork/clawrouter-backend-sdk/http"
)

type AiApi struct {
    client *sdkhttp.Client
}

func NewAiApi(client *sdkhttp.Client) *AiApi {
    return &AiApi{client: client}
}

// List
func (a *AiApi) ChannelGroupsList() (sdktypes.ChannelGroupsListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/ai/channel_groups"), nil, nil)
    if err != nil {
        var zero sdktypes.ChannelGroupsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ChannelGroupsListResult](raw)
}

// Create
func (a *AiApi) ChannelGroupsCreate() (sdktypes.ChannelGroupsCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/ai/channel_groups"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ChannelGroupsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ChannelGroupsCreateResult](raw)
}

// Delete
func (a *AiApi) ChannelGroupsDelete(channelGroupId string) (sdktypes.ChannelGroupsDeleteResult, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/ai/channel_groups/%s", SerializePathParameter(channelGroupId, PathParameterSpec{Name: "channelGroupId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ChannelGroupsDeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.ChannelGroupsDeleteResult](raw)
}

// Update
func (a *AiApi) ChannelGroupsUpdate(channelGroupId string) (sdktypes.ChannelGroupsUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/ai/channel_groups/%s", SerializePathParameter(channelGroupId, PathParameterSpec{Name: "channelGroupId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ChannelGroupsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ChannelGroupsUpdateResult](raw)
}

// List
func (a *AiApi) ChannelGroupsBindingsList(channelGroupId string) (sdktypes.ChannelGroupsChannelBindingsListResult, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/ai/channel_groups/%s/channel_bindings", SerializePathParameter(channelGroupId, PathParameterSpec{Name: "channelGroupId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ChannelGroupsChannelBindingsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ChannelGroupsChannelBindingsListResult](raw)
}

// Update
func (a *AiApi) ChannelGroupsBindingsUpdate(channelGroupId string) (sdktypes.ChannelGroupsChannelBindingsUpdateResult, error) {
    raw, err := a.client.Put(BackendApiPath(fmt.Sprintf("/ai/channel_groups/%s/channel_bindings", SerializePathParameter(channelGroupId, PathParameterSpec{Name: "channelGroupId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ChannelGroupsChannelBindingsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ChannelGroupsChannelBindingsUpdateResult](raw)
}

// Retrieve
func (a *AiApi) ChannelGroupsRouteExplainRetrieve(channelGroupId string) (sdktypes.ChannelGroupsRouteExplainRetrieveResult, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/ai/channel_groups/%s/route_explain", SerializePathParameter(channelGroupId, PathParameterSpec{Name: "channelGroupId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ChannelGroupsRouteExplainRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.ChannelGroupsRouteExplainRetrieveResult](raw)
}

// List
func (a *AiApi) ModelMappingOptionsList() (sdktypes.ModelMappingOptionsListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/ai/model_mapping_options"), nil, nil)
    if err != nil {
        var zero sdktypes.ModelMappingOptionsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ModelMappingOptionsListResult](raw)
}

// List
func (a *AiApi) ModelMappingsList() (sdktypes.ModelMappingsListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/ai/model_mappings"), nil, nil)
    if err != nil {
        var zero sdktypes.ModelMappingsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ModelMappingsListResult](raw)
}

// Create
func (a *AiApi) ModelMappingsCreate() (sdktypes.ModelMappingsCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/ai/model_mappings"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ModelMappingsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ModelMappingsCreateResult](raw)
}

// Replace
func (a *AiApi) ModelMappingsReplace() (sdktypes.ModelMappingsReplaceResult, error) {
    raw, err := a.client.Put(BackendApiPath("/ai/model_mappings"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ModelMappingsReplaceResult
        return zero, err
    }
    return decodeResult[sdktypes.ModelMappingsReplaceResult](raw)
}

// Create
func (a *AiApi) ModelMappingsResolveCreate() (sdktypes.ModelMappingsResolveCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/ai/model_mappings/resolve"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ModelMappingsResolveCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ModelMappingsResolveCreateResult](raw)
}

// Delete
func (a *AiApi) ModelMappingsDelete(mappingId string) (sdktypes.ModelMappingsDeleteResult, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/ai/model_mappings/%s", SerializePathParameter(mappingId, PathParameterSpec{Name: "mappingId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ModelMappingsDeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.ModelMappingsDeleteResult](raw)
}

// Update
func (a *AiApi) ModelMappingsUpdate(mappingId string) (sdktypes.ModelMappingsUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/ai/model_mappings/%s", SerializePathParameter(mappingId, PathParameterSpec{Name: "mappingId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ModelMappingsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ModelMappingsUpdateResult](raw)
}

// List
func (a *AiApi) ModelRankingsList(rankScope *string, vendorCode *string, modality *string, q *string, pageSize *int) (sdktypes.ModelRankingsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "rank_scope", Value: func() interface{} { if rankScope == nil { return nil }; return *rankScope }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "vendor_code", Value: func() interface{} { if vendorCode == nil { return nil }; return *vendorCode }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "modality", Value: func() interface{} { if modality == nil { return nil }; return *modality }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/ai/model_rankings"), query), nil, nil)
    if err != nil {
        var zero sdktypes.ModelRankingsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ModelRankingsListResult](raw)
}

// List
func (a *AiApi) ModelRankingsJobsList(rankScope *string, pageSize *int) (sdktypes.ModelRankingsJobsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "rank_scope", Value: func() interface{} { if rankScope == nil { return nil }; return *rankScope }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/ai/model_rankings/jobs"), query), nil, nil)
    if err != nil {
        var zero sdktypes.ModelRankingsJobsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ModelRankingsJobsListResult](raw)
}

// Refresh
func (a *AiApi) ModelRankingsRefresh() (sdktypes.ModelRankingsRefreshResult, error) {
    raw, err := a.client.Post(BackendApiPath("/ai/model_rankings/refresh"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ModelRankingsRefreshResult
        return zero, err
    }
    return decodeResult[sdktypes.ModelRankingsRefreshResult](raw)
}

// Retrieve
func (a *AiApi) ModelRankingsStatusRetrieve(page *int, pageSize *int, q *string, billingMeter *string, vendorCodes []string, modalities []string, capabilities []string, categories []string, groups []string) (sdktypes.ModelRankingsStatusRetrieveResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "billing_meter", Value: func() interface{} { if billingMeter == nil { return nil }; return *billingMeter }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "vendor_codes", Value: func() interface{} { if vendorCodes == nil { return nil }; return *vendorCodes }(), Style: "form", Explode: false, AllowReserved: false},
        {Name: "modalities", Value: func() interface{} { if modalities == nil { return nil }; return *modalities }(), Style: "form", Explode: false, AllowReserved: false},
        {Name: "capabilities", Value: func() interface{} { if capabilities == nil { return nil }; return *capabilities }(), Style: "form", Explode: false, AllowReserved: false},
        {Name: "categories", Value: func() interface{} { if categories == nil { return nil }; return *categories }(), Style: "form", Explode: false, AllowReserved: false},
        {Name: "groups", Value: func() interface{} { if groups == nil { return nil }; return *groups }(), Style: "form", Explode: false, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/ai/model_rankings/status"), query), nil, nil)
    if err != nil {
        var zero sdktypes.ModelRankingsStatusRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.ModelRankingsStatusRetrieveResult](raw)
}

// List
func (a *AiApi) ModelVendorsList() (sdktypes.ModelVendorsListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/ai/model_vendors"), nil, nil)
    if err != nil {
        var zero sdktypes.ModelVendorsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ModelVendorsListResult](raw)
}

// Create
func (a *AiApi) ModelVendorsCreate() (sdktypes.ModelVendorsCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/ai/model_vendors"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ModelVendorsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ModelVendorsCreateResult](raw)
}

// List
func (a *AiApi) ModelsList(page *int, pageSize *int, q *string, billingMeter *string, vendorCodes []string, modalities []string, capabilities []string, categories []string, groups []string) (sdktypes.ModelsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "billing_meter", Value: func() interface{} { if billingMeter == nil { return nil }; return *billingMeter }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "vendor_codes", Value: func() interface{} { if vendorCodes == nil { return nil }; return *vendorCodes }(), Style: "form", Explode: false, AllowReserved: false},
        {Name: "modalities", Value: func() interface{} { if modalities == nil { return nil }; return *modalities }(), Style: "form", Explode: false, AllowReserved: false},
        {Name: "capabilities", Value: func() interface{} { if capabilities == nil { return nil }; return *capabilities }(), Style: "form", Explode: false, AllowReserved: false},
        {Name: "categories", Value: func() interface{} { if categories == nil { return nil }; return *categories }(), Style: "form", Explode: false, AllowReserved: false},
        {Name: "groups", Value: func() interface{} { if groups == nil { return nil }; return *groups }(), Style: "form", Explode: false, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/ai/models"), query), nil, nil)
    if err != nil {
        var zero sdktypes.ModelsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ModelsListResult](raw)
}

// Create
func (a *AiApi) ModelsCreate() (sdktypes.ModelsCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/ai/models"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ModelsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ModelsCreateResult](raw)
}

// Refresh
func (a *AiApi) ModelsRefresh() (sdktypes.ModelsRefreshResult, error) {
    raw, err := a.client.Post(BackendApiPath("/ai/models/refresh"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ModelsRefreshResult
        return zero, err
    }
    return decodeResult[sdktypes.ModelsRefreshResult](raw)
}

// Delete
func (a *AiApi) ModelsDelete(modelId string) (sdktypes.ModelsDeleteResult, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/ai/models/%s", SerializePathParameter(modelId, PathParameterSpec{Name: "modelId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ModelsDeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.ModelsDeleteResult](raw)
}

// Update
func (a *AiApi) ModelsUpdate(modelId string) (sdktypes.ModelsUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/ai/models/%s", SerializePathParameter(modelId, PathParameterSpec{Name: "modelId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ModelsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ModelsUpdateResult](raw)
}

// List
func (a *AiApi) GetResourceGroupsList() (sdktypes.AiResourceGroupsListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/ai/resource_groups"), nil, nil)
    if err != nil {
        var zero sdktypes.AiResourceGroupsListResult
        return zero, err
    }
    return decodeResult[sdktypes.AiResourceGroupsListResult](raw)
}

// Create
func (a *AiApi) ResourceGroupsCreate() (sdktypes.AiResourceGroupsCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/ai/resource_groups"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.AiResourceGroupsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.AiResourceGroupsCreateResult](raw)
}

// List
func (a *AiApi) GetResourceGroupsListResourceGroups(groupIdOrCode string) (sdktypes.AiResourceGroupsResourcesListResult, error) {
    raw, err := a.client.Get(BackendApiPath(fmt.Sprintf("/ai/resource_groups/%s/resources", SerializePathParameter(groupIdOrCode, PathParameterSpec{Name: "groupIdOrCode", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.AiResourceGroupsResourcesListResult
        return zero, err
    }
    return decodeResult[sdktypes.AiResourceGroupsResourcesListResult](raw)
}

// Delete
func (a *AiApi) ResourceGroupsDelete(groupId string) (sdktypes.AiResourceGroupsDeleteResult, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/ai/resource_groups/%s", SerializePathParameter(groupId, PathParameterSpec{Name: "groupId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.AiResourceGroupsDeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.AiResourceGroupsDeleteResult](raw)
}

// Update
func (a *AiApi) ResourceGroupsUpdate(groupId string) (sdktypes.AiResourceGroupsUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/ai/resource_groups/%s", SerializePathParameter(groupId, PathParameterSpec{Name: "groupId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.AiResourceGroupsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.AiResourceGroupsUpdateResult](raw)
}

// List
func (a *AiApi) ResourcesList() (sdktypes.AiResourcesListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/ai/resources"), nil, nil)
    if err != nil {
        var zero sdktypes.AiResourcesListResult
        return zero, err
    }
    return decodeResult[sdktypes.AiResourcesListResult](raw)
}

// Create
func (a *AiApi) ResourcesCreate() (sdktypes.AiResourcesCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/ai/resources"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.AiResourcesCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.AiResourcesCreateResult](raw)
}

// Update
func (a *AiApi) ResourcesUpdate(resourceId string) (sdktypes.AiResourcesUpdateResult, error) {
    raw, err := a.client.Put(BackendApiPath(fmt.Sprintf("/ai/resources/%s", SerializePathParameter(resourceId, PathParameterSpec{Name: "resourceId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.AiResourcesUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.AiResourcesUpdateResult](raw)
}

// Create
func (a *AiApi) RouteExplainCreate() (sdktypes.RouteExplainCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/ai/route_explain"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.RouteExplainCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.RouteExplainCreateResult](raw)
}

type PathParameterSpec struct {
    Name    string
    Style   string
    Explode bool
}

func SerializePathParameter(value interface{}, spec PathParameterSpec) string {
    if value == nil {
        return ""
    }
    style := spec.Style
    if style == "" {
        style = "simple"
    }

    switch typed := value.(type) {
    case []string:
        return SerializePathArray(spec.Name, stringSliceToInterface(typed), style, spec.Explode)
    case []int:
        return SerializePathArray(spec.Name, intSliceToInterface(typed), style, spec.Explode)
    case []interface{}:
        return SerializePathArray(spec.Name, typed, style, spec.Explode)
    case map[string]string:
        return SerializePathObject(spec.Name, stringMapToInterface(typed), style, spec.Explode)
    case map[string]int:
        return SerializePathObject(spec.Name, intMapToInterface(typed), style, spec.Explode)
    case map[string]interface{}:
        return SerializePathObject(spec.Name, typed, style, spec.Explode)
    default:
        return PathPrefix(spec.Name, style) + url.PathEscape(fmt.Sprint(value))
    }
}

func SerializePathArray(name string, values []interface{}, style string, explode bool) string {
    serialized := make([]string, 0, len(values))
    for _, item := range values {
        if item != nil {
            serialized = append(serialized, url.PathEscape(fmt.Sprint(item)))
        }
    }
    if len(serialized) == 0 {
        return PathPrefix(name, style)
    }
    if style == "matrix" {
        if explode {
            parts := make([]string, 0, len(serialized))
            for _, item := range serialized {
                parts = append(parts, ";"+name+"="+item)
            }
            return strings.Join(parts, "")
        }
        return ";" + name + "=" + strings.Join(serialized, ",")
    }
    separator := ","
    if explode {
        separator = "."
    }
    return PathPrefix(name, style) + strings.Join(serialized, separator)
}

func SerializePathObject(name string, values map[string]interface{}, style string, explode bool) string {
    entries := make([]string, 0, len(values)*2)
    exploded := make([]string, 0, len(values))
    for key, value := range values {
        if value == nil {
            continue
        }
        escapedKey := url.PathEscape(key)
        escapedValue := url.PathEscape(fmt.Sprint(value))
        if explode {
            if style == "matrix" {
                exploded = append(exploded, ";"+escapedKey+"="+escapedValue)
            } else {
                exploded = append(exploded, escapedKey+"="+escapedValue)
            }
        } else {
            entries = append(entries, escapedKey, escapedValue)
        }
    }
    if style == "matrix" {
        if explode {
            return strings.Join(exploded, "")
        }
        return ";" + name + "=" + strings.Join(entries, ",")
    }
    if explode {
        separator := ","
        if style == "label" {
            separator = "."
        }
        return PathPrefix(name, style) + strings.Join(exploded, separator)
    }
    return PathPrefix(name, style) + strings.Join(entries, ",")
}

func PathPrefix(name string, style string) string {
    if style == "label" {
        return "."
    }
    if style == "matrix" {
        return ";" + name
    }
    return ""
}
type QueryParameterSpec struct {
    Name          string
    Value         interface{}
    Style         string
    Explode       bool
    AllowReserved bool
    ContentType   string
}

func BuildQueryString(parameters []QueryParameterSpec) string {
    pairs := make([]string, 0)
    for _, parameter := range parameters {
        AppendSerializedParameter(&pairs, parameter)
    }
    return strings.Join(pairs, "&")
}

func AppendSerializedParameter(pairs *[]string, parameter QueryParameterSpec) {
    if parameter.Value == nil {
        return
    }

    if parameter.ContentType != "" {
        encoded, _ := json.Marshal(parameter.Value)
        *pairs = append(*pairs, url.QueryEscape(parameter.Name)+"="+EncodeQueryValue(string(encoded), parameter.AllowReserved))
        return
    }

    style := parameter.Style
    if style == "" {
        style = "form"
    }

    switch value := parameter.Value.(type) {
    case []string:
        AppendArrayParameter(pairs, parameter.Name, stringSliceToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case []int:
        AppendArrayParameter(pairs, parameter.Name, intSliceToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case []interface{}:
        AppendArrayParameter(pairs, parameter.Name, value, style, parameter.Explode, parameter.AllowReserved)
    case map[string]int:
        AppendObjectParameter(pairs, parameter.Name, intMapToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case map[string]string:
        AppendObjectParameter(pairs, parameter.Name, stringMapToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case map[string]interface{}:
        if style == "deepObject" {
            AppendDeepObjectParameter(pairs, parameter.Name, value, parameter.AllowReserved)
        } else {
            AppendObjectParameter(pairs, parameter.Name, value, style, parameter.Explode, parameter.AllowReserved)
        }
    default:
        *pairs = append(*pairs, url.QueryEscape(parameter.Name)+"="+EncodeQueryValue(fmt.Sprint(value), parameter.AllowReserved))
    }
}

func AppendArrayParameter(pairs *[]string, name string, value []interface{}, style string, explode bool, allowReserved bool) {
    values := make([]string, 0, len(value))
    for _, item := range value {
        if item != nil {
            values = append(values, fmt.Sprint(item))
        }
    }
    if len(values) == 0 {
        return
    }
    if style == "form" && explode {
        for _, item := range values {
            *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(item, allowReserved))
        }
        return
    }
    *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(strings.Join(values, ","), allowReserved))
}

func AppendObjectParameter(pairs *[]string, name string, value map[string]interface{}, style string, explode bool, allowReserved bool) {
    entries := make([]string, 0, len(value)*2)
    for key, item := range value {
        if item == nil {
            continue
        }
        if style == "form" && explode {
            *pairs = append(*pairs, url.QueryEscape(key)+"="+EncodeQueryValue(fmt.Sprint(item), allowReserved))
            continue
        }
        entries = append(entries, key, fmt.Sprint(item))
    }
    if len(entries) == 0 {
        return
    }
    if !(style == "form" && explode) {
        *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(strings.Join(entries, ","), allowReserved))
    }
}

func AppendDeepObjectParameter(pairs *[]string, name string, value map[string]interface{}, allowReserved bool) {
    for key, item := range value {
        if item == nil {
            continue
        }
        *pairs = append(*pairs, url.QueryEscape(fmt.Sprintf("%s[%s]", name, key))+"="+EncodeQueryValue(fmt.Sprint(item), allowReserved))
    }
}

func EncodeQueryValue(value string, allowReserved bool) string {
    encoded := url.QueryEscape(value)
    if !allowReserved {
        return encoded
    }
    replacements := map[string]string{
        "%3A": ":", "%2F": "/", "%3F": "?", "%23": "#",
        "%5B": "[", "%5D": "]", "%40": "@", "%21": "!",
        "%24": "$", "%26": "&", "%27": "'", "%28": "(",
        "%29": ")", "%2A": "*", "%2B": "+", "%2C": ",",
        "%3B": ";", "%3D": "=",
    }
    for escaped, reserved := range replacements {
        encoded = strings.ReplaceAll(encoded, escaped, reserved)
    }
    return encoded
}



func stringSliceToInterface(values []string) []interface{} {
    result := make([]interface{}, 0, len(values))
    for _, value := range values {
        result = append(result, value)
    }
    return result
}

func intSliceToInterface(values []int) []interface{} {
    result := make([]interface{}, 0, len(values))
    for _, value := range values {
        result = append(result, value)
    }
    return result
}

func stringMapToInterface(values map[string]string) map[string]interface{} {
    result := make(map[string]interface{}, len(values))
    for key, value := range values {
        result[key] = value
    }
    return result
}

func intMapToInterface(values map[string]int) map[string]interface{} {
    result := make(map[string]interface{}, len(values))
    for key, value := range values {
        result[key] = value
    }
    return result
}
