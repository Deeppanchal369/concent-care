import httpx
import json

prompt = """You are a clinical document parser. Extract only the information explicitly stated in the document below. Do not guess or extrapolate. If any field is not stated in the document, use "Not detected".

<document_content>
CLINICAL LABORATORY REPORT
Patient: Eleanor Vance
Collection Date: 2026-08-15
Test: Fasting Blood Glucose: 142 mg/dL (Reference: 70-100 mg/dL) HIGH
Test: HbA1c: 7.8 % (Reference: 4.0-5.6 %) HIGH
Medications: Metformin 500mg BID
Impression: Type 2 Diabetes Mellitus
</document_content>

Return a JSON object conforming to this schema:
{
  "documentType": "string",
  "summary": "string",
  "labResults": [
    {
      "testName": "string",
      "value": "string",
      "unit": "string",
      "referenceRange": "string",
      "flag": "string"
    }
  ],
  "medications": ["string"],
  "diagnosesMentioned": ["string"],
  "symptomsMentioned": "string",
  "disclaimer": "AI-assisted summary. Verify against original document."
}
"""

try:
    resp = httpx.post(
        "http://host.docker.internal:11434/api/generate",
        json={
            "model": "llama3.2:1b",
            "prompt": prompt,
            "format": "json",
            "stream": False,
            "options": {"temperature": 0.1}
        },
        timeout=60.0
    )
    raw = resp.json().get("response", "")
    data = json.loads(raw)
    print("SUCCESS")
    print(json.dumps(data, indent=2))
except Exception as e:
    print("ERROR:", e)

