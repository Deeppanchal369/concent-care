# ArogyaMitra EHR

<div align="center">

### Next-Generation Zero-Trust, Patient-Governed Electronic Health Record Platform

[![Security Hardened](https://img.shields.io/badge/Security-OWASP%20ASVS%205.0%20(Level%202)-teal.svg)](#4-security-compliance--governance)
[![Architecture](https://img.shields.io/badge/Architecture-Zero--Trust%20ABAC-blue.svg)](#3-system-architecture--topology)
[![AI Intelligence](https://img.shields.io/badge/Clinical%20AI-Multimodal%20Vision%20%2B%20Local%20LLM-028090.svg)](#-4-multimodal-clinical-ai--machine-learning)
[![Standards](https://img.shields.io/badge/Interoperability-HL7%20%2F%20FHIR%20R4-emerald.svg)](#4-security-compliance--governance)
[![License](https://img.shields.io/badge/License-Proprietary%20%26%20Confidential-red.svg)](LICENSE)

*Empowering healthcare providers with real-time clinical workstations while restoring sovereign data consent and privacy to patients.*

</div>

---

## 1. Executive Summary & Value Proposition

Traditional Electronic Health Record (EHR) architectures confine sensitive patient health data within opaque, centralized hospital silos. Patients possess zero visibility or fine-grained control over who accesses their health history, while clinicians grapple with fragmented interfaces, manual transcription burdens, and disconnected care-team handoffs.

**ArogyaMitra EHR** (built on the *ConsentCare* architecture) establishes a modern, patient-governed clinical standard:
* **Patient Sovereign Consent Hub**: Granular category-level access control (`MEDICAL_HISTORY`, `DIAGNOSES`, `LAB_REPORTS`, `PRESCRIPTIONS`, `DOCUMENTS`, `RISK_ASSESSMENTS`) with 1-click instant revocation ("Stop Sharing") enforced at the database and gateway layers.
* **Specialized Clinical Workstations**: Purpose-built, distraction-free workspaces designed for attending physicians, care-team nurses, system administrators, and patients.
* **Grounded Multimodal Clinical AI**: Hybrid intelligence combining local offline models (Ollama `llama3.2:1b`) with multimodal cloud vision fallback (Gemini Vision) and adaptive OCR to digitize handwritten prescriptions, physician cursive notes, and scanned lab reports without hallucinations.
* **Predictive Clinical Analytics**: An authentic Random Forest readmission risk prediction engine trained on 101,766 verified inpatient clinical encounters (UCI Diabetes 130-US Hospitals dataset).
* **Enterprise Security Baseline**: Formally audited against **OWASP ASVS 5.0.0 (Level 2)**, OWASP Top 10:2025, and OWASP API Top 10:2023, featuring Attribute-Based Access Control (ABAC), immutable Envers audit provenance, and automated credential redaction.

---

## 2. Product Modules & Clinical Workstations

### 🛡️ 1. Patient Sovereign Consent Center
* **Granular Permission Sliders**: Patients independently grant or deny permission across 6 distinct clinical categories per physician or care team.
* **Instant Revocation ("Stop Sharing")**: Immediately terminates access tokens and propagates access barriers (HTTP 403 Forbidden) across all endpoints with zero synchronization delay.
* **Transparent Access Ledger**: Complete historical log detailing every physician, nurse, and system access attempt, timestamped with clinical justification.
* **Care Circle Management**: Enables patients to view and manage designated primary care physicians and approved specialists.

### 🩺 2. Doctor Clinical Workstation
* **Longitudinal Patient Charting**: Comprehensive timeline visualizing clinical encounters, lab trends, vitals history, and active medications.
* **Diagnostic Problem List**: ICD-10 standardized diagnostic registry with severity ratings, clinical notes, and amendment tracking.
* **Digital Prescription Authoring**: Structured e-prescriptions with dosage, route, frequency, duration, and indication checks.
* **Care-Team Task Delegation**: Real-time delegation of bedside care tasks, medication administration, and lab orders to assigned care-team nurses.

### 👩‍⚕️ 3. Nurse Bedside Coordination Station
* **Real-Time Task Queue**: Interactive dispatch queue for claiming, starting, and completing delegated physician orders.
* **Optimistic Concurrency Control**: Prevents duplicate medication administration or conflicting care tasks via database row-versioning locks.
* **Bedside Vitals Flowsheet**: Quick recording modal for blood pressure, pulse, temperature, oxygen saturation (SpO2), and blood glucose with range validation.
* **Duty Status Selector**: Real-time availability indicator (`AVAILABLE`, `BUSY`, `OFF_DUTY`) keeping attending doctors informed of nurse operational bandwidth.

### 🤖 4. Multimodal Clinical AI & Machine Learning
* **Handwriting & Prescription Digitization**: High-fidelity multimodal vision processing capable of transcribing physician cursive handwriting and camera uploads.
* **Strict Zero-Hallucination Guardrails**: Adheres to medical safety standards—unidentifiable markers are explicitly flagged as `"Not detected"` rather than fabricated.
* **Adversarial Prompt Shielding**: Uploaded clinical text is isolated within inert XML execution envelopes, defending against prompt injection and malicious payloads.
* **Supervised Readmission Risk Engine**: Classifies patient 30-day hospital readmission risk (`LOW`, `MEDIUM`, `HIGH`) with strict `INSUFFICIENT_DATA` enforcement when required clinical features are missing.

---

## 3. System Architecture & Topology

```
                         ┌──────────────────────────────────────────────┐
                         │   ArogyaMitra Single-Page Application (SPA) │
                         │       React 19 · Vite · Tailwind CSS v4      │
                         └──────────────────────┬───────────────────────┘
                                                │ RESTful APIs / SSE Notifications
                                                ▼
                         ┌──────────────────────────────────────────────┐
                         │       Enterprise Core API Gateway            │
                         │    Spring Boot 3.3 · Java 17 · Security 6    │
                         └──────┬────────────────┬───────────────┬──────┘
                                │                │               │
            Internal Microservice Network (Bound to Loopback / Private VPC)
                                │                │               │
                                ▼                ▼               ▼
                     ┌──────────────────┐ ┌───────────────┐ ┌───────────────┐
                     │  PostgreSQL 16   │ │ Risk Service  │ │ Agent Service │
                     │   Flyway V1–V26  │ │ Scikit-Learn  │ │ Ollama/Gemini │
                     │ Envers Provenance│ │ Readmission ML│ │ Document AI   │
                     └──────────────────┘ └───────────────┘ └───────────────┘
```

* **Microservice Isolation**: Risk and AI services bind strictly to loopback interfaces (`127.0.0.1`), ensuring zero direct exposure to public networks.
* **State Synchronization**: Server-Sent Events (SSE) deliver instant bedside notifications, task claim alerts, and duty state updates with zero polling overhead.
* **Healthcare Dark Mode**: High-contrast, WCAG 2.1 AA compliant dark theme designed for low-light clinical environments and nursing stations.
* **Bilingual Support**: Instant toggle between English and regional Gujarati (`ગુજરાતી`) with localized medical terminology and typography.

---

## 4. Security, Compliance & Governance

* **OWASP ASVS 5.0.0 (Level 2) Hardened**: Rigorously verified across authentication, session management, access control, input validation, and cryptography.
* **Attribute-Based Access Control (ABAC)**: Enforces dynamic multi-parameter authorization (patient consent + doctor care-team assignment + active clinical encounter).
* **Automated Audit Redaction**: High-performance regex filters scrub raw passwords, JWT bearer tokens, and sensitive clinical identifiers from system audit logs.
* **Immutable Provenance Tracking**: Hibernate Envers captures full historical snapshots of patient records, consent modifications, and diagnostic updates.
* **Interoperability Standards**: Features HL7 / FHIR R4 export endpoints (`/fhir/Patient`, `/fhir/Observation`) supporting interoperable clinical data exchange.

---

## 5. Live Demonstration & Evaluation Access

To safeguard the intellectual property of this platform and maintain healthcare security best practices, **production deployment scripts, internal network configurations, and administrative master credentials are kept in secure enterprise runbooks**.

### Interactive Sandbox Access
Live demonstration environments and evaluation credentials across all four roles (**Attending Physician**, **Care-Team Nurse**, **Patient**, and **System Administrator**) are available for institutional reviews, research evaluations, and prospective deployments upon verification:

* 📧 **Request Demonstration Access**: [deeppanchal01999@gmail.com](mailto:deeppanchal01999@gmail.com)  
* 📄 **Comprehensive Project Report**: An in-depth 11-section architectural and clinical report is available in [`docs/PROJECT_REPORT_AROGYAMITRA_EHR.md`](docs/PROJECT_REPORT_AROGYAMITRA_EHR.md) and [`docs/ArogyaMitra_EHR_Project_Report.pdf`](docs/ArogyaMitra_EHR_Project_Report.pdf).

---

## 6. Intellectual Property & Copyright Notice

**Copyright © 2026 Deep Panchal. All Rights Reserved.**

This platform, including its software architecture, user interface designs, proprietary algorithms, database schemas, and documentation, is the exclusive intellectual property of **Deep Panchal**.

* **PROPRIETARY & CONFIDENTIAL**: No part of this software may be cloned, copied, downloaded, redistributed, reverse-engineered, white-labeled, re-hosted, or commercially exploited without prior express written authorization.
* **UNAUTHORIZED USE & PIRACY**: Unauthorized reproduction or false claims of authorship over this system, its source code, or its branding will be subject to immediate legal action and DMCA takedown enforcement.

For licensing, commercial partnerships, or deployment inquiries, please contact **Deep Panchal** at [deeppanchal01999@gmail.com](mailto:deeppanchal01999@gmail.com).
