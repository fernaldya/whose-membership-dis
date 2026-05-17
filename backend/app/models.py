import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    TIMESTAMP,
    Boolean,
    Column,
    Date,
    Enum as SAEnum,
    ForeignKey,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func


class GroupRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    viewer = "viewer"


class InviteStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"


class Base(DeclarativeBase):
    pass


# Pure join table — no extra columns, no ORM class needed.
membership_groups_table = Table(
    "membership_groups",
    Base.metadata,
    Column(
        "membership_id",
        UUID(as_uuid=True),
        ForeignKey("wmd.memberships.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "group_id",
        UUID(as_uuid=True),
        ForeignKey("wmd.groups.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    schema="wmd",
)


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "wmd"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    google_sub: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    picture_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    memberships: Mapped[list["Membership"]] = relationship(
        "Membership", back_populates="owner", cascade="all, delete-orphan"
    )
    group_memberships: Mapped[list["GroupMember"]] = relationship(
        "GroupMember", back_populates="user", cascade="all, delete-orphan"
    )


class Group(Base):
    __tablename__ = "groups"
    __table_args__ = {"schema": "wmd"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wmd.users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    members: Mapped[list["GroupMember"]] = relationship(
        "GroupMember", back_populates="group", cascade="all, delete-orphan"
    )
    memberships: Mapped[list["Membership"]] = relationship(
        "Membership", secondary=membership_groups_table, back_populates="groups"
    )


class GroupMember(Base):
    __tablename__ = "group_members"
    __table_args__ = {"schema": "wmd"}

    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wmd.groups.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wmd.users.id", ondelete="CASCADE"), primary_key=True
    )
    # Column is "user_role" in DB (renamed to avoid collision with the SQL reserved word "role").
    user_role: Mapped[GroupRole] = mapped_column(
        SAEnum(GroupRole, name="group_role", schema="wmd", create_type=False),
        nullable=False,
        default=GroupRole.viewer,
    )
    joined_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    group: Mapped["Group"] = relationship("Group", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="group_memberships")


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (
        UniqueConstraint("user_id", "merchant", "membership_number", name="uq_membership_user_merchant_number"),
        {"schema": "wmd"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wmd.users.id", ondelete="CASCADE"), nullable=False
    )
    merchant: Mapped[str] = mapped_column(String(200), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=True)
    membership_number: Mapped[str] = mapped_column(String(200), nullable=False)
    screenshot_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_expired: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    owner: Mapped["User"] = relationship("User", back_populates="memberships")
    groups: Mapped[list["Group"]] = relationship(
        "Group", secondary=membership_groups_table, back_populates="memberships"
    )


class Invite(Base):
    __tablename__ = "invites"
    __table_args__ = (
        UniqueConstraint("group_id", "invited_email", name="uq_invite_group_email"),
        {"schema": "wmd"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wmd.groups.id", ondelete="CASCADE"), nullable=False
    )
    invited_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wmd.users.id", ondelete="CASCADE"), nullable=False
    )
    invited_email: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[InviteStatus] = mapped_column(
        SAEnum(InviteStatus, name="invite_status", schema="wmd", create_type=False),
        nullable=False,
        default=InviteStatus.pending,
    )
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    group: Mapped["Group"] = relationship("Group")
    inviter: Mapped["User"] = relationship("User", foreign_keys=[invited_by])


class FailedInvite(Base):
    __tablename__ = "failed_invites"
    __table_args__ = {"schema": "wmd"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wmd.groups.id", ondelete="CASCADE"), nullable=False
    )
    invited_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wmd.users.id", ondelete="CASCADE"), nullable=False
    )
    invited_email: Mapped[str] = mapped_column(String, nullable=False)
    attempted_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
