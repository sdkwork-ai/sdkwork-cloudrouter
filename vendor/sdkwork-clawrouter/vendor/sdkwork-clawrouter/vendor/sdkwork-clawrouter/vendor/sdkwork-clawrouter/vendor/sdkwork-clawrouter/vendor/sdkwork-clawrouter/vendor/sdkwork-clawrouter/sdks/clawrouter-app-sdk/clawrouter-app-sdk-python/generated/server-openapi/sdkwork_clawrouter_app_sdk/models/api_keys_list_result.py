from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .app_api_key_list_response import AppApiKeyListResponse


@dataclass
class ApiKeysListResult:
    """Api keys list result schema exposed by Claw Router."""
    code: str
    data: Optional[AppApiKeyListResponse] = None
    msg: Optional[str] = None
