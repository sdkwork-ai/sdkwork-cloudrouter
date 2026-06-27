from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminPromptVersionItem:
    """Admin prompt version item schema exposed by Claw Router."""
    checksum_hash: str
    content: str
    created_at: str
    created_by: str
    examples_json: List[Dict[str, str]]
    id: str
    lifecycle_status: str
    model_constraints: Dict[str, str]
    organization_id: str
    output_schema: Dict[str, str]
    prompt_id: str
    review_status: str
    safety_policy: Dict[str, str]
    tenant_id: str
    title: str
    updated_at: str
    uuid: str
    variable_schema: Dict[str, str]
    version_no: str
    published_at: Optional[str] = None
    review_comment: Optional[str] = None
