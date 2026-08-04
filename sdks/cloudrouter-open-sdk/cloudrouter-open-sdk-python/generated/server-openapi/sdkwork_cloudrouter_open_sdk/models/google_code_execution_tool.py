from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleCodeExecutionTool:
    """Google code execution tool configuration."""
    enabled: Optional[bool] = None
