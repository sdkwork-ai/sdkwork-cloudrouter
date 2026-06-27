from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .usage_snapshot import UsageSnapshot


@dataclass
class RuntimeInvocationCompleteRequest:
    """Runtime invocation complete request schema exposed by Claw Router."""
    error_code: Optional[str] = None
    error_message_masked: Optional[str] = None
    error_type: Optional[str] = None
    exit_code: Optional[str] = None
    finish_reason: Optional[str] = None
    latency_ms: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    provider_conversation_id: Optional[str] = None
    provider_response_id: Optional[str] = None
    provider_session_id: Optional[str] = None
    provider_step_id: Optional[str] = None
    response_json: Optional[Dict[str, str]] = None
    status: Optional[str] = None
    ttft_ms: Optional[str] = None
    usage_json: Optional[UsageSnapshot] = None
