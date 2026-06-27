from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminPromptVersionCreateRequest:
    """Admin prompt version create request schema exposed by Claw Router."""
    content: str
    title: str
    version_no: str
    examples_json: Optional[List[Dict[str, str]]] = None
    model_constraints: Optional[Dict[str, str]] = None
    output_schema: Optional[Dict[str, str]] = None
    safety_policy: Optional[Dict[str, str]] = None
    variable_schema: Optional[Dict[str, str]] = None
