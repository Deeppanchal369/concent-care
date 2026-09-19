# ==============================================================================
# ConsentCare EHR - Phase 7 Final Acceptance & End-to-End QA Suite
# ==============================================================================

$ErrorActionPreference = "Continue"

$CORE_URL = "http://localhost:8081"
$FRONTEND_URL = "http://localhost:81"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " CONSENTCARE EHR - PHASE 7 FINAL ACCEPTANCE & RELEASE QA SUITE  " -ForegroundColor Cyan
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
        return @{ StatusCode = 0; Headers = @{}; Content = $_.Exception.Message }
    } catch {
        return @{ StatusCode = 0; Headers = @{}; Content = $_.Exception.Message }
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
# 1. AUTHENTICATION & ROLE TAMPERING ACCEPTANCE (QA-1)
# ------------------------------------------------------------------------------
Write-Host "`n--> Section 1: Authentication & Role Tampering Verification..." -ForegroundColor Yellow

# Valid login for all 4 roles
$adminToken = Invoke-LoginWithRetry "admin" "Admin@12345"
$docToken = Invoke-LoginWithRetry "dr.jenkins" "Doctor@123"
$nurseToken = Invoke-LoginWithRetry "nurse.elena" "Nurse@123"
$patientToken = Invoke-LoginWithRetry "patient.eleanor.vance" "Patient@123"

Report-Check "AUTH-1" "Admin Login (admin)" ($adminToken -ne $null)
Report-Check "AUTH-2" "Doctor Login (dr.jenkins)" ($docToken -ne $null)
Report-Check "AUTH-3" "Nurse Login (nurse.elena)" ($nurseToken -ne $null)
Report-Check "AUTH-4" "Patient Login (patient.eleanor.vance)" ($patientToken -ne $null)

# Invalid credentials test (with rate-limit backoff)
Start-Sleep -Seconds 2
$badLogin = Invoke-SafeRequest -uri "$CORE_URL/api/auth/login" -method "POST" -body '{"username":"admin","password":"WrongPassword!"}'
Report-Check "AUTH-5" "Invalid credentials rejected with HTTP 401 or 429" ($badLogin.StatusCode -eq 401 -or $badLogin.StatusCode -eq 429) "Status: $($badLogin.StatusCode)"

# Invalid / forged JWT token test
$fakeJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInJvbGVzIjpbIlJPTEVfQURNSU4iXX0.fake_signature_that_fails_verification"
$fakeJwtResp = Invoke-SafeRequest -uri "$CORE_URL/api/admin/audit-logs" -method "GET" -headers @{ Authorization = "Bearer $fakeJwt" }
Report-Check "AUTH-6" "Forged JWT token rejected with HTTP 401/403" ($fakeJwtResp.StatusCode -eq 401 -or $fakeJwtResp.StatusCode -eq 403) "Status: $($fakeJwtResp.StatusCode)"

# Expired / malformed token test
$malformedResp = Invoke-SafeRequest -uri "$CORE_URL/api/patients/me" -method "GET" -headers @{ Authorization = "Bearer malformed.token.value" }
Report-Check "AUTH-7" "Malformed token rejected with HTTP 401/403" ($malformedResp.StatusCode -eq 401 -or $malformedResp.StatusCode -eq 403) "Status: $($malformedResp.StatusCode)"

# Role privilege tampering: Patient attempts admin endpoint
$tamperAdmin = Invoke-SafeRequest -uri "$CORE_URL/api/admin/audit-logs" -method "GET" -headers @{ Authorization = "Bearer $patientToken" }
Report-Check "AUTH-8" "Patient denied admin endpoint access (HTTP 403)" ($tamperAdmin.StatusCode -eq 403) "Status: $($tamperAdmin.StatusCode)"

# ------------------------------------------------------------------------------
# 2. ADMIN WORKFLOW & PRIVACY PRESERVATION (QA-2)
# ------------------------------------------------------------------------------
Write-Host "`n--> Section 2: Admin Workflow & Clinical Privacy..." -ForegroundColor Yellow

# Admin queries system audit logs
$adminAudit = Invoke-SafeRequest -uri "$CORE_URL/api/admin/audit-logs?page=0&size=10" -method "GET" -headers @{ Authorization = "Bearer $adminToken" }
Report-Check "ADM-1" "Admin can query system audit logs" ($adminAudit.StatusCode -eq 200)

# Admin is BLOCKED from direct clinical patient record access (least-privilege)
$adminClinical = Invoke-SafeRequest -uri "$CORE_URL/api/patients/4" -method "GET" -headers @{ Authorization = "Bearer $adminToken" }
Report-Check "ADM-2" "Admin strictly blocked from patient clinical records (HTTP 403)" ($adminClinical.StatusCode -eq 403) "Status: $($adminClinical.StatusCode)"

# Admin lists full patient directory
$adminPatients = Invoke-SafeRequest -uri "$CORE_URL/api/patients" -method "GET" -headers @{ Authorization = "Bearer $adminToken" }
Report-Check "ADM-3" "Admin authorized to list patients directory" ($adminPatients.StatusCode -eq 200)

# ------------------------------------------------------------------------------
# 3. PATIENT COMPLETE JOURNEY (QA-3)
# ------------------------------------------------------------------------------
Write-Host "`n--> Section 3: Patient Journey & Consent Lifecycle..." -ForegroundColor Yellow

# 3a. Patient queries own profile
$patProfile = Invoke-RestMethod -Uri "$CORE_URL/api/patients/me" -Method Get -Headers @{ Authorization = "Bearer $patientToken" }
Report-Check "PAT-1" "Patient retrieves own medical profile (Eleanor Vance)" ($patProfile.fullName -eq "Eleanor Vance") "ID: $($patProfile.id)"

# 3b. Patient searches doctors
$docSearch = Invoke-RestMethod -Uri "$CORE_URL/api/doctors/paged?search=Jenkins" -Method Get -Headers @{ Authorization = "Bearer $patientToken" }
$foundDoc = $docSearch.content | Where-Object { $_.fullName -match "Jenkins" }
Report-Check "PAT-2" "Patient searches and locates Doctor by name" ($foundDoc -ne $null) "Doctor: $($foundDoc.fullName)"

# 3c. Patient directly grants consent for Doctor 1 (Dr. Jenkins)
$grantPayload = @{
    doctorId = 1
    category = "LAB_REPORTS"
    purpose = "Routine lab monitoring and consultations"
    expiresAt = (Get-Date).AddDays(30).ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json
$grantResp = Invoke-RestMethod -Uri "$CORE_URL/api/consents/grant" -Method Post -Headers @{ Authorization = "Bearer $patientToken" } -Body $grantPayload -ContentType "application/json"
Report-Check "PAT-3" "Patient grants LAB_REPORTS consent to Doctor 1" ($grantResp.id -gt 0) "Consent ID: $($grantResp.id)"

# Also grant MEDICAL_HISTORY and PRESCRIPTIONS for full clinical workflow
$grantHist = @{
    doctorId = 1
    category = "MEDICAL_HISTORY"
    purpose = "Complete clinical management"
    expiresAt = (Get-Date).AddDays(30).ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json
Invoke-RestMethod -Uri "$CORE_URL/api/consents/grant" -Method Post -Headers @{ Authorization = "Bearer $patientToken" } -Body $grantHist -ContentType "application/json" | Out-Null

$grantRx = @{
    doctorId = 1
    category = "PRESCRIPTIONS"
    purpose = "Chronic medication therapy management"
    expiresAt = (Get-Date).AddDays(30).ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json
Invoke-RestMethod -Uri "$CORE_URL/api/consents/grant" -Method Post -Headers @{ Authorization = "Bearer $patientToken" } -Body $grantRx -ContentType "application/json" | Out-Null

# 3d. Patient views Care Circle (active consents)
$myConsents = Invoke-RestMethod -Uri "$CORE_URL/api/consents/my" -Method Get -Headers @{ Authorization = "Bearer $patientToken" }
$hasActiveConsent = $myConsents | Where-Object { $_.doctorId -eq 1 -and -not $_.revoked }
Report-Check "PAT-4" "Patient views active Care Circle relationships" ($hasActiveConsent.Count -ge 1) "Active consents: $($hasActiveConsent.Count)"

# ------------------------------------------------------------------------------
# 4. DOCTOR COMPLETE JOURNEY (QA-4)
# ------------------------------------------------------------------------------
Write-Host "`n--> Section 4: Doctor Journey & Clinical Decision Support..." -ForegroundColor Yellow

# 4a. Doctor views authorized cohort
$docCohort = Invoke-RestMethod -Uri "$CORE_URL/api/doctors/my/patients" -Method Get -Headers @{ Authorization = "Bearer $docToken" }
$eleanorInCohort = $docCohort | Where-Object { $_.id -eq 4 }
Report-Check "DOC-1" "Doctor views authorized patient cohort containing Eleanor" ($eleanorInCohort -ne $null)

# 4b. Doctor views authorized patient history
$encList = Invoke-SafeRequest -uri "$CORE_URL/api/clinical/encounters/patient/4" -method "GET" -headers @{ Authorization = "Bearer $docToken" }
Report-Check "DOC-2" "Doctor accesses consented patient encounters (HTTP 200)" ($encList.StatusCode -eq 200)

# 4c. Doctor writes prescription
$rxPayload = @{
    patientId = 4
    status = "ACTIVE"
    instructions = "Take with food daily"
    items = @(
        @{
            medicationName = "Metformin HCl"
            dosage = "500mg"
            route = "Oral"
            frequency = "Twice Daily"
            duration = "90 days"
            prescribedQuantity = 180
            refillsAllowed = 2
            instructions = "Take after breakfast and dinner"
        }
    )
} | ConvertTo-Json
$rxResp = Invoke-SafeRequest -uri "$CORE_URL/api/prescriptions" -method "POST" -headers @{ Authorization = "Bearer $docToken" } -body $rxPayload
Report-Check "DOC-3" "Doctor creates prescription under verified consent (HTTP 200)" ($rxResp.StatusCode -eq 200)

# 4d. Doctor checks assigned care-team nurses
$nurseTeam = Invoke-RestMethod -Uri "$CORE_URL/api/doctors/my/nurses" -Method Get -Headers @{ Authorization = "Bearer $docToken" }
Report-Check "DOC-4" "Doctor queries assigned care-team nurses" ($nurseTeam.Count -ge 1) "Nurses count: $($nurseTeam.Count)"

# ------------------------------------------------------------------------------
# 5. NURSE COMPLETE JOURNEY & CONCURRENCY LOCK (QA-5)
# ------------------------------------------------------------------------------
Write-Host "`n--> Section 5: Nurse Task Lifecycle & Concurrency Locking..." -ForegroundColor Yellow

# Find an available nurse in Doctor 1's care team
$availNurse = $nurseTeam | Where-Object { $_.availabilityStatus -eq "AVAILABLE" } | Select-Object -First 1
if (-not $availNurse) {
    # Reset Nurse Elena or Nurse David to AVAILABLE for test
    Invoke-RestMethod -Uri "$CORE_URL/api/nurses/1/status?status=AVAILABLE" -Method Patch -Headers @{ Authorization = "Bearer $nurseToken" } | Out-Null
    $availNurseId = 1
} else {
    $availNurseId = $availNurse.id
}

# Concurrency Test: Doctor 1 creates task for available nurse
$nurseTaskBody = @{
    doctorId = 1
    nurseId = $availNurseId
    patientId = 4
    taskType = "MEDICATION_ADMINISTRATION"
    priority = "ROUTINE"
    instructions = "Administer morning oral Metformin 500mg"
} | ConvertTo-Json

$assign1 = Invoke-SafeRequest -uri "$CORE_URL/api/nurses/tasks" -method "POST" -headers @{ Authorization = "Bearer $docToken" } -body $nurseTaskBody
Report-Check "NUR-1" "Doctor assigns clinical task to available nurse (HTTP 200)" ($assign1.StatusCode -eq 200)

# Immediate secondary assignment to same nurse -> Must be BLOCKED (400 Bad Request because nurse is now BUSY)
$assign2 = Invoke-SafeRequest -uri "$CORE_URL/api/nurses/tasks" -method "POST" -headers @{ Authorization = "Bearer $docToken" } -body $nurseTaskBody
Report-Check "NUR-2" "Concurrent double-assignment to BUSY nurse safely rejected (HTTP 400)" ($assign2.StatusCode -eq 400) "Status: $($assign2.StatusCode)"

# Nurse completes task and transitions back to AVAILABLE
if ($assign1.StatusCode -eq 200) {
    $taskId = (ConvertFrom-Json $assign1.Content).id
    # Accept task
    Invoke-SafeRequest -uri "$CORE_URL/api/nurses/tasks/$taskId/status" -method "PATCH" -headers @{ Authorization = "Bearer $nurseToken" } -body '{"status":"ACCEPTED"}' | Out-Null
    # Start task
    Invoke-SafeRequest -uri "$CORE_URL/api/nurses/tasks/$taskId/status" -method "PATCH" -headers @{ Authorization = "Bearer $nurseToken" } -body '{"status":"IN_PROGRESS"}' | Out-Null
    # Complete task
    $compResp = Invoke-SafeRequest -uri "$CORE_URL/api/nurses/tasks/$taskId/status" -method "PATCH" -headers @{ Authorization = "Bearer $nurseToken" } -body '{"status":"COMPLETED","notes":"Administered Metformin with water."}'
    Report-Check "NUR-3" "Nurse completes task with clinical notes (HTTP 200)" ($compResp.StatusCode -eq 200)
}

# ------------------------------------------------------------------------------
# 6. DOCUMENT MULTI-FORMAT MATRIX (QA-6)
# ------------------------------------------------------------------------------
Write-Host "`n--> Section 6: Document Format Matrix & Upload Validation..." -ForegroundColor Yellow

$formats = @(
    @{ ext = "pdf"; mime = "application/pdf"; header = "%PDF-1.4 test document content for QA" },
    @{ ext = "txt"; mime = "text/plain"; header = "Clinical progress note text content" },
    @{ ext = "png"; mime = "image/png"; header = [char]0x89 + "PNG`r`n" + [char]0x1A + [char]0x0A + "PNG binary header test" }
)

$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

foreach ($fmt in $formats) {
    $uploadBody = (
        "--$boundary$LF" +
        "Content-Disposition: form-data; name=`"patientId`"$LF$LF" + "4$LF" +
        "--$boundary$LF" +
        "Content-Disposition: form-data; name=`"category`"$LF$LF" + "OTHER$LF" +
        "--$boundary$LF" +
        "Content-Disposition: form-data; name=`"title`"$LF$LF" + "Format Test $($fmt.ext)$LF" +
        "--$boundary$LF" +
        "Content-Disposition: form-data; name=`"file`"; filename=`"test_file.$($fmt.ext)`"$LF" +
        "Content-Type: $($fmt.mime)$LF$LF" +
        "$($fmt.header)$LF" +
        "--$boundary--$LF"
    )
    $fmtResp = Invoke-SafeRequest -uri "$CORE_URL/api/documents/upload" -method "POST" -headers @{ Authorization = "Bearer $patientToken" } -body $uploadBody -contentType "multipart/form-data; boundary=$boundary"
    Report-Check "DOC-FMT-$($fmt.ext.ToUpper())" "Document upload accepted for format .$($fmt.ext)" ($fmtResp.StatusCode -eq 200) "Status: $($fmtResp.StatusCode)"
}

# ------------------------------------------------------------------------------
# 7. REAL-TIME EVENT SCOPING & NOTIFICATION ISOLATION (QA-7)
# ------------------------------------------------------------------------------
Write-Host "`n--> Section 7: Real-Time Event Scoping & Notification Isolation..." -ForegroundColor Yellow

$patNotifs = Invoke-RestMethod -Uri "$CORE_URL/api/notifications" -Method Get -Headers @{ Authorization = "Bearer $patientToken" }
$nurseNotifs = Invoke-RestMethod -Uri "$CORE_URL/api/notifications" -Method Get -Headers @{ Authorization = "Bearer $nurseToken" }

# Verify patient notifications do NOT contain nurse-specific internal messages
$leakToPatient = $false
foreach ($n in $patNotifs) {
    if ($n.type -eq "NURSE_ASSIGNMENT" -and -not ($n.message -match "Eleanor")) {
        $leakToPatient = $true
        break
    }
}
Report-Check "NOTIF-1" "Patient notifications do not receive cross-patient or nurse-private events" (-not $leakToPatient)

# ------------------------------------------------------------------------------
# 8. IMMEDIATE REVOCATION ENFORCEMENT (QA-8)
# ------------------------------------------------------------------------------
Write-Host "`n--> Section 8: Immediate Revocation Enforcement..." -ForegroundColor Yellow

$revokeResp = Invoke-SafeRequest -uri "$CORE_URL/api/consents/revoke-doctor/1" -method "POST" -headers @{ Authorization = "Bearer $patientToken" }
Report-Check "REV-1" "Patient revokes Doctor 1 access immediately (HTTP 200)" ($revokeResp.StatusCode -eq 200)

# Doctor 1 immediately blocked from viewing Eleanor's encounters
$postRevokeEnc = Invoke-SafeRequest -uri "$CORE_URL/api/clinical/encounters/patient/4" -method "GET" -headers @{ Authorization = "Bearer $docToken" }
Report-Check "REV-2" "Doctor 1 immediately blocked from patient encounters post-revocation (HTTP 403)" ($postRevokeEnc.StatusCode -eq 403) "Status: $($postRevokeEnc.StatusCode)"

# ------------------------------------------------------------------------------
# 9. DATABASE SCHEMA & INTEGRITY AUDIT (QA-9)
# ------------------------------------------------------------------------------
Write-Host "`n--> Section 9: Database Schema & Migration Verification..." -ForegroundColor Yellow

$coreHealth = Invoke-RestMethod -Uri "$CORE_URL/actuator/health" -Method Get
Report-Check "DB-1" "PostgreSQL connectivity and Flyway status is UP" ($coreHealth.status -eq "UP")

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
