-- Migration 001: Create users table
-- Stores authenticated user profiles synced from Firebase Auth

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid    VARCHAR(128) NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL,
    display_name    VARCHAR(255),
    knowledge_level VARCHAR(20) DEFAULT 'Beginner'
        CHECK (knowledge_level IN ('Beginner', 'Intermediate', 'Advanced')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast Firebase UID lookups during auth middleware
CREATE INDEX idx_users_firebase_uid ON users (firebase_uid);

-- Index for email-based searches
CREATE INDEX idx_users_email ON users (email);

-- Trigger to auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
