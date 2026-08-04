from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiThreadMessage:
    """OpenAI-compatible thread message object."""
    content: List[str]
    created_at: int
    id: str
    object: str
    role: str
    thread_id: str
    assistant_id: Optional[str] = None
    attachments: Optional[List[str]] = None
    completed_at: Optional[int] = None
    incomplete_at: Optional[int] = None
    incomplete_details: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    run_id: Optional[str] = None
    status: Optional[str] = None
