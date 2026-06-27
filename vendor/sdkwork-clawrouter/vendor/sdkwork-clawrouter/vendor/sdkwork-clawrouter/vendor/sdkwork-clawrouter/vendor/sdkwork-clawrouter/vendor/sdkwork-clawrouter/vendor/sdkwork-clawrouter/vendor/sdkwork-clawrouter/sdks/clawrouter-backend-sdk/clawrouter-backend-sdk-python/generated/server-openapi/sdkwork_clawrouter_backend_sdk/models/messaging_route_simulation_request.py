from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MessagingRouteSimulationRequest:
    """Messaging route simulation request schema exposed by Claw Router."""
    channel: str
    delivery_purpose: str
    scene_code: str
    country_code: Optional[str] = None
    locale: Optional[str] = None
    user_segment: Optional[str] = None
