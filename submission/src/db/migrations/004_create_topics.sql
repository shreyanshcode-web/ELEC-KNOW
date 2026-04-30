-- Migration 004: Create topics table
-- Categorizes election education queries into structured topic areas
-- NOTE: This table must be created BEFORE queries table (003) due to FK reference.
-- Run migrations in order: 001 → 002 → 004 → 003 → 005

CREATE TABLE IF NOT EXISTS topics (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    category        VARCHAR(50) NOT NULL DEFAULT 'general'
        CHECK (category IN (
            'voter_registration',
            'election_types',
            'election_timeline',
            'voting_methods',
            'vote_counting',
            'electoral_systems',
            'ballot_measures',
            'election_admin',
            'campaign_finance',
            'contested_topics',
            'general'
        )),
    query_count     INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for slug-based lookups (URL-friendly identifiers)
CREATE INDEX idx_topics_slug ON topics (slug);

-- Index for category filtering
CREATE INDEX idx_topics_category ON topics (category);

-- Index for popular topics sorting
CREATE INDEX idx_topics_query_count ON topics (query_count DESC);
