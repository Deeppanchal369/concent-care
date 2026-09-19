# CONSENTCARE — PERMANENT ENGINEERING RULES

These rules apply to every task in the ConsentCare repository.

## 1. PRODUCT IDENTITY

ConsentCare is a privacy-aware, AI-assisted Electronic Health Record system.

It is not:

* a generic CRUD application
* a generic admin dashboard
* a chatbot demo
* a fictional AI healthcare simulator
* a collection of disconnected pages

All implementation decisions must preserve the EHR purpose and the patient → doctor → nurse care workflow.

## 2. SECURITY FIRST

Security has higher priority than convenience, visual effects, speed of implementation, or feature count.

Use:

* OWASP ASVS as the primary application-security verification baseline
* OWASP Top 10:2025
* OWASP API Security Top 10:2023
* appropriate OWASP AI security guidance for AI components

Never claim certification or compliance unless it has actually been independently established.

Do not use deliberately vulnerable training code such as DVWA patterns inside ConsentCare.

## 3. NEVER INVENT

Never invent:

* patient data
* medical values
* diagnoses
* prescriptions
* AI predictions
* model accuracy
* clinical findings
* API behavior
* database tables
* relationships
* permissions
* endpoints
* library APIs

Before implementing something, inspect the repository.

If something does not exist, design it explicitly and implement it.

If requirements are ambiguous, choose the safest reasonable interpretation and record the assumption in documentation instead of pretending certainty.

## 4. NO FAKE AI

AI results must come from an actual model/service or actual document-processing pipeline.

Never use:

* random risk percentages
* hard-coded HIGH/MEDIUM/LOW prediction
* if/else logic disguised as ML
* static AI summaries
* placeholder medical analysis
* fake confidence values

Unknown information must remain unknown.

For document extraction, use:

"Not detected"

when the source document does not contain the information.

Never hallucinate medical information.

AI is advisory only.

It must never independently:

* diagnose
* prescribe
* alter clinical records
* approve patient access
* assign nurses
* change medication
* make autonomous medical decisions

## 5. SOURCE OF TRUTH

The source of truth must be:

database
uploaded document
validated application state
trained model
or explicit configuration.

Do not use frontend local arrays as the authoritative source for production functionality.

Do not implement important business logic only in React.

## 6. AUTHORIZATION

Never rely on frontend visibility for security.

Every protected backend request must verify:

* authenticated user
* role
* ownership
* relationship
* consent
* resource-level permission

If a request contains:

patientId
doctorId
nurseId
documentId
prescriptionId
taskId
consentId
accessRequestId

the backend must verify whether that object is accessible to the current user.

Knowing an ID must never grant access.

## 7. PATIENT PRIVACY

Patient data must follow least privilege.

PATIENT:
own records

DOCTOR:
only authorized/related patient information

NURSE:
only information required for authorized assignments and care

ADMIN:
operational information required for administration

Do not expose entire patient records merely because a user has a higher role.

## 8. DOCUMENT SECURITY

Uploaded medical documents are private.

Supported:

PDF
JPG
JPEG
PNG
DOC
DOCX

Validate:

* extension
* MIME type
* file signature where practical
* size
* filename
* path

Use generated storage names.

Prevent:

path traversal
public exposure
unauthorized downloads
malicious content execution

Do not expose the document storage directory directly.

## 9. XSS

Protect against:

stored XSS
reflected XSS
DOM XSS

Avoid unsafe HTML injection.

Do not use dangerouslySetInnerHTML with untrusted content.

Sanitize any rich content that genuinely requires HTML.

Use secure response handling and appropriate Content Security Policy where practical.

## 10. SQL INJECTION

Never create SQL through untrusted string concatenation.

Prefer:

Spring Data
parameterized JPQL
parameterized native queries
Criteria APIs
safe query construction

Dynamic sort/filter fields must be allowlisted.

Never accept arbitrary SQL fragments from users.

## 11. API SECURITY

Protect against:

Broken Object Level Authorization
Broken Authentication
Broken Object Property Level Authorization
Broken Function Level Authorization
Unrestricted Resource Consumption
Security Misconfiguration
Improper API inventory
Unsafe third-party API consumption

Every sensitive object endpoint must be tested against unauthorized IDs.

## 12. RATE LIMITING

Use appropriate configurable rate limits for sensitive operations, including:

login
registration
password recovery
document upload
AI processing
risk prediction
search
sensitive mutations

Return HTTP 429 when a limit is exceeded.

## 13. CSRF

Do not blindly disable CSRF.

Choose the correct strategy based on the authentication mechanism.

If cookies are used, protect state-changing requests appropriately.

Never perform destructive actions through GET requests.

## 14. AUTHENTICATION

Use:

* strong password hashing
* JWT/session expiration
* secure token handling
* correct logout behavior
* appropriate CORS
* validation
* account abuse protection

Never place secrets in source code.

## 15. DATA INPUT

All user-controlled input must be validated.

Use explicit DTOs.

Never bind arbitrary client JSON directly into privileged entities.

Do not allow clients to modify:

role
owner
approval status
authorization status
audit fields
internal workflow states

unless the server intentionally allows that transition.

## 16. CLINICAL DATA PRESENTATION

Never expose raw JSON to normal users.

Never show:

database field names
DTO names
FHIR JSON
internal enums
technical API payloads

to patients, doctors, or nurses.

Use human-readable clinical presentation.

Example:

Bad:
hba1c_value = 7.8

Good:

HbA1c
7.8 %
High

Explain technical or clinical concepts through contextual help where appropriate.

## 17. UX

Users are non-technical.

Use simple language.

Prefer:

"Share records"

over:

"Grant authorization"

Prefer:

"Ask your doctor to view these records"

over:

"Create access request"

Prefer:

"AI summary ready for review"

over:

"LLM inference complete"

Prefer:

"We couldn't upload the report. Please try again."

over:

"500 Internal Server Error"

## 18. NO GENERIC AI UI

Do not use:

* excessive neon
* glowing borders
* futuristic dark panels
* excessive gradients
* excessive glassmorphism
* animated backgrounds
* oversized statistic cards

ConsentCare must look like professional healthcare software.

## 19. BRANDING

Never use default Vite logos, Vite names, React default titles, or starter branding.

The application name is:

ConsentCare

The browser title, favicon, metadata, loading screen, login page, navigation and footer must use ConsentCare branding.

Create a professional custom SVG logo and favicon.

Do not use a generic Vite/React logo.

## 20. PRODUCT EXPERIENCE

ConsentCare should have a distinctive concept called:

Care Circle

Care Circle visually explains:

* patient
* doctor
* nurse
* shared records
* current task
* access level
* recent activity

It must remain simple and practical.

Do not claim that ConsentCare is the first or only product in the world.

## 21. PERFORMANCE

Avoid:

* unrestricted queries
* loading entire tables
* N+1 queries
* unnecessary eager loading
* duplicate API requests
* huge frontend bundles

Use where appropriate:

* pagination
* indexes
* DTO projections
* lazy loading
* route-level code splitting
* optimized repository queries
* server-side filtering
* server-side sorting

## 22. DATABASE

PostgreSQL is the source of truth.

Use Flyway for schema evolution.

Never edit an already-applied migration.

Create a new migration for every schema change.

Never delete production-like data to solve an ordinary development problem.

Do not use Hibernate automatic schema creation for the production schema.

## 23. DOCKER

Keep Docker service responsibilities clear.

Use internal service names for container-to-container communication.

Do not use localhost between containers.

Keep host ports configurable.

Never solve a host-port collision by randomly changing internal container ports.

## 24. TEST BEFORE CLAIMING SUCCESS

Never report "fixed" or "complete" simply because files were changed.

For every significant implementation:

* compile
* test
* run affected service
* verify API
* verify database behavior
* verify authorization
* verify browser behavior where relevant

## 25. SECURITY REGRESSION RULE

Before declaring a feature complete, test:

authorized path
unauthorized path
invalid input
missing resource
expired access
revoked access
malicious input where appropriate

## 26. CHANGE CONTROL

Do not modify unrelated parts of the application.

Before a large change:

inspect
plan
implement
test
report

Prefer small reversible changes.

Do not rewrite the whole application unless explicitly required.

## 27. EHR PRINCIPLE

The system should answer:

"What does this patient need right now?"

rather than:

"How many rows are in the database?"

The UI and workflows must prioritize:

clinical context
patient safety
privacy
care coordination
clarity
workflow efficiency

## 28. COMPLETION STANDARD

A feature is complete only when:

UI
→ API
→ authorization
→ business logic
→ persistence/storage
→ output
→ audit/notification when required

works end-to-end.

Pretty screens without working backend logic do not count as completion.
