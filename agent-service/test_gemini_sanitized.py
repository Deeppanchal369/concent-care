import sys
from providers.gemini_provider import GeminiProvider

p = GeminiProvider()
print("Gemini Key Present:", p.is_available())
print("Gemini Model:", p.model)
sys.stdout.flush()

try:
    res = p.generate_structured('Respond with JSON: {"status": "ok", "message": "ping"}')
    if res and res.get("status") == "ok":
        print("GEMINI_TEST: PASS")
    else:
        print("GEMINI_TEST: FAIL - Structure:", res)
except Exception as e:
    print(f"GEMINI_TEST: FAIL - Error: {type(e).__name__}")
sys.stdout.flush()

