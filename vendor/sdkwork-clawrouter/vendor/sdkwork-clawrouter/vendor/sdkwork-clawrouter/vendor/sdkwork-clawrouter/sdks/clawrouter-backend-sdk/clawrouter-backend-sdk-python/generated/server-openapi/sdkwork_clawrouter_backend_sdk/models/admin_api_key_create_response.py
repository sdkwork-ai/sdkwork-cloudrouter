from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_api_key_item import AdminApiKeyItem


@dataclass
class AdminApiKeyCreateResponse:
    """Admin api key create response schema exposed by Claw Router."""
    key: AdminApiKeyItem
    raw_key: str
