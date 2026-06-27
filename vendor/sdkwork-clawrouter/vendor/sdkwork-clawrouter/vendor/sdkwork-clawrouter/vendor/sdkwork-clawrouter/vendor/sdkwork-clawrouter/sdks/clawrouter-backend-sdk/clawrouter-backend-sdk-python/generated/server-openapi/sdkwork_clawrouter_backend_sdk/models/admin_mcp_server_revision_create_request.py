from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminMcpServerRevisionCreateRequest:
    """Admin mcp server revision create request schema exposed by Claw Router."""
    revision_no: str
    args_json: Optional[List[str]] = None
    auth_type: Optional[str] = None
    command: Optional[str] = None
    endpoint_url: Optional[str] = None
    env_schema: Optional[Dict[str, str]] = None
    retry_policy: Optional[Dict[str, str]] = None
    secret_ref: Optional[str] = None
    timeout_ms: Optional[int] = None
    transport: Optional[str] = None
