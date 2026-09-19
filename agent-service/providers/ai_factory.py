import os
import logging
from typing import Dict, Any, Optional
from providers.ollama_provider import OllamaProvider
from providers.gemini_provider import GeminiProvider

logger = logging.getLogger("agent-service.factory")

AI_PROVIDER_SETTING = os.getenv("AI_PROVIDER", "ollama").lower()


class AIFactory:
    _ollama = None
    _gemini = None

    @classmethod
    def get_ollama_provider(cls) -> OllamaProvider:
        if cls._ollama is None:
            cls._ollama = OllamaProvider()
        return cls._ollama

    @classmethod
    def get_gemini_provider(cls) -> GeminiProvider:
        if cls._gemini is None:
            cls._gemini = GeminiProvider()
        return cls._gemini

    @classmethod
    def get_active_provider(cls):
        provider_name = os.getenv("AI_PROVIDER", "ollama").lower()
        if provider_name == "gemini":
            gemini = cls.get_gemini_provider()
            if gemini.is_available():
                return gemini
            # Fall back to ollama if gemini key is missing/unavailable
            ollama = cls.get_ollama_provider()
            if ollama.is_available():
                return ollama
        else:
            ollama = cls.get_ollama_provider()
            if ollama.is_available():
                return ollama
            gemini = cls.get_gemini_provider()
            if gemini.is_available():
                return gemini
        return None

    @classmethod
    def get_health_status(cls) -> Dict[str, Any]:
        ollama = cls.get_ollama_provider()
        gemini = cls.get_gemini_provider()

        ollama_ok = ollama.is_available()
        gemini_ok = gemini.is_available()

        configured_provider = os.getenv("AI_PROVIDER", "ollama").lower()
        active_provider = None
        active_model = None

        if configured_provider == "gemini" and gemini_ok:
            active_provider = "gemini"
            active_model = gemini.model
        elif ollama_ok:
            active_provider = "ollama"
            active_model = ollama.model
        elif gemini_ok:
            active_provider = "gemini"
            active_model = gemini.model

        return {
            "status": "ok" if (ollama_ok or gemini_ok) else "degraded",
            "active_provider": active_provider,
            "active_model": active_model,
            "configured_provider": configured_provider,
            "ollama": {
                "configured": True,
                "model": ollama.model,
                "base_url": ollama.base_url,
                "available": ollama_ok
            },
            "gemini": {
                "configured": bool(os.getenv("GEMINI_API_KEY")),
                "model": gemini.model,
                "available": gemini_ok
            }
        }

