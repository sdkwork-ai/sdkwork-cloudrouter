from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .usage_logs_response import UsageLogsResponse


@dataclass
class UsageLogsListResult:
    """Usage logs list result schema exposed by Claw Router."""
    code: str
    data: Optional[UsageLogsResponse] = None
    msg: Optional[str] = None
