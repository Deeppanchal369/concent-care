import os
import httpx

BASE_URL = os.getenv("OPENAI_COMPATIBLE_BASE_URL", "").rstrip("/")
API_KEY = os.getenv("LLM_API_KEY", "")
MODEL = os.getenv("LLM_MODEL", "llama3")


def _fallback_phrase(kind: str, context: dict) -> str:
    if kind == "consent_alert":
        return (
            f"Consent for {context['category']} on patient {context['patient_id']} "
            f"{context['status_phrase']}. Access under this consent should "
            f"{'be treated as active' if context['active'] else 'not be permitted'}."
        )
    if kind == "access_flag":
        return (
            f"Access attempt by role '{context['role']}' to category "
            f"'{context['category']}' for patient {context['patient_id']} was "
            f"{context['decision']}. Reason: {context['reason']}."
        )
    if kind == "summary":
        lines = "; ".join(context["allowed_points"]) or "no records within the granted consent scope"
        return f"Summary for patient {context['patient_id']} (within consented scope): {lines}."
    return "No summary available."


def generate_text(kind: str, context: dict) -> str:
    if not BASE_URL:
        return _fallback_phrase(kind, context)
    prompt = _build_prompt(kind, context)
    try:
        resp = httpx.post(
            f"{BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {API_KEY}"} if API_KEY else {},
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": "You write one short, plain-language sentence for clinic staff. Do not invent facts beyond what is given."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
                "max_tokens": 120,
            },
            timeout=8.0,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return _fallback_phrase(kind, context)


def _build_prompt(kind: str, context: dict) -> str:
    if kind == "consent_alert":
        return f"Consent details: {context}. Write one short staff-facing alert sentence."
    if kind == "access_flag":
        return f"Access attempt details: {context}. Write one short staff-facing alert sentence."
    if kind == "summary":
        return f"Patient record points (already filtered to consented scope): {context['allowed_points']}. Write a brief, plain-language summary."
    return str(context)
