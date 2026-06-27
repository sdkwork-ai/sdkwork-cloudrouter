from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class StorageUsageLedgerEntry:
    """Storage usage ledger entry schema exposed by Claw Router."""
    id: str
    delta_bytes: Optional[str] = None
    occurred_at: Optional[str] = None
    scope_id: Optional[str] = None
    scope_type: Optional[str] = None
