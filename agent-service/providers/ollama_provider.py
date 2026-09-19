import os
import json
import logging
from typing import Dict, Any, Optional
import httpx

logger = logging.getLogger("agent-service.ollama")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")


class OllamaProvider:
    def __init__(self, base_url: str = OLLAMA_BASE_URL, model: str = OLLAMA_MODEL):
        self.base_url = base_url
        self.model = model

    def is_available(self) -> bool:
        try:
            resp = httpx.get(f"{self.base_url}/api/tags", timeout=3.0)
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                # Check if selected model or model prefix exists
                return any(self.model in m or m.startswith(self.model) for m in models)
            return False
        except Exception as e:
            logger.debug(f"Ollama availability check failed: {e}")
            return False

    def generate_structured(self, prompt: str, schema_description: str = "") -> Optional[Dict[str, Any]]:
        try:
            resp = httpx.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "format": "json",
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_predict": 1024
                    }
                },
                timeout=45.0
            )
            resp.raise_for_status()
            data = resp.json()
            raw_text = data.get("response", "")
            return json.loads(raw_text)
        except Exception as e:
            logger.warning(f"Ollama generation failed: {e}")
            return None

