from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class SettingsNotifications:
    """Settings notifications schema exposed by Claw Router."""
    api_monitor: bool
    bill_reminder: bool
    quota_warning: bool
