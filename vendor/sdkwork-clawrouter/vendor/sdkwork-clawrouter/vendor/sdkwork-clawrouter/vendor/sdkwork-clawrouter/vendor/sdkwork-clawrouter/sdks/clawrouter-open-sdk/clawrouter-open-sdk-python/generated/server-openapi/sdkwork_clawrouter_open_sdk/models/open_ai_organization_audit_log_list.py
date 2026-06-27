from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_organization_audit_log import OpenAiOrganizationAuditLog


@dataclass
class OpenAiOrganizationAuditLogList:
    """OpenAI-compatible paginated list of organization audit log events."""
    data: List[OpenAiOrganizationAuditLog]
    object: str
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None
