# A Project Report on ArogyaMitra EHR
## Electronic Health Record System with an Agentic AI Compliance Assistant

**Developed By:**  
Deep Panchal (Enrollment No: 2505112110073)  

**As Partial Fulfillment of Semester III of:**  
Master of Computer Applications (MCA)  
Academic Year: 2026 - 2027  

**Under the Guidance of:**  
Prof. Madhav Kapadiya  

**Submitted To:**  
Department of MCA / M.Sc. IT  
Faculty of IT & Computer Science  
PARUL University, Vadodara, Gujarat  

---

## HEADER AND FOOTER SPECIFICATION
* **Running Header (All Pages):** ArogyaMitra EHR - Minor Project Report | Department of MCA, Parul University
* **Running Footer (All Pages):** Faculty of IT & Computer Science, Parul University | Page [No.]
* **Typography:** Clean standard roman font, no italic styling, zero placeholder highlights.

---

## CERTIFICATE

This is to certify that **Mr. Deep Panchal**, Enrollment No. **2505112110073**, a student of Master of Computer Applications, has satisfactorily completed the Minor Project entitled:

**"ArogyaMitra EHR – Electronic Health Record System with an Agentic AI Compliance Assistant"**

at the Faculty of IT & Computer Science, Parul University, in partial fulfillment of the requirements for Master of Computer Applications (MCA) Semester III for the Academic Year 2026 - 2027.

Seat No: 2505112110073  
Date of Submission: 07-10-2026  

| ____________________ | ____________________ | ____________________ |
| Internal Guide | Project Coordinator | HOD / HOI |
| Prof. Madhav Kapadiya | Prof. Project Coordinator | Dr. Head of Department |
| Department of MCA | Department of MCA | Faculty of IT & Computer Science |

**Faculty of IT & Computer Science**  
**PARUL University, Vadodara**

---

## PREFACE

Quality healthcare delivery depends fundamentally on reliable, accessible clinical information. In conventional outpatient and community settings, medical records are commonly fragmented across physical paper files, standalone laboratory slips, handwritten prescriptions, and disparate departmental software. When patients consult a new physician, critical history is often inaccessible, creating diagnostic delays and risking treatment errors.

ArogyaMitra EHR is conceived to resolve this fragmentation through a sovereign, consent-centered Electronic Health Record system. The patient is placed at the center of data governance: patients maintain their personal health records, grant time-bound and category-scoped access permissions to attending doctors, and retain the unilateral power to revoke access at any instant. Doctors, nurses, and administrators operate within purpose-built, role-isolated workstations.

Clinical documents uploaded by patients are processed through a local-first agentic AI pipeline that extracts candidate laboratory findings, medications, and vitals. To enforce clinical safety, zero automated chart mutation is permitted: every extracted candidate fact must be explicitly confirmed, modified, or rejected by a clinician before canonical persistence. Supervised machine-learning models estimate 30-day hospital readmission risks as non-diagnostic decision-support signals, strictly guarded by data-completeness validation.

The system is fully bilingual (English and Gujarati), supporting equitable healthcare access for regional populations. Developed using Spring Boot 3, React 19, PostgreSQL 16, and containerized Python AI microservices, ArogyaMitra demonstrates an enterprise-grade, privacy-preserving, and mathematically verified electronic health record architecture.

---

## ACKNOWLEDGEMENT

I express my sincere gratitude to Parul University, Faculty of IT & Computer Science, and the Department of MCA / M.Sc. IT for providing the infrastructure, computing resources, and academic environment essential for completing this project.

I am deeply thankful to my Internal Guide, **Prof. Madhav Kapadiya**, for continuous technical guidance, regular architectural reviews, and constructive feedback throughout the design, implementation, and verification phases. His recommendations regarding clinical consent isolation, zero-fabrication AI boundaries, and automated testing significantly elevated the quality and rigor of this work.

I extend my appreciation to the Head of Department, Project Coordinators, and faculty members of the Faculty of IT & Computer Science for their academic support. I also thank my peers for valuable feedback during user-interface and usability testing sessions. Finally, I thank my family and friends for their enduring encouragement throughout my academic journey.

**Deep Panchal**  
Enrollment No: 2505112110073  
Department of MCA, Parul University  

---

## INDEX

| Chapter No. | Description | Page No. |
| :--- | :--- | :--- |
| **1.** | **About Department of MCA/MScIT/IMCA** | 1 |
| | 1.1 Parul University | 1 |
| | 1.2 Faculty of IT & Computer Science | 1 |
| | 1.3 MCA Department & Academic Focus | 1 |
| **2.** | **Project Profile** | 2 |
| | 2.1 Project Definition | 2 |
| | 2.2 Project Description | 2 |
| | 2.3 Existing System / Work Environment | 3 |
| | 2.4 Problem Statements | 4 |
| | 2.5 Need for New System | 5 |
| | 2.6 Proposed System & Features | 5 |
| | 2.7 Scope | 7 |
| | 2.8 Outcomes | 8 |
| | 2.9 Tools & Technology Used | 8 |
| | 2.10 Project Plan & Milestones | 10 |
| **3.** | **Requirement Analysis** | 12 |
| | 3.1 Feasibility Study (Technical, Economic, Operational, Social) | 12 |
| | 3.2 Users of the System & Rights Matrix | 13 |
| | 3.3 System Modules | 14 |
| | 3.4 Process Model (Agile Scrum Workflow) | 15 |
| | 3.5 Hardware & Software Requirements | 17 |
| | 3.6 Use Cases | 18 |
| | 3.7 Use Case Diagram | 20 |
| **4.** | **Design** | 21 |
| | 4.1 Use Case Scenarios | 21 |
| | 4.2 Architectural & Behavioral Diagrams | 25 |
| | 4.2.1 UML Class, Sequence, Activity & Deployment Diagrams | 25 |
| | 4.2.2 Data Flow Diagrams (Context, Level 1, Level 2) | 30 |
| | 4.2.3 Formal Workflow Models (CPN Tools / WoPeD) | 33 |
| | 4.2.4 Entity Relationship Diagram | 34 |
| | 4.3 Data Dictionary & Schema Integrity Rules | 36 |
| **5.** | **Implementation** | 42 |
| | 5.1 Form Layouts & Screen Workflows | 42 |
| | 5.2 Report Layouts & Clinical Intelligence Outputs | 49 |
| | 5.3 Coding Conventions & Core Business Logic | 52 |
| **6.** | **Testing** | 56 |
| | 6.1 Test Strategy, Safety Principles & Test Data | 56 |
| | 6.2 Test Cases (40 Executed Test Cases with Actual Results) | 59 |
| | 6.3 Test Evidence & Verification Telemetry | 65 |
| **7.** | **Future Enhancements** | 68 |
| | 7.1 Proposed System Expansions | 68 |
| | 7.2 Research & Standards Trajectory | 68 |
| **8.** | **Bibliography** | 69 |

---

## 1. ABOUT DEPARTMENT OF MCA/MScIT/IMCA

### 1.1 Parul University
Parul University is established under the Gujarat Private Universities Act 2009, recognized by University Grants Commission (UGC) and accredited by NAAC with prestigious A++ grade. Located in Vadodara, Gujarat, Parul University houses more than 50,000 students across 32 institutes offering comprehensive multidisciplinary education.

### 1.2 Faculty of IT & Computer Science
The Faculty of IT & Computer Science is a premier technical education institution dedicated to producing industry-ready computing professionals. The faculty bridges theoretical computer science with modern engineering practices through practical laboratories, research initiatives, industrial internships, hackathons, and global academic affiliations.

### 1.3 MCA Department & Academic Focus
The Department of Master of Computer Applications (MCA) emphasizes advanced software engineering, cloud computing, artificial intelligence, enterprise architecture, and distributed databases. Curriculum delivery prioritizes project-based learning. Students execute end-to-end software development lifecycles covering requirements engineering, formal design, containerized deployment, test automation, and security audits to prepare for senior engineering roles.

---

## 2. PROJECT PROFILE

### 2.1 Project Definition
ArogyaMitra EHR is a web-based Electronic Health Record (EHR) system featuring patient-governed granular consent, role-isolated care workstations, agentic clinical document understanding, supervised hospital readmission risk prediction, and multilingual English/Gujarati presentation.

### 2.2 Project Description
Patient medical information is frequently distributed across isolated hospitals, paper records, and departmental laboratories. ArogyaMitra EHR creates a unified digital health record where patients retain absolute ownership over who views their records, for what clinical category, and for what duration.

The system incorporates four distinct user roles:
1. **Patient:** Self-registers, manages emergency contacts, uploads historical health reports, issues time-limited category-scoped consents, and monitors access audit trails.
2. **Doctor:** Accesses records exclusively for consented patients, documents encounters, ICD-10 diagnoses, multi-item prescriptions, and lab orders, reviews AI-extracted candidate facts, evaluates 30-day readmission risk estimates, and delegates bedside tasks to care-team nurses.
3. **Nurse:** Operates a task queue assigned by attending care-team physicians, advances tasks through state-machine workflows, and records bedside vital signs.
4. **Administrator:** Governs staff accounts, configures doctor-nurse care teams, oversees document removals/restorations with mandatory clinical justification, and inspects immutable audit logs.

An AI assistance layer built on FastAPI uses a local-first LLaMA 3.2 model via Ollama with automated failover to Google Gemini and deterministic heuristics. AI outputs remain strictly advisory: candidate facts require clinician confirmation before canonical EHR persistence.

### 2.3 Existing System vs. Proposed System
| Parameter | Manual Paper Records | Enterprise EHR (Epic / Cerner) | OpenEMR | ArogyaMitra EHR |
| :--- | :--- | :--- | :--- | :--- |
| **Patient Consent** | None (Physical custody) | Hospital-controlled | Coarse-grained | Granular, category-scoped, time-bound |
| **Fact Review Pipeline** | Manual typing | Proprietary OCR | Plugin-dependent | Staged human-in-the-loop candidate verification |
| **Nurse Delegation** | Verbal / Paper slips | Complex order entry | Basic scheduling | Formal Spring State Machine delegation queue |
| **Readmission Risk** | Subjective estimation | Closed proprietary model | None native | Supervised Random Forest with zero-fabrication gate |
| **Regional Language** | Handwritten local text | English-centric | Translation packs | Native runtime English and Gujarati parity |
| **AI Privacy Boundary** | N/A | Cloud-dependent | N/A | Local-first Ollama runtime with graceful fallback |

### 2.4 Problem Statements
1. **Fragmentation (P1):** Patient history scattered across paper slips and hospitals prevents longitudinal analysis.
2. **Lack of Patient Control (P2):** Patients cannot restrict specific clinical categories or enforce automatic expiration.
3. **Manual Transcribing Burden (P3):** Clinicians spend excessive consultation time typing lab values from paper.
4. **Unvalidated Autonomous AI Risk (P4):** Unguarded AI tools risk hallucinating clinical diagnoses into medical charts.
5. **Untracked Nursing Duties (P5):** Nursing tasks lack formal state-controlled delegation and bedside accountability.
6. **Auditing Voids (P6):** Legacy clinics maintain no tamper-evident ledger of who accessed sensitive health records.
7. **Language Barriers (P7):** English-only systems disenfranchise regional Gujarati-speaking populations.

### 2.5 Need for the New System
ArogyaMitra EHR is required to eliminate medical records fragmentation while safeguarding patient privacy through cryptographically verifiable, server-side authorization. It establishes bounded AI assistance that reduces administrative burden without transferring diagnostic authority from human doctors to machine learning models.

### 2.6 Proposed System Features
* **Role-Based Workstations:** Custom interfaces for Patient, Doctor, Nurse, and Administrator.
* **Granular Consent Engine:** Authorizations bounded by 6 categories and automated expiration timers.
* **Document Understanding Gateway:** PDF/Image text extraction proposing candidate vitals and lab numbers.
* **Human-in-the-Loop Fact Review:** Mandatory doctor confirmation before facts enter canonical history.
* **Clinical Intelligence Synthesis:** Longitudinal summaries organized by Past, Present, Trends, and Future Signals.
* **Supervised Readmission Predictor:** Random Forest classifier trained on 101,766 clinical encounters.
* **Zero-Fabrication Gate:** Rejection of risk inference when minimum structured inputs are missing.
* **Bilingual Parity:** Seamless English and Gujarati switching with localized terminology preservation.

### 2.7 Scope
* **Target Audience:** Clinics, teaching hospitals, outpatient centers, community dispensaries, and individual patients.
* **Operational Boundary:** Web browser execution on desktop, tablet, and mobile form factors.
* **Out of Scope:** Billing, pharmacy POS, automated robotic drug dispensing, autonomous diagnostic decisions.

### 2.8 Expected Outcomes
* Elimination of duplicate physical file retrieval during repeat visits.
* Instant revocation of doctor access upon consent termination.
* Zero unverified AI facts entering canonical patient charts.
* Bounded sub-second readmission risk signaling based on empirical training data.
* Full accessibility for Gujarati-speaking patients and staff.

### 2.9 Tools & Technology Used
* **Frontend:** React 19, TypeScript 5.5, Vite 8, Tailwind CSS, i18next, React Router 6.
* **Core Backend:** Java 17, Spring Boot 3.3.4, Spring Security 6, Spring Data JPA, Spring Statemachine, Hibernate Envers.
* **Database & Migration:** PostgreSQL 16 Alpine, Flyway Migration Engine.
* **AI & Machine Learning:** Python 3.11, FastAPI, Scikit-Learn 1.3, Tesseract OCR, Ollama, Google Gemini API.
* **DevOps & Containers:** Docker Engine 27, Docker Compose v2, Nginx Alpine, GitHub Actions.

### 2.10 Project Plan & Milestones
| Milestone | Period | Target Deliverable |
| :--- | :--- | :--- |
| **Phase 1: Requirements & Topic Approval** | 08-06-2026 to 10-07-2026 | Approved SRS and architectural plan |
| **Phase 2: Project Profile & Feasibility** | 11-07-2026 to 19-07-2026 | Baseline technical feasibility document |
| **Phase 3: Database & Security Architecture** | 20-07-2026 to 10-08-2026 | PostgreSQL schema, Flyway migrations, JWT security |
| **Phase 4: Design & Formal Modeling** | 11-08-2026 to 30-08-2026 | UML diagrams, DFDs, ER model, CPN Petri nets |
| **Phase 5: Implementation & Workstations** | 31-08-2026 to 08-09-2026 | React UI, Spring Boot APIs, Python AI services |
| **Phase 6: AI Hardening & Multilingual UX** | 09-09-2026 to 18-09-2026 | Gujarati i18n, zero-fabrication gates, failover |
| **Phase 7: End-to-End Testing & Stabilization**| 19-09-2026 to 22-09-2026 | 29 Unit tests, 10 E2E phases, 38 assertions passed |
| **Phase 8: Project Submission & Defense** | 01-10-2026 to 15-10-2026 | Verified project report, code repository, live demo |

---

## 3. REQUIREMENT ANALYSIS

### 3.1 Feasibility Study
* **Technical Feasibility:** Validated by successful containerization of 5 services (Core, DB, Agent, Risk, Frontend) on Docker.
* **Economic Feasibility:** Built entirely on open-source frameworks (React, Spring, PostgreSQL, Ollama) requiring zero proprietary enterprise license fees.
* **Operational Feasibility:** Streamlined into 4 role-specific workstations reducing training overhead.
* **Social Feasibility:** Preserves patient autonomy and broadens regional access through Gujarati localization.

### 3.2 Users of the System & Rights Matrix
| Permission / Capability | Patient | Doctor | Nurse | Administrator |
| :--- | :---: | :---: | :---: | :---: |
| Self-Registration & Profile Update | Yes | No | No | No |
| Upload & View Personal Medical Files | Yes | If Consented | If Consented | Governance Only |
| Grant / Revoke Access Consent | Yes | No | No | No |
| Create Encounters & Clinical Notes | No | Yes | No | No |
| Issue Prescriptions & Order Labs | No | Yes | No | No |
| Confirm / Edit Candidate Extracted Facts | No | Yes | Yes | No |
| Run Readmission Risk Assessment | No | Yes | No | No |
| Receive & Progress Delegated Tasks | No | No | Yes | No |
| Create Staff Accounts & Form Care Teams | No | No | No | Yes |
| Inspect Complete System Audit Trail | No | No | No | Yes |

### 3.3 System Modules
1. **Authentication & Identity Service:** JWT issuance, bcrypt password hashing, stateless token validation.
2. **Patient Sovereign Portal:** Medical profile, document repository, active consent dashboard.
3. **Doctor Clinical Workstation:** Consented chart review, encounter documentation, prescription writer.
4. **Nurse Execution Workstation:** Bedside task queue, status transitions, vital signs documentation.
5. **Admin Command Center:** Staff provisioning, doctor-nurse care team linkage, document governance.
6. **Consent & Expiration Engine:** Time-bound authorization evaluator with background revocation daemon.
7. **Document OCR & NER Extractor:** Text extraction staging candidate facts into review tables.
8. **Human-in-the-Loop Review Hub:** Triage interface for approving, correcting, or rejecting candidate facts.
9. **Longitudinal Clinical Synthesizer:** Narrative engine structuring health history into chronological quadrants.
10. **Supervised Readmission Estimator:** Random Forest risk prediction gated by data completeness checks.
11. **Bilingual Localization Module:** Dynamic language switching for English and Gujarati.
12. **Onboarding & Media Center:** Integrated 55-second instructional video walkthrough and interactive help.

### 3.4 Process Model: Agile Scrum Workflow
The development utilized Agile Scrum over five intensive sprints:
* **Sprint 1 (Core Foundations):** JWT authentication, role guards, base database schemas.
* **Sprint 2 (Clinical CRUD & Consent):** Encounters, prescriptions, lab orders, consent grant/revoke logic.
* **Sprint 3 (AI Document Pipelines):** OCR integration, NER candidate fact extraction, Clinical Fact Review UI.
* **Sprint 4 (Care Teams & State Machines):** Doctor-nurse task delegation, Spring Statemachine, Envers audit.
* **Sprint 5 (Stabilization & Localization):** Gujarati translation, Readmission risk model, 55s How-It-Works video.

### 3.5 Hardware & Software Requirements
* **Development Machine:** Intel Core i7 / AMD Ryzen 7, 16 GB DDR4 RAM, 512 GB NVMe SSD, Windows 11 64-bit.
* **Server Environment:** Docker Desktop 4.34, Java 17 OpenJDK, Python 3.11.9, Node.js 22.14, PostgreSQL 16.
* **Client Device:** Desktop, laptop, tablet, or smartphone with modern browser (Edge 120+, Chrome 120+, Firefox 120+).

### 3.6 Use Cases Summary
* **UC-01:** User Authentication & Session Refresh
* **UC-02:** Patient Self-Registration
* **UC-03:** Grant / Revoke Category-Scoped Consent
* **UC-04:** View Consented Patient Chart
* **UC-05:** Document Clinical Encounter & Diagnosis
* **UC-06:** Author Multi-Item Prescription
* **UC-07:** Order & Record Diagnostic Lab Result
* **UC-08:** Upload Medical Report & Trigger AI Analysis
* **UC-09:** Review, Edit, and Confirm Extracted Facts
* **UC-10:** Generate Longitudinal Health Insights
* **UC-11:** Execute 30-Day Readmission Risk Estimation
* **UC-12:** Delegate Bedside Task to Care-Team Nurse
* **UC-13:** Accept, Start, and Complete Nursing Task
* **UC-14:** Provision Staff Account & Care Team
* **UC-15:** Govern Document (Administrative Removal/Restoration)
* **UC-16:** Inspect System Security Audit Trail

---

## 4. DESIGN

### 4.1 Use Case Scenarios
* **Scenario UC-03 (Grant Consent):** Patient logs in -> navigates to Doctors -> selects Dr. Sarah Jenkins -> selects categories [LAB_REPORTS, CLINICAL_NOTES, MEDICATIONS] -> specifies 7-day expiration -> submits -> Core API verifies patient identity -> persists ACTIVE consent record -> logs audit event.
* **Scenario UC-08 & UC-09 (Document Fact Review):** Patient uploads blood test report -> API stores file in secure storage -> dispatches text to Agent Service -> OCR and NER run -> candidate facts saved in `document_extracted_facts` with status `PENDING` -> Doctor opens Clinical Fact Review -> inspects Fasting Blood Glucose (108 mg/dL) -> clicks Confirm -> fact is canonically written to `lab_reports`.
* **Scenario UC-11 (Risk Assessment Zero-Fabrication Gate):** Doctor opens patient chart -> requests 30-day readmission risk -> Core API evaluates patient clinical history -> detects missing date of birth and zero encounter records -> halts inference immediately -> returns `INSUFFICIENT_DATA` response -> displays clinical integrity advisory notice without guessing synthetic inputs.

### 4.2 Architectural Diagrams

#### 4.2.1 High-Level Microservice Architecture
```text
+-----------------------------------------------------------------------------------+
|                           PRESENTATION LAYER (Browser)                            |
|             React 19 + TypeScript + Vite + Tailwind CSS + i18next (EN / GU)       |
+------------------------------------------+----------------------------------------+
                                           | HTTPS / REST (JSON)
                                           v
+-----------------------------------------------------------------------------------+
|                           APPLICATION LAYER (Docker Bridge)                       |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |             core-service (Spring Boot 3.3.4, Java 17, Port 8081)            |  |
|  |  * Spring Security (JWT Stateless Filter)    * ConsentSecurityEvaluator     |  |
|  |  * Spring Data JPA / Hibernate ORM           * Spring Statemachine (Tasks)  |  |
|  |  * Hibernate Envers Historical Auditing      * Flyway Migration Runner      |  |
|  +-----------------------+-------------------------------+---------------------+  |
|                          |                               |                        |
|                          v                               v                        v
|  +-------------------------------+  +--------------------------+  +---------------+
|  | agent-service (FastAPI :8002) |  | risk-service (FastAPI)   |  | PostgreSQL 16 |
|  | * OCR & Text Extraction       |  | * Random Forest Model    |  | * Structured  |
|  | * Candidate Fact Staging      |  | * 101,766 US Encounters  |  |   EHR Tables  |
|  | * Longitudinal Synthesis      |  | * Zero-Fabrication Gate  |  | * Audit Logs  |
|  +---------------+---------------+  +--------------------------+  +---------------+
|                  |                                                                |
+------------------|----------------------------------------------------------------+
                   |
                   +--> [1. Ollama (Local LLaMA 3.2)] ===> [2. Gemini API (Fallback)]
```

#### 4.2.2 State Machine: Nurse Task Progression
```text
  [OPEN / ASSIGNED] 
         |
         | (Nurse clicks Accept)
         v
    [ACCEPTED]
         |
         | (Nurse clicks Start)
         v
   [IN_PROGRESS]
         |
         | (Nurse records vitals & clicks Complete)
         v
    [COMPLETED]
```

### 4.3 Data Dictionary
* **users:** `user_id` (PK, BigInt), `email_username` (VarChar 100, Unique), `password_hash` (VarChar 255), `role` (Enum: PATIENT, DOCTOR, NURSE, ADMIN), `language` (VarChar 10), `created_at` (Timestamp).
* **patients:** `patient_id` (PK, BigInt), `user_id` (FK users), `date_of_birth` (Date), `gender` (VarChar 20), `emergency_contact_name` (VarChar 100), `emergency_contact_phone` (VarChar 30).
* **consents:** `consent_id` (PK, BigInt), `patient_id` (FK patients), `doctor_id` (FK users), `categories` (VarChar 255), `status` (Enum: ACTIVE, EXPIRED, REVOKED), `expires_at` (Timestamp), `created_at` (Timestamp).
* **encounters:** `encounter_id` (PK, BigInt), `patient_id` (FK patients), `doctor_id` (FK users), `encounter_date` (Timestamp), `encounter_type` (VarChar 50), `chief_complaint` (Text), `assessment_plan` (Text).
* **prescriptions:** `prescription_id` (PK, BigInt), `patient_id` (FK patients), `doctor_id` (FK users), `status` (Enum: ACTIVE, DISCONTINUED, COMPLETED), `created_at` (Timestamp).
* **documents:** `document_id` (PK, BigInt), `patient_id` (FK patients), `file_name` (VarChar 255), `file_type` (VarChar 50), `file_size` (BigInt), `storage_path` (VarChar 500), `status` (Enum: UPLOADED, ANALYZED, REMOVED).
* **document_extracted_facts:** `fact_id` (PK, BigInt), `document_id` (FK documents), `fact_type` (Enum: LAB_RESULT, MEDICATION, DIAGNOSIS, VITAL_SIGN), `raw_text` (Text), `normalized_value` (VarChar 100), `status` (Enum: PENDING, CONFIRMED, REJECTED).
* **access_logs:** `log_id` (PK, BigInt), `actor_username` (VarChar 100), `role` (VarChar 30), `action` (VarChar 100), `resource_path` (VarChar 255), `decision` (Enum: ALLOW, DENY), `timestamp` (Timestamp).

---

## 5. IMPLEMENTATION

### 5.1 Form Layouts & Screen Workflows

#### Figure 5.1: Landing Page & Responsive Header
* **Route:** `/`
* **Elements:** ArogyaMitra healthcare emblem, short nav links (About, How It Works, Care Circle, Privacy), Language toggle (`ગુજરાતી / English`), Theme toggle, Sign In CTA, Create Patient Account CTA.
* **Operating Description:** Unauthenticated visitors navigate the platform value proposition, review the Care Circle model, toggle bilingual presentation, or launch the 55-second instructional video walkthrough.

#### Figure 5.2: Care Circle Coordination Visual
* **Component:** `CareCircleVisual.tsx`
* **Elements:** 3-node connected diagram showcasing Patient (Record Owner & Authority) -> Doctor (Attending Clinical Lead) -> Nurse (Bedside Care & Execution) with live flow tabs (Permissions, Records, Tasks, Updates).
* **Operating Description:** Illustrates the triadic coordination loop where patient consent unlocks doctor orders, and doctor orders delegate bedside tasks to nurses.

#### Figure 5.3: User Login Screen
* **Route:** `/login`
* **Elements:** Email/Username input, Password input with visibility toggle, Role selector badge, Sign In tactile button, Register link.
* **Operating Description:** Authenticates user via Spring Security, acquires signed JWT token, decodes role claims, and directs user to their authorized workstation.

#### Figure 5.4: Patient Self-Registration Screen
* **Route:** `/register`
* **Elements:** Full Name, Email, Password, Date of Birth, Gender, Emergency Contact Name/Phone, Language preference.
* **Operating Description:** Validates inputs, creates patient user account and profile, and redirects to login with success notification. Staff roles cannot be created here.

#### Figure 5.5: Patient Portal & Health Summary
* **Route:** `/dashboard` (Role: PATIENT)
* **Elements:** Metric cards (Encounters, Active Prescriptions, Lab Reports, Active Consents), recent clinical timeline, active care team list.
* **Operating Description:** Enables patient to review personal health records, observe recent entries, and track which clinicians possess active viewing permissions.

#### Figure 5.6: Document Center & File Upload
* **Route:** `/documents`
* **Elements:** Drag-and-drop file upload zone (PDF, PNG, JPG), file list table, document type badge, extraction status pill, Review Candidate Facts button.
* **Operating Description:** Patient uploads historical diagnostic reports. System computes SHA-256 hash, stores file securely, and dispatches file to OCR service.

#### Figure 5.7: Granular Consent & Permission Management
* **Route:** `/consent`
* **Elements:** Attending doctor selector, category check-grid (Encounters, Lab Reports, Prescriptions, Vitals, Diagnoses), duration selector (1 Hour, 24 Hours, 7 Days, 30 Days), Grant Consent button, Revoke Instantly button.
* **Operating Description:** Patient configures explicit data access boundaries. Revoking instantly locks doctor access server-side.

#### Figure 5.8: Doctor Workstation & Consented Patient List
* **Route:** `/dashboard` (Role: DOCTOR)
* **Elements:** Consented patient cards, active consent countdown, patient search/filter, Open Clinical Chart action.
* **Operating Description:** Doctor accesses records exclusively for patients who have granted active consent. Non-consented patients are blocked with HTTP 403.

#### Figure 5.9: Clinical Encounter Workspace
* **Route:** `/patient/:id/encounter`
* **Elements:** Visit date, Visit type (Inpatient, Outpatient, Emergency), Chief Complaint, Clinical Notes, Assessment & Plan, Amend Encounter button.
* **Operating Description:** Doctor records structured clinical consultations. Past encounters can be amended without destructive overwriting.

#### Figure 5.10: Diagnostic Laboratory Entry Form
* **Component:** `LabResultModal.tsx`
* **Elements:** Test Name selector, Result Value, Measurement Unit, Reference Range, Clinical Flag (Normal, High, Low, Critical), Save Lab Report button.
* **Operating Description:** Clinician enters canonical quantitative lab findings. Triggers automated notification to patient upon successful commit.

#### Figure 5.11: Extracted Clinical Flowsheet & Lab History
* **Route:** `/patient/:id/flowsheet`
* **Elements:** Longitudinal tabular view of Fasting Glucose, HbA1c, Total Cholesterol, Blood Pressure over time with color-coded severity badges.
* **Operating Description:** Consolidates all verified historical lab values in chronological sequence for rapid clinical trend analysis.

#### Figure 5.12: Nurse Workstation & Task Queue
* **Route:** `/nurse/tasks`
* **Elements:** Assigned duty list, Priority badge (Urgent, Routine), Status button (Accept -> Start -> Complete), Bedside Observation input.
* **Operating Description:** Nurse views duties delegated by attending care-team physicians, accepts duties, records vitals, and finalizes tasks.

#### Figure 5.13: Admin Command Center (People & Care Teams)
* **Route:** `/admin`
* **Elements:** Staff creation form (Doctor, Nurse, Admin), Care Team Builder (Assign Nurse to Doctor), Document Governance hub, Audit Trail viewer.
* **Operating Description:** System administrator provisions authenticated clinical staff, links nurses to doctors, and reviews system-wide security operations.

#### Figure 5.14: Onboarding Help & How-It-Works Video Modal
* **Component:** `HowItWorksModal.tsx`
* **Elements:** 1280x720 video viewport, HTML5 playback controls (play, pause, seek, volume, fullscreen), 4-step walkthrough cards, Retry fallback container.
* **Operating Description:** Plays the 55-second instructional walkthrough video explaining account creation, Care Circle, consent, and AI review.

---

### 5.2 Report Layouts & Clinical Intelligence Outputs

#### Figure 5.15: AI Health Insights (English View)
* **Component:** `HealthInsightsSection.tsx`
* **Quadrant 1 (Past Clinical Trajectory):** Chronological summary of documented encounters and chronic diagnoses.
* **Quadrant 2 (Current Health Status):** Active pharmacological regimen and verified vital signs.
* **Quadrant 3 (Trend Progression Analysis):** Trajectory of quantitative lab values across successive visits.
* **Quadrant 4 (Future Risk Signals):** Advisory indicators for follow-up scheduling.
* **Advisory Notice:** "Clinical Advisory: AI-assisted clinical synthesis with clinician review. Licensed clinicians make all clinical decisions."

#### Figure 5.16: AI Health Insights (Gujarati View)
* **Local Language Parity:** Renders all quadrant titles and explanations in authentic Gujarati:
  * ભુતકાળ — અગાઉ શું બન્યું હતું?
  * વર્તમાન — અત્યારે શું સ્થિતિ છે?
  * પ્રવાહો — શું બદલાઈ રહ્યું છે?
  * સલાહકારી જોખમ સંકેતો
* **Medical Value Preservation:** Preserves canonical international drug names, dosages, and units (`Metformin 500mg`, `108 mg/dL`, `124/82 mmHg`) while translating explanatory prose.

#### Figure 5.17: Clinical Document AI Analysis & Fact Review Modal
* **Component:** `ClinicalFactReview.tsx`
* **Sections:** Document metadata, OCR confidence, Extracted Entities (Labs, Meds, Diagnoses), Confirm/Edit/Reject action buttons.
* **Operating Description:** Clinician triages candidate facts extracted by LLaMA 3.2. Confirmed facts are migrated to canonical clinical tables.

#### Figure 5.18: Supervised 30-Day Readmission Risk Panel
* **Component:** `RiskAssessmentPanel.tsx`
* **Display Elements:** Readmission probability score, Risk Level (LOW, MODERATE, HIGH), Model Provenance (UCI Diabetes 130-US Hospitals legacy baseline), Feature Weights breakdown.
* **Zero-Fabrication State:** If minimum data requirements are unmet, renders: "Insufficient Information for Risk Assessment - ConsentCare enforces strict safety boundaries: missing features are never replaced with synthetic assumptions."

#### Figure 5.19: Admin Audit Log & Security Oversight
* **Component:** `AuditLogTable.tsx`
* **Columns:** Timestamp, Actor Username, Role, Action (e.g. `CONSENT_GRANTED`, `DOCUMENT_READ`, `LAB_REPORT_CREATED`), Resource ID, Decision (`ALLOW` / `DENY`).
* **Operating Description:** Provides compliance officers with immutable, chronologically ordered records of every protected transaction.

#### Figure 5.20: User Notifications Inbox
* **Component:** `NotificationDropdown.tsx`
* **Events:** Access requests, Consent revocations, Lab results ready, Nursing task delegations. Includes mark-as-read and real-time counter badges.

---

### 5.3 Coding Conventions & Core Business Logic

#### 1. Server-Side Method Security (@PreAuthorize)
```java
@PreAuthorize("hasRole('DOCTOR') and @consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'CLINICAL_NOTES')")
@GetMapping("/patient/{patientId}")
public ResponseEntity<List<EncounterResponse>> getEncounters(@PathVariable Long patientId) {
    return ResponseEntity.ok(clinicalRecordService.getEncountersForPatient(patientId));
}
```

#### 2. Zero-Fabrication Risk Assessment Gate
```java
public RiskPredictionResponse evaluateReadmissionRisk(Long patientId) {
    LongitudinalFeatures features = featureExtractor.extractFeatures(patientId);
    if (!features.isComplete()) {
        auditService.logRiskEvent(patientId, "INSUFFICIENT_DATA");
        return RiskPredictionResponse.builder()
            .status("INSUFFICIENT_DATA")
            .advisoryNotice("Missing required longitudinal features. Inference halted.")
            .build();
    }
    return riskClient.predict(features);
}
```

#### 3. AI Provider Chain Failover Logic
```python
class AIFactory:
    @classmethod
    def get_provider_chain(cls) -> list:
        # Intended order: Local Ollama -> Cloud Gemini Fallback
        providers = [cls.get_ollama_provider(), cls.get_gemini_provider()]
        return [p for p in providers if p.is_available()]
```

---

## 6. TESTING

### 6.1 Test Strategy & Execution Parameters
* **Unit Testing:** 29 backend JUnit 5 / Mockito tests verifying service methods, rate limiters, and JWT parsing.
* **Integration Testing:** Spring Boot WebMvcTest suites verifying REST controllers and database repositories.
* **End-to-End Suite:** 10-phase automated PowerShell harness (`test_final_system_audit_e2e.ps1`) executing 38 live assertions against running Docker containers.
* **Frontend Build Validation:** `tsc -b && vite build` verifying zero TypeScript or packaging compilation errors.
* **CDP Video Verification:** Real Microsoft Edge / Chromium headless automation testing HTML5 video playback, pause, time advancement, and modal reopen.

---

### 6.2 Test Cases (40 Executed Test Cases)

| Test ID | Module | Scenario Tested | Input / Action | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-01** | Auth | Patient Self-Registration | Valid registration payload | Account created, HTTP 201 | Created successfully | **PASS** |
| **TC-02** | Auth | Duplicate Email Registration | Repeat existing email | Rejected with HTTP 409 | Rejected with duplicate error | **PASS** |
| **TC-03** | Auth | Missing Registration Field | Omit password in registration | Validation failure, HTTP 400 | Rejected with field error | **PASS** |
| **TC-04** | Auth | Unauthorized Staff Registration | Submit role DOCTOR in register | Rejected, HTTP 403 | Forbidden, only Patient allowed | **PASS** |
| **TC-05** | Auth | Multi-Role Login | Valid login for all 4 roles | Signed JWT returned for each | HTTP 200, JWT tokens issued | **PASS** |
| **TC-06** | Auth | Bad Password Login | Valid username + wrong pass | Rejected, HTTP 401 | Authentication refused | **PASS** |
| **TC-07** | Security | Unauthenticated API Call | Call `/api/clinical/encounters` | Request rejected, HTTP 401 | Blocked by JwtAuthFilter | **PASS** |
| **TC-08** | Security | Role Boundary Violation | Patient calls `/api/admin/users` | Request rejected, HTTP 403 | Forbidden by PreAuthorize | **PASS** |
| **TC-09** | Security | Cross-Patient BOLA/IDOR | Patient A requests Patient B file | Access denied, HTTP 403 | Blocked by object security | **PASS** |
| **TC-10** | Consent | Grant Consent | Patient grants Doctor access | Consent status ACTIVE | Doctor can query records | **PASS** |
| **TC-11** | Consent | Access Without Consent | Doctor requests non-consented chart | Access denied, HTTP 403 | Blocked by ConsentSecurity | **PASS** |
| **TC-12** | Consent | Revoke Consent | Patient revokes active consent | Doctor loses access immediately | HTTP 403 returned to Doctor | **PASS** |
| **TC-13** | Consent | Automated Expiration | Expiration timestamp shifted past | Daemon sets EXPIRED, blocks doctor | Access denied, denial audited | **PASS** |
| **TC-14** | Consent | Category Scoping | Doctor queries ungranted category | Category access denied | HTTP 403 on ungranted scope | **PASS** |
| **TC-15** | Clinical | View Patient Chart | Consented Doctor opens chart | All clinical sections returned | Encounters/labs/meds returned | **PASS** |
| **TC-16** | Document | Multipart PDF Upload | Upload synthetic demo PDF | File saved, status UPLOADED | File stored, SHA-256 logged | **PASS** |
| **TC-17** | Document | Malformed / Large File | Upload unsupported binary | Request rejected, HTTP 400 | File rejected cleanly | **PASS** |
| **TC-18** | Doc AI | Extract Vitals & Labs | Agent runs OCR on demo report | Glucose 138, HbA1c 7.2 identified | Candidate facts staged | **PASS** |
| **TC-19** | Doc AI | Extract Meds & Diagnoses | Agent extracts Metformin & E11.9 | Staged with PENDING status | Values match demo report | **PASS** |
| **TC-20** | Review | Confirm Extracted Fact | Doctor clicks Confirm on Glucose | Fact migrated to `lab_reports` | Persisted canonically | **PASS** |
| **TC-21** | Review | Edit Extracted Fact | Doctor modifies dosage to 250mg | Edited value stored canonically | Corrected fact persisted | **PASS** |
| **TC-22** | Review | Reject Extracted Fact | Doctor clicks Reject on bad fact | Fact marked REJECTED | Omitted from canonical chart | **PASS** |
| **TC-23** | Insights | Longitudinal Synthesis (EN) | Request synthesis for Patient 4 | Narrative divided into 4 quadrants | Grounded narrative returned | **PASS** |
| **TC-24** | Insights | Empty Chart Synthesis | Request synthesis on empty patient | Empty state, zero hallucinations | No facts fabricated | **PASS** |
| **TC-25** | Insights | AI Local Provider Offline | Stop Ollama, call Insights | Automatic failover to Gemini | Gemini returns synthesis | **PASS** |
| **TC-26** | Insights | All AI Models Offline | Block Ollama and Gemini | Deterministic fallback invoked | Safe non-LLM summary returned | **PASS** |
| **TC-27** | Risk | Readmission Inference | Complete record on Patient 4 | Score & risk level returned | Score 0.24 (LOW) returned | **PASS** |
| **TC-28** | Risk | Zero-Fabrication Gate | Incomplete record (missing DOB) | INSUFFICIENT_DATA returned | Inference safely blocked | **PASS** |
| **TC-29** | Nurse | Task Delegation | Doctor delegates vitals check | Task created, Nurse notified | Task OPEN in nurse queue | **PASS** |
| **TC-30** | Nurse | State Machine Progression | Nurse moves: ACCEPT -> START | Valid state transitions allowed | Status changes to IN_PROGRESS | **PASS** |
| **TC-31** | Nurse | Bedside Vitals Recording | Nurse enters BP: 124/82 mmHg | Observation saved with task | Vitals persisted | **PASS** |
| **TC-32** | Nurse | Task Finalization | Nurse marks task COMPLETE | Task COMPLETED, Doctor notified | Notification sent to doctor | **PASS** |
| **TC-33** | Admin | Create Staff Account | Admin creates Doctor account | Doctor can log in successfully | Staff user created | **PASS** |
| **TC-34** | Admin | Form Care Team | Admin links Nurse to Doctor | Care team mapping saved | Doctor can assign to nurse | **PASS** |
| **TC-35** | Admin | Document Governance | Admin removes file with reason | File removed, audit recorded | Reason logged in audit trail | **PASS** |
| **TC-36** | i18n | English / Gujarati Parity | Toggle language to Gujarati | UI labels translated accurately | Complete Gujarati UI loaded | **PASS** |
| **TC-37** | i18n | Gujarati AI Insights | Request Insights with `lang=gu` | Explanations rendered in Gujarati | Canonical medical units intact | **PASS** |
| **TC-38** | Video | How-It-Works Video Play | Open modal, trigger play() | Duration >= 30s, time advances | 55s video plays cleanly | **PASS** |
| **TC-39** | Security | Frontend Secrets Leak Check | Scan production bundle for keys | Zero API keys or secrets found | Zero keys leaked | **PASS** |
| **TC-40** | Audit | Immutable Audit Inspection | Admin queries `/api/admin/audit` | 2,200+ events returned | All actions traceable | **PASS** |

---

### 6.3 Test Evidence & Verification Telemetry

#### 1. Frontend Production Build Output
```text
> frontend@0.0.0 build
> tsc -b && vite build

vite v8.2.1 building client environment for production...
transforming... [102 modules transformed]
rendering chunks...
computing gzip size...
dist/index.html                                2.32 kB │ gzip:   0.99 kB
dist/assets/index-Jvb13qzi.css                94.85 kB │ gzip:  14.15 kB
dist/assets/DocumentCenter-MW1o5wpz.js        79.06 kB │ gzip:  15.11 kB
dist/assets/index-Bm2-ze8W.js                410.65 kB │ gzip: 109.27 kB

[SUCCESS] Built in 770ms with 0 errors.
```

#### 2. Backend Unit & Security Test Execution
```text
[INFO] Running com.consentcare.core.security.ConsentSecurityEvaluatorTest
[INFO] Tests run: 9, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.421 s
[INFO] Running com.consentcare.core.service.ClinicalFactNormalizationServiceTest
[INFO] Tests run: 11, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.612 s
[INFO] Running com.consentcare.core.service.ConsentExpirationServiceTest
[INFO] Tests run: 9, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.504 s
[INFO] -------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] Total tests run: 29, Failures: 0, Errors: 0, Skipped: 0
```

#### 3. End-to-End System Audit Harness (`test_final_system_audit_e2e.ps1`)
```text
=== EXECUTING AROGYAMITRA FULL SYSTEM AUDIT ===
[PHASE 1] Health & Container Availability: PASS (5/5 UP)
[PHASE 2] Authentication & Role Isolation: PASS (4/4 Roles Tested)
[PHASE 3] BOLA / IDOR Authorization Security: PASS (HTTP 403 Enforced)
[PHASE 4] Doctor Clinical Encounters & Prescriptions: PASS
[PHASE 5] Diagnostic Laboratory Creation (Bug 0 Fix): PASS (HTTP 200)
[PHASE 6] Care Team & Nurse Task State Machine: PASS (ASSIGNED->ACCEPTED->COMPLETED)
[PHASE 7] Document Upload & OCR Candidate Extraction: PASS
[PHASE 8] 1-Hour Consent Expiration & Revocation: PASS (Expired Access Blocked)
[PHASE 9] Supervised Readmission Model & Zero-Fabrication Gate: PASS
[PHASE 10] Multilingual AI Synthesis & Audit Ledger: PASS

AUDIT SUMMARY: 10 / 10 PHASES PASSED | 38 DISCRETE ASSERTIONS CONFIRMED
```

#### 4. Browser CDP Video Playback Telemetry
```json
{
  "src": "http://localhost:81/media/how-it-works.mp4",
  "readyState": 4,
  "duration": 54.9132,
  "videoWidth": 1280,
  "videoHeight": 720,
  "playResult": { "success": true },
  "currentTimeAfter2s": 2.200106,
  "pauseVerification": { "halted": true, "timestamp": 2.201644 },
  "modalClose": { "dialogClosed": true },
  "modalReopen": { "dialogOpen": true, "hasVideo": true, "currentTime": 0, "readyState": 4 }
}
```

---

## 7. FUTURE ENHANCEMENTS

### 7.1 Proposed System Expansions
1. **ABDM / ABHA Gateway Integration:** Connecting to the Ayushman Bharat Digital Mission sandbox after formal government milestone certification and key provisioning.
2. **HL7 FHIR Release 4 Compatibility:** Exposing standardized FHIR REST endpoints (`/Observation`, `/Condition`, `/MedicationRequest`) for interoperability with tertiary hospitals.
3. **Multi-Hospital Federation:** Enabling federated identity and record exchange across independent healthcare facilities.
4. **Direct Telemedicine Integration:** WebRTC-based encrypted video consultations directly linked to patient encounter documentation.

### 7.2 Research & Standards Trajectory
1. **Multimodal Clinical Modeling:** Incorporating validated medical vision models for chest X-ray and CT triage under specialist radiologist oversight.
2. **Decentralized Audit Proofs:** Anchoring periodic SHA-256 state roots of the Envers audit ledger to a public ledger for non-repudiation.
3. **Voice-Assisted Clinical Scribing:** Ambient clinical dictation in Hindi and Gujarati with immediate doctor verification.

---

## 8. BIBLIOGRAPHY

### Books & Core Standards
1. Sommerville, Ian. *Software Engineering*, 10th Edition, Pearson Education, 2015.
2. Pressman, Roger S. and Maxim, Bruce R. *Software Engineering: A Practitioner's Approach*, 9th Edition, McGraw-Hill, 2019.
3. Schwaber, Ken and Sutherland, Jeff. *The Scrum Guide: The Definitive Guide to Scrum*, Scrum.org, 2020.
4. Jones, Michael, Bradley, John, and Sakimura, Nat. *JSON Web Token (JWT)*, RFC 7519, Internet Engineering Task Force (IETF), 2015.
5. Object Management Group (OMG). *Unified Modeling Language (UML) Specification Version 2.5.1*, 2017.

### Regulatory & Clinical Frameworks
6. Ministry of Law and Justice, Government of India. *The Digital Personal Data Protection Act, 2023 (DPDP Act)*, Gazette of India, 2023.
7. National Health Authority (NHA). *Ayushman Bharat Digital Mission (ABDM) Architecture and Sandbox Guidelines*, 2022.
8. Health Level Seven International (HL7). *Fast Healthcare Interoperability Resources (FHIR) Specification Release 4*, 2019.
9. Open Web Application Security Project (OWASP). *API Security Top 10 Vulnerabilities Standard*, 2023.

### Technical & Framework Documentation
10. Meta Platforms. *React 19 Documentation*, https://react.dev/
11. Microsoft Corporation. *TypeScript Language Specification*, https://www.typescriptlang.org/
12. VMware Inc. *Spring Boot Reference Documentation Version 3.3.4*, https://docs.spring.io/spring-boot/
13. VMware Inc. *Spring Security Framework Reference*, https://docs.spring.io/spring-security/
14. Red Hat Inc. *Hibernate ORM & Hibernate Envers User Guide*, https://hibernate.org/orm/
15. The PostgreSQL Global Development Group. *PostgreSQL 16 Reference Manual*, https://www.postgresql.org/docs/
16. Redgate Software. *Flyway Database Migration Engine Documentation*, https://flywaydb.org/
17. Docker Inc. *Docker Engine & Docker Compose Architecture Guides*, https://docs.docker.com/
18. Ollama Project. *Local Large Language Model Runtime Documentation*, https://ollama.com/
19. Google LLC. *Google Gemini API & GenAI SDK Reference*, https://ai.google.dev/
20. Scikit-Learn Developers. *Random Forest Classifier & Model Evaluation Metrics*, https://scikit-learn.org/
21. Strack, Beata, et al. *Impact of HbA1c Measurement on Hospital Readmission Rates: Analysis of 70,000 Clinical Database Encounters*, UCI Machine Learning Repository, 2014.
