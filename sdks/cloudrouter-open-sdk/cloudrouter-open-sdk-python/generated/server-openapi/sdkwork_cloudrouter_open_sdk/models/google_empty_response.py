from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleEmptyResponse:
    """Empty JSON object returned by Google APIs for successful delete operations."""
    object: str
