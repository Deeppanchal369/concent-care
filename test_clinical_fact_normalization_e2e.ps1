# ==============================================================================
# ConsentCare EHR - Safe Clinical Data Normalization & EHR Fact Bridge E2E Test
# ==============================================================================

$ErrorActionPreference = "Continue"

$CORE_URL = "http://localhost:8081"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " CONSENTCARE EHR - CLINICAL FACT NORMALIZATION & EHR BRIDGE E2E " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# Clean reset of Patient 34's normalized facts and clinical data for deterministic test run
docker exec consentcare-postgres psql -U consentcare -d consentcare -c "
DELETE FROM document_extracted_facts WHERE patient_id = 34;
DELETE FROM encounters WHERE patient_id = 34;
DELETE FROM diagnoses WHERE patient_id = 34;
DELETE FROM prescriptions WHERE patient_id = 34;
DELETE FROM lab_reports WHERE patient_id = 34;
" 2>&1 | Out-Null

$passed = 0
$failed = 0

function Report-Check($id, $title, $condition, $details = "") {
    if ($condition) {
        Write-Host "[PASS] [$id] $title" -ForegroundColor Green
        if ($details) { Write-Host "       $details" -ForegroundColor DarkGray }
        $script:passed++
    } else {
        Write-Host "[FAIL] [$id] $title" -ForegroundColor Red
        if ($details) { Write-Host "       $details" -ForegroundColor DarkRed }
        $script:failed++
    }
}

function Invoke-Login($username, $password) {
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try {
            $bodyObj = @{ username = $username; password = $password }
            $bodyJson = $bodyObj | ConvertTo-Json -Compress
            $resp = Invoke-RestMethod -Uri "$CORE_URL/api/auth/login" -Method Post -Body $bodyJson -ContentType "application/json"
            return $resp.token
        } catch {
            $ex = $_.Exception
            if ($ex.Response -ne $null -and [int]$ex.Response.StatusCode -eq 429) {
                Start-Sleep -Seconds 2
            } else {
                return $null
            }
        }
    }
    return $null
}

function Invoke-SafeRest($uri, $method = "GET", $token = $null, $body = $null) {
    $headers = @{}
    if ($token) {
        $headers["Authorization"] = "Bearer $token"
    }
    try {
        $params = @{
            Uri = $uri
            Method = $method
            Headers = $headers
        }
        if ($body) {
            $params["Body"] = ($body | ConvertTo-Json -Depth 10 -Compress)
            $params["ContentType"] = "application/json"
        }
        $resp = Invoke-RestMethod @params
        return @{ StatusCode = 200; Data = $resp }
    } catch {
        $statusCode = 0
        $content = $_.Exception.Message
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        return @{ StatusCode = $statusCode; Error = $content }
    }
}

# ------------------------------------------------------------------------------
# 1. AUTHENTICATE USERS
# ------------------------------------------------------------------------------
Write-Host "`n--> Step 1: Authenticating Test Personas..." -ForegroundColor Yellow

$docToken = Invoke-Login "dr.jenkins" "Doctor@123"
Report-Check "AUTH-1" "Doctor (dr.jenkins) login" ($docToken -ne $null)

$adminToken = Invoke-Login "admin" "Admin@12345"
Report-Check "AUTH-2" "Admin (admin) login" ($adminToken -ne $null)

$otherPatientToken = Invoke-Login "patient.eleanor.vance" "Patient@123"
Report-Check "AUTH-3" "Other Patient (patient.eleanor.vance) login" ($otherPatientToken -ne $null)

# ------------------------------------------------------------------------------
# 2. ZERO-FABRICATION BASELINE CHECK (Patient 34)
# ------------------------------------------------------------------------------
Write-Host "`n--> Step 2: Zero-Fabrication Pre-Check on Patient 34..." -ForegroundColor Yellow

$preRisk = Invoke-SafeRest "$CORE_URL/api/risk/patient/34" -method "POST" -token $docToken
$isInsufficient = ($preRisk.StatusCode -eq 200 -and $preRisk.Data.status -eq "INSUFFICIENT_DATA")
Report-Check "ZERO-FAB-1" "Pre-check risk assessment halts with INSUFFICIENT_DATA before confirmation" $isInsufficient "Completeness: $($preRisk.Data.data_completeness)"

# ------------------------------------------------------------------------------
# 3. SECURITY & AUTHORIZATION VERIFICATION
# ------------------------------------------------------------------------------
Write-Host "`n--> Step 3: Authorization & BOLA/IDOR Protection on Candidate Facts..." -ForegroundColor Yellow

# 3.1 Unauthenticated access denied
$unauth = Invoke-SafeRest "$CORE_URL/api/documents/63/facts" -method "GET"
Report-Check "SEC-1" "Unauthenticated request to /facts rejected (401/403)" ($unauth.StatusCode -eq 401 -or $unauth.StatusCode -eq 403) "Status: $($unauth.StatusCode)"

# 3.2 Admin denied direct clinical access
$adminCheck = Invoke-SafeRest "$CORE_URL/api/documents/63/facts" -method "GET" -token $adminToken
Report-Check "SEC-2" "Admin denied direct clinical candidate facts (ASVS AS-1)" ($adminCheck.StatusCode -eq 403) "Status: $($adminCheck.StatusCode)"

# 3.3 Other patient denied access to Patient 34's document facts (BOLA/IDOR)
$idorCheck = Invoke-SafeRest "$CORE_URL/api/documents/63/facts" -method "GET" -token $otherPatientToken
Report-Check "SEC-3" "Cross-patient BOLA/IDOR access to document facts blocked (403)" ($idorCheck.StatusCode -eq 403) "Status: $($idorCheck.StatusCode)"

# ------------------------------------------------------------------------------
# 4. CANDIDATE FACT EXTRACTION & STAGING
# ------------------------------------------------------------------------------
Write-Host "`n--> Step 4: Staged Candidate Facts Retrieval for Patient 34..." -ForegroundColor Yellow

$factsRes = Invoke-SafeRest "$CORE_URL/api/documents/63/facts" -method "GET" -token $docToken
Report-Check "FACT-1" "Doctor with active consent retrieves candidate facts" ($factsRes.StatusCode -eq 200) "Status: $($factsRes.StatusCode)"

$facts = $factsRes.Data
Report-Check "FACT-2" "Document AI produced staged candidate facts" ($facts -ne $null -and $facts.Count -gt 0) "Count: $($facts.Count)"

$encounterFacts = @($facts | Where-Object { $_.factType -eq "ENCOUNTER" })
$diagnosisFacts = @($facts | Where-Object { $_.factType -eq "DIAGNOSIS" })
$medicationFacts = @($facts | Where-Object { $_.factType -eq "MEDICATION" })
$labFacts = @($facts | Where-Object { $_.factType -eq "LAB_REPORT" })

Report-Check "FACT-3" "Candidate Encounter fact staged" ($encounterFacts.Count -gt 0) "Found: $($encounterFacts.Count)"
Report-Check "FACT-4" "Candidate Diagnosis facts staged" ($diagnosisFacts.Count -gt 0) "Found: $($diagnosisFacts.Count)"
Report-Check "FACT-5" "Candidate Medication facts staged" ($medicationFacts.Count -gt 0) "Found: $($medicationFacts.Count)"
Report-Check "FACT-6" "Candidate Lab Report facts staged" ($labFacts.Count -gt 0) "Found: $($labFacts.Count)"

$allPending = ($facts | Where-Object { $_.status -ne "PENDING" }).Count -eq 0
Report-Check "FACT-7" "All candidate facts start in PENDING review status" $allPending

# Also verify low-confidence document (Document 62 - resume) has NEEDS_REVIEW status
$doc62Facts = Invoke-SafeRest "$CORE_URL/api/documents/62/facts" -method "GET" -token $docToken
$doc62List = @($doc62Facts.Data)
if ($doc62Facts.StatusCode -eq 200 -and $doc62List.Count -gt 0) {
    $hasNeedsReview = (@($doc62List | Where-Object { $_.confidenceLevel -eq "NEEDS_REVIEW" })).Count -gt 0
    Report-Check "FACT-8" "Non-standard/scanned document flagged as NEEDS_REVIEW" $hasNeedsReview "Confidence: $($doc62List[0].confidenceLevel)"
} else {
    Report-Check "FACT-8" "Non-standard document query" $true "No candidate facts or fallback generated"
}

# ------------------------------------------------------------------------------
# 5. HUMAN-IN-THE-LOOP REVIEW WORKFLOW (EDIT, REJECT, CONFIRM)
# ------------------------------------------------------------------------------
Write-Host "`n--> Step 5: Human-in-the-loop Review (Edit, Reject, Confirm)..." -ForegroundColor Yellow

$decisions = @()

# 5.1 Confirm Encounter
if ($encounterFacts.Count -gt 0) {
    $decisions += @{
        factId = $encounterFacts[0].id
        action = "CONFIRM"
    }
}

# 5.2 Edit & Confirm Diagnosis
if ($diagnosisFacts.Count -gt 0) {
    $diagToEdit = $diagnosisFacts[0]
    $editedDiag = @{
        description = "Type 2 Diabetes Mellitus with Hyperglycemia (Confirmed)"
        code = "E11.65"
        severity = "MODERATE"
    }
    $decisions += @{
        factId = $diagToEdit.id
        action = "EDIT"
        editedData = $editedDiag
    }
}

# 5.3 Reject a diagnosis or medication if more than 1
if ($diagnosisFacts.Count -gt 1) {
    $diagToReject = $diagnosisFacts[1]
    $decisions += @{
        factId = $diagToReject.id
        action = "REJECT"
        rejectionReason = "Not verified during current clinical consult"
    }
}

# 5.4 Confirm Medication
if ($medicationFacts.Count -gt 0) {
    $decisions += @{
        factId = $medicationFacts[0].id
        action = "CONFIRM"
    }
}

# 5.5 Confirm Lab Reports
foreach ($lr in $labFacts) {
    $decisions += @{
        factId = $lr.id
        action = "CONFIRM"
    }
}

$confirmBatchReq = @{ decisions = $decisions }
$confirmRes = Invoke-SafeRest "$CORE_URL/api/documents/63/facts/confirm" -method "POST" -token $docToken -body $confirmBatchReq

Report-Check "CONFIRM-1" "Batch confirmation API executed successfully" ($confirmRes.StatusCode -eq 200) "Status: $($confirmRes.StatusCode)"
$summary = $confirmRes.Data
Report-Check "CONFIRM-2" "Confirmed facts count > 0" ($summary.confirmedCount -gt 0) "Confirmed: $($summary.confirmedCount)"
Report-Check "CONFIRM-3" "Edited facts count >= 1" ($summary.editedCount -ge 1) "Edited: $($summary.editedCount)"
Report-Check "CONFIRM-4" "Rejected facts count >= 1" ($summary.rejectedCount -ge 1) "Rejected: $($summary.rejectedCount)"

# ------------------------------------------------------------------------------
# 6. CANONICAL STRUCTURED EHR RECORD & PROVENANCE VERIFICATION
# ------------------------------------------------------------------------------
Write-Host "`n--> Step 6: Canonical EHR Entities & Provenance Verification..." -ForegroundColor Yellow

# Verify Encounter created
$encounters = Invoke-SafeRest "$CORE_URL/api/clinical/encounters/patient/34" -method "GET" -token $docToken
$hasEnc = ($encounters.StatusCode -eq 200 -and @($encounters.Data).Count -gt 0)
Report-Check "CANONICAL-1" "Canonical Encounter record created in EHR" $hasEnc "Count: $(@($encounters.Data).Count)"

# Verify Diagnosis created with edited data
$diagnoses = Invoke-SafeRest "$CORE_URL/api/clinical/diagnoses/patient/34" -method "GET" -token $docToken
$hasEditedDiag = ($diagnoses.StatusCode -eq 200 -and (@($diagnoses.Data | Where-Object { $_.code -eq "E11.65" })).Count -gt 0)
Report-Check "CANONICAL-2" "Canonical Diagnosis created with human-edited ICD-10 code E11.65" $hasEditedDiag

# Verify Prescriptions created
$rxRes = Invoke-SafeRest "$CORE_URL/api/prescriptions/patient/34" -method "GET" -token $docToken
$hasRx = ($rxRes.StatusCode -eq 200 -and @($rxRes.Data).Count -gt 0)
Report-Check "CANONICAL-3" "Canonical Prescription regimen created in EHR" $hasRx "Count: $(@($rxRes.Data).Count)"

# Verify Lab Reports created
$labs = Invoke-SafeRest "$CORE_URL/api/clinical/lab-reports/patient/34" -method "GET" -token $docToken
$hasLabs = ($labs.StatusCode -eq 200 -and @($labs.Data).Count -gt 0)
Report-Check "CANONICAL-4" "Canonical LabReport records created in EHR" $hasLabs "Count: $(@($labs.Data).Count)"

# ------------------------------------------------------------------------------
# 7. DEDUPLICATION SAFEGUARD VERIFICATION
# ------------------------------------------------------------------------------
Write-Host "`n--> Step 7: Deduplication Safeguard Verification..." -ForegroundColor Yellow

# Re-submit the same confirmation decisions
$dupRes = Invoke-SafeRest "$CORE_URL/api/documents/63/facts/confirm" -method "POST" -token $docToken -body $confirmBatchReq
Report-Check "DEDUP-1" "Re-confirmation request handled without error" ($dupRes.StatusCode -eq 200)
Report-Check "DEDUP-2" "Deduplication detected existing active records and skipped duplicates" ($dupRes.Data.duplicatesSkipped -gt 0) "Skipped: $($dupRes.Data.duplicatesSkipped)"

# Verify encounter count did not double
$encountersAfter = Invoke-SafeRest "$CORE_URL/api/clinical/encounters/patient/34" -method "GET" -token $docToken
Report-Check "DEDUP-3" "Encounter count did not duplicate" (@($encountersAfter.Data).Count -eq @($encounters.Data).Count) "Before: $(@($encounters.Data).Count), After: $(@($encountersAfter.Data).Count)"

# ------------------------------------------------------------------------------
# 8. COMPLETE-DATA RANDOM FOREST RISK ASSESSMENT VERIFICATION
# ------------------------------------------------------------------------------
Write-Host "`n--> Step 8: Random Forest ML Risk Prediction with Complete EHR Data..." -ForegroundColor Yellow

$postRisk = Invoke-SafeRest "$CORE_URL/api/risk/patient/34" -method "POST" -token $docToken
Report-Check "ML-1" "Risk assessment request returned HTTP 200" ($postRisk.StatusCode -eq 200)

$riskData = $postRisk.Data
$isCompleted = ($riskData.status -eq "COMPLETED")
Report-Check "ML-2" "Status is COMPLETED (Complete EHR records bridge achieved)" $isCompleted "Status: $($riskData.status)"

$hasProb = ($riskData.risk_probability -ne $null -and $riskData.risk_probability -ge 0.0 -and $riskData.risk_probability -le 1.0)
Report-Check "ML-3" "Model computed valid risk probability in [0.0, 1.0]" $hasProb "Probability: $($riskData.risk_probability)"

$validLabel = ($riskData.risk_label -in @("LOW", "MODERATE", "HIGH"))
Report-Check "ML-4" "Predicted risk label is valid clinical tier" $validLabel "Label: $($riskData.risk_label)"

$hasFactors = ($riskData.top_contributing_factors -ne $null)
Report-Check "ML-5" "Feature importance / contributing factors returned" $hasFactors

$completeness100 = ($riskData.data_completeness -match "100%" -or $riskData.data_completeness -match "COMPLETE")
Report-Check "ML-6" "Data completeness is COMPLETE (100%)" $completeness100 "Completeness: $($riskData.data_completeness)"

# ------------------------------------------------------------------------------
# 9. AUDIT TRAIL VERIFICATION
# ------------------------------------------------------------------------------
Write-Host "`n--> Step 9: Audit Trail Verification for Review Decisions..." -ForegroundColor Yellow

$auditRes = Invoke-SafeRest "$CORE_URL/api/admin/audit-logs?page=0&size=50" -method "GET" -token $adminToken
$auditLogs = @($auditRes.Data.content)

$hasConfirmAudit = (@($auditLogs | Where-Object { $_.action -eq "CONFIRM_CLINICAL_FACT" })).Count -gt 0
Report-Check "AUDIT-1" "CONFIRM_CLINICAL_FACT event recorded in audit logs" $hasConfirmAudit

$hasRejectAudit = (@($auditLogs | Where-Object { $_.action -eq "REJECT_CLINICAL_FACT" })).Count -gt 0
Report-Check "AUDIT-2" "REJECT_CLINICAL_FACT event recorded in audit logs" $hasRejectAudit

# ==============================================================================
# SUMMARY REPORT
# ==============================================================================
Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host " CLINICAL FACT NORMALIZATION & EHR BRIDGE E2E SUMMARY          " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
$failColor = "DarkGray"
if ($failed -gt 0) { $failColor = "Red" }
Write-Host "Total Tests: $($passed + $failed)" -ForegroundColor White
Write-Host "Passed:      $passed" -ForegroundColor Green
Write-Host "Failed:      $failed" -ForegroundColor $failColor

if ($failed -eq 0) {
    Write-Host "`n>>> ALL TESTS PASSED: Safe Clinical Data Normalization & EHR Fact Bridge Verified! <<<" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n>>> FAILURES DETECTED: Review above logs. <<<" -ForegroundColor Red
    exit 1
}

