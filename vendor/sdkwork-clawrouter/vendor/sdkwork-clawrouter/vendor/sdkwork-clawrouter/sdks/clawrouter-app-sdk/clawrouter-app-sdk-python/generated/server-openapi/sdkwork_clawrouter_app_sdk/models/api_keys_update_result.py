from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .update_api_key_response import UpdateApiKeyResponse


@dataclass
class ApiKeysUpdateResult:
    """Api keys update result schema exposed by Claw Router."""
    code: str
    data: Optional[UpdateApiKeyResponse] = None
    msg: Optional[str] = None
