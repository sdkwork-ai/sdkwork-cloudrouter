from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class RuntimeInvocationCreateRequest:
    """Runtime invocation create request schema exposed by Claw Router."""
    runtime: str
    agent_run_id: Optional[str] = None
    agent_run_step_id: Optional[str] = None
    agent_session_id: Optional[str] = None
    approval_policy: Optional[str] = None
    chat_item_id: Optional[str] = None
    chat_turn_id: Optional[str] = None
    conversation_id: Optional[str] = None
    cwd: Optional[str] = None
    endpoint: Optional[str] = None
    invocation_type: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    model: Optional[str] = None
    permission_mode: Optional[str] = None
    provider: Optional[str] = None
    request_json: Optional[Dict[str, str]] = None
    sandbox_policy: Optional[str] = None
    status: Optional[str] = None
    streaming: Optional[bool] = None
    tool_call_id: Optional[str] = None
    tool_name: Optional[str] = None
    trace_id: Optional[str] = None
