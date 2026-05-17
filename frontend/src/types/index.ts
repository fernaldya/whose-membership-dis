export interface User {
  id: string
  email: string
  name: string
  picture_url: string | null
  created_at: string
}

export type GroupRole = 'owner' | 'admin' | 'viewer'
export type InviteStatus = 'pending' | 'accepted'
export type SortField = 'merchant' | 'expiry_date' | 'country' | 'created_at'
export type SortDir = 'asc' | 'desc'

export interface GroupMember {
  user_id: string
  name: string
  email: string
  picture_url: string | null
  role: GroupRole
  joined_at: string
}

export interface GroupSummary {
  id: string
  name: string
  created_at: string
  member_count: number
  your_role: GroupRole
}

export interface GroupDetail {
  id: string
  name: string
  created_at: string
  members: GroupMember[]
  your_role: GroupRole
}

export interface MembershipGroupTag {
  id: string
  name: string
}

export interface Membership {
  id: string
  merchant: string
  country: string
  membership_number: string
  screenshot_url: string | null
  expiry_date: string | null
  is_expired: boolean
  created_at: string
  updated_at: string
  groups: MembershipGroupTag[]
  is_owner: boolean
  owner_name: string
}

export interface PaginatedMemberships {
  items: Membership[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface Invite {
  id: string
  group_id: string
  group_name: string
  invited_by_name: string
  invited_email: string
  status: InviteStatus
  created_at: string
}
