BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS facility_security_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id TEXT NOT NULL, facility_id TEXT NOT NULL,
  subject_id TEXT NOT NULL, idempotency_key TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'received', version INTEGER NOT NULL DEFAULT 1,
  severity TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}', created_by TEXT NOT NULL, assigned_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, idempotency_key), CHECK (stage IN ('received','evidence_validated','triaged','manager_review','action_approved','dispatched','resolved','closed','deleted'))
);
CREATE INDEX IF NOT EXISTS facility_security_cases_tenant_stage_idx ON facility_security_cases(tenant_id, stage, updated_at DESC);
CREATE TABLE IF NOT EXISTS facility_security_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id TEXT NOT NULL, case_id UUID NOT NULL REFERENCES facility_security_cases(id),
  source_type TEXT NOT NULL, source_ref TEXT NOT NULL, source_version TEXT NOT NULL, checksum TEXT NOT NULL,
  permission_scope TEXT NOT NULL, captured_at TIMESTAMPTZ NOT NULL, retention_until TIMESTAMPTZ, metadata JSONB NOT NULL DEFAULT '{}',
  UNIQUE (tenant_id, source_ref, source_version, checksum)
);
CREATE TABLE IF NOT EXISTS facility_security_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id TEXT NOT NULL, case_id UUID NOT NULL REFERENCES facility_security_cases(id),
  evidence_id UUID NOT NULL REFERENCES facility_security_evidence(id), excerpt TEXT NOT NULL, authorized BOOLEAN NOT NULL DEFAULT FALSE,
  conflict BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS facility_security_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id TEXT NOT NULL, case_id UUID NOT NULL REFERENCES facility_security_cases(id),
  provider TEXT NOT NULL, operation TEXT NOT NULL, idempotency_key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0, next_attempt_at TIMESTAMPTZ, request JSONB NOT NULL DEFAULT '{}', receipt JSONB, last_error TEXT,
  UNIQUE (tenant_id, provider, idempotency_key), CHECK (status IN ('pending','sent','acknowledged','failed','dead_letter','reconciled'))
);
CREATE TABLE IF NOT EXISTS facility_security_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id TEXT NOT NULL, case_id UUID REFERENCES facility_security_cases(id),
  corpus_version TEXT NOT NULL, groundedness NUMERIC NOT NULL, citation_precision NUMERIC NOT NULL, permission_leaks INTEGER NOT NULL DEFAULT 0,
  abstained BOOLEAN NOT NULL DEFAULT FALSE, passed BOOLEAN NOT NULL, details JSONB NOT NULL DEFAULT '{}', evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS facility_security_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id TEXT NOT NULL, case_id UUID NOT NULL REFERENCES facility_security_cases(id),
  actor_id TEXT NOT NULL, rating SMALLINT NOT NULL CHECK(rating IN (-1,1)), reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id,case_id,actor_id)
);
CREATE TABLE IF NOT EXISTS facility_security_audit (
  id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, case_id UUID, actor_id TEXT NOT NULL, action TEXT NOT NULL,
  from_stage TEXT, to_stage TEXT, payload JSONB NOT NULL DEFAULT '{}', occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION facility_security_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'facility security audit is append-only'; END; $$;
DROP TRIGGER IF EXISTS facility_security_audit_no_mutation ON facility_security_audit;
CREATE TRIGGER facility_security_audit_no_mutation BEFORE UPDATE OR DELETE ON facility_security_audit FOR EACH ROW EXECUTE FUNCTION facility_security_audit_immutable();
COMMIT;
