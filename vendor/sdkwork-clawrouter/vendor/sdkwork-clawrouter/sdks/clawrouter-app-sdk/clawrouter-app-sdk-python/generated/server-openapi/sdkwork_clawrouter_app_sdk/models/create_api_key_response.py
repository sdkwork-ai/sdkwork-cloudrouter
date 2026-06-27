from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .app_api_key_item import AppApiKeyItem


@dataclass
class CreateApiKeyResponse:
    """Create api key response schema exposed by Claw Router."""
    item: AppApiKeyItem
    raw_key: str
