-- Migration 003: Create queries table
-- Stores every question asked by users and the AI-generated response

CREATE TABLE IF NOT EXISTS queries (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id          UUID REFERENCES topics(id) ON DELETE SET NULL,
    query_text        TEXT NOT NULL,
    ai_response       TEXT,
    knowledge_level   VARCHAR(20) NOT NULL DEFAULT 'Beginner'
        CHECK (knowledge_level IN ('Beginner', 'Intermediate', 'Advanced')),
    response_time_ms  INTEGER,
    from_cache        BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user query history (most recent first)
CREATE INDEX idx_queries_user_id ON queries (user_id, created_at DESC);

-- Index for topic-based filtering
CREATE INDEX idx_queries_topic_id ON queries (topic_id);

-- Index for analytics: queries over time
CREATE INDEX idx_queries_created_at ON queries (created_at);

-- Full-text search on query content for search/discovery features
CREATE INDEX idx_queries_text_search ON queries
    USING GIN (to_tsvector('english', query_text));
