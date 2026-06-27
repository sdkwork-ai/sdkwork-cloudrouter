from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .delete_api_key_response import DeleteApiKeyResponse


@dataclass
class ApiKeysDeleteResult:
    """Api keys delete result schema exposed by Claw Router."""
    code: str
    data: Optional[DeleteApiKeyResponse] = None
    msg: Optional[str] = None
