from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class BlackForestLabsImageGenerationTask:
    """Black Forest Labs asynchronous FLUX generation record."""
    details: Optional[Dict[str, str]] = None
    id: Optional[str] = None
    polling_url: Optional[str] = None
    progress: Optional[float] = None
    result: Optional[Dict[str, str]] = None
    status: Optional[str] = None
