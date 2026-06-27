from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class NotificationItem:
    """Notification item schema exposed by Claw Router."""
    app_id: str
    archived: bool
    content: str
    desc: str
    id: str
    popup_seen: bool
    read: bool
    show_as_popup: bool
    time: str
    title: str
    type: str
    action_url: Optional[str] = None
