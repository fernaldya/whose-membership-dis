import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..dependencies import get_current_user
from ..models import Group, GroupMember, GroupRole, Membership, User, membership_groups_table
from ..schemas import (
    CreateGroupRequest,
    GroupDetailResponse,
    GroupMemberResponse,
    GroupSummary,
    UpdateGroupRequest,
)

router = APIRouter(prefix="/groups", tags=["groups"])

MAX_GROUPS_PER_USER = 5


async def _require_member(db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID) -> GroupMember:
    gm = await db.get(GroupMember, (group_id, user_id))
    if not gm:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this group")
    return gm


@router.get("", response_model=list[GroupSummary])
async def list_groups(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GroupMember)
        .options(selectinload(GroupMember.group))
        .where(GroupMember.user_id == user.id)
    )
    rows = result.scalars().all()

    summaries = []
    for gm in rows:
        count = (
            await db.execute(
                select(func.count()).select_from(GroupMember).where(GroupMember.group_id == gm.group_id)
            )
        ).scalar() or 0
        summaries.append(
            GroupSummary(
                id=gm.group.id,
                name=gm.group.name,
                created_at=gm.group.created_at,
                member_count=count,
                your_role=gm.user_role,
            )
        )
    return summaries


@router.post("", response_model=GroupSummary, status_code=status.HTTP_201_CREATED)
async def create_group(
    body: CreateGroupRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    owned = (
        await db.execute(
            select(func.count())
            .select_from(GroupMember)
            .where(GroupMember.user_id == user.id, GroupMember.user_role == GroupRole.owner)
        )
    ).scalar() or 0

    if owned >= MAX_GROUPS_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You can own at most {MAX_GROUPS_PER_USER} groups",
        )

    group = Group(name=body.name, created_by=user.id)
    db.add(group)
    await db.flush()
    db.add(GroupMember(group_id=group.id, user_id=user.id, user_role=GroupRole.owner))
    await db.commit()

    return GroupSummary(
        id=group.id,
        name=group.name,
        created_at=group.created_at,
        member_count=1,
        your_role=GroupRole.owner,
    )


@router.get("/{group_id}", response_model=GroupDetailResponse)
async def get_group(
    group_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(db, group_id, user.id)

    group = await db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    result = await db.execute(
        select(GroupMember)
        .options(selectinload(GroupMember.user))
        .where(GroupMember.group_id == group_id)
    )
    members_db = result.scalars().all()
    your_role = next(gm.user_role for gm in members_db if gm.user_id == user.id)

    return GroupDetailResponse(
        id=group.id,
        name=group.name,
        created_at=group.created_at,
        your_role=your_role,
        members=[
            GroupMemberResponse(
                user_id=gm.user_id,
                name=gm.user.name,
                email=gm.user.email,
                picture_url=gm.user.picture_url,
                role=gm.user_role,
                joined_at=gm.joined_at,
            )
            for gm in members_db
        ],
    )


@router.put("/{group_id}", response_model=GroupSummary)
async def update_group(
    group_id: uuid.UUID,
    body: UpdateGroupRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    gm = await _require_member(db, group_id, user.id)
    if gm.user_role != GroupRole.owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can rename the group")

    group = await db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    group.name = body.name
    await db.commit()

    count = (
        await db.execute(
            select(func.count()).select_from(GroupMember).where(GroupMember.group_id == group_id)
        )
    ).scalar() or 0

    return GroupSummary(
        id=group.id,
        name=group.name,
        created_at=group.created_at,
        member_count=count,
        your_role=GroupRole.owner,
    )


@router.post("/{group_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_group(
    group_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    gm = await _require_member(db, group_id, user.id)
    await _remove_member(db, group_id, user.id, gm.user_role)


@router.delete("/{group_id}/members/{target_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    group_id: uuid.UUID,
    target_user_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    requester = await _require_member(db, group_id, user.id)
    if requester.user_role != GroupRole.owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can remove members")
    if target_user_id == user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Use /leave to leave the group")

    target = await db.get(GroupMember, (group_id, target_user_id))
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    await _remove_member(db, group_id, target_user_id, target.user_role)


async def _remove_member(
    db: AsyncSession,
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    role: GroupRole,
) -> None:
    if role != GroupRole.owner:
        # Unlink their memberships from this group.
        user_membership_ids = select(Membership.id).where(Membership.user_id == user_id).scalar_subquery()
        await db.execute(
            delete(membership_groups_table).where(
                membership_groups_table.c.group_id == group_id,
                membership_groups_table.c.membership_id.in_(user_membership_ids),
            )
        )
        await db.delete(await db.get(GroupMember, (group_id, user_id)))
        await db.commit()
        return

    # Owner is leaving: transfer or disband.
    next_gm = (
        await db.execute(
            select(GroupMember)
            .where(GroupMember.group_id == group_id, GroupMember.user_id != user_id)
            .order_by(GroupMember.joined_at.asc())
            .limit(1)
        )
    ).scalar_one_or_none()

    if next_gm:
        next_gm.user_role = GroupRole.owner
        owner_membership_ids = select(Membership.id).where(Membership.user_id == user_id).scalar_subquery()
        await db.execute(
            delete(membership_groups_table).where(
                membership_groups_table.c.group_id == group_id,
                membership_groups_table.c.membership_id.in_(owner_membership_ids),
            )
        )
        await db.delete(await db.get(GroupMember, (group_id, user_id)))
    else:
        # No remaining members — disband (cascade handles group_members + membership_groups).
        group = await db.get(Group, group_id)
        if group:
            await db.delete(group)

    await db.commit()
