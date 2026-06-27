from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class RoutingRequestTraceItem:
    """Routing request trace item schema exposed by Claw Router."""
    channel: str
    duration: str
    ended_at: str
    error_message_masked: str
    error_type: str
    http_method: str
    id: str
    model: str
    provider_error_code: str
    request_bytes: str
    request_id: str
    request_path: str
    request_payload_hash: str
    response_bytes: str
    response_payload_hash: str
    started_at: str
    status: str
    streaming: bool
    time: str
    tokens: str
    trace_id: str
