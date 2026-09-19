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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agent-service")

RISK_SERVICE_URL = os.getenv("RISK_SERVICE_URL", "http://localhost:8001")

app = FastAPI(
    title="ConsentCare Agent Service",
    version="1.0.0",
    description="Document AI processing, real OCR, structured clinical information extraction, and Ollama integration."
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


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

    # 1. Multi-format text extraction & OCR
    extracted_text, method, status = DocumentTextExtractor.extract_from_bytes(
        file_bytes, actual_name, file.content_type or ""
    )

    # 2. Structured entity extraction
    entities = ClinicalEntityExtractor.extract(extracted_text)

    # 3. Grounded AI summarization
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
