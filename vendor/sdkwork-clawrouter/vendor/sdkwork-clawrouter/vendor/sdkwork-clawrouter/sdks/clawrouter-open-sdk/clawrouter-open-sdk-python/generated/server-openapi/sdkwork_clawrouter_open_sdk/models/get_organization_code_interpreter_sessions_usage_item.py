from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GetOrganizationCodeInterpreterSessionsUsageItem:
    """Item module returned inside the getOrganizationCodeInterpreterSessionsUsage list response."""
    created: Optional[int] = None
    created_at: Optional[int] = None
    email: Optional[str] = None
    id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
    object: Optional[str] = None
    project_id: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
