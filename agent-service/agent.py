from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel

import llm_client

SENSITIVE_CATEGORIES = {"mental_health", "hiv_status", "genetic_data", "substance_use"}


class ConsentRecord(BaseModel):
    category: str
    granted_to_role: str
    purpose: str
    granted_at: datetime
    expires_at: datetime
    revoked: bool = False


class ConsentCheckRequest(BaseModel):
    patient_id: str
    consents: List[ConsentRecord]
    now: Optional[datetime] = None


class ConsentStatus(BaseModel):
    category: str
    granted_to_role: str
    active: bool
    status: str
    message: str


class AccessAttempt(BaseModel):
    patient_id: str
    accessed_by_role: str
    category: str
    consents: List[ConsentRecord]
    timestamp: Optional[datetime] = None


class AccessDecision(BaseModel):
    decision: str
    reason: str
    message: str
    flagged_as_anomaly: bool


def _now(explicit: Optional[datetime]) -> datetime:
    return explicit or datetime.now(timezone.utc)


def check_consents(req: ConsentCheckRequest) -> List[ConsentStatus]:
    now = _now(req.now)
    results = []
    for c in req.consents:
        if c.revoked:
            status, active, phrase = "REVOKED", False, "has been revoked"
        elif c.expires_at <= now:
            status, active, phrase = "EXPIRED", False, "has expired"
        elif (c.expires_at - now).total_seconds() <= 3 * 24 * 3600:
            status, active, phrase = "EXPIRING_SOON", True, "is expiring within 3 days"
        else:
            status, active, phrase = "ACTIVE", True, "is active"

        message = llm_client.generate_text("consent_alert", {
            "patient_id": req.patient_id, "category": c.category,
            "status_phrase": phrase, "active": active,
        })
        results.append(ConsentStatus(category=c.category, granted_to_role=c.granted_to_role, active=active, status=status, message=message))
    return results


def evaluate_access(attempt: AccessAttempt) -> AccessDecision:
    now = _now(attempt.timestamp)
    matching = [c for c in attempt.consents if c.category == attempt.category and c.granted_to_role == attempt.accessed_by_role]
    valid = [c for c in matching if not c.revoked and c.expires_at > now]

    if not valid:
        reason = "no active consent covers this role/category combination"
        decision = "DENY"
    else:
        reason = "an active, unexpired consent covers this access"
        decision = "ALLOW"

    anomaly = False
    anomaly_notes = []
    if attempt.category in SENSITIVE_CATEGORIES and decision == "ALLOW":
        anomaly = True
        anomaly_notes.append("sensitive category access, logged for review")
    hour = now.hour
    if hour < 6 or hour >= 23:
        anomaly = True
        anomaly_notes.append("access outside typical clinic hours")

    if anomaly_notes:
        reason = f"{reason}; {', '.join(anomaly_notes)}"

    message = llm_client.generate_text("access_flag", {
        "patient_id": attempt.patient_id, "role": attempt.accessed_by_role,
        "category": attempt.category, "decision": decision, "reason": reason,
    })
    return AccessDecision(decision=decision, reason=reason, message=message, flagged_as_anomaly=anomaly)


class RecordPoint(BaseModel):
    category: str
    text: str


class SummarizeRequest(BaseModel):
    patient_id: str
    allowed_categories: List[str]
    records: List[RecordPoint]


class SummarizeResponse(BaseModel):
    patient_id: str
    included_categories: List[str]
    excluded_categories: List[str]
    summary: str


def summarize_within_consent(req: SummarizeRequest) -> SummarizeResponse:
    allowed_set = set(req.allowed_categories)
    included = [r for r in req.records if r.category in allowed_set]
    excluded_categories = sorted({r.category for r in req.records if r.category not in allowed_set})

    summary = llm_client.generate_text("summary", {
        "patient_id": req.patient_id,
        "allowed_points": [f"[{r.category}] {r.text}" for r in included],
    })
    return SummarizeResponse(
        patient_id=req.patient_id,
        included_categories=sorted({r.category for r in included}),
        excluded_categories=excluded_categories,
        summary=summary,
    )
