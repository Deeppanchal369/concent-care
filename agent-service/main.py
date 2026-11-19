import os
import sys
import json
import logging
from typing import Dict, Any, Optional
import httpx
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from providers.ai_factory import AIFactory
from extractors.text_extractor import DocumentTextExtractor
from extractors.clinical_extractor import ClinicalEntityExtractor
from summarizers.clinical_summarizer import ClinicalDocumentSummarizer
from synthesizers.longitudinal_synthesizer import LongitudinalClinicalSynthesizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agent-service")

RISK_SERVICE_URL = os.getenv("RISK_SERVICE_URL", "http://localhost:8001")

app = FastAPI(
    title="ConsentCare Agent Service",
    version="1.0.0",
    description="Document AI processing, real OCR, structured clinical information extraction, and Ollama integration."
)
allowed_origins_env = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:81,http://127.0.0.1:81,http://localhost:8081,http://localhost:3000")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"]
)


@app.get("/health")
def health():
    ai_health = AIFactory.get_health_status()
    risk_ok = False
    try:
        r = httpx.get(f"{RISK_SERVICE_URL}/health", timeout=2.0)
        risk_ok = (r.status_code == 200)
    except Exception:
        pass

    return {
        "status": "ok",
        "service": "agent-service",
        "ai_provider": ai_health,
        "risk_service_reachable": risk_ok,
        "ocr_available": True
    }


@app.post("/agent/process-file")
async def process_file(
    file: UploadFile = File(...),
    document_id: int = Form(...),
    patient_id: int = Form(...),
    category: str = Form("OTHER"),
    file_name: Optional[str] = Form(None)
):
    actual_name = file_name if file_name else file.filename
    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read uploaded file: {e}")

    ext = actual_name.lower().split(".")[-1] if "." in actual_name else ""
    mime_type = file.content_type or ""
    is_image = ext in ["jpg", "jpeg", "png", "webp"] or ("image/" in mime_type)

    summary_result = None
    extracted_text = ""
    method = "DIRECT_PARSE"
    status = "READY"

    # 1. Multimodal Vision Pipeline: For images and mobile photos (doctor prescriptions, slips)
    # Bypasses classical OCR limitations to read cursive handwriting, medicines, and dosages directly.
    if is_image:
        gemini = AIFactory.get_gemini_provider()
        if gemini and gemini.is_available():
            vision_prompt = f"""You are an expert clinical document analyst.
Analyze this prescription or medical document image in high detail.
Transcribe and identify:
1. Patient name, age, gender, date
2. Prescribing doctor name, credentials, registration, clinic, contact
3. Clinical condition, complaints (e.g. c/o BP -> Hypertension)
4. Prescribed medications with dosage, frequency/schedule (e.g. 1-0-0 = once daily morning), and instructions
5. Any lab tests or values if present
Output strictly in valid JSON matching this schema:
{{
    "documentType": "{category.replace('_', ' ').title() if category != 'OTHER' else 'Prescription'}",
    "summary": "Clear, grounded clinical summary of the patient, doctor, condition, and treatment",
    "keyFindings": ["clinical finding 1", "clinical finding 2"],
    "labResults": [
        {{"testName": "string", "value": "string", "unit": "string", "referenceRange": "string", "flag": "NORMAL|HIGH|LOW"}}
    ],
    "medications": ["Medication name, dosage, schedule (e.g. Tab. Nicardia 1-0-0)"],
    "diagnosesMentioned": ["Diagnosis or condition (e.g. Hypertension)"],
    "symptomsMentioned": "Symptoms or chief complaint",
    "uncertainItems": ["Any ambiguous handwriting items"]
}}"""
            try:
                vision_res = gemini.generate_structured_vision(
                    vision_prompt, file_bytes, mime_type or "image/jpeg"
                )
                if vision_res and (vision_res.get("medications") or vision_res.get("summary") or vision_res.get("diagnosesMentioned")):
                    summary_result = vision_res
                    method = "MULTIMODAL_VISION"
                    status = "READY"
                    summary_result["modelProvider"] = f"gemini-vision ({gemini.model})"
                    med_lines = "\n".join([f"- {m}" for m in summary_result.get("medications", [])])
                    diag_lines = ", ".join(summary_result.get("diagnosesMentioned", []))
                    extracted_text = f"Summary: {summary_result.get('summary', '')}\n\nCondition: {diag_lines}\n\nPrescribed Medications:\n{med_lines}"
            except Exception as vision_err:
                logger.warning(f"Vision analysis fallback triggered: {vision_err}")
                summary_result = None

    # 2. Text Extraction & Fallback Pipeline (PDFs, DOCX, TXT, or when vision is offline)
    if not summary_result:
        extracted_text, method, status = DocumentTextExtractor.extract_from_bytes(
            file_bytes, actual_name, mime_type
        )
        entities = ClinicalEntityExtractor.extract(extracted_text)
        summary_result = ClinicalDocumentSummarizer.summarize(
            extracted_text, actual_name, category, entities
        )

    report_type = summary_result.get("documentType")
    if not report_type or str(report_type).lower().strip() in ["string", "number", "object", "example", "test", "unknown", ""]:
        report_type = category.replace("_", " ").title() if category not in ("OTHER", "") else "Not detected"

    symptoms = summary_result.get("symptomsMentioned")
    if not symptoms or str(symptoms).lower().strip() in ["string", "number", "object", "example", "test", "unknown", ""]:
        symptoms = "Not detected"

    return {
        "document_id": document_id,
        "patient_id": patient_id,
        "report_type": report_type,
        "summary": summary_result.get("summary", "Document processed."),
        "key_findings": summary_result.get("keyFindings", []),
        "lab_results": summary_result.get("labResults", []),
        "medications": summary_result.get("medications", []),
        "diagnoses": summary_result.get("diagnosesMentioned", []),
        "symptoms": symptoms,
        "extracted_text": extracted_text,
        "extraction_method": method,
        "extraction_status": status,
        "model_provider": summary_result.get("modelProvider", "local-nlp"),
        "model_version": "1.0.0",
        "structured_json": json.dumps(summary_result),
        "disclaimer": "AI-assisted — verify against original document."
    }


@app.post("/agent/process-document")
def process_document(payload: Dict[str, Any]):
    doc_id = payload.get("document_id", 0)
    patient_id = payload.get("patient_id", 0)
    file_name = payload.get("file_name", "Clinical_Document")
    category = payload.get("category", "CLINICAL_NOTE")
    text = payload.get("text", "")

    entities = ClinicalEntityExtractor.extract(text)
    summary_result = ClinicalDocumentSummarizer.summarize(text, file_name, category, entities)

    return {
        "document_id": doc_id,
        "patient_id": patient_id,
        "report_type": summary_result.get("documentType", category),
        "summary": summary_result.get("summary", "Clinical document processed."),
        "key_findings": summary_result.get("keyFindings", []),
        "lab_results": summary_result.get("labResults", []),
        "medications": summary_result.get("medications", []),
        "diagnoses": summary_result.get("diagnosesMentioned", []),
        "symptoms": summary_result.get("symptomsMentioned", "Not detected"),
        "extracted_text": text,
        "extraction_method": "DIRECT_TEXT",
        "extraction_status": "READY" if text.strip() else "NEEDS_REVIEW",
        "model_provider": summary_result.get("modelProvider", "local-nlp"),
        "model_version": "1.0.0",
        "structured_json": json.dumps(summary_result),
        "disclaimer": "AI-assisted — verify against original document."
    }


@app.post("/agent/synthesize-clinical-insights")
def synthesize_clinical_insights(payload: Dict[str, Any]):
    return LongitudinalClinicalSynthesizer.synthesize(payload)
