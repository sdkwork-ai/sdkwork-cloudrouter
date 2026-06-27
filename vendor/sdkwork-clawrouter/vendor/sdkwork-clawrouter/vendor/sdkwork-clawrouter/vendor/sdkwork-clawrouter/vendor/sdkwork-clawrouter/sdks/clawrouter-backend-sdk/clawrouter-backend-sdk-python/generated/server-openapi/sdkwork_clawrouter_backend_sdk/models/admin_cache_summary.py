from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminCacheSummary:
    """Admin cache summary schema exposed by Claw Router."""
    cache_deletes: str
    cache_errors: str
    cache_hits: str
    cache_inspections: str
    cache_misses: str
    cache_refreshes: str
    cache_writes: str
    expired_entries: str
    runtime_target: str
    total_entries: str
    total_instances: str
    total_namespaces: str
