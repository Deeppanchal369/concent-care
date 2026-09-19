# ==============================================================================
# ConsentCare EHR — Phase 5 Local Ollama Verification Script
# ==============================================================================
$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:8081"
$ollamaHostUrl = "http://localhost:11434"
$agentServiceUrl = "http://localhost:8002"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " CONSENTCARE EHR: PHASE 5 LOCAL OLLAMA VERIFICATION" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# Check 1: Verify Ollama is reachable from Windows
# ------------------------------------------------------------------------------
Write-Host "`n[Check 1] Verifying Ollama reachability from Windows host ($ollamaHostUrl)..." -ForegroundColor Yellow
try {
    $tagsHost = Invoke-RestMethod -Uri "$ollamaHostUrl/api/tags" -Method Get -TimeoutSec 5
    Write-Host " [PASS] Ollama is reachable on host at $ollamaHostUrl." -ForegroundColor Green
} catch {
    throw "Check 1 FAILED: Cannot reach Ollama on host at $ollamaHostUrl - $($_.Exception.Message)"
}

# ------------------------------------------------------------------------------
# Check 2: Verify llama3.2:1b exists
# ------------------------------------------------------------------------------
Write-Host "`n[Check 2] Verifying model llama3.2:1b in Ollama model registry..." -ForegroundColor Yellow
$modelNames = $tagsHost.models | ForEach-Object { $_.name }
$targetModel = $tagsHost.models | Where-Object { $_.name -eq "llama3.2:1b" -or $_.name -like "llama3.2:1b*" }
if (-not $targetModel) {
    throw "Check 2 FAILED: llama3.2:1b model not found in Ollama! Available models: $($modelNames -join ', ')"
}
Write-Host " [PASS] llama3.2:1b exists in Ollama (Size: $($targetModel.size) bytes, Format: $($targetModel.details.format), Parameter Size: $($targetModel.details.parameter_size))." -ForegroundColor Green

# ------------------------------------------------------------------------------
# Check 3: Verify agent-service can reach Ollama (http://host.docker.internal:11434)
# ------------------------------------------------------------------------------
Write-Host "`n[Check 3] Verifying agent-service container can reach Ollama via Docker host route..." -ForegroundColor Yellow
try {
    $agentHealth = Invoke-RestMethod -Uri "$agentServiceUrl/health" -Method Get -TimeoutSec 5
    if ($agentHealth.ai_provider.ollama.available -ne $true) {
        throw "Check 3 FAILED: agent-service reports ollama available = $($agentHealth.ai_provider.ollama.available)"
    }
    Write-Host " [PASS] agent-service successfully connected to Ollama (Provider: $($agentHealth.ai_provider.active_provider), Model: $($agentHealth.ai_provider.active_model), Route: $($agentHealth.ai_provider.ollama.base_url))." -ForegroundColor Green
} catch {
    throw "Check 3 FAILED: agent-service unreachable or cannot connect to Ollama - $($_.Exception.Message)"
}

# ------------------------------------------------------------------------------
# Check 4: Verify agent-service can call Ollama generate/chat API
# ------------------------------------------------------------------------------
Write-Host "`n[Check 4] Testing direct Ollama generate invocation from agent-service..." -ForegroundColor Yellow
$directRes = docker exec consentcare-agent-service python -c "from providers.ollama_provider import OllamaProvider; p = OllamaProvider(); res = p.generate_structured('Extract as json: The patient was prescribed amlodipine 5mg daily.'); print(res)"
if ($LASTEXITCODE -ne 0 -or -not $directRes) {
    throw "Check 4 FAILED: Direct Ollama call from agent-service failed! ExitCode: $LASTEXITCODE, Output: $directRes"
}
Write-Host " [PASS] agent-service successfully invoked Ollama generate API. Output: $directRes" -ForegroundColor Green

# ------------------------------------------------------------------------------
# Check 5: Process one real test medical document through existing pipeline
# ------------------------------------------------------------------------------
Write-Host "`n[Check 5] Processing a real test medical document through ConsentCare document pipeline..." -ForegroundColor Yellow

# Authenticate test personas
$patientLogin = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body (@{ username = "patient.eleanor.vance"; password = "Patient@123" } | ConvertTo-Json)
$pHeaders = @{ Authorization = "Bearer $($patientLogin.token)" }
$patientId = $patientLogin.profileId
if (-not $patientId) { $patientId = 4 }

$doc1Login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body (@{ username = "dr.jenkins"; password = "Doctor@123" } | ConvertTo-Json)
$doc1Headers = @{ Authorization = "Bearer $($doc1Login.token)" }
$doc1Id = $doc1Login.profileId
if (-not $doc1Id) { $doc1Id = 1 }

$doc2Login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body (@{ username = "dr.vance"; password = "Doctor@123" } | ConvertTo-Json)
$doc2Headers = @{ Authorization = "Bearer $($doc2Login.token)" }
$doc2Id = $doc2Login.profileId
if (-not $doc2Id) { $doc2Id = 2 }

# Prepare unique medical document content with intentional missing fields (no symptoms, no vitals)
$uniqueId = [System.Guid]::NewGuid().ToString().Substring(0, 8)
$medicalContent = @"
METROPOLITAN CARDIOLOGY CLINICAL REPORT
Document Reference: MCC-$uniqueId
Patient: Eleanor Vance
Date: 2026-09-19
Category: CARDIOLOGY_REPORT

CLINICAL IMPRESSION:
Patient evaluated for routine cardiometabolic follow-up. Electrocardiogram demonstrates sinus bradycardia with normal axis. Echocardiogram reveals preserved left ventricular ejection fraction of 62%.

DIAGNOSES:
1. Sinus bradycardia
2. Primary hypercholesterolemia

MEDICATIONS:
- Atorvastatin 20mg once daily at bedtime
- Aspirin 81mg once daily with meals

LABORATORY FINDINGS:
- Total Cholesterol: 215 mg/dL (Reference: < 200 mg/dL, Flag: HIGH)
- LDL Cholesterol: 138 mg/dL (Reference: < 100 mg/dL, Flag: HIGH)
- HDL Cholesterol: 54 mg/dL (Reference: > 50 mg/dL, Flag: NORMAL)
- Serum Creatinine: 0.88 mg/dL (Reference: 0.6 - 1.2 mg/dL, Flag: NORMAL)

SYMPTOMS / ACUTE COMPLAINTS:
(None reported. Patient specifically denies chest pain, shortness of breath, palpitations, or lightheadedness.)
"@

# Upload document via multipart/form-data
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"
$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"cardio_report_$uniqueId.txt`"",
    "Content-Type: text/plain$LF",
    $medicalContent,
    "--$boundary",
    "Content-Disposition: form-data; name=`"patientId`"$LF",
    "$patientId",
    "--$boundary",
    "Content-Disposition: form-data; name=`"category`"$LF",
    "DIAGNOSIS_REPORT",
    "--$boundary",
    "Content-Disposition: form-data; name=`"title`"$LF",
    "Cardiology Followup MCC-$uniqueId",
    "--$boundary",
    "Content-Disposition: form-data; name=`"description`"$LF",
    "Routine cardiology evaluation and lipid panel",
    "--$boundary--"
) -join $LF

$uploadRes = Invoke-RestMethod -Uri "$baseUrl/api/documents/upload" `
    -Method Post `
    -Headers $pHeaders `
    -ContentType "multipart/form-data; boundary=$boundary" `
    -Body $bodyLines

$docId = $uploadRes.id
Write-Host " [PASS] Document uploaded via core-service pipeline (Document ID: $docId, Status: $($uploadRes.processingStatus), AI Status: $($uploadRes.aiStatus))." -ForegroundColor Green

# ------------------------------------------------------------------------------
# Check 6 & Check 7: Await processing, verify Ollama generation and persistence
# ------------------------------------------------------------------------------
Write-Host "`n[Check 6 & 7] Awaiting Ollama inference & verifying persistence in ConsentCare workflow..." -ForegroundColor Yellow
$docDetail = $null
for ($i = 1; $i -le 45; $i++) {
    Start-Sleep -Seconds 1
    $docDetail = Invoke-RestMethod -Uri "$baseUrl/api/documents/$docId" -Method Get -Headers $pHeaders
    if ($docDetail.aiAnalysis -and ($docDetail.aiAnalysis.status -eq "READY" -or $docDetail.aiAnalysis.status -eq "NEEDS_REVIEW")) {
        Write-Host " [PASS] Ollama document inference completed in ${i}s." -ForegroundColor Green
        break
    }
}

if (-not $docDetail.aiAnalysis) {
    throw "Check 6/7 FAILED: AI analysis record was not persisted for document $docId!"
}

$analysis = $docDetail.aiAnalysis
Write-Host " [PASS] Document AI record persisted in PostgreSQL:" -ForegroundColor Green
Write-Host "        - Analysis ID: $($analysis.id)"
Write-Host "        - Model Provider: $($analysis.modelProvider)"
Write-Host "        - Status: $($analysis.status)"
Write-Host "        - Disclaimer: $($analysis.disclaimer)"
Write-Host "        - Summary: `"$($analysis.summaryText)`""

# Check 6 verification: Verify provider is Ollama
if ($analysis.modelProvider -notlike "*ollama*") {
    throw "Check 6 FAILED: Model provider is '$($analysis.modelProvider)', expected Ollama!"
}
Write-Host " [PASS] Verified result was genuinely generated by Ollama ($($analysis.modelProvider))." -ForegroundColor Green

# ------------------------------------------------------------------------------
# Check 8: Verify no mock/static AI response is being used
# ------------------------------------------------------------------------------
Write-Host "`n[Check 8] Verifying no mock/static response is used (grounded in dynamic document content)..." -ForegroundColor Yellow

$entities = $analysis.entitiesJson | ConvertFrom-Json
$foundAtorvastatin = $false
foreach ($med in $entities.medications) {
    if ($med -like "*Atorvastatin*" -or $med -like "*atorvastatin*") { $foundAtorvastatin = $true }
}

$foundCholesterol = $false
foreach ($lab in $entities.labResults) {
    if ($lab.testName -like "*Cholesterol*" -or $lab.testName -like "*LDL*") { $foundCholesterol = $true }
}

if (-not $foundAtorvastatin) {
    throw "Check 8 FAILED: Dynamic medication 'Atorvastatin' from input document was not extracted! Entities: $($analysis.entitiesJson)"
}
if (-not $foundCholesterol) {
    throw "Check 8 FAILED: Dynamic lab 'Cholesterol' from input document was not extracted! Entities: $($analysis.entitiesJson)"
}
Write-Host " [PASS] Dynamically extracted specific medication (Atorvastatin) and lab (Cholesterol/LDL) from document." -ForegroundColor Green
Write-Host " [PASS] No hardcoded or static response detected." -ForegroundColor Green

# ------------------------------------------------------------------------------
# Check 9: Verify missing information is returned as 'Not detected' rather than guessed
# ------------------------------------------------------------------------------
Write-Host "`n[Check 9] Verifying missing information is returned as 'Not detected' rather than guessed..." -ForegroundColor Yellow

# In the document, no acute symptoms were present, only denial of symptoms.
$symptoms = $entities.symptomsMentioned
Write-Host "        - Extracted Symptoms field: '$symptoms'"
$isNotDetectedOrNone = ($symptoms -eq "Not detected" -or $symptoms -like "*None*" -or $symptoms -like "*denies*" -or $symptoms -like "*No acute*" -or $symptoms -eq "")

if (-not $isNotDetectedOrNone) {
    throw "Check 9 FAILED: Model hallucinated or guessed symptoms instead of reporting not detected/none! Value: $symptoms"
}
Write-Host " [PASS] Missing/denied symptoms correctly preserved without hallucination or guessing: '$symptoms'." -ForegroundColor Green

# ------------------------------------------------------------------------------
# Check 10: Verify AI result is visible ONLY through authorized workflow
# ------------------------------------------------------------------------------
Write-Host "`n[Check 10] Verifying AI result is visible ONLY through authorized workflow..." -ForegroundColor Yellow

# Sub-check 10.1: Patient (owner) can view
$patientView = Invoke-RestMethod -Uri "$baseUrl/api/documents/$docId" -Method Get -Headers $pHeaders
if (-not $patientView.aiAnalysis) {
    throw "Check 10.1 FAILED: Patient cannot view own document AI analysis!"
}
Write-Host " [PASS] Patient successfully accessed own document AI analysis (200 OK)." -ForegroundColor Green

# Sub-check 10.2: Doctor 2 (no consent) is blocked
try {
    Invoke-RestMethod -Uri "$baseUrl/api/documents/$docId" -Method Get -Headers $doc2Headers
    throw "Check 10.2 FAILED: Doctor 2 was able to view document without consent!"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host " [PASS] Unauthorized Doctor 2 strictly blocked from viewing document (403 Forbidden)." -ForegroundColor Green
    } else {
        throw "Check 10.2 FAILED: Expected 403 Forbidden for Doctor 2, got: $($_.Exception.Message)"
    }
}

# Sub-check 10.3: Doctor 1 without consent is blocked
try {
    Invoke-RestMethod -Uri "$baseUrl/api/consents/revoke-doctor/$doc1Id" -Method Post -Headers $pHeaders | Out-Null
} catch {}

try {
    Invoke-RestMethod -Uri "$baseUrl/api/documents/$docId" -Method Get -Headers $doc1Headers
    throw "Check 10.3 FAILED: Doctor 1 was able to view document without consent!"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host " [PASS] Doctor 1 without active consent strictly blocked (403 Forbidden)." -ForegroundColor Green
    } else {
        throw "Check 10.3 FAILED: Expected 403 Forbidden for Doctor 1 without consent, got: $($_.Exception.Message)"
    }
}

# Sub-check 10.4: Patient grants consent for DOCUMENTS to Doctor 1
$grantDocBody = @{
    doctorId = $doc1Id
    category = "DOCUMENTS"
    purpose = "Authorize cardiology document review"
    expiresAt = (Get-Date).AddDays(30).ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json

$grantRes = Invoke-RestMethod -Uri "$baseUrl/api/consents/grant" -Method Post -Headers $pHeaders `
    -ContentType "application/json" `
    -Body $grantDocBody
Write-Host " [PASS] Patient granted active consent for DOCUMENTS to Doctor 1 (Consent ID: $($grantRes.id))." -ForegroundColor Green

# Sub-check 10.5: Doctor 1 can now view under valid consent
$doc1View = Invoke-RestMethod -Uri "$baseUrl/api/documents/$docId" -Method Get -Headers $doc1Headers
if (-not $doc1View.aiAnalysis) {
    throw "Check 10.5 FAILED: Doctor 1 under valid consent could not view document AI analysis!"
}
Write-Host " [PASS] Doctor 1 successfully viewed document AI analysis under active consent (200 OK)." -ForegroundColor Green

# Sub-check 10.6: Immediate revocation blocks Doctor 1
$revokeRes = Invoke-RestMethod -Uri "$baseUrl/api/consents/revoke-doctor/$doc1Id" -Method Post -Headers $pHeaders
Write-Host " [PASS] Patient revoked Doctor 1 access (revoked count: $($revokeRes.revokedCount))." -ForegroundColor Green
try {
    Invoke-RestMethod -Uri "$baseUrl/api/documents/$docId" -Method Get -Headers $doc1Headers
    throw "Check 10.6 FAILED: Doctor 1 was able to view document after revocation!"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host " [PASS] Immediate revocation verified: Doctor 1 access instantly revoked (403 Forbidden)." -ForegroundColor Green
    } else {
        throw "Check 10.6 FAILED: Expected 403 Forbidden after revocation, got: $($_.Exception.Message)"
    }
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " ALL 10 OLLAMA PHASE 5 VERIFICATION CHECKS PASSED (100%)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
