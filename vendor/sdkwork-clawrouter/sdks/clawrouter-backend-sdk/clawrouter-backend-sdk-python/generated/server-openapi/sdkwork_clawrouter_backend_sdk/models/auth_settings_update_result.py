from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_auth_settings_response import AdminAuthSettingsResponse


@dataclass
class AuthSettingsUpdateResult:
    """Auth settings update result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminAuthSettingsResponse] = None
    msg: Optional[str] = None
