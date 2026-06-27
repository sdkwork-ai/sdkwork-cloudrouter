from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleUrlContextTool:
    """Google URL context tool configuration."""
    allowed_domains: Optional[List[str]] = None
