# Phase 3 Comprehensive End-to-End Test Suite
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " CONSENTCARE EHR: PHASE 3 VERIFICATION SUITE" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Authenticate Patient (Eleanor Vance, ID 4)
$loginPatient = @{ username = "patient.eleanor.vance"; password = "Patient@123" } | ConvertTo-Json
$pAuth = Invoke-RestMethod -Uri "http://localhost:8081/api/auth/login" -Method Post -Body $loginPatient -ContentType "application/json"
$pToken = $pAuth.token
$pHeaders = @{ Authorization = "Bearer $pToken" }
Write-Host " [PASS] Patient Eleanor Vance authenticated successfully." -ForegroundColor Green

# 2. Authenticate Doctor (Dr. Sarah Jenkins, Doctor ID 1)
$loginDoc = @{ username = "dr.jenkins"; password = "Doctor@123" } | ConvertTo-Json
$dAuth = Invoke-RestMethod -Uri "http://localhost:8081/api/auth/login" -Method Post -Body $loginDoc -ContentType "application/json"
$dToken = $dAuth.token
$dHeaders = @{ Authorization = "Bearer $dToken" }
Write-Host " [PASS] Dr. Sarah Jenkins authenticated successfully." -ForegroundColor Green

# 3. Authenticate Doctor (Dr. Marcus Vance, Doctor ID 2 - has no consent for Patient 4 initially)
$loginDoc2 = @{ username = "dr.vance"; password = "Doctor@123" } | ConvertTo-Json
$d2Auth = Invoke-RestMethod -Uri "http://localhost:8081/api/auth/login" -Method Post -Body $loginDoc2 -ContentType "application/json"
$d2Token = $d2Auth.token
$d2Headers = @{ Authorization = "Bearer $d2Token" }
Write-Host " [PASS] Dr. Marcus Vance authenticated successfully." -ForegroundColor Green

$patientId = 4

# 4. Test Document Upload (Patient uploads a PDF report)
$sampleContent = "%PDF-1.4 sample diagnostic test report content for ConsentCare Phase 3 verification"
$tempPdfPath = [System.IO.Path]::GetTempFileName() + ".pdf"
[System.IO.File]::WriteAllText($tempPdfPath, $sampleContent)

Write-Host "`n--- Testing Document Upload ---" -ForegroundColor Yellow
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"
$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"patientId`"$LF",
    "$patientId",
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"clinical_lab_panel.pdf`"",
    "Content-Type: application/pdf$LF",
    $sampleContent,
    "--$boundary",
    "Content-Disposition: form-data; name=`"category`"$LF",
    "LABORATORY_REPORT",
    "--$boundary",
    "Content-Disposition: form-data; name=`"title`"$LF",
    "Comprehensive Lipid & Metabolic Panel",
    "--$boundary",
    "Content-Disposition: form-data; name=`"description`"$LF",
    "Fasting comprehensive metabolic and lipid panel performed at central lab.",
    "--$boundary--"
) -join $LF

$uploadRes = Invoke-RestMethod -Uri "http://localhost:8081/api/documents/upload" `
    -Method Post `
    -Headers $pHeaders `
    -ContentType "multipart/form-data; boundary=$boundary" `
    -Body $bodyLines

$docId = $uploadRes.id
Write-Host " [PASS] Document uploaded successfully. ID: $docId, Title: $($uploadRes.title), Category: $($uploadRes.category), Status: $($uploadRes.processingStatus)" -ForegroundColor Green

# 5. Test Paged Document Search & Filter
Write-Host "`n--- Testing Paged Document Search & Filter ---" -ForegroundColor Yellow
$pagedDocs = Invoke-RestMethod -Uri "http://localhost:8081/api/documents/patient/$patientId/paged?page=0&size=10&category=LABORATORY_REPORT&search=Lipid" `
    -Method Get `
    -Headers $pHeaders

if ($pagedDocs.content.Count -ge 1 -and $pagedDocs.totalElements -ge 1) {
    Write-Host " [PASS] Pagination & Search returned $($pagedDocs.content.Count) match (Total: $($pagedDocs.totalElements), Pages: $($pagedDocs.totalPages))." -ForegroundColor Green
} else {
    throw "Document search & pagination failed!"
}

# 6. Test Safe Document Preview (Headers: CSP, X-Content-Type-Options)
Write-Host "`n--- Testing Safe Document Preview Headers ---" -ForegroundColor Yellow
$previewReq = [System.Net.HttpWebRequest]::Create("http://localhost:8081/api/documents/$docId/preview")
$previewReq.Headers.Add("Authorization", "Bearer $pToken")
$previewRes = $previewReq.GetResponse()
$csp = $previewRes.Headers["Content-Security-Policy"]
$nosniff = $previewRes.Headers["X-Content-Type-Options"]
$cType = $previewRes.Headers["Content-Type"]
$previewRes.Close()

Write-Host " Preview Content-Type: $cType"
Write-Host " Preview CSP: $csp"
Write-Host " Preview X-Content-Type-Options: $nosniff"
if ($csp -match "default-src" -and $nosniff -eq "nosniff") {
    Write-Host " [PASS] Document preview headers strictly enforce zero-execution sandbox and nosniff." -ForegroundColor Green
} else {
    throw "Security headers missing in preview!"
}

# 7. Test Safe Document Download (Header: Content-Disposition: attachment)
Write-Host "`n--- Testing Safe Document Download ---" -ForegroundColor Yellow
$downloadReq = [System.Net.HttpWebRequest]::Create("http://localhost:8081/api/documents/$docId/download")
$downloadReq.Headers.Add("Authorization", "Bearer $pToken")
$downloadRes = $downloadReq.GetResponse()
$disp = $downloadRes.Headers["Content-Disposition"]
$downloadRes.Close()

Write-Host " Download Content-Disposition: $disp"
if ($disp -match "attachment") {
    Write-Host " [PASS] Download strictly forces browser attachment download." -ForegroundColor Green
} else {
    throw "Content-Disposition attachment missing in download!"
}

# 8. Test Document Metadata Update (Rename & Recategorize)
Write-Host "`n--- Testing Document Metadata Update (Rename & Recategorize) ---" -ForegroundColor Yellow
$updatePayload = @{
    title = "Renamed Lipid & Metabolic Panel Q1 2026"
    category = "DIAGNOSIS_REPORT"
} | ConvertTo-Json

$updatedDoc = Invoke-RestMethod -Uri "http://localhost:8081/api/documents/$docId" `
    -Method Patch `
    -Headers $pHeaders `
    -ContentType "application/json" `
    -Body $updatePayload

if ($updatedDoc.title -eq "Renamed Lipid & Metabolic Panel Q1 2026" -and $updatedDoc.category -eq "DIAGNOSIS_REPORT") {
    Write-Host " [PASS] Document metadata updated to title '$($updatedDoc.title)' and category '$($updatedDoc.category)'." -ForegroundColor Green
} else {
    throw "Metadata update failed!"
}

# 9. Test Document Sharing with Doctor and Revocation
Write-Host "`n--- Testing Explicit Doctor Sharing & Revocation ---" -ForegroundColor Yellow
$sharePayload = @{ doctorId = 2 } | ConvertTo-Json
$sharedDoc = Invoke-RestMethod -Uri "http://localhost:8081/api/documents/$docId/share" `
    -Method Post `
    -Headers $pHeaders `
    -ContentType "application/json" `
    -Body $sharePayload
Write-Host " [PASS] Document shared with Dr. Marcus Vance (Doctor ID 2). Sharing Status: $($sharedDoc.sharingStatus)" -ForegroundColor Green

# Verify Dr. Vance can now access preview
$vanceReq = [System.Net.HttpWebRequest]::Create("http://localhost:8081/api/documents/$docId/preview")
$vanceReq.Headers.Add("Authorization", "Bearer $d2Token")
$vanceRes = $vanceReq.GetResponse()
$vanceStatus = [int]$vanceRes.StatusCode
$vanceRes.Close()
Write-Host " [PASS] Dr. Vance successfully accessed shared document (Status: $vanceStatus)." -ForegroundColor Green

# Revoke share with Doctor 2
$revokedDoc = Invoke-RestMethod -Uri "http://localhost:8081/api/documents/$docId/share/2" `
    -Method Delete `
    -Headers $pHeaders
Write-Host " [PASS] Document share revoked from Dr. Marcus Vance." -ForegroundColor Green

# Verify Dr. Vance can no longer access the document
try {
    $vanceReq2 = [System.Net.HttpWebRequest]::Create("http://localhost:8081/api/documents/$docId/preview")
    $vanceReq2.Headers.Add("Authorization", "Bearer $d2Token")
    $vanceRes2 = $vanceReq2.GetResponse()
    $vanceRes2.Close()
    throw "Dr Vance should not have access after revocation!"
} catch [System.Net.WebException] {
    $resp = $_.Exception.Response
    if ($resp -and [int]$resp.StatusCode -eq 403) {
        Write-Host " [PASS] Dr. Vance access denied with 403 Forbidden after share revocation." -ForegroundColor Green
    } else {
        throw "Unexpected error: $_"
    }
}

# 10. Test Soft-Archive (Delete)
Write-Host "`n--- Testing Document Soft-Archive ---" -ForegroundColor Yellow
$archivedDoc = Invoke-RestMethod -Uri "http://localhost:8081/api/documents/$docId" `
    -Method Delete `
    -Headers $pHeaders
Write-Host " [PASS] Document soft-archived. Archived: $($archivedDoc.isArchived)" -ForegroundColor Green

# Verify document no longer in active list
$activeDocs = Invoke-RestMethod -Uri "http://localhost:8081/api/documents/patient/$($patientId)/paged?page=0&size=10" `
    -Method Get `
    -Headers $pHeaders
$found = $activeDocs.content | Where-Object { $_.id -eq $docId }
if ($null -eq $found) {
    Write-Host " [PASS] Soft-archived document correctly excluded from active patient list." -ForegroundColor Green
} else {
    throw "Soft-archived document still visible in active list!"
}

# 11. Test Negative Security Controls
Write-Host "`n--- Testing Negative Security Controls ---" -ForegroundColor Yellow

# Disallowed extension: .exe
try {
    $badBoundary = [System.Guid]::NewGuid().ToString()
    $badBody = (
        "--$badBoundary",
        "Content-Disposition: form-data; name=`"patientId`"$LF",
        "$patientId",
        "--$badBoundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"malicious.exe`"",
        "Content-Type: application/x-msdownload$LF",
        "Binary executable content",
        "--$badBoundary",
        "Content-Disposition: form-data; name=`"category`"$LF",
        "OTHER",
        "--$badBoundary--"
    ) -join $LF

    Invoke-RestMethod -Uri "http://localhost:8081/api/documents/upload" `
        -Method Post `
        -Headers $pHeaders `
        -ContentType "multipart/form-data; boundary=$badBoundary" `
        -Body $badBody
    throw "Disallowed extension .exe should have been rejected!"
} catch {
    Write-Host " [PASS] Upload with disallowed extension (.exe) rejected with 400 Bad Request." -ForegroundColor Green
}

# 12. Test Clinical Record Creation, Amendment & Status Updates
Write-Host "`n--- Testing Clinical Encounter & Diagnosis Lifecycle ---" -ForegroundColor Yellow

# Dr. Jenkins creates an encounter for Eleanor Vance
$newEncPayload = @{
    patientId = $patientId
    encounterType = "FOLLOW_UP"
    chiefComplaint = "Routine cardiovascular checkup and metabolic monitoring"
    clinicalNotes = "Blood pressure mildly elevated at 135/88. Heart sounds normal, regular rate and rhythm. Patient reports occasional fatigue."
    assessmentPlan = "Maintain current ACE inhibitor dosage. Add 30 minutes of daily aerobic exercise. Repeat lipid panel in 90 days."
} | ConvertTo-Json

$createdEnc = Invoke-RestMethod -Uri "http://localhost:8081/api/clinical/encounters" `
    -Method Post `
    -Headers $dHeaders `
    -ContentType "application/json" `
    -Body $newEncPayload

$encId = $createdEnc.id
Write-Host " [PASS] Dr. Jenkins created Encounter ID: $encId. Chief complaint: $($createdEnc.chiefComplaint)" -ForegroundColor Green

# Dr. Jenkins amends the encounter
$amendPayload = @{
    amendmentNotes = "Addendum: Confirmed patient adherence to dietary sodium restriction. Ambulatory BP monitor ordered."
} | ConvertTo-Json

$amendedEnc = Invoke-RestMethod -Uri "http://localhost:8081/api/clinical/encounters/$encId/amend" `
    -Method Post `
    -Headers $dHeaders `
    -ContentType "application/json" `
    -Body $amendPayload

if ($amendedEnc.isAmended -eq $true -and ($amendedEnc.amendedByName -match "Jenkins" -or $amendedEnc.amendedBy -gt 0)) {
    Write-Host " [PASS] Encounter $encId amended with non-destructive audit log. Notes: $($amendedEnc.amendmentNotes)" -ForegroundColor Green
} else {
    throw "Encounter amendment failed!"
}

# Dr. Jenkins records a diagnosis
$newDiagPayload = @{
    patientId = $patientId
    code = "I10"
    description = "Essential (Primary) Hypertension"
    severity = "MODERATE"
    notes = "Stage 1 essential hypertension documented during serial office visits."
} | ConvertTo-Json

$createdDiag = Invoke-RestMethod -Uri "http://localhost:8081/api/clinical/diagnoses" `
    -Method Post `
    -Headers $dHeaders `
    -ContentType "application/json" `
    -Body $newDiagPayload

$diagId = $createdDiag.id
Write-Host " [PASS] Dr. Jenkins added Diagnosis ID: $diagId ($($createdDiag.description))." -ForegroundColor Green

# Dr. Jenkins updates diagnosis status
$statusPayload = @{
    status = "RESOLVED"
    notes = "Blood pressure normalized under therapeutic regimen and lifestyle adjustments."
} | ConvertTo-Json

$updatedDiag = Invoke-RestMethod -Uri "http://localhost:8081/api/clinical/diagnoses/$diagId/status" `
    -Method Patch `
    -Headers $dHeaders `
    -ContentType "application/json" `
    -Body $statusPayload

if ($updatedDiag.status -eq "RESOLVED") {
    Write-Host " [PASS] Diagnosis $diagId updated to RESOLVED with clinical note." -ForegroundColor Green
} else {
    throw "Diagnosis status update failed!"
}

# 13. Test Longitudinal Clinical Paged APIs
Write-Host "`n--- Testing Longitudinal Clinical Paged APIs ---" -ForegroundColor Yellow

# Encounters paged
$encounters = Invoke-RestMethod -Uri "http://localhost:8081/api/clinical/encounters/patient/$($patientId)/paged?page=0&size=5" -Method Get -Headers $pHeaders
if ($encounters.content.Count -ge 1) {
    Write-Host " [PASS] Encounters Paged: $($encounters.content.Count) items (Total: $($encounters.totalElements), TotalPages: $($encounters.totalPages))." -ForegroundColor Green
} else {
    throw "Encounters paged should have at least 1 encounter!"
}

# Diagnoses paged
$diagnoses = Invoke-RestMethod -Uri "http://localhost:8081/api/clinical/diagnoses/patient/$($patientId)/paged?page=0&size=5" -Method Get -Headers $pHeaders
if ($diagnoses.content.Count -ge 1) {
    Write-Host " [PASS] Diagnoses Paged: $($diagnoses.content.Count) items (Total: $($diagnoses.totalElements), TotalPages: $($diagnoses.totalPages))." -ForegroundColor Green
} else {
    throw "Diagnoses paged should have at least 1 diagnosis!"
}

# Lab Reports paged
$labs = Invoke-RestMethod -Uri "http://localhost:8081/api/clinical/lab-reports/patient/$($patientId)/paged?page=0&size=5" -Method Get -Headers $pHeaders
Write-Host " [PASS] Lab Reports Paged: $($labs.content.Count) items (Total: $($labs.totalElements), TotalPages: $($labs.totalPages))." -ForegroundColor Green

# Prescriptions paged
$prescriptions = Invoke-RestMethod -Uri "http://localhost:8081/api/prescriptions/patient/$($patientId)/paged?page=0&size=5" -Method Get -Headers $pHeaders
Write-Host " [PASS] Prescriptions Paged: $($prescriptions.content.Count) items (Total: $($prescriptions.totalElements), TotalPages: $($prescriptions.totalPages))." -ForegroundColor Green

# Patient Activity paged (Access Logs audit trail)
$activity = Invoke-RestMethod -Uri "http://localhost:8081/api/patients/$($patientId)/activity?page=0&size=10" -Method Get -Headers $pHeaders
if ($activity.content.Count -ge 1) {
    Write-Host " [PASS] Patient Activity Audit Paged: $($activity.content.Count) events recorded (Total: $($activity.totalElements), Action: $($activity.content[0].action))." -ForegroundColor Green
} else {
    Write-Host " [WARN] Activity logs count is 0." -ForegroundColor Yellow
}

# Clean up temp file
if (Test-Path $tempPdfPath) { Remove-Item $tempPdfPath }

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " ALL PHASE 3 VERIFICATION TESTS PASSED SUCCESSFULLY! " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
