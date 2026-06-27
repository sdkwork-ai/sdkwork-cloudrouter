from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class RuntimeInvocationItem:
    """Runtime invocation item schema exposed by Claw Router."""
    attempt_no: str
    created_at: str
    id: str
    invocation_no: str
    invocation_type: str
    runtime: str
    status: str
    streaming: bool
    agent_run_id: Optional[str] = None
    agent_run_step_id: Optional[str] = None
    agent_session_id: Optional[str] = None
    approval_policy: Optional[str] = None
    chat_item_id: Optional[str] = None
    chat_turn_id: Optional[str] = None
    completed_at: Optional[str] = None
    conversation_id: Optional[str] = None
    cwd: Optional[str] = None
    endpoint: Optional[str] = None
    error_code: Optional[str] = None
    error_message_masked: Optional[str] = None
    error_type: Optional[str] = None
    exit_code: Optional[str] = None
    finish_reason: Optional[str] = None
    latency_ms: Optional[str] = None
    model: Optional[str] = None
    permission_mode: Optional[str] = None
    provider: Optional[str] = None
    provider_conversation_id: Optional[str] = None
    provider_response_id: Optional[str] = None
    provider_session_id: Optional[str] = None
    provider_step_id: Optional[str] = None
    request_id: Optional[str] = None
    sandbox_policy: Optional[str] = None
    started_at: Optional[str] = None
    tool_call_id: Optional[str] = None
    tool_name: Optional[str] = None
    trace_id: Optional[str] = None
    ttft_ms: Optional[str] = None
