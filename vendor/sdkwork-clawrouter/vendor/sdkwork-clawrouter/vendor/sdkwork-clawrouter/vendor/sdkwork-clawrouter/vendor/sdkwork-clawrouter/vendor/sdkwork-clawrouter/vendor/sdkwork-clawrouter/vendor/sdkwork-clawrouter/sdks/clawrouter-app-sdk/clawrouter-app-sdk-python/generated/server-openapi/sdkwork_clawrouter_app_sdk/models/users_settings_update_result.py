from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .update_settings_response import UpdateSettingsResponse


@dataclass
class UsersSettingsUpdateResult:
    """Users settings update result schema exposed by Claw Router."""
    code: str
    data: Optional[UpdateSettingsResponse] = None
    msg: Optional[str] = None
