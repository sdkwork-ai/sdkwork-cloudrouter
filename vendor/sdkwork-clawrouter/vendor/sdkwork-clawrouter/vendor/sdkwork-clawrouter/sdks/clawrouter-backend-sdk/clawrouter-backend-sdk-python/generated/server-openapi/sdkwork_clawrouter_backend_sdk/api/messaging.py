from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import DiagnosticsRouteSimulationCreateResult, DiagnosticsTestSendsCreateResult, MessagingProviderAccountCreateRequest, MessagingRouteRuleCreateRequest, MessagingRouteSimulationRequest, MessagingSenderIdentityCreateRequest, MessagingSuppressionCreateRequest, MessagingTemplateCreateRequest, MessagingTemplateSendRequest, MessagingTestSendRequest, ProviderAccountsCreateResult, ProviderAccountsListResult, RateLimitBucketsListResult, RouteRulesCreateResult, RouteRulesListResult, SenderIdentitiesCreateResult, SenderIdentitiesListResult, SendRequestsListResult, SuppressionsCreateResult, SuppressionsListResult, TemplatesCreateResult, TemplateSendsCreateResult, TemplatesListResult, TemplatesVersionsPublishResult, VerificationPoliciesListResult, VerificationPoliciesUpdateResult, VerificationPolicyUpdateRequest

def _append_query_string(path: str, raw_query_string: str) -> str:
    query = raw_query_string.lstrip('?')
    if not query:
        return path
    separator = '&' if '?' in path else '?'
    return f"{path}{separator}{query}"

def serialize_path_parameter(value: Any, spec: Dict[str, Any]) -> str:
    if value is None:
        return ''

    style = str(spec.get('style') or 'simple')
    name = str(spec.get('name') or '')
    explode = bool(spec.get('explode'))
    if isinstance(value, (list, tuple)):
        return serialize_path_array(name, value, style, explode)
    if isinstance(value, dict):
        return serialize_path_object(name, value, style, explode)
    return path_prefix(name, style) + encode_path_value(serialize_path_primitive(value))


def serialize_path_array(name: str, values: Any, style: str, explode: bool) -> str:
    serialized = [encode_path_value(serialize_path_primitive(item)) for item in values if item is not None]
    if not serialized:
        return path_prefix(name, style)
    if style == 'matrix':
        return ''.join(f";{name}={item}" for item in serialized) if explode else f";{name}={','.join(serialized)}"
    return path_prefix(name, style) + ('.' if explode else ',').join(serialized)


def serialize_path_object(name: str, value: Dict[str, Any], style: str, explode: bool) -> str:
    entries = [(key, entry_value) for key, entry_value in value.items() if entry_value is not None]
    if not entries:
        return path_prefix(name, style)
    if style == 'matrix':
        if explode:
            return ''.join(f";{encode_path_value(str(key))}={encode_path_value(serialize_path_primitive(entry_value))}" for key, entry_value in entries)
        serialized = ','.join(item for key, entry_value in entries for item in (encode_path_value(str(key)), encode_path_value(serialize_path_primitive(entry_value))))
        return f";{name}={serialized}"
    if explode:
        separator = '.' if style == 'label' else ','
        serialized = separator.join(f"{encode_path_value(str(key))}={encode_path_value(serialize_path_primitive(entry_value))}" for key, entry_value in entries)
    else:
        serialized = ','.join(item for key, entry_value in entries for item in (encode_path_value(str(key)), encode_path_value(serialize_path_primitive(entry_value))))
    return path_prefix(name, style) + serialized


def path_prefix(name: str, style: str) -> str:
    if style == 'label':
        return '.'
    if style == 'matrix':
        return f";{name}"
    return ''


def encode_path_value(value: str) -> str:
    from urllib.parse import quote

    return quote(value, safe='')


def serialize_path_primitive(value: Any) -> str:
    if isinstance(value, dict):
        import json

        return json.dumps(value, separators=(',', ':'))
    return str(value)


def build_query_string(parameters: List[Dict[str, Any]]) -> str:
    pairs: List[str] = []
    for parameter in parameters:
        append_serialized_parameter(pairs, parameter)
    return '&'.join(pairs)


def append_serialized_parameter(pairs: List[str], parameter: Dict[str, Any]) -> None:
    value = parameter.get('value')
    if value is None:
        return

    name = str(parameter.get('name') or '')
    allow_reserved = bool(parameter.get('allow_reserved'))
    content_type = parameter.get('content_type')
    if content_type:
        import json

        pairs.append(f"{encode_query_component(name)}={encode_query_value(json.dumps(value, separators=(',', ':')), allow_reserved)}")
        return

    style = str(parameter.get('style') or 'form')
    explode = bool(parameter.get('explode'))
    if style == 'deepObject':
        append_deep_object_parameter(pairs, name, value, allow_reserved)
        return
    if isinstance(value, (list, tuple)):
        append_array_parameter(pairs, name, value, style, explode, allow_reserved)
        return
    if isinstance(value, dict):
        append_object_parameter(pairs, name, value, style, explode, allow_reserved)
        return

    pairs.append(f"{encode_query_component(name)}={encode_query_value(serialize_primitive(value), allow_reserved)}")


def append_array_parameter(
    pairs: List[str],
    name: str,
    value: Any,
    style: str,
    explode: bool,
    allow_reserved: bool,
) -> None:
    values = [serialize_primitive(item) for item in value if item is not None]
    if not values:
        return

    if style == 'form' and explode:
        for item in values:
            pairs.append(f"{encode_query_component(name)}={encode_query_value(item, allow_reserved)}")
        return

    pairs.append(f"{encode_query_component(name)}={encode_query_value(','.join(values), allow_reserved)}")


def append_object_parameter(
    pairs: List[str],
    name: str,
    value: Dict[str, Any],
    style: str,
    explode: bool,
    allow_reserved: bool,
) -> None:
    entries = [(key, entry_value) for key, entry_value in value.items() if entry_value is not None]
    if not entries:
        return

    if style == 'form' and explode:
        for key, entry_value in entries:
            pairs.append(f"{encode_query_component(str(key))}={encode_query_value(serialize_primitive(entry_value), allow_reserved)}")
        return

    serialized = ','.join(
        item
        for key, entry_value in entries
        for item in (str(key), serialize_primitive(entry_value))
    )
    pairs.append(f"{encode_query_component(name)}={encode_query_value(serialized, allow_reserved)}")


def append_deep_object_parameter(pairs: List[str], name: str, value: Any, allow_reserved: bool) -> None:
    if not isinstance(value, dict):
        pairs.append(f"{encode_query_component(name)}={encode_query_value(serialize_primitive(value), allow_reserved)}")
        return

    for key, entry_value in value.items():
        if entry_value is None:
            continue
        pairs.append(f"{encode_query_component(f'{name}[{key}]')}={encode_query_value(serialize_primitive(entry_value), allow_reserved)}")


def serialize_primitive(value: Any) -> str:
    if isinstance(value, dict):
        import json

        return json.dumps(value, separators=(',', ':'))
    return str(value)


def encode_query_component(value: str) -> str:
    from urllib.parse import quote

    return quote(value, safe='')


def encode_query_value(value: str, allow_reserved: bool) -> str:
    from urllib.parse import quote

    return quote(value, safe=':/?#[]@!$&\'()*+,;=' if allow_reserved else '')

def build_request_headers(headers: Dict[str, Dict[str, Any]], cookies: Optional[Dict[str, Dict[str, Any]]] = None) -> Optional[Dict[str, str]]:
    request_headers: Dict[str, str] = {}
    for name, parameter in headers.items():
        serialized = serialize_parameter_value(parameter)
        if serialized is not None:
            request_headers[name] = serialized

    cookie_header = build_cookie_header(cookies or {})
    if cookie_header:
        request_headers['Cookie'] = (
            f"{request_headers['Cookie']}; {cookie_header}"
            if 'Cookie' in request_headers
            else cookie_header
        )

    return request_headers or None


def build_cookie_header(cookies: Dict[str, Dict[str, Any]]) -> Optional[str]:
    from urllib.parse import quote

    pairs: List[str] = []
    for name, parameter in cookies.items():
        serialized = serialize_parameter_value(parameter)
        if serialized is not None:
            pairs.append(f"{quote(str(name), safe='')}={quote(serialized, safe='')}")
    return '; '.join(pairs) if pairs else None


def serialize_parameter_value(parameter: Optional[Dict[str, Any]]) -> Optional[str]:
    value = None if parameter is None else parameter.get('value')
    if value is None:
        return None
    if parameter and parameter.get('content_type'):
        import json

        return json.dumps(value, separators=(',', ':'))
    if isinstance(value, (list, tuple)):
        return ','.join(serialize_header_primitive(item) for item in value if item is not None)
    if isinstance(value, dict):
        return serialize_header_object(value, bool(parameter and parameter.get('explode')))
    return serialize_header_primitive(value)


def serialize_header_object(value: Dict[str, Any], explode: bool) -> str:
    entries = [(key, entry_value) for key, entry_value in value.items() if entry_value is not None]
    if explode:
        return ','.join(f"{key}={serialize_header_primitive(entry_value)}" for key, entry_value in entries)
    return ','.join(item for key, entry_value in entries for item in (str(key), serialize_header_primitive(entry_value)))


def serialize_header_primitive(value: Any) -> str:
    return str(value)


class MessagingApi:
    """messaging messaging API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.diagnostics = MessagingDiagnosticsApi(client)
        self.provider_accounts = MessagingProviderAccountsApi(client)
        self.rate_limit_buckets = MessagingRateLimitBucketsApi(client)
        self.route_rules = MessagingRouteRulesApi(client)
        self.send_requests = MessagingSendRequestsApi(client)
        self.sender_identities = MessagingSenderIdentitiesApi(client)
        self.suppressions = MessagingSuppressionsApi(client)
        self.template_sends = MessagingTemplateSendsApi(client)
        self.templates = MessagingTemplatesApi(client)
        self.verification_policies = MessagingVerificationPoliciesApi(client)


class MessagingDiagnosticsApi:
    """messaging messaging.diagnostics API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.route_simulation = MessagingDiagnosticsRouteSimulationApi(client)
        self.test_sends = MessagingDiagnosticsTestSendsApi(client)


class MessagingDiagnosticsRouteSimulationApi:
    """messaging messaging.diagnostics.route_simulation API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, body: MessagingRouteSimulationRequest) -> DiagnosticsRouteSimulationCreateResult:
        """Messaging route simulation"""
        return self._client.post(f"/backend/v3/api/messaging/diagnostics/route_simulation", json=body)

class MessagingDiagnosticsTestSendsApi:
    """messaging messaging.diagnostics.test_sends API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, body: MessagingTestSendRequest, idempotency_key: str) -> DiagnosticsTestSendsCreateResult:
        """Messaging test send"""
        request_headers = build_request_headers(
            {
                'Idempotency-Key': {'value': idempotency_key, 'style': 'simple', 'explode': False},
            },
            {}
        )
        return self._client.post(f"/backend/v3/api/messaging/diagnostics/test_sends", json=body, headers=request_headers)

class MessagingProviderAccountsApi:
    """messaging messaging.provider_accounts API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, q: Optional[str] = None, status: Optional[str] = None, channel: Optional[str] = None, provider_code: Optional[str] = None) -> ProviderAccountsListResult:
        """Messaging provider accounts list"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'channel', 'value': channel, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_code', 'value': provider_code, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/messaging/provider_accounts", query))

    def create(self, body: MessagingProviderAccountCreateRequest, idempotency_key: str) -> ProviderAccountsCreateResult:
        """Messaging provider account create"""
        request_headers = build_request_headers(
            {
                'Idempotency-Key': {'value': idempotency_key, 'style': 'simple', 'explode': False},
            },
            {}
        )
        return self._client.post(f"/backend/v3/api/messaging/provider_accounts", json=body, headers=request_headers)

class MessagingRateLimitBucketsApi:
    """messaging messaging.rate_limit_buckets API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, scene_code: Optional[str] = None, channel: Optional[str] = None, target_hash: Optional[str] = None, ip_hash: Optional[str] = None, device_hash: Optional[str] = None) -> RateLimitBucketsListResult:
        """Messaging rate limit buckets list"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'scene_code', 'value': scene_code, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'channel', 'value': channel, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'target_hash', 'value': target_hash, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'ip_hash', 'value': ip_hash, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'device_hash', 'value': device_hash, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/messaging/rate_limit_buckets", query))

class MessagingRouteRulesApi:
    """messaging messaging.route_rules API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, q: Optional[str] = None, status: Optional[str] = None, channel: Optional[str] = None, provider_code: Optional[str] = None) -> RouteRulesListResult:
        """Messaging route rules list"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'channel', 'value': channel, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_code', 'value': provider_code, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/messaging/route_rules", query))

    def create(self, body: MessagingRouteRuleCreateRequest, idempotency_key: str) -> RouteRulesCreateResult:
        """Messaging route rule create"""
        request_headers = build_request_headers(
            {
                'Idempotency-Key': {'value': idempotency_key, 'style': 'simple', 'explode': False},
            },
            {}
        )
        return self._client.post(f"/backend/v3/api/messaging/route_rules", json=body, headers=request_headers)

class MessagingSendRequestsApi:
    """messaging messaging.send_requests API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, status: Optional[str] = None, channel: Optional[str] = None, scene_code: Optional[str] = None, provider_code: Optional[str] = None, target_hash: Optional[str] = None) -> SendRequestsListResult:
        """Messaging send requests list"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'channel', 'value': channel, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'scene_code', 'value': scene_code, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_code', 'value': provider_code, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'target_hash', 'value': target_hash, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/messaging/send_requests", query))

class MessagingSenderIdentitiesApi:
    """messaging messaging.sender_identities API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, q: Optional[str] = None, status: Optional[str] = None, channel: Optional[str] = None, provider_code: Optional[str] = None) -> SenderIdentitiesListResult:
        """Messaging sender identities list"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'channel', 'value': channel, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_code', 'value': provider_code, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/messaging/sender_identities", query))

    def create(self, body: MessagingSenderIdentityCreateRequest, idempotency_key: str) -> SenderIdentitiesCreateResult:
        """Messaging sender identity create"""
        request_headers = build_request_headers(
            {
                'Idempotency-Key': {'value': idempotency_key, 'style': 'simple', 'explode': False},
            },
            {}
        )
        return self._client.post(f"/backend/v3/api/messaging/sender_identities", json=body, headers=request_headers)

class MessagingSuppressionsApi:
    """messaging messaging.suppressions API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, status: Optional[str] = None, channel: Optional[str] = None, target_hash: Optional[str] = None, reason_code: Optional[str] = None) -> SuppressionsListResult:
        """Messaging suppressions list"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'channel', 'value': channel, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'target_hash', 'value': target_hash, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'reason_code', 'value': reason_code, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/messaging/suppressions", query))

    def create(self, body: MessagingSuppressionCreateRequest, idempotency_key: str) -> SuppressionsCreateResult:
        """Messaging suppression create"""
        request_headers = build_request_headers(
            {
                'Idempotency-Key': {'value': idempotency_key, 'style': 'simple', 'explode': False},
            },
            {}
        )
        return self._client.post(f"/backend/v3/api/messaging/suppressions", json=body, headers=request_headers)

class MessagingTemplateSendsApi:
    """messaging messaging.template_sends API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def create(self, body: MessagingTemplateSendRequest, idempotency_key: str) -> TemplateSendsCreateResult:
        """Messaging template send"""
        request_headers = build_request_headers(
            {
                'Idempotency-Key': {'value': idempotency_key, 'style': 'simple', 'explode': False},
            },
            {}
        )
        return self._client.post(f"/backend/v3/api/messaging/template_sends", json=body, headers=request_headers)

class MessagingTemplatesApi:
    """messaging messaging.templates API client."""

    def __init__(self, client: HttpClient):
        self._client = client
        self.versions = MessagingTemplatesVersionsApi(client)


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, q: Optional[str] = None, status: Optional[str] = None, channel: Optional[str] = None, provider_code: Optional[str] = None) -> TemplatesListResult:
        """Messaging templates list"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'channel', 'value': channel, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_code', 'value': provider_code, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/messaging/templates", query))

    def create(self, body: MessagingTemplateCreateRequest, idempotency_key: str) -> TemplatesCreateResult:
        """Messaging template create"""
        request_headers = build_request_headers(
            {
                'Idempotency-Key': {'value': idempotency_key, 'style': 'simple', 'explode': False},
            },
            {}
        )
        return self._client.post(f"/backend/v3/api/messaging/templates", json=body, headers=request_headers)

class MessagingTemplatesVersionsApi:
    """messaging messaging.templates.versions API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def publish(self, template_id: str, version_id: str) -> TemplatesVersionsPublishResult:
        """Messaging template version publish"""
        return self._client.post(f"/backend/v3/api/messaging/templates/{serialize_path_parameter(template_id, {'name': 'templateId', 'style': 'simple', 'explode': False})}/versions/{serialize_path_parameter(version_id, {'name': 'versionId', 'style': 'simple', 'explode': False})}/publish")

class MessagingVerificationPoliciesApi:
    """messaging messaging.verification_policies API client."""

    def __init__(self, client: HttpClient):
        self._client = client


    def list(self, page: Optional[str] = None, page_size: Optional[str] = None, q: Optional[str] = None, status: Optional[str] = None, channel: Optional[str] = None, provider_code: Optional[str] = None) -> VerificationPoliciesListResult:
        """Verification policies list"""
        query = build_query_string([
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page_size', 'value': page_size, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'q', 'value': q, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'status', 'value': status, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'channel', 'value': channel, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'provider_code', 'value': provider_code, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/backend/v3/api/messaging/verification_policies", query))

    def update(self, policy_id: str, body: VerificationPolicyUpdateRequest) -> VerificationPoliciesUpdateResult:
        """Verification policy update"""
        return self._client.put(f"/backend/v3/api/messaging/verification_policies/{serialize_path_parameter(policy_id, {'name': 'policyId', 'style': 'simple', 'explode': False})}", json=body)
