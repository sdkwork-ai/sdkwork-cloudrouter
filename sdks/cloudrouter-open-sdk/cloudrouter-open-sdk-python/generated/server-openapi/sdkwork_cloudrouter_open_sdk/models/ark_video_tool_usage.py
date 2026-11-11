from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ArkVideoToolUsage:
    """Ark tool usage counters."""
    web_search: Optional[int] = None
