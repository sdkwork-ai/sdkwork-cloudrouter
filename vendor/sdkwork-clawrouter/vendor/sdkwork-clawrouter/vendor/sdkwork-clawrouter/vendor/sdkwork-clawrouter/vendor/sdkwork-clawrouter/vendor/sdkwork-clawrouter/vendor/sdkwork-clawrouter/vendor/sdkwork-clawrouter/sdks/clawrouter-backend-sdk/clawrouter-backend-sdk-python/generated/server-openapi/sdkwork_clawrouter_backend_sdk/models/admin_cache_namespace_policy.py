from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminCacheNamespacePolicy:
    """Admin cache namespace policy schema exposed by Claw Router."""
    consistency: str
    enabled: bool
    failure_mode: str
    instance_name: str
    jitter_percent: str
    namespace: str
    scope: str
    sensitivity: str
    stale_while_revalidate_seconds: str
    tags: List[str]
    ttl_seconds: str
