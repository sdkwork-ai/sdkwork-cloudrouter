from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class RoutingApiKeyItem:
    """Routing api key item schema exposed by Claw Router."""
    created_at: str
    display_key: str
    id: str
    name: str
    status: str
    total_usage: str
    copyable_key: Optional[str] = None
