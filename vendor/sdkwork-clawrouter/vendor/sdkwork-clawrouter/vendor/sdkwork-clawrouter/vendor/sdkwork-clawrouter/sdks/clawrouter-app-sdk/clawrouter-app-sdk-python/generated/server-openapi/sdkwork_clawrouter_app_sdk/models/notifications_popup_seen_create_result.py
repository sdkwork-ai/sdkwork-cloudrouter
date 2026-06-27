from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .notification_mutation_response import NotificationMutationResponse


@dataclass
class NotificationsPopupSeenCreateResult:
    """Notifications popup seen create result schema exposed by Claw Router."""
    code: str
    data: Optional[NotificationMutationResponse] = None
    msg: Optional[str] = None
