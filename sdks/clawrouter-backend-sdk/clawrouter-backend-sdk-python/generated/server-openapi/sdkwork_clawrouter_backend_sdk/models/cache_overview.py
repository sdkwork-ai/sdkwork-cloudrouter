from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class CacheOverview:
    """Cache overview schema exposed by Claw Router."""
    instances: List[Dict[str, Any]]
    namespace_policies: List[Dict[str, Any]]
    summary: Dict[str, Any]
