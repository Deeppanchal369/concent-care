import os
import json
import time
import logging
from typing import Dict, Any, Optional
import httpx

logger = logging.getLogger("agent-service.gemini")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")


class GeminiProvider:
    def __init__(self, api_key: str = GEMINI_API_KEY, model: str = GEMINI_MODEL):
        self.api_key = api_key
        self.model = model
        self.fallback_models = ["gemini-3.5-flash", "gemini-3.6-flash"]

    def is_available(self) -> bool:
        return bool(self.api_key)

    def generate_structured(self, prompt: str, schema_description: str = "") -> Optional[Dict[str, Any]]:
        if not self.is_available():
            return None

        models_to_try = [self.model]
        for m in self.fallback_models:
            if m not in models_to_try:
                models_to_try.append(m)

        headers = {
            "x-goog-api-key": self.api_key,
            "Content-Type": "application/json"
        }

        for current_model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:generateContent"
            for attempt in range(2):
                try:
                    resp = httpx.post(
                        url,
                        headers=headers,
                        json={
                            "contents": [{"parts": [{"text": prompt}]}],
                            "generationConfig": {
                                "response_mime_type": "application/json",
                                "temperature": 0.1
                            }
                        },
                        timeout=45.0
                    )
                    if resp.status_code in (503, 429) and attempt == 0:
                        time.sleep(1.0)
                        continue
                    if resp.status_code in (404, 429, 503):
                        break
                    resp.raise_for_status()
                    data = resp.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return json.loads(raw_text)
                except Exception as e:
                    if attempt == 1:
                        status = getattr(getattr(e, "response", None), "status_code", "N/A")
                        logger.warning(f"Gemini generation failed on model '{current_model}': {type(e).__name__} (status: {status})")
                    time.sleep(1.0)

        return None

