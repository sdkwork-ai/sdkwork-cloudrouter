from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class PixverseTaskResp:
    """PixVerse task payload shared by creation and polling."""
    aspect_ratio: Optional[str] = None
    create_time: Optional[str] = None
    credits: Optional[int] = None
    customer_paths: Optional[Dict[str, str]] = None
    duration: Optional[int] = None
    has_audio: Optional[bool] = None
    id: Optional[int] = None
    modify_time: Optional[str] = None
    negative_prompt: Optional[str] = None
    output_height: Optional[int] = None
    output_width: Optional[int] = None
    path: Optional[str] = None
    prompt: Optional[str] = None
    quality: Optional[str] = None
    resolution_ratio: Optional[int] = None
    seed: Optional[int] = None
    size: Optional[int] = None
    status: Optional[int] = None
    style: Optional[str] = None
    url: Optional[str] = None
    video_id: Optional[int] = None
