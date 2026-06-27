from typing import Any, Dict, List, Optional
from ..http_client import HttpClient
from ..models import DeleteResult, OpenAiFineTuningCheckpointPermission, OpenAiFineTuningCheckpointPermissionCreateRequest, OpenAiFineTuningCheckpointPermissionList, OpenAiFineTuningGraderRunRequest, OpenAiFineTuningGraderRunResult, OpenAiFineTuningGraderValidateRequest, OpenAiFineTuningGraderValidationResult, OpenAiFineTuningJob, OpenAiFineTuningJobCheckpointList, OpenAiFineTuningJobCreateRequest, OpenAiFineTuningJobEventList, OpenAiFineTuningJobList

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




class FineTuningApi:
    """fine_tuning API client."""

    def __init__(self, client: HttpClient):
        self._client = client

    def create_run(self, body: OpenAiFineTuningGraderRunRequest) -> OpenAiFineTuningGraderRunResult:
        """Run fine-tuning grader"""
        return self._client.post(f"/v1/fine_tuning/alpha/graders/run", json=body)

    def create_validate(self, body: OpenAiFineTuningGraderValidateRequest) -> OpenAiFineTuningGraderValidationResult:
        """Validate fine-tuning grader"""
        return self._client.post(f"/v1/fine_tuning/alpha/graders/validate", json=body)

    def retrieve_permissions(self, fine_tuned_model_checkpoint: str, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None, project_id: Optional[str] = None) -> OpenAiFineTuningCheckpointPermissionList:
        """List fine-tuning checkpoint permissions"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'project_id', 'value': project_id, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/fine_tuning/checkpoints/{serialize_path_parameter(fine_tuned_model_checkpoint, {'name': 'fine_tuned_model_checkpoint', 'style': 'simple', 'explode': False})}/permissions", query))

    def create_permissions(self, fine_tuned_model_checkpoint: str, body: OpenAiFineTuningCheckpointPermissionCreateRequest) -> OpenAiFineTuningCheckpointPermission:
        """Create fine-tuning checkpoint permission"""
        return self._client.post(f"/v1/fine_tuning/checkpoints/{serialize_path_parameter(fine_tuned_model_checkpoint, {'name': 'fine_tuned_model_checkpoint', 'style': 'simple', 'explode': False})}/permissions", json=body)

    def delete_permissions(self, fine_tuned_model_checkpoint: str, permission_id: str) -> DeleteResult:
        """Delete fine-tuning checkpoint permission"""
        return self._client.delete(f"/v1/fine_tuning/checkpoints/{serialize_path_parameter(fine_tuned_model_checkpoint, {'name': 'fine_tuned_model_checkpoint', 'style': 'simple', 'explode': False})}/permissions/{serialize_path_parameter(permission_id, {'name': 'permission_id', 'style': 'simple', 'explode': False})}")

    def list_jobs(self, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiFineTuningJobList:
        """List fine-tuning jobs"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/fine_tuning/jobs", query))

    def create_jobs(self, body: OpenAiFineTuningJobCreateRequest) -> OpenAiFineTuningJob:
        """Create fine-tuning job"""
        return self._client.post(f"/v1/fine_tuning/jobs", json=body)

    def retrieve_jobs(self, fine_tuning_job_id: str) -> OpenAiFineTuningJob:
        """Retrieve fine-tuning job"""
        return self._client.get(f"/v1/fine_tuning/jobs/{serialize_path_parameter(fine_tuning_job_id, {'name': 'fine_tuning_job_id', 'style': 'simple', 'explode': False})}")

    def create_cancel(self, fine_tuning_job_id: str) -> OpenAiFineTuningJob:
        """Cancel fine-tuning job"""
        return self._client.post(f"/v1/fine_tuning/jobs/{serialize_path_parameter(fine_tuning_job_id, {'name': 'fine_tuning_job_id', 'style': 'simple', 'explode': False})}/cancel")

    def retrieve_checkpoints(self, fine_tuning_job_id: str, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiFineTuningJobCheckpointList:
        """List fine-tuning checkpoints"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/fine_tuning/jobs/{serialize_path_parameter(fine_tuning_job_id, {'name': 'fine_tuning_job_id', 'style': 'simple', 'explode': False})}/checkpoints", query))

    def retrieve_events(self, fine_tuning_job_id: str, limit: Optional[int] = None, order: Optional[str] = None, after: Optional[str] = None, before: Optional[str] = None) -> OpenAiFineTuningJobEventList:
        """List fine-tuning events"""
        query = build_query_string([
            {'name': 'limit', 'value': limit, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'order', 'value': order, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'after', 'value': after, 'style': 'form', 'explode': True, 'allow_reserved': False},
            {'name': 'before', 'value': before, 'style': 'form', 'explode': True, 'allow_reserved': False},
        ])
        return self._client.get(_append_query_string(f"/v1/fine_tuning/jobs/{serialize_path_parameter(fine_tuning_job_id, {'name': 'fine_tuning_job_id', 'style': 'simple', 'explode': False})}/events", query))

    def create_pause(self, fine_tuning_job_id: str) -> OpenAiFineTuningJob:
        """Pause fine-tuning job"""
        return self._client.post(f"/v1/fine_tuning/jobs/{serialize_path_parameter(fine_tuning_job_id, {'name': 'fine_tuning_job_id', 'style': 'simple', 'explode': False})}/pause")

    def create_resume(self, fine_tuning_job_id: str) -> OpenAiFineTuningJob:
        """Resume fine-tuning job"""
        return self._client.post(f"/v1/fine_tuning/jobs/{serialize_path_parameter(fine_tuning_job_id, {'name': 'fine_tuning_job_id', 'style': 'simple', 'explode': False})}/resume")
