from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class NoData:
    """Closed empty payload for operations that complete without business data."""
    pass
