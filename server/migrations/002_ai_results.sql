BEGIN;

CREATE TABLE IF NOT EXISTS ai_results (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  endpoint VARCHAR(120) NOT NULL,
  entity_id BIGINT,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_results_user_endpoint_idx
  ON ai_results(user_id, endpoint, created_at DESC);

COMMIT;
