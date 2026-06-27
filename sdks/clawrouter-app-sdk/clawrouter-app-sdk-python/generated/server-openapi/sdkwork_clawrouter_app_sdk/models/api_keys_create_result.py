from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .create_api_key_response import CreateApiKeyResponse


@dataclass
class ApiKeysCreateResult:
    """Api keys create result schema exposed by Claw Router."""
    code: str
    data: Optional[CreateApiKeyResponse] = None
    msg: Optional[str] = None
