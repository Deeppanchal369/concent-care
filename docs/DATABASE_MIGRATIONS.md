# ConsentCare Database Migrations & Schema Strategy

## Overview

ConsentCare uses **Flyway** as its single authoritative database migration tool across development, testing, and production environments.
Hibernate is configured to **validate** the schema (`spring.jpa.hibernate.ddl-auto: validate`) rather than modifying or creating database structures silently.

---

## Core Rules

1. **Flyway is Authoritative**:
   - All table definitions, columns, primary keys, foreign keys, constraints, indexes, and initial reference data must be defined exclusively through Flyway migration scripts.
   - Hibernate's `ddl-auto` must remain `validate`. It must **never** be set to `update` or `create` in shared environments.

2. **Sequential Versioning**:
   - Migrations are stored in `core-service/src/main/resources/db/migration`.
   - Migration file naming follows:
     `V<Version>__<descriptive_snake_case_title>.sql`
     *(Note the two underscores between version and description).*
   - Applied migrations must **never** be edited. Any schema addition, modification, or constraint fix must be introduced as a new migration (e.g., `V13__...sql`).

3. **Hibernate Envers & Sequence Increments**:
   - In Hibernate 6, the default Envers revision sequence (`revinfo_seq`) expects an allocation size of **50**.
   - Therefore, any script provisioning or altering `revinfo_seq` must define:
     ```sql
     CREATE SEQUENCE IF NOT EXISTS revinfo_seq START WITH 1 INCREMENT BY 50;
     ```
     Creating `revinfo_seq` with `INCREMENT BY 1` causes Hibernate schema validation to fail on startup.
   - Every entity annotated with `@Audited` must have an exact mirroring table named `<table_name>_aud` containing all persistent entity attributes plus:
     - `rev INTEGER NOT NULL REFERENCES revinfo(rev)`
     - `revtype SMALLINT` (0 = ADD, 1 = MOD, 2 = DEL)
     - `PRIMARY KEY (id, rev)`

---

## Migration Index

| Version | File | Scope / Responsibilities |
|---|---|---|
| **V1** | `V1__initial_schema.sql` | Users, Departments, Doctors, Nurses, Patients, and initial seed admin. |
| **V2** | `V2__audit_and_envers.sql` | Envers `revinfo`, `revinfo_seq` (`INCREMENT BY 50`), historical audit tables, system `audit_logs`. |
| **V3** | `V3__patient_doctor_relationship.sql` | Doctor-Patient relationships, Access Requests, and Doctor-Nurse team assignments. |
| **V4** | `V4__consent.sql` | Granular patient consents across clinical categories. |
| **V5** | `V5__documents.sql` | Secure document storage metadata, processing status, and document shares. |
| **V6** | `V6__clinical_records.sql` | Clinical encounters, diagnoses, lab requests, lab reports, and vital observations. |
| **V7** | `V7__prescriptions.sql` | Prescriptions, prescription items, and nurse medication administration records. |
| **V8** | `V8__nurse_workflow.sql` | Nurse tasks, priority queues, task state transition events, and availability tracking. |
| **V9** | `V9__notifications.sql` | Real-time notification records and references. |
| **V10** | `V10__ai.sql` | AI document analyses, clinical entities JSON, ML risk predictions, and model version metadata. |
| **V11** | `V11__audit.sql` | User-attributed read and access logs. |
| **V12** | `V12__fhir.sql` | HL7 FHIR R4 relational projections and views. |

---

## Verifying Migrations

To verify Flyway status during development:
```sql
SELECT installed_rank, version, description, type, script, checksum, installed_on, success
FROM flyway_schema_history
ORDER BY installed_rank;
```

