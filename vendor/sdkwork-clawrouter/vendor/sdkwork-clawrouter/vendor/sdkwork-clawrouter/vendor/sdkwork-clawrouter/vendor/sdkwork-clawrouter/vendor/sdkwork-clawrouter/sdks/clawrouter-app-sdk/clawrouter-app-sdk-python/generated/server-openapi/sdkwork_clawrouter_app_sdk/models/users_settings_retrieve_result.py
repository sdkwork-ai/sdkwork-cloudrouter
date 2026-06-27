from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .settings_data_response import SettingsDataResponse


@dataclass
class UsersSettingsRetrieveResult:
    """Users settings retrieve result schema exposed by Claw Router."""
    code: str
    data: Optional[SettingsDataResponse] = None
    msg: Optional[str] = None
