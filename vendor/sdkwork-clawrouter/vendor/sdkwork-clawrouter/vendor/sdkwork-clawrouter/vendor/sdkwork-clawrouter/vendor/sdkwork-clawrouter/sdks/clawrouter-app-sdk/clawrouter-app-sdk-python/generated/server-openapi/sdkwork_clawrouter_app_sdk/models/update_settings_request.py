from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .settings_notifications import SettingsNotifications


@dataclass
class UpdateSettingsRequest:
    """Update settings request schema exposed by Claw Router."""
    language: str
    notifications: SettingsNotifications
    timezone: str
    webhook_url: str
