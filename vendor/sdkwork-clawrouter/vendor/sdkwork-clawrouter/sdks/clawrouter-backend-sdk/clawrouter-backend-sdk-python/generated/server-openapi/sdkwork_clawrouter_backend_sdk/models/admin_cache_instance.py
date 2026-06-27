from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminCacheInstance:
    """Admin cache instance schema exposed by Claw Router."""
    cache_deletes: str
    cache_errors: str
    cache_hits: str
    cache_inspections: str
    cache_misses: str
    cache_refreshes: str
    cache_writes: str
    default_ttl_seconds: str
    entry_count: str
    expired_entry_count: str
    key_prefix: str
    name: str
    provider_kind: str
    purpose: str
    status: str
    supports_delete: bool
    supports_inspect: bool
    supports_refresh: bool
    connection_profile_name: Optional[str] = None
    max_entries: Optional[str] = None
