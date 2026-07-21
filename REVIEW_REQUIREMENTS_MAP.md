# Completeness review mapping

| Review requirement | Implementation |
|---|---|
| 1 | `facilitySecurityWorkflow` persists versioned evidence, permission scope and case state; `validateAnswer` requires authorized citations and abstains on conflicts or missing evidence. |
| 2 | Migration `001_facility_security_workflow.sql` defines authoritative evidence, resumable delivery receipts, retry/dead-letter state, retention metadata and deletion receipts. |
| 3 | `facility_security_evaluations` records corpus version, groundedness, citation precision, permission leaks and abstention; policy tests exercise conflicting and unauthorized evidence. |
| 4 | JWT-derived tenant/subject filters, role gates, independent approval, append-only audit, retention fields and optimistic versions enforce isolation and controlled action. |
| 5 | Generated security-alert and direct AI/gap routes are quarantined with authenticated 503 responses pointing to `/api/facility-security-workflow`. |
| 6 | Dependency-free policy tests, CI checks, explicit migrations, fail-closed environment validation and non-mutating `start.sh` provide repeatable verification and operation. |
