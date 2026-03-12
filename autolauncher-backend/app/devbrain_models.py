"""Pydantic models for DevBrain Agent API."""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ==================== METADATA IMPORT ====================

class MetadataImport(BaseModel):
    """Import all metadata at once."""
    user_profile: dict
    apps_catalog: List[dict]
    decisions_log: List[dict]
    corrections_log: List[dict]
    sessions_metadata: List[dict] = []


class MetadataImportResponse(BaseModel):
    message: str
    apps_imported: int
    decisions_imported: int
    corrections_imported: int
    sessions_imported: int


# ==================== USER PROFILE ====================

class DevBrainProfileResponse(BaseModel):
    id: int
    preferred_tech_stack: str  # JSON string
    coding_conventions: str  # JSON string
    architectural_preferences: str  # JSON string
    communication_style: str
    frustrations: str  # JSON string
    what_works_well: str  # JSON string
    work_patterns: str  # JSON string
    key_principles: str  # JSON string
    updated_at: str


# ==================== APP CATALOG ====================

class DevBrainAppResponse(BaseModel):
    id: int
    name: str
    description: str
    status: str
    tech_stack: str  # JSON string
    requirements: str  # JSON string
    related_sessions: str  # JSON string
    session_count: int
    priority: str
    created_at: str


# ==================== SESSION MANAGEMENT ====================

class DevBrainSessionCreate(BaseModel):
    """Create a new Devin session with enriched context."""
    app_name: Optional[str] = None
    prompt: str
    auto_monitor: bool = True


class DevBrainSessionResponse(BaseModel):
    id: int
    devin_session_id: str
    app_name: str
    original_prompt: str
    enriched_prompt: str
    status: str
    auto_monitor: bool
    created_at: str
    updated_at: str
    last_checked_at: Optional[str] = None


class DevBrainSessionDetail(BaseModel):
    session: DevBrainSessionResponse
    actions: List[dict]
    devin_status: Optional[dict] = None


# ==================== AGENT ACTIONS ====================

class AgentActionResponse(BaseModel):
    id: int
    session_id: int
    action_type: str  # comment, correction, nudge, completion_check
    content: str
    devin_response: str
    created_at: str


# ==================== MONITOR ====================

class MonitorStatusResponse(BaseModel):
    is_running: bool
    active_sessions: int
    total_actions_taken: int
    last_check_at: Optional[str] = None


# ==================== REVIEW ====================

class SessionReviewRequest(BaseModel):
    """Request agent to review a session's current state."""
    force: bool = False  # Force review even if recently checked


class SessionReviewResponse(BaseModel):
    session_id: str
    review_result: str  # on_track, needs_correction, stalled, completed
    actions_taken: List[str]
    details: str
