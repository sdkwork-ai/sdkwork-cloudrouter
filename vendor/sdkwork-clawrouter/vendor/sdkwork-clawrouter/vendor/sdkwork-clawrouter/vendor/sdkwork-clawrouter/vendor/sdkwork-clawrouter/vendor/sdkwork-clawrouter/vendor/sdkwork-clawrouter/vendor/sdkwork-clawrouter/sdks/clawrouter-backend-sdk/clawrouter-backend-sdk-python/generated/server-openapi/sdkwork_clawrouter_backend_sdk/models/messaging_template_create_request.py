from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MessagingTemplateCreateRequest:
    """Messaging template create request schema exposed by Claw Router."""
    body_template: str
    category: str
    channel: str
    delivery_purpose: str
    scene_code: str
    template_code: str
    template_name: str
    content_format: Optional[str] = None
    locale: Optional[str] = None
    subject_template: Optional[str] = None
    variable_schema: Optional[Dict[str, str]] = None
