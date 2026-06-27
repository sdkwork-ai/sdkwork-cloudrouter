from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiOrganizationAuditLog:
    """OpenAI-compatible organization audit log event."""
    id: str
    object: str
    type: str
    actor: Optional[str] = None
    api_key_id: Optional[str] = None
    effective_at: Optional[int] = None
    metadata: Optional[Dict[str, str]] = None
    project: Optional[str] = None
    request: Optional[str] = None
