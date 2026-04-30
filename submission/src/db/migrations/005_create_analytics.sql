-- Migration 005: Create query_analytics table
-- Detailed metrics per query for AI quality monitoring and user feedback

CREATE TABLE IF NOT EXISTS query_analytics (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_id          UUID NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
    token_count       INTEGER,
    confidence_score  REAL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    feedback_rating   SMALLINT CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    metadata          JSONB DEFAULT '{}'::jsonb,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for query relationship
CREATE INDEX idx_analytics_query_id ON query_analytics (query_id);

-- Index for feedback analysis
CREATE INDEX idx_analytics_rating ON query_analytics (feedback_rating)
    WHERE feedback_rating IS NOT NULL;

-- GIN index on metadata JSONB for flexible querying
CREATE INDEX idx_analytics_metadata ON query_analytics USING GIN (metadata);
