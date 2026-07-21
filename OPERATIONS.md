# Operations

Provision a least-privilege PostgreSQL database and copy `.env.example` to `.env`; replace both credentials and use a 32+ character random JWT secret. Install dependencies deliberately, then run `./scripts/migrate.sh`; migrations are the only supported schema mutation. `./start.sh backend` or `./start.sh all` never installs, seeds, kills unrelated processes or changes schema.

Monitor pending/failed `facility_security_deliveries`, stale case versions, permission leaks and failed evaluations. Reconcile a provider receipt before advancing, use the policy recovery/closure path, and retain append-only audit rows. Rotate a compromised JWT secret and database credential, expire sessions, and review tenant-scoped audit records. AI/gap endpoints are quarantined by design.
