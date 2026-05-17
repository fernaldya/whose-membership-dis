-- Whose Membership Is Dis? — initial schema
-- All tables live under the dedicated `wmd` schema to avoid collisions with Climbge's public schema.

CREATE SCHEMA IF NOT EXISTS wmd;

-- ─── Users ────────────────────────────────────────────────────────────────────

CREATE TABLE wmd.users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_sub  TEXT NOT NULL UNIQUE,
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    picture_url TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Groups ───────────────────────────────────────────────────────────────────

CREATE TABLE wmd.groups (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES wmd.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Group Members ────────────────────────────────────────────────────────────

CREATE TYPE wmd.group_role AS ENUM ('owner', 'admin', 'viewer');

CREATE TABLE wmd.group_members (
    group_id  UUID NOT NULL REFERENCES wmd.groups(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES wmd.users(id) ON DELETE CASCADE,
    user_role wmd.group_role NOT NULL DEFAULT 'viewer',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_group_members_user_id ON wmd.group_members(user_id);

-- ─── Invites ──────────────────────────────────────────────────────────────────

CREATE TYPE wmd.invite_status AS ENUM ('pending', 'accepted');

CREATE TABLE wmd.invites (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id       UUID NOT NULL REFERENCES wmd.groups(id) ON DELETE CASCADE,
    invited_by     UUID NOT NULL REFERENCES wmd.users(id) ON DELETE CASCADE,
    invited_email  TEXT NOT NULL REFERENCES wmd.users(email) ON DELETE CASCADE,
    status         wmd.invite_status NOT NULL DEFAULT 'pending',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (group_id, invited_email)
);

CREATE INDEX idx_invites_invited_email ON wmd.invites(invited_email);
CREATE INDEX idx_invites_status        ON wmd.invites(status);

-- ─── Failed Invites (log only) ────────────────────────────────────────────────

CREATE TABLE wmd.failed_invites (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id      UUID NOT NULL REFERENCES wmd.groups(id) ON DELETE CASCADE,
    invited_by    UUID NOT NULL REFERENCES wmd.users(id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    attempted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Memberships ──────────────────────────────────────────────────────────────

CREATE TABLE wmd.memberships (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES wmd.users(id) ON DELETE CASCADE,
    merchant          TEXT NOT NULL,
    country           TEXT NOT NULL,
    membership_number TEXT NOT NULL,
    screenshot_path   TEXT,
    expiry_date       DATE,
    is_expired		  BOOLEAN NOT NULL default false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_membership_user_merch_mno UNIQUE (user_id, merchant, membership_number)
);

CREATE INDEX idx_memberships_user_id     ON wmd.memberships(user_id);
CREATE INDEX idx_memberships_expiry_date ON wmd.memberships(expiry_date);

-- auto process is_expired field for every new / update membership actions
CREATE OR REPLACE FUNCTION wmd.sync_is_expired()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.is_expired := (NEW.expiry_date IS NOT NULL AND NEW.expiry_date < CURRENT_DATE);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_memberships_is_expired
BEFORE INSERT OR UPDATE OF expiry_date ON wmd.memberships
FOR EACH ROW EXECUTE FUNCTION wmd.sync_is_expired();

-- Keep updated_at current automatically.
CREATE OR REPLACE FUNCTION wmd.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_memberships_updated_at
BEFORE UPDATE ON wmd.memberships
FOR EACH ROW EXECUTE FUNCTION wmd.set_updated_at();

-- ─── Membership ↔ Group links ─────────────────────────────────────────────────

CREATE TABLE wmd.membership_groups (
    membership_id UUID NOT NULL REFERENCES wmd.memberships(id) ON DELETE CASCADE,
    group_id      UUID NOT NULL REFERENCES wmd.groups(id)      ON DELETE CASCADE,
    PRIMARY KEY (membership_id, group_id)
);

CREATE INDEX idx_membership_groups_group_id ON wmd.membership_groups(group_id);
