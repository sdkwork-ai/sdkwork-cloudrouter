from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class BlackForestLabsVideoGenerationTask:
    """Black Forest Labs asynchronous FLUX video generation record; poll GET /black_forest_labs/v1/get_result until status is Ready."""
    details: Optional[Dict[str, str]] = None
    id: Optional[str] = None
    polling_url: Optional[str] = None
    progress: Optional[float] = None
    result: Optional[Dict[str, str]] = None
    status: Optional[str] = None
