from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_record_log_item import AdminRecordLogItem


@dataclass
class AdminRecordLogsResponse:
    """Admin record logs response schema exposed by Claw Router."""
    logs: List[AdminRecordLogItem]
    page: str
    page_size: str
    total: str
