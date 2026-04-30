-- Migration 002: Create sessions table
-- Tracks user login sessions for analytics and security auditing

CREATE TABLE IF NOT EXISTS sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token   VARCHAR(512) NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ
);

-- Index for user session lookups
CREATE INDEX idx_sessions_user_id ON sessions (user_id);

-- Index for active session queries (where ended_at IS NULL)
CREATE INDEX idx_sessions_active ON sessions (user_id) WHERE ended_at IS NULL;

-- Index for session token validation
CREATE INDEX idx_sessions_token ON sessions (session_token);
