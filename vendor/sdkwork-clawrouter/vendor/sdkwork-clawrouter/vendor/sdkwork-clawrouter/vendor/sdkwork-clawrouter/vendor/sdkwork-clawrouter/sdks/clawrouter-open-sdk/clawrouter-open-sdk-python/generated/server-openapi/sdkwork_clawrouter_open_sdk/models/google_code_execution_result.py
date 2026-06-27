from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class GoogleCodeExecutionResult:
    """Google Gemini google code execution result schema exposed by Claw Router vendor routing."""
    outcome: Optional[str] = None
    output: Optional[str] = None
