from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_announcement_item import AdminAnnouncementItem


@dataclass
class AdminAnnouncementMutationResponse:
    """Admin announcement mutation response schema exposed by Claw Router."""
    item: AdminAnnouncementItem
