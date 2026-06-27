from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_ai_resource_item import AdminAiResourceItem


@dataclass
class AdminAiResourcesResponse:
    """Admin ai resources response schema exposed by Claw Router."""
    items: List[AdminAiResourceItem]
