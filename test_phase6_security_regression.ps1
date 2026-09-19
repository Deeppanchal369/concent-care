# ==============================================================================
# ConsentCare EHR - Phase 6 Security & Performance Verification Suite
# Baseline: OWASP ASVS 5.0.0 (Level 2), OWASP Top 10:2025, OWASP API Top 10:2023
# Compatible with Windows PowerShell 5.1 & PowerShell Core
# ==============================================================================

$ErrorActionPreference = "Continue"

$CORE_URL = "http://localhost:8081"
$FRONTEND_URL = "http://localhost:81"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " CONSENTCARE EHR - PHASE 6 AUTOMATED SECURITY REGRESSION SUITE " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

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

function Invoke-SafeRequest($uri, $method = "GET", $headers = @{}, $body = $null, $contentType = "application/json") {
    try {
        $params = @{
            Uri = $uri
            Method = $method
            Headers = $headers
            UseBasicParsing = $true
        }
        if ($body) {
            $params["Body"] = $body
            $params["ContentType"] = $contentType
        }
        $resp = Invoke-WebRequest @params
        return @{
            StatusCode = [int]$resp.StatusCode
            Headers = $resp.Headers
            Content = $resp.Content
        }
    } catch [System.Net.WebException] {
        $webResp = $_.Exception.Response
        if ($webResp) {
            $statusCode = [int]$webResp.StatusCode
            $sr = New-Object System.IO.StreamReader($webResp.GetResponseStream())
            $content = $sr.ReadToEnd()
            $sr.Close()
            return @{
                StatusCode = $statusCode
                Headers = $webResp.Headers
                Content = $content
            }
        }
        return @{
            StatusCode = 0
            Headers = @{}
            Content = $_.Exception.Message
        }
    } catch {
        return @{
            StatusCode = 0
            Headers = @{}
            Content = $_.Exception.Message
        }
    }
}

function Invoke-LoginWithRetry($username, $password) {
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try {
            $body = @{ username = $username; password = $password } | ConvertTo-Json
            $resp = Invoke-RestMethod -Uri "$CORE_URL/api/auth/login" -Method Post -Body $body -ContentType "application/json"
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

# ------------------------------------------------------------------------------
# 1. AUTHENTICATE USERS
# ------------------------------------------------------------------------------
Write-Host "`n--> Authenticating Test Personas..." -ForegroundColor Yellow

$adminToken = Invoke-LoginWithRetry "admin" "Admin@12345"
$docToken = Invoke-LoginWithRetry "dr.jenkins" "Doctor@123"
$nurseToken = Invoke-LoginWithRetry "nurse.elena" "Nurse@123"
$patientToken = Invoke-LoginWithRetry "patient.eleanor.vance" "Patient@123"

# Register a secondary patient to test cross-patient isolation (BOLA)
$secondaryPatientUser = "sec_patient_" + (Get-Random -Minimum 1000 -Maximum 9999)
$secRegBody = @{
    username = $secondaryPatientUser
    password = "SecPatient@123"
    email = "$secondaryPatientUser@test.local"
    fullName = "Secondary Test Patient"
    dateOfBirth = "1992-05-15"
    gender = "MALE"
    phone = "555-0199"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$CORE_URL/api/auth/register" -Method Post -Body $secRegBody -ContentType "application/json" | Out-Null
    $secPatientToken = Invoke-LoginWithRetry $secondaryPatientUser "SecPatient@123"
} catch {
    $secPatientToken = $null
}

Report-Check "AUTH-1" "Admin Authentication (admin)" ($adminToken -ne $null)
Report-Check "AUTH-2" "Doctor Authentication (dr.jenkins)" ($docToken -ne $null)
Report-Check "AUTH-3" "Nurse Authentication (nurse.elena)" ($nurseToken -ne $null)
Report-Check "AUTH-4" "Primary Patient Authentication (patient.eleanor.vance)" ($patientToken -ne $null)
Report-Check "AUTH-5" "Secondary Patient Registration & Login" ($secPatientToken -ne $null)

# ------------------------------------------------------------------------------
# 2. SECURITY HEADERS (OWASP ASVS 5.0.0 V14)
# ------------------------------------------------------------------------------
Write-Host "`n--> Checking Security Headers on Core..." -ForegroundColor Yellow

$coreResp = Invoke-SafeRequest -uri "$CORE_URL/actuator/health" -method "GET"
$headers = $coreResp.Headers

Report-Check "HDR-1" "Content-Security-Policy Header present" ($headers["Content-Security-Policy"] -ne $null) "CSP: $($headers['Content-Security-Policy'])"
Report-Check "HDR-2" "X-Content-Type-Options: nosniff" ($headers["X-Content-Type-Options"] -eq "nosniff")
Report-Check "HDR-3" "X-Frame-Options: DENY" ($headers["X-Frame-Options"] -eq "DENY")
Report-Check "HDR-4" "Permissions-Policy Header present" ($headers["Permissions-Policy"] -ne $null) "Policy: $($headers['Permissions-Policy'])"
Report-Check "HDR-5" "Referrer-Policy Header present" ($headers["Referrer-Policy"] -ne $null) "Policy: $($headers['Referrer-Policy'])"

# ------------------------------------------------------------------------------
# 3. RETIRED LEGACY ENDPOINTS (OWASP ASVS V1.1 Attack Surface Reduction)
# ------------------------------------------------------------------------------
Write-Host "`n--> Testing Retired Legacy Endpoints (Must be 404 / 405)..." -ForegroundColor Yellow

$r1 = Invoke-SafeRequest -uri "$CORE_URL/api/agent/risk-aware-alert" -method "POST" -headers @{ Authorization = "Bearer $docToken" } -body "{}"
Report-Check "LEG-1" "POST /api/agent/risk-aware-alert is retired (404/405)" ($r1.StatusCode -eq 404 -or $r1.StatusCode -eq 405) "Status: $($r1.StatusCode)"

$r2 = Invoke-SafeRequest -uri "$CORE_URL/api/agent/summarize" -method "POST" -headers @{ Authorization = "Bearer $docToken" } -body "{}"
Report-Check "LEG-2" "POST /api/agent/summarize is retired (404/405)" ($r2.StatusCode -eq 404 -or $r2.StatusCode -eq 405) "Status: $($r2.StatusCode)"

$r3 = Invoke-SafeRequest -uri "$CORE_URL/api/risk/predict" -method "POST" -headers @{ Authorization = "Bearer $docToken" } -body "{}"
Report-Check "LEG-3" "POST /api/risk/predict is retired (404/405)" ($r3.StatusCode -eq 404 -or $r3.StatusCode -eq 405) "Status: $($r3.StatusCode)"

# Verify /health endpoints are strictly protected (Admin only)
$rHealthAnon = Invoke-SafeRequest -uri "$CORE_URL/api/agent/health" -method "GET"
$rHealthDoc = Invoke-SafeRequest -uri "$CORE_URL/api/agent/health" -method "GET" -headers @{ Authorization = "Bearer $docToken" }
$rHealthAdmin = Invoke-SafeRequest -uri "$CORE_URL/api/agent/health" -method "GET" -headers @{ Authorization = "Bearer $adminToken" }

Report-Check "LEG-4" "GET /api/agent/health rejected for unauthenticated (401/403)" ($rHealthAnon.StatusCode -eq 401 -or $rHealthAnon.StatusCode -eq 403) "Status: $($rHealthAnon.StatusCode)"
Report-Check "LEG-5" "GET /api/agent/health rejected for non-admin Doctor (Must be 403)" ($rHealthDoc.StatusCode -eq 403) "Status: $($rHealthDoc.StatusCode)"
Report-Check "LEG-6" "GET /api/agent/health allowed for Admin (Must be 200)" ($rHealthAdmin.StatusCode -eq 200) "Status: $($rHealthAdmin.StatusCode)"

$rRiskHealthDoc = Invoke-SafeRequest -uri "$CORE_URL/api/risk/health" -method "GET" -headers @{ Authorization = "Bearer $docToken" }
$rRiskHealthAdmin = Invoke-SafeRequest -uri "$CORE_URL/api/risk/health" -method "GET" -headers @{ Authorization = "Bearer $adminToken" }
Report-Check "LEG-7" "GET /api/risk/health rejected for non-admin Doctor (Must be 403)" ($rRiskHealthDoc.StatusCode -eq 403) "Status: $($rRiskHealthDoc.StatusCode)"
Report-Check "LEG-8" "GET /api/risk/health allowed for Admin (Must be 200)" ($rRiskHealthAdmin.StatusCode -eq 200) "Status: $($rRiskHealthAdmin.StatusCode)"

# ------------------------------------------------------------------------------
# 4. OBJECT-LEVEL AUTHORIZATION & BOLA HARDENING (ASVS V4.1, V4.2)
# ------------------------------------------------------------------------------
Write-Host "`n--> Testing Object-Level Access Control (BOLA / IDOR)..." -ForegroundColor Yellow

# Get Primary Patient Profile
$patientMe = Invoke-RestMethod -Uri "$CORE_URL/api/patients/me" -Method Get -Headers @{ Authorization = "Bearer $patientToken" }
$primaryPatientId = $patientMe.id

# 4a. Cross-Patient Access Attempt (Secondary patient requests Primary patient record)
$crossPatientResp = Invoke-SafeRequest -uri "$CORE_URL/api/patients/$primaryPatientId" -method "GET" -headers @{ Authorization = "Bearer $secPatientToken" }
Report-Check "BOLA-1" "Patient cannot access another patient record (Must be 403)" ($crossPatientResp.StatusCode -eq 403) "Status: $($crossPatientResp.StatusCode)"

# 4b. Admin Attempting Direct Clinical Access (Admin least-privilege)
$adminClinicalResp = Invoke-SafeRequest -uri "$CORE_URL/api/patients/$primaryPatientId" -method "GET" -headers @{ Authorization = "Bearer $adminToken" }
Report-Check "BOLA-2" "Admin cannot directly access clinical record (Must be 403)" ($adminClinicalResp.StatusCode -eq 403) "Status: $($adminClinicalResp.StatusCode)"

# 4c. Doctor Without Consent Attempting Clinical Document Access
$docDocResp = Invoke-SafeRequest -uri "$CORE_URL/api/documents/patient/99999" -method "GET" -headers @{ Authorization = "Bearer $docToken" }
Report-Check "BOLA-3" "Doctor without consent denied document list (Must be 403)" ($docDocResp.StatusCode -eq 403) "Status: $($docDocResp.StatusCode)"

# 4d. Unauthenticated Access to Notifications Stream
$streamAnon = Invoke-SafeRequest -uri "$CORE_URL/api/notifications/stream" -method "GET"
Report-Check "BOLA-4" "Unauthenticated access to SSE stream rejected (Must be 401/403)" ($streamAnon.StatusCode -eq 401 -or $streamAnon.StatusCode -eq 403) "Status: $($streamAnon.StatusCode)"

# 4e. Non-Admin Listing Full Patient Directory
$patientListResp = Invoke-SafeRequest -uri "$CORE_URL/api/patients" -method "GET" -headers @{ Authorization = "Bearer $patientToken" }
Report-Check "BOLA-5" "Non-Admin cannot list all patients directory (Must be 403)" ($patientListResp.StatusCode -eq 403) "Status: $($patientListResp.StatusCode)"

# 4f. Admin CAN list all patients directory
$adminListResp = Invoke-SafeRequest -uri "$CORE_URL/api/patients" -method "GET" -headers @{ Authorization = "Bearer $adminToken" }
Report-Check "BOLA-6" "Admin is authorized to list all patients directory (200)" ($adminListResp.StatusCode -eq 200) "Status: $($adminListResp.StatusCode)"

# 4g. Unauthorized Medication Administration by Patient
$adminMedBody = @{
    prescriptionItemId = 1
    status = "GIVEN"
    notes = "Unauthorized test administration"
} | ConvertTo-Json
$medResp = Invoke-SafeRequest -uri "$CORE_URL/api/prescriptions/administrations" -method "POST" -headers @{ Authorization = "Bearer $patientToken" } -body $adminMedBody
Report-Check "BOLA-7" "Patient cannot record medication administration (Must be 403)" ($medResp.StatusCode -eq 403) "Status: $($medResp.StatusCode)"

# 4h. Patient Cannot Upload Document to Another Patient's Chart
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"
$otherPatientUploadBody = (
    "--$boundary$LF" +
    "Content-Disposition: form-data; name=`"patientId`"$LF$LF" + "99999$LF" +
    "--$boundary$LF" +
    "Content-Disposition: form-data; name=`"file`"; filename=`"report.txt`"$LF" +
    "Content-Type: text/plain$LF$LF" +
    "Test normal text report$LF" +
    "--$boundary--$LF"
)
$otherUploadResp = Invoke-SafeRequest -uri "$CORE_URL/api/documents/upload" -method "POST" -headers @{
    Authorization = "Bearer $patientToken"
} -body $otherPatientUploadBody -contentType "multipart/form-data; boundary=$boundary"
Report-Check "BOLA-8" "Patient cannot upload to another patient chart (Must be 403)" ($otherUploadResp.StatusCode -eq 403) "Status: $($otherUploadResp.StatusCode)"

# ------------------------------------------------------------------------------
# 5. INPUT VALIDATION & UPLOAD HARDENING (ASVS V5, V12)
# ------------------------------------------------------------------------------
Write-Host "`n--> Testing File Upload Security & Validation..." -ForegroundColor Yellow

# Test Disallowed Executable Upload (.exe)
$boundaryExe = [System.Guid]::NewGuid().ToString()
$exeBody = (
    "--$boundaryExe$LF" +
    "Content-Disposition: form-data; name=`"patientId`"$LF$LF$primaryPatientId$LF" +
    "--$boundaryExe$LF" +
    "Content-Disposition: form-data; name=`"file`"; filename=`"malicious.exe`"$LF" +
    "Content-Type: application/x-msdownload$LF$LF" +
    "MZexecutablebinarypayloadtest$LF" +
    "--$boundaryExe--$LF"
)

$exeResp = Invoke-SafeRequest -uri "$CORE_URL/api/documents/upload" -method "POST" -headers @{
    Authorization = "Bearer $patientToken"
} -body $exeBody -contentType "multipart/form-data; boundary=$boundaryExe"
Report-Check "UPL-1" "Executable file upload rejected (Must be 400)" ($exeResp.StatusCode -eq 400) "Status: $($exeResp.StatusCode)"

# Test Path Traversal Filename
$boundaryTrav = [System.Guid]::NewGuid().ToString()
$traversalBody = (
    "--$boundaryTrav$LF" +
    "Content-Disposition: form-data; name=`"patientId`"$LF$LF$primaryPatientId$LF" +
    "--$boundaryTrav$LF" +
    "Content-Disposition: form-data; name=`"file`"; filename=`"../../../../etc/passwd.txt`"$LF" +
    "Content-Type: text/plain$LF$LF" +
    "Test text content$LF" +
    "--$boundaryTrav--$LF"
)
$traversalResp = Invoke-SafeRequest -uri "$CORE_URL/api/documents/upload" -method "POST" -headers @{
    Authorization = "Bearer $patientToken"
} -body $traversalBody -contentType "multipart/form-data; boundary=$boundaryTrav"
Report-Check "UPL-2" "Path traversal filename safely accepted/sanitized or rejected (200/400)" ($traversalResp.StatusCode -eq 200 -or $traversalResp.StatusCode -eq 400) "Status: $($traversalResp.StatusCode)"

# ------------------------------------------------------------------------------
# 6. RESOURCE CONSUMPTION & PAGINATION CLAMPING (ASVS V10)
# ------------------------------------------------------------------------------
Write-Host "`n--> Testing Pagination & Resource Clamping..." -ForegroundColor Yellow

$auditLogResp = Invoke-RestMethod -Uri "$CORE_URL/api/admin/audit-logs?page=0&size=5000" -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
$returnedCount = $auditLogResp.content.Count
Report-Check "PAG-1" "Audit log pagination clamped to <= 100 entries" ($returnedCount -le 100) "Requested 5000, received $returnedCount"

# ------------------------------------------------------------------------------
# 7. SENSITIVE DATA MASKING IN AUDIT LOGS (ASVS V8)
# ------------------------------------------------------------------------------
Write-Host "`n--> Verifying Sensitive Data Masking in Audit Logs..." -ForegroundColor Yellow

$hasLeak = $false
foreach ($logItem in $auditLogResp.content) {
    if ($logItem.metadataJson -match "password=([^,\s]+)" -and -not ($logItem.metadataJson -match "\*\*\*REDACTED\*\*\*")) {
        $hasLeak = $true
        break
    }
}
Report-Check "AUD-1" "Audit logs do not contain unredacted passwords" (-not $hasLeak)

# ------------------------------------------------------------------------------
# 8. RATE LIMITING (ASVS V2.2)
# ------------------------------------------------------------------------------
Write-Host "`n--> Testing Rate Limiting Quota Tracking..." -ForegroundColor Yellow

$rateLimited = $false
$lastRemaining = $null
for ($i = 0; $i -lt 15; $i++) {
    $burstResp = Invoke-SafeRequest -uri "$CORE_URL/api/auth/login" -method "POST" -body '{"username":"burst_probe_user","password":"probe_password"}'
    if ($burstResp.Headers["X-RateLimit-Remaining"]) {
        $lastRemaining = $burstResp.Headers["X-RateLimit-Remaining"]
    }
    if ($burstResp.StatusCode -eq 429) {
        $rateLimited = $true
        break
    }
}
Report-Check "RAT-1" "Rate limiter enforces HTTP 429 or decrements quota" ($rateLimited -or ($lastRemaining -ne $null)) "Remaining: $lastRemaining, RateLimited: $rateLimited"

# ------------------------------------------------------------------------------
# SUMMARY
# ------------------------------------------------------------------------------
Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host " RESULTS: $passed PASSED, $failed FAILED out of $($passed + $failed) checks" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "================================================================" -ForegroundColor Cyan

if ($failed -gt 0) {
    exit 1
} else {
    exit 0
}

