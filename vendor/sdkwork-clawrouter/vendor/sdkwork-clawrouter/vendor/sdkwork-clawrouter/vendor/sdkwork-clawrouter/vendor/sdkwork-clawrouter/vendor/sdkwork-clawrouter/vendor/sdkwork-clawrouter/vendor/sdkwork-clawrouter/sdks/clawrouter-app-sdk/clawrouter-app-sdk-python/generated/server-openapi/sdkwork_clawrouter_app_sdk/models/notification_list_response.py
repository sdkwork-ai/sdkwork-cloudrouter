from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .notification_item import NotificationItem


@dataclass
class NotificationListResponse:
    """Notification list response schema exposed by Claw Router."""
    items: List[NotificationItem]
