from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_record_logs_response import AdminRecordLogsResponse


@dataclass
class RecordsListResult:
    """Records list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminRecordLogsResponse] = None
    msg: Optional[str] = None
