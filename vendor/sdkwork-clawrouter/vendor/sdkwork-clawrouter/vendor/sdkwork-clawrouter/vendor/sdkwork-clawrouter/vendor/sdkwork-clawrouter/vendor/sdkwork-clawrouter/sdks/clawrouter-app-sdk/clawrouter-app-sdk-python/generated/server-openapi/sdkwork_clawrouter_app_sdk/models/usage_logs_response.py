from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .usage_log_item import UsageLogItem


@dataclass
class UsageLogsResponse:
    """Usage logs response schema exposed by Claw Router."""
    logs: List[UsageLogItem]
    page: str
    page_size: str
    total: str
