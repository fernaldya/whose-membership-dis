import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator

from .models import GroupRole, InviteStatus


# ── Users ──────────────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    picture_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Groups ─────────────────────────────────────────────────────────────────────

class CreateGroupRequest(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Group name cannot be empty")
        if len(v) > 100:
            raise ValueError("Group name must be 100 characters or fewer")
        return v


class UpdateGroupRequest(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Group name cannot be empty")
        if len(v) > 100:
            raise ValueError("Group name must be 100 characters or fewer")
        return v


class GroupMemberResponse(BaseModel):
    user_id: uuid.UUID
    name: str
    email: str
    picture_url: Optional[str] = None
    role: GroupRole
    joined_at: datetime

    model_config = {"from_attributes": True}


class GroupSummary(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime
    member_count: int
    your_role: GroupRole


class GroupDetailResponse(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime
    members: list[GroupMemberResponse]
    your_role: GroupRole


# ── Invites ────────────────────────────────────────────────────────────────────

class InviteRequest(BaseModel):
    email: EmailStr


class InviteResponse(BaseModel):
    id: uuid.UUID
    group_id: uuid.UUID
    group_name: str
    invited_by_name: str
    invited_email: str
    status: InviteStatus
    created_at: datetime


# ── Memberships ────────────────────────────────────────────────────────────────

class MembershipGroupTag(BaseModel):
    id: uuid.UUID
    name: str


class CreateMembershipRequest(BaseModel):
    merchant: str
    country: Optional[str] = None
    membership_number: str
    expiry_date: Optional[date] = None
    group_ids: list[uuid.UUID] = []

    @field_validator("merchant", "membership_number")
    @classmethod
    def not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be empty")
        return v


class UpdateMembershipRequest(BaseModel):
    merchant: Optional[str] = None
    country: Optional[str] = None
    membership_number: Optional[str] = None
    expiry_date: Optional[date] = None
    group_ids: Optional[list[uuid.UUID]] = None

    @field_validator("merchant", "membership_number", mode="before")
    @classmethod
    def not_empty(cls, v: object) -> object:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                raise ValueError("Field cannot be empty")
        return v


class MembershipResponse(BaseModel):
    id: uuid.UUID
    merchant: str
    country: Optional[str] = None
    membership_number: str
    screenshot_url: Optional[str] = None
    expiry_date: Optional[date] = None
    is_expired: bool
    created_at: datetime
    updated_at: datetime
    groups: list[MembershipGroupTag]
    is_owner: bool
    owner_name: str


class PaginatedMemberships(BaseModel):
    items: list[MembershipResponse]
    total: int
    page: int
    page_size: int
    pages: int
