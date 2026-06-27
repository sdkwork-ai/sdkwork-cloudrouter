from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .messaging_collection_response import MessagingCollectionResponse


@dataclass
class RouteRulesListResult:
    """Route rules list result schema exposed by Claw Router."""
    code: str
    data: Optional[MessagingCollectionResponse] = None
    msg: Optional[str] = None
