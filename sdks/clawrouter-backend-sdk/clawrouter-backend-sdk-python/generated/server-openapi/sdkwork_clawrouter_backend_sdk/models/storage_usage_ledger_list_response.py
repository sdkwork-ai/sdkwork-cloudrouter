from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .storage_usage_ledger_entry import StorageUsageLedgerEntry


@dataclass
class StorageUsageLedgerListResponse:
    """Storage usage ledger list response schema exposed by Claw Router."""
    items: List[StorageUsageLedgerEntry]
    request_id: str
    next_cursor: Optional[str] = None
