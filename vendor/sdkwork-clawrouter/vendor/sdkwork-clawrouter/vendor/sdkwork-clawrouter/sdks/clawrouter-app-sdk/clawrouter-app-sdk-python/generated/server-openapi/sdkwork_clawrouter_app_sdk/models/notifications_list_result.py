from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .notification_list_response import NotificationListResponse


@dataclass
class NotificationsListResult:
    """Notifications list result schema exposed by Claw Router."""
    code: str
    data: Optional[NotificationListResponse] = None
    msg: Optional[str] = None
