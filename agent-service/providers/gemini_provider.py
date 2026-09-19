import os
import json
import logging
from typing import Dict, Any, Optional
import httpx

logger = logging.getLogger("agent-service.gemini")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


class GeminiProvider:
    def __init__(self, api_key: str = GEMINI_API_KEY, model: str = GEMINI_MODEL):
        self.api_key = api_key
        self.model = model

    def is_available(self) -> bool:
        return bool(self.api_key)

    def generate_structured(self, prompt: str, schema_description: str = "") -> Optional[Dict[str, Any]]:
        if not self.is_available():
            return None
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        try:
            resp = httpx.post(
                url,
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "response_mime_type": "application/json",
                        "temperature": 0.1
                    }
                },
                timeout=45.0
            )
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(raw_text)
        except Exception as e:
            logger.warning(f"Gemini generation failed: {e}")
            return None

