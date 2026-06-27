package api

import (
    "encoding/json"
    "fmt"
    "net/url"
    "strings"
    sdktypes "github.com/sdkwork/clawrouter-backend-sdk/types"
    sdkhttp "github.com/sdkwork/clawrouter-backend-sdk/http"
)

type MessagingApi struct {
    client *sdkhttp.Client
}

func NewMessagingApi(client *sdkhttp.Client) *MessagingApi {
    return &MessagingApi{client: client}
}

// Messaging route simulation
func (a *MessagingApi) DiagnosticsRouteSimulationCreate(body sdktypes.MessagingRouteSimulationRequest) (sdktypes.DiagnosticsRouteSimulationCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/messaging/diagnostics/route_simulation"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.DiagnosticsRouteSimulationCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.DiagnosticsRouteSimulationCreateResult](raw)
}

// Messaging test send
func (a *MessagingApi) DiagnosticsTestSendsCreate(body sdktypes.MessagingTestSendRequest, idempotencyKey string) (sdktypes.DiagnosticsTestSendsCreateResult, error) {
    headers := BuildRequestHeaders(
        map[string]ParameterSpec{"Idempotency-Key": ParameterSpec{Value: idempotencyKey, Style: "simple", Explode: false},},
        map[string]ParameterSpec{},
    )
    raw, err := a.client.Post(BackendApiPath("/messaging/diagnostics/test_sends"), body, nil, headers, "application/json")
    if err != nil {
        var zero sdktypes.DiagnosticsTestSendsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.DiagnosticsTestSendsCreateResult](raw)
}

// Messaging provider accounts list
func (a *MessagingApi) ProviderAccountsList(page *string, pageSize *string, q *string, status *string, channel *string, providerCode *string) (sdktypes.ProviderAccountsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "channel", Value: func() interface{} { if channel == nil { return nil }; return *channel }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_code", Value: func() interface{} { if providerCode == nil { return nil }; return *providerCode }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/messaging/provider_accounts"), query), nil, nil)
    if err != nil {
        var zero sdktypes.ProviderAccountsListResult
        return zero, err
    }
    return decodeResult[sdktypes.ProviderAccountsListResult](raw)
}

// Messaging provider account create
func (a *MessagingApi) ProviderAccountsCreate(body sdktypes.MessagingProviderAccountCreateRequest, idempotencyKey string) (sdktypes.ProviderAccountsCreateResult, error) {
    headers := BuildRequestHeaders(
        map[string]ParameterSpec{"Idempotency-Key": ParameterSpec{Value: idempotencyKey, Style: "simple", Explode: false},},
        map[string]ParameterSpec{},
    )
    raw, err := a.client.Post(BackendApiPath("/messaging/provider_accounts"), body, nil, headers, "application/json")
    if err != nil {
        var zero sdktypes.ProviderAccountsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ProviderAccountsCreateResult](raw)
}

// Messaging rate limit buckets list
func (a *MessagingApi) RateLimitBucketsList(page *string, pageSize *string, sceneCode *string, channel *string, targetHash *string, ipHash *string, deviceHash *string) (sdktypes.RateLimitBucketsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "scene_code", Value: func() interface{} { if sceneCode == nil { return nil }; return *sceneCode }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "channel", Value: func() interface{} { if channel == nil { return nil }; return *channel }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "target_hash", Value: func() interface{} { if targetHash == nil { return nil }; return *targetHash }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "ip_hash", Value: func() interface{} { if ipHash == nil { return nil }; return *ipHash }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "device_hash", Value: func() interface{} { if deviceHash == nil { return nil }; return *deviceHash }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/messaging/rate_limit_buckets"), query), nil, nil)
    if err != nil {
        var zero sdktypes.RateLimitBucketsListResult
        return zero, err
    }
    return decodeResult[sdktypes.RateLimitBucketsListResult](raw)
}

// Messaging route rules list
func (a *MessagingApi) RouteRulesList(page *string, pageSize *string, q *string, status *string, channel *string, providerCode *string) (sdktypes.RouteRulesListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "channel", Value: func() interface{} { if channel == nil { return nil }; return *channel }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_code", Value: func() interface{} { if providerCode == nil { return nil }; return *providerCode }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/messaging/route_rules"), query), nil, nil)
    if err != nil {
        var zero sdktypes.RouteRulesListResult
        return zero, err
    }
    return decodeResult[sdktypes.RouteRulesListResult](raw)
}

// Messaging route rule create
func (a *MessagingApi) RouteRulesCreate(body sdktypes.MessagingRouteRuleCreateRequest, idempotencyKey string) (sdktypes.RouteRulesCreateResult, error) {
    headers := BuildRequestHeaders(
        map[string]ParameterSpec{"Idempotency-Key": ParameterSpec{Value: idempotencyKey, Style: "simple", Explode: false},},
        map[string]ParameterSpec{},
    )
    raw, err := a.client.Post(BackendApiPath("/messaging/route_rules"), body, nil, headers, "application/json")
    if err != nil {
        var zero sdktypes.RouteRulesCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.RouteRulesCreateResult](raw)
}

// Messaging send requests list
func (a *MessagingApi) SendRequestsList(page *string, pageSize *string, status *string, channel *string, sceneCode *string, providerCode *string, targetHash *string) (sdktypes.SendRequestsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "channel", Value: func() interface{} { if channel == nil { return nil }; return *channel }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "scene_code", Value: func() interface{} { if sceneCode == nil { return nil }; return *sceneCode }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_code", Value: func() interface{} { if providerCode == nil { return nil }; return *providerCode }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "target_hash", Value: func() interface{} { if targetHash == nil { return nil }; return *targetHash }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/messaging/send_requests"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SendRequestsListResult
        return zero, err
    }
    return decodeResult[sdktypes.SendRequestsListResult](raw)
}

// Messaging sender identities list
func (a *MessagingApi) SenderIdentitiesList(page *string, pageSize *string, q *string, status *string, channel *string, providerCode *string) (sdktypes.SenderIdentitiesListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "channel", Value: func() interface{} { if channel == nil { return nil }; return *channel }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_code", Value: func() interface{} { if providerCode == nil { return nil }; return *providerCode }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/messaging/sender_identities"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SenderIdentitiesListResult
        return zero, err
    }
    return decodeResult[sdktypes.SenderIdentitiesListResult](raw)
}

// Messaging sender identity create
func (a *MessagingApi) SenderIdentitiesCreate(body sdktypes.MessagingSenderIdentityCreateRequest, idempotencyKey string) (sdktypes.SenderIdentitiesCreateResult, error) {
    headers := BuildRequestHeaders(
        map[string]ParameterSpec{"Idempotency-Key": ParameterSpec{Value: idempotencyKey, Style: "simple", Explode: false},},
        map[string]ParameterSpec{},
    )
    raw, err := a.client.Post(BackendApiPath("/messaging/sender_identities"), body, nil, headers, "application/json")
    if err != nil {
        var zero sdktypes.SenderIdentitiesCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.SenderIdentitiesCreateResult](raw)
}

// Messaging suppressions list
func (a *MessagingApi) SuppressionsList(page *string, pageSize *string, status *string, channel *string, targetHash *string, reasonCode *string) (sdktypes.SuppressionsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "channel", Value: func() interface{} { if channel == nil { return nil }; return *channel }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "target_hash", Value: func() interface{} { if targetHash == nil { return nil }; return *targetHash }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "reason_code", Value: func() interface{} { if reasonCode == nil { return nil }; return *reasonCode }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/messaging/suppressions"), query), nil, nil)
    if err != nil {
        var zero sdktypes.SuppressionsListResult
        return zero, err
    }
    return decodeResult[sdktypes.SuppressionsListResult](raw)
}

// Messaging suppression create
func (a *MessagingApi) SuppressionsCreate(body sdktypes.MessagingSuppressionCreateRequest, idempotencyKey string) (sdktypes.SuppressionsCreateResult, error) {
    headers := BuildRequestHeaders(
        map[string]ParameterSpec{"Idempotency-Key": ParameterSpec{Value: idempotencyKey, Style: "simple", Explode: false},},
        map[string]ParameterSpec{},
    )
    raw, err := a.client.Post(BackendApiPath("/messaging/suppressions"), body, nil, headers, "application/json")
    if err != nil {
        var zero sdktypes.SuppressionsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.SuppressionsCreateResult](raw)
}

// Messaging template send
func (a *MessagingApi) TemplateSendsCreate(body sdktypes.MessagingTemplateSendRequest, idempotencyKey string) (sdktypes.TemplateSendsCreateResult, error) {
    headers := BuildRequestHeaders(
        map[string]ParameterSpec{"Idempotency-Key": ParameterSpec{Value: idempotencyKey, Style: "simple", Explode: false},},
        map[string]ParameterSpec{},
    )
    raw, err := a.client.Post(BackendApiPath("/messaging/template_sends"), body, nil, headers, "application/json")
    if err != nil {
        var zero sdktypes.TemplateSendsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.TemplateSendsCreateResult](raw)
}

// Messaging templates list
func (a *MessagingApi) TemplatesList(page *string, pageSize *string, q *string, status *string, channel *string, providerCode *string) (sdktypes.TemplatesListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "channel", Value: func() interface{} { if channel == nil { return nil }; return *channel }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_code", Value: func() interface{} { if providerCode == nil { return nil }; return *providerCode }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/messaging/templates"), query), nil, nil)
    if err != nil {
        var zero sdktypes.TemplatesListResult
        return zero, err
    }
    return decodeResult[sdktypes.TemplatesListResult](raw)
}

// Messaging template create
func (a *MessagingApi) TemplatesCreate(body sdktypes.MessagingTemplateCreateRequest, idempotencyKey string) (sdktypes.TemplatesCreateResult, error) {
    headers := BuildRequestHeaders(
        map[string]ParameterSpec{"Idempotency-Key": ParameterSpec{Value: idempotencyKey, Style: "simple", Explode: false},},
        map[string]ParameterSpec{},
    )
    raw, err := a.client.Post(BackendApiPath("/messaging/templates"), body, nil, headers, "application/json")
    if err != nil {
        var zero sdktypes.TemplatesCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.TemplatesCreateResult](raw)
}

// Messaging template version publish
func (a *MessagingApi) TemplatesVersionsPublish(templateId string, versionId string) (sdktypes.TemplatesVersionsPublishResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/messaging/templates/%s/versions/%s/publish", SerializePathParameter(templateId, PathParameterSpec{Name: "templateId", Style: "simple", Explode: false}), SerializePathParameter(versionId, PathParameterSpec{Name: "versionId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.TemplatesVersionsPublishResult
        return zero, err
    }
    return decodeResult[sdktypes.TemplatesVersionsPublishResult](raw)
}

// Verification policies list
func (a *MessagingApi) VerificationPoliciesList(page *string, pageSize *string, q *string, status *string, channel *string, providerCode *string) (sdktypes.VerificationPoliciesListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "channel", Value: func() interface{} { if channel == nil { return nil }; return *channel }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "provider_code", Value: func() interface{} { if providerCode == nil { return nil }; return *providerCode }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/messaging/verification_policies"), query), nil, nil)
    if err != nil {
        var zero sdktypes.VerificationPoliciesListResult
        return zero, err
    }
    return decodeResult[sdktypes.VerificationPoliciesListResult](raw)
}

// Verification policy update
func (a *MessagingApi) VerificationPoliciesUpdate(policyId string, body sdktypes.VerificationPolicyUpdateRequest) (sdktypes.VerificationPoliciesUpdateResult, error) {
    raw, err := a.client.Put(BackendApiPath(fmt.Sprintf("/messaging/verification_policies/%s", SerializePathParameter(policyId, PathParameterSpec{Name: "policyId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.VerificationPoliciesUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.VerificationPoliciesUpdateResult](raw)
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


type ParameterSpec struct {
    Value       interface{}
    Style       string
    Explode     bool
    ContentType string
}

func BuildRequestHeaders(headers map[string]ParameterSpec, cookies map[string]ParameterSpec) map[string]string {
    requestHeaders := map[string]string{}
    for name, parameter := range headers {
        if serialized, ok := SerializeParameterValue(parameter); ok {
            requestHeaders[name] = serialized
        }
    }

    if cookieHeader := BuildCookieHeader(cookies); cookieHeader != "" {
        if existing, ok := requestHeaders["Cookie"]; ok && existing != "" {
            requestHeaders["Cookie"] = existing + "; " + cookieHeader
        } else {
            requestHeaders["Cookie"] = cookieHeader
        }
    }

    if len(requestHeaders) == 0 {
        return nil
    }
    return requestHeaders
}

func BuildCookieHeader(cookies map[string]ParameterSpec) string {
    pairs := make([]string, 0, len(cookies))
    for name, parameter := range cookies {
        if serialized, ok := SerializeParameterValue(parameter); ok {
            pairs = append(pairs, url.QueryEscape(name)+"="+url.QueryEscape(serialized))
        }
    }
    return strings.Join(pairs, "; ")
}

func SerializeParameterValue(parameter ParameterSpec) (string, bool) {
    value := parameter.Value
    if value == nil {
        return "", false
    }
    if parameter.ContentType != "" {
        encoded, _ := json.Marshal(value)
        return string(encoded), true
    }
    switch typed := value.(type) {
    case string:
        return typed, true
    case fmt.Stringer:
        return typed.String(), true
    case []string:
        return strings.Join(typed, ","), true
    case []int:
        values := make([]string, 0, len(typed))
        for _, item := range typed {
            values = append(values, fmt.Sprint(item))
        }
        return strings.Join(values, ","), true
    case map[string]string:
        return SerializeHeaderObject(stringMapToInterface(typed), parameter.Explode), true
    case map[string]int:
        return SerializeHeaderObject(intMapToInterface(typed), parameter.Explode), true
    case map[string]interface{}:
        return SerializeHeaderObject(typed, parameter.Explode), true
    default:
        return fmt.Sprint(value), true
    }
}

func SerializeHeaderObject(values map[string]interface{}, explode bool) string {
    serialized := make([]string, 0, len(values)*2)
    for key, value := range values {
        if value == nil {
            continue
        }
        if explode {
            serialized = append(serialized, key+"="+fmt.Sprint(value))
        } else {
            serialized = append(serialized, key, fmt.Sprint(value))
        }
    }
    return strings.Join(serialized, ",")
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
