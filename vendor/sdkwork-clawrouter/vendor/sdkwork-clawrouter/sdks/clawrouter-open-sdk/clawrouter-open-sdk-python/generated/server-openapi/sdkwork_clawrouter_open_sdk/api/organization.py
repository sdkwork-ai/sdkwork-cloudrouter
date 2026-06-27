from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import DeleteResult, OpenAiCertificate, OpenAiCertificateActivationRequest, OpenAiCertificateList, OpenAiCertificateUploadMultipartRequest, OpenAiOrganizationAdminApiKey, OpenAiOrganizationAdminApiKeyCreateRequest, OpenAiOrganizationAdminApiKeyList, OpenAiOrganizationAuditLogList, OpenAiOrganizationCostList, OpenAiOrganizationGroup, OpenAiOrganizationGroupCreateRequest, OpenAiOrganizationGroupList, OpenAiOrganizationGroupUserCreateRequest, OpenAiOrganizationInvite, OpenAiOrganizationInviteCreateRequest, OpenAiOrganizationInviteList, OpenAiOrganizationUsageList, OpenAiOrganizationUser, OpenAiOrganizationUserList, OpenAiOrganizationUserUpdateRequest, OpenAiProject, OpenAiProjectApiKeyList, OpenAiProjectCreateRequest, OpenAiProjectGroupCreateRequest, OpenAiProjectList, OpenAiProjectRateLimit, OpenAiProjectRateLimitList, OpenAiProjectRateLimitUpdateRequest, OpenAiProjectServiceAccount, OpenAiProjectServiceAccountCreateRequest, OpenAiProjectServiceAccountList, OpenAiProjectUser, OpenAiProjectUserCreateRequest, OpenAiProjectUserList, OpenAiRole, OpenAiRoleAssignment, OpenAiRoleAssignmentCreateRequest, OpenAiRoleAssignmentList, OpenAiRoleCreateRequest, OpenAiRoleList

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




class OrganizationApi:
    """organization API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def list_admin_api_keys(self, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiOrganizationAdminApiKeyList:
        """List organization admin API keys"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/admin_api_keys", query))

    def create_admin_api_key(self, body: OpenAiOrganizationAdminApiKeyCreateRequest) -> OpenAiOrganizationAdminApiKey:
        """Create organization admin API key"""
        return self._client.post(f"/v1/organization/admin_api_keys", json=body)

    def delete_admin_api_keys(self, key_id: str) -> DeleteResult:
        """Delete organization admin API key"""
        return self._client.delete(f"/v1/organization/admin_api_keys/{serialize_path_parameter(key_id, {'name': 'key_id', 'style': 'simple', 'explode': False})}")

    def list_audit_logs(self, effective_at_gte: Optional[int] = None, effective_at_lte: Optional[int] = None, project_ids: Optional[List[str]] = None, event_types: Optional[List[str]] = None, actor_ids: Optional[List[str]] = None, actor_emails: Optional[List[str]] = None, resource_ids: Optional[List[str]] = None, limit: Optional[int] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiOrganizationAuditLogList:
        """List organization audit logs"""
        query = build_query_string([
            {'name': 'effective_at[gte]', 'value': effective_at_gte, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'effective_at[lte]', 'value': effective_at_lte, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'project_ids[]', 'value': project_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'event_types[]', 'value': event_types, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'actor_ids[]', 'value': actor_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'actor_emails[]', 'value': actor_emails, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'resource_ids[]', 'value': resource_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/audit_logs", query))

    def list_certificates(self, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiCertificateList:
        """List organization certificates"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/certificates", query))

    def create_certificate(self, body: OpenAiCertificateUploadMultipartRequest) -> OpenAiCertificate:
        """Upload organization certificate"""
        return self._client.post(f"/v1/organization/certificates", data=body)

    def create_certificates_activate(self, body: OpenAiCertificateActivationRequest) -> OpenAiCertificateList:
        """Activate organization certificates"""
        return self._client.post(f"/v1/organization/certificates/activate", json=body)

    def create_certificates_deactivate(self, body: OpenAiCertificateActivationRequest) -> OpenAiCertificateList:
        """Deactivate organization certificates"""
        return self._client.post(f"/v1/organization/certificates/deactivate", json=body)

    def delete_certificates(self, certificate_id: str) -> DeleteResult:
        """Delete organization certificate"""
        return self._client.delete(f"/v1/organization/certificates/{serialize_path_parameter(certificate_id, {'name': 'certificate_id', 'style': 'simple', 'explode': False})}")

    def list_costs(self, start_time: Optional[int] = None, end_time: Optional[int] = None, bucket_width: Optional[str] = None, project_ids: Optional[List[str]] = None, user_ids: Optional[List[str]] = None, api_key_ids: Optional[List[str]] = None, models: Optional[List[str]] = None, group_by: Optional[List[str]] = None, limit: Optional[int] = None, page: Optional[str] = None) -> OpenAiOrganizationCostList:
        """Get organization costs"""
        query = build_query_string([
            {'name': 'start_time', 'value': start_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'end_time', 'value': end_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'bucket_width', 'value': bucket_width, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'project_ids', 'value': project_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'user_ids', 'value': user_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'api_key_ids', 'value': api_key_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'models', 'value': models, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'group_by', 'value': group_by, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/costs", query))

    def list_groups(self, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiOrganizationGroupList:
        """List organization groups"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/groups", query))

    def create_group(self, body: OpenAiOrganizationGroupCreateRequest) -> OpenAiOrganizationGroup:
        """Create organization group"""
        return self._client.post(f"/v1/organization/groups", json=body)

    def delete_groups(self, group_id: str) -> DeleteResult:
        """Delete organization group"""
        return self._client.delete(f"/v1/organization/groups/{serialize_path_parameter(group_id, {'name': 'group_id', 'style': 'simple', 'explode': False})}")

    def list_groups_roles(self, group_id: str, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiRoleAssignmentList:
        """List organization group roles"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/groups/{serialize_path_parameter(group_id, {'name': 'group_id', 'style': 'simple', 'explode': False})}/roles", query))

    def create_groups_role(self, group_id: str, body: OpenAiRoleAssignmentCreateRequest) -> OpenAiRoleAssignment:
        """Create organization group role"""
        return self._client.post(f"/v1/organization/groups/{serialize_path_parameter(group_id, {'name': 'group_id', 'style': 'simple', 'explode': False})}/roles", json=body)

    def delete_groups_roles(self, group_id: str, role_id: str) -> DeleteResult:
        """Delete organization group role"""
        return self._client.delete(f"/v1/organization/groups/{serialize_path_parameter(group_id, {'name': 'group_id', 'style': 'simple', 'explode': False})}/roles/{serialize_path_parameter(role_id, {'name': 'role_id', 'style': 'simple', 'explode': False})}")

    def list_groups_users(self, group_id: str, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiOrganizationUserList:
        """List organization group users"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/groups/{serialize_path_parameter(group_id, {'name': 'group_id', 'style': 'simple', 'explode': False})}/users", query))

    def create_groups_user(self, group_id: str, body: OpenAiOrganizationGroupUserCreateRequest) -> OpenAiOrganizationUser:
        """Add organization group user"""
        return self._client.post(f"/v1/organization/groups/{serialize_path_parameter(group_id, {'name': 'group_id', 'style': 'simple', 'explode': False})}/users", json=body)

    def delete_groups_users(self, group_id: str, user_id: str) -> DeleteResult:
        """Delete organization group user"""
        return self._client.delete(f"/v1/organization/groups/{serialize_path_parameter(group_id, {'name': 'group_id', 'style': 'simple', 'explode': False})}/users/{serialize_path_parameter(user_id, {'name': 'user_id', 'style': 'simple', 'explode': False})}")

    def list_invites(self, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiOrganizationInviteList:
        """List organization invites"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/invites", query))

    def create_invite(self, body: OpenAiOrganizationInviteCreateRequest) -> OpenAiOrganizationInvite:
        """Create organization invite"""
        return self._client.post(f"/v1/organization/invites", json=body)

    def delete_invites(self, invite_id: str) -> DeleteResult:
        """Delete organization invite"""
        return self._client.delete(f"/v1/organization/invites/{serialize_path_parameter(invite_id, {'name': 'invite_id', 'style': 'simple', 'explode': False})}")

    def list_projects(self, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiProjectList:
        """List organization projects"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/projects", query))

    def create_project(self, body: OpenAiProjectCreateRequest) -> OpenAiProject:
        """Create organization project"""
        return self._client.post(f"/v1/organization/projects", json=body)

    def list_projects_api_keys(self, project_id: str, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiProjectApiKeyList:
        """List project API keys"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/projects/{serialize_path_parameter(project_id, {'name': 'project_id', 'style': 'simple', 'explode': False})}/api_keys", query))

    def delete_projects_api_keys(self, project_id: str, key_id: str) -> DeleteResult:
        """Delete project API key"""
        return self._client.delete(f"/v1/organization/projects/{serialize_path_parameter(project_id, {'name': 'project_id', 'style': 'simple', 'explode': False})}/api_keys/{serialize_path_parameter(key_id, {'name': 'key_id', 'style': 'simple', 'explode': False})}")

    def create_projects_archive(self, project_id: str) -> OpenAiProject:
        """Archive organization project"""
        return self._client.post(f"/v1/organization/projects/{serialize_path_parameter(project_id, {'name': 'project_id', 'style': 'simple', 'explode': False})}/archive")

    def list_projects_certificates(self, project_id: str, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiCertificateList:
        """List project certificates"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/projects/{serialize_path_parameter(project_id, {'name': 'project_id', 'style': 'simple', 'explode': False})}/certificates", query))

    def create_projects_certificates_activate(self, project_id: str, body: OpenAiCertificateActivationRequest) -> OpenAiCertificateList:
        """Activate project certificates"""
        return self._client.post(f"/v1/organization/projects/{serialize_path_parameter(project_id, {'name': 'project_id', 'style': 'simple', 'explode': False})}/certificates/activate", json=body)

    def create_projects_certificates_deactivate(self, project_id: str, body: OpenAiCertificateActivationRequest) -> OpenAiCertificateList:
        """Deactivate project certificates"""
        return self._client.post(f"/v1/organization/projects/{serialize_path_parameter(project_id, {'name': 'project_id', 'style': 'simple', 'explode': False})}/certificates/deactivate", json=body)

    def list_projects_groups(self, project_id: str, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiOrganizationGroupList:
        """List project groups"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/projects/{serialize_path_parameter(project_id, {'name': 'project_id', 'style': 'simple', 'explode': False})}/groups", query))

    def create_projects_group(self, project_id: str, body: OpenAiProjectGroupCreateRequest) -> OpenAiOrganizationGroup:
        """Create project group"""
        return self._client.post(f"/v1/organization/projects/{serialize_path_parameter(project_id, {'name': 'project_id', 'style': 'simple', 'explode': False})}/groups", json=body)

    def delete_projects_groups(self, project_id: str, group_id: str) -> DeleteResult:
        """Delete project group"""
        return self._client.delete(f"/v1/organization/projects/{serialize_path_parameter(project_id, {'name': 'project_id', 'style': 'simple', 'explode': False})}/groups/{serialize_path_parameter(group_id, {'name': 'group_id', 'style': 'simple', 'explode': False})}")

    def list_projects_rate_limits(self, project_id: str, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiProjectRateLimitList:
        """List project rate limits"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/projects/{serialize_path_parameter(project_id, {'name': 'project_id', 'style': 'simple', 'explode': False})}/rate_limits", query))

    def create_projects_rate_limit(self, project_id: str, rate_limit_id: str, body: OpenAiProjectRateLimitUpdateRequest) -> OpenAiProjectRateLimit:
        """Modify project rate limit"""
        return self._client.post(f"/v1/organization/projects/{serialize_path_parameter(project_id, {'name': 'project_id', 'style': 'simple', 'explode': False})}/rate_limits/{serialize_path_parameter(rate_limit_id, {'name': 'rate_limit_id', 'style': 'simple', 'explode': False})}", json=body)

    def list_projects_service_accounts(self, project_id: str, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiProjectServiceAccountList:
        """List project service accounts"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/projects/{serialize_path_parameter(project_id, {'name': 'project_id', 'style': 'simple', 'explode': False})}/service_accounts", query))

    def create_projects_service_account(self, project_id: str, body: OpenAiProjectServiceAccountCreateRequest) -> OpenAiProjectServiceAccount:
        """Create project service account"""
        return self._client.post(f"/v1/organization/projects/{serialize_path_parameter(project_id, {'name': 'project_id', 'style': 'simple', 'explode': False})}/service_accounts", json=body)

    def delete_projects_service_accounts(self, project_id: str, service_account_id: str) -> DeleteResult:
        """Delete project service account"""
        return self._client.delete(f"/v1/organization/projects/{serialize_path_parameter(project_id, {'name': 'project_id', 'style': 'simple', 'explode': False})}/service_accounts/{serialize_path_parameter(service_account_id, {'name': 'service_account_id', 'style': 'simple', 'explode': False})}")

    def list_projects_users(self, project_id: str, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiProjectUserList:
        """List project users"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/projects/{serialize_path_parameter(project_id, {'name': 'project_id', 'style': 'simple', 'explode': False})}/users", query))

    def create_projects_user(self, project_id: str, body: OpenAiProjectUserCreateRequest) -> OpenAiProjectUser:
        """Create project user"""
        return self._client.post(f"/v1/organization/projects/{serialize_path_parameter(project_id, {'name': 'project_id', 'style': 'simple', 'explode': False})}/users", json=body)

    def delete_projects_users(self, project_id: str, user_id: str) -> DeleteResult:
        """Delete project user"""
        return self._client.delete(f"/v1/organization/projects/{serialize_path_parameter(project_id, {'name': 'project_id', 'style': 'simple', 'explode': False})}/users/{serialize_path_parameter(user_id, {'name': 'user_id', 'style': 'simple', 'explode': False})}")

    def list_roles(self, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiRoleList:
        """List organization roles"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/roles", query))

    def create_role(self, body: OpenAiRoleCreateRequest) -> OpenAiRole:
        """Create organization role"""
        return self._client.post(f"/v1/organization/roles", json=body)

    def delete_roles(self, role_id: str) -> DeleteResult:
        """Delete organization role"""
        return self._client.delete(f"/v1/organization/roles/{serialize_path_parameter(role_id, {'name': 'role_id', 'style': 'simple', 'explode': False})}")

    def list_usage_audio_speeches(self, start_time: Optional[int] = None, end_time: Optional[int] = None, bucket_width: Optional[str] = None, project_ids: Optional[List[str]] = None, user_ids: Optional[List[str]] = None, api_key_ids: Optional[List[str]] = None, models: Optional[List[str]] = None, group_by: Optional[List[str]] = None, limit: Optional[int] = None, page: Optional[str] = None) -> OpenAiOrganizationUsageList:
        """Get audio speech usage"""
        query = build_query_string([
            {'name': 'start_time', 'value': start_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'end_time', 'value': end_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'bucket_width', 'value': bucket_width, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'project_ids', 'value': project_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'user_ids', 'value': user_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'api_key_ids', 'value': api_key_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'models', 'value': models, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'group_by', 'value': group_by, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/usage/audio_speeches", query))

    def list_usage_audio_transcriptions(self, start_time: Optional[int] = None, end_time: Optional[int] = None, bucket_width: Optional[str] = None, project_ids: Optional[List[str]] = None, user_ids: Optional[List[str]] = None, api_key_ids: Optional[List[str]] = None, models: Optional[List[str]] = None, group_by: Optional[List[str]] = None, limit: Optional[int] = None, page: Optional[str] = None) -> OpenAiOrganizationUsageList:
        """Get audio transcription usage"""
        query = build_query_string([
            {'name': 'start_time', 'value': start_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'end_time', 'value': end_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'bucket_width', 'value': bucket_width, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'project_ids', 'value': project_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'user_ids', 'value': user_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'api_key_ids', 'value': api_key_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'models', 'value': models, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'group_by', 'value': group_by, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/usage/audio_transcriptions", query))

    def list_usage_code_interpreter_sessions(self, start_time: Optional[int] = None, end_time: Optional[int] = None, bucket_width: Optional[str] = None, project_ids: Optional[List[str]] = None, user_ids: Optional[List[str]] = None, api_key_ids: Optional[List[str]] = None, models: Optional[List[str]] = None, group_by: Optional[List[str]] = None, limit: Optional[int] = None, page: Optional[str] = None) -> OpenAiOrganizationUsageList:
        """Get code interpreter session usage"""
        query = build_query_string([
            {'name': 'start_time', 'value': start_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'end_time', 'value': end_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'bucket_width', 'value': bucket_width, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'project_ids', 'value': project_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'user_ids', 'value': user_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'api_key_ids', 'value': api_key_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'models', 'value': models, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'group_by', 'value': group_by, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/usage/code_interpreter_sessions", query))

    def list_usage_completions(self, start_time: Optional[int] = None, end_time: Optional[int] = None, bucket_width: Optional[str] = None, project_ids: Optional[List[str]] = None, user_ids: Optional[List[str]] = None, api_key_ids: Optional[List[str]] = None, models: Optional[List[str]] = None, group_by: Optional[List[str]] = None, limit: Optional[int] = None, page: Optional[str] = None) -> OpenAiOrganizationUsageList:
        """Get completions usage"""
        query = build_query_string([
            {'name': 'start_time', 'value': start_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'end_time', 'value': end_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'bucket_width', 'value': bucket_width, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'project_ids', 'value': project_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'user_ids', 'value': user_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'api_key_ids', 'value': api_key_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'models', 'value': models, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'group_by', 'value': group_by, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/usage/completions", query))

    def list_usage_embeddings(self, start_time: Optional[int] = None, end_time: Optional[int] = None, bucket_width: Optional[str] = None, project_ids: Optional[List[str]] = None, user_ids: Optional[List[str]] = None, api_key_ids: Optional[List[str]] = None, models: Optional[List[str]] = None, group_by: Optional[List[str]] = None, limit: Optional[int] = None, page: Optional[str] = None) -> OpenAiOrganizationUsageList:
        """Get embeddings usage"""
        query = build_query_string([
            {'name': 'start_time', 'value': start_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'end_time', 'value': end_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'bucket_width', 'value': bucket_width, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'project_ids', 'value': project_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'user_ids', 'value': user_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'api_key_ids', 'value': api_key_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'models', 'value': models, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'group_by', 'value': group_by, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/usage/embeddings", query))

    def list_usage_images(self, start_time: Optional[int] = None, end_time: Optional[int] = None, bucket_width: Optional[str] = None, project_ids: Optional[List[str]] = None, user_ids: Optional[List[str]] = None, api_key_ids: Optional[List[str]] = None, models: Optional[List[str]] = None, group_by: Optional[List[str]] = None, limit: Optional[int] = None, page: Optional[str] = None) -> OpenAiOrganizationUsageList:
        """Get image usage"""
        query = build_query_string([
            {'name': 'start_time', 'value': start_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'end_time', 'value': end_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'bucket_width', 'value': bucket_width, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'project_ids', 'value': project_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'user_ids', 'value': user_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'api_key_ids', 'value': api_key_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'models', 'value': models, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'group_by', 'value': group_by, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/usage/images", query))

    def list_usage_moderations(self, start_time: Optional[int] = None, end_time: Optional[int] = None, bucket_width: Optional[str] = None, project_ids: Optional[List[str]] = None, user_ids: Optional[List[str]] = None, api_key_ids: Optional[List[str]] = None, models: Optional[List[str]] = None, group_by: Optional[List[str]] = None, limit: Optional[int] = None, page: Optional[str] = None) -> OpenAiOrganizationUsageList:
        """Get moderation usage"""
        query = build_query_string([
            {'name': 'start_time', 'value': start_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'end_time', 'value': end_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'bucket_width', 'value': bucket_width, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'project_ids', 'value': project_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'user_ids', 'value': user_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'api_key_ids', 'value': api_key_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'models', 'value': models, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'group_by', 'value': group_by, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/usage/moderations", query))

    def list_usage_vector_stores(self, start_time: Optional[int] = None, end_time: Optional[int] = None, bucket_width: Optional[str] = None, project_ids: Optional[List[str]] = None, user_ids: Optional[List[str]] = None, api_key_ids: Optional[List[str]] = None, models: Optional[List[str]] = None, group_by: Optional[List[str]] = None, limit: Optional[int] = None, page: Optional[str] = None) -> OpenAiOrganizationUsageList:
        """Get vector store usage"""
        query = build_query_string([
            {'name': 'start_time', 'value': start_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'end_time', 'value': end_time, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'bucket_width', 'value': bucket_width, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'project_ids', 'value': project_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'user_ids', 'value': user_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'api_key_ids', 'value': api_key_ids, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'models', 'value': models, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'group_by', 'value': group_by, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'page', 'value': page, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/usage/vector_stores", query))

    def list_users(self, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiOrganizationUserList:
        """List organization users"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/users", query))

    def delete_users(self, user_id: str) -> DeleteResult:
        """Delete organization user"""
        return self._client.delete(f"/v1/organization/users/{serialize_path_parameter(user_id, {'name': 'user_id', 'style': 'simple', 'explode': False})}")

    def create_user(self, user_id: str, body: OpenAiOrganizationUserUpdateRequest) -> OpenAiOrganizationUser:
        """Modify organization user"""
        return self._client.post(f"/v1/organization/users/{serialize_path_parameter(user_id, {'name': 'user_id', 'style': 'simple', 'explode': False})}", json=body)

    def list_users_roles(self, user_id: str, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiRoleAssignmentList:
        """List organization user roles"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/organization/users/{serialize_path_parameter(user_id, {'name': 'user_id', 'style': 'simple', 'explode': False})}/roles", query))

    def create_users_role(self, user_id: str, body: OpenAiRoleAssignmentCreateRequest) -> OpenAiRoleAssignment:
        """Create organization user role"""
        return self._client.post(f"/v1/organization/users/{serialize_path_parameter(user_id, {'name': 'user_id', 'style': 'simple', 'explode': False})}/roles", json=body)

    def delete_users_roles(self, user_id: str, role_id: str) -> DeleteResult:
        """Delete organization user role"""
        return self._client.delete(f"/v1/organization/users/{serialize_path_parameter(user_id, {'name': 'user_id', 'style': 'simple', 'explode': False})}/roles/{serialize_path_parameter(role_id, {'name': 'role_id', 'style': 'simple', 'explode': False})}")
