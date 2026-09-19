# Phase 4 Comprehensive End-to-End Verification Suite
# Tests the complete privacy-aware care workflow:
# 1. Patient finds doctor via paged search
# 2. Patient selects granular categories and sends access request
# 3. Doctor receives pending access request notification
# 4. Doctor approves request with validity duration
# 5. Granular category-level access enforcement (permitted categories 200 OK, unpermitted 403 Forbidden)
# 6. BOLA / Patient isolation check (unconsented patient 403 Forbidden)
# 7. Care team boundary validation (cannot assign another doctor's nurse)
# 8. Pessimistic concurrency locking & Nurse status transition (AVAILABLE -> BUSY)
# 9. Concurrency protection (cannot double-assign BUSY nurse)
# 10. Nurse task queue with bedside patient safety context
# 11. Nurse task lifecycle: ASSIGNED -> ACCEPTED -> IN_PROGRESS -> COMPLETED with clinical notes
# 12. Automatic nurse status recovery: BUSY -> AVAILABLE
# 13. Immediate patient revocation ("Stop sharing") and instant access termination

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " CONSENTCARE EHR: PHASE 4 E2E VERIFICATION SUITE" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:8081"

# Helper for HTTP requests that may return 403 / 400
function Invoke-RestExpectStatus {
    param(
        [string]$Uri,
        [string]$Method = "Get",
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int[]]$ExpectedStatus
    )
    try {
        $params = @{
            Uri = $Uri
            Method = $Method
            Headers = $Headers
            ErrorAction = "Stop"
        }
        if ($Body) {
            $params["Body"] = $Body
            $params["ContentType"] = "application/json"
        }
        $res = Invoke-RestMethod @params
        if ($ExpectedStatus -notcontains 200 -and $ExpectedStatus -notcontains 201) {
            throw "Expected status $($ExpectedStatus -join '/'), but request succeeded with 200 OK."
        }
        return @{ StatusCode = 200; Data = $res }
    } catch {
        $ex = $_.Exception
        if ($ex.Response -ne $null) {
            $actualStatus = [int]$ex.Response.StatusCode
            if ($ExpectedStatus -contains $actualStatus) {
                return @{ StatusCode = $actualStatus; Error = $ex.Message }
            }
            throw "Expected status $($ExpectedStatus -join '/'), but received ${actualStatus}: $($ex.Message)"
        }
        throw $_
    }
}

function Invoke-LoginWithRetry {
    param([string]$Username, [string]$Password)
    for ($attempt = 1; $attempt -le 6; $attempt++) {
        try {
            return Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post `
                -Body (@{ username = $Username; password = $Password } | ConvertTo-Json) `
                -ContentType "application/json"
        } catch {
            $ex = $_.Exception
            if ($ex.Response -ne $null -and [int]$ex.Response.StatusCode -eq 429) {
                Write-Host " [Rate Limit] Anti-automation backoff active (2s) for $Username..." -ForegroundColor DarkYellow
                Start-Sleep -Seconds 2
            } else {
                throw $_
            }
        }
    }
    throw "Login failed after 6 rate-limit backoff attempts for $Username"
}

# --------------------------------------------------------------------------
# Step 1: Authentication of All Roles
# --------------------------------------------------------------------------
Write-Host "`n[Step 1] Authenticating Test Personas..." -ForegroundColor Yellow

# Patient A (Eleanor Vance, ID 4)
$pAuth = Invoke-LoginWithRetry -Username "patient.eleanor.vance" -Password "Patient@123"
$pHeaders = @{ Authorization = "Bearer $($pAuth.token)" }
$patientAId = $pAuth.profileId
if (-not $patientAId) { $patientAId = 4 }
Write-Host " [PASS] Patient Eleanor Vance authenticated (Patient ID: $patientAId)." -ForegroundColor Green

# Patient B (Robert Kowalski, ID 7 - consented only to Doctor 2)
$p2Auth = Invoke-LoginWithRetry -Username "patient.robert.kowalski" -Password "Patient@123"
$p2Headers = @{ Authorization = "Bearer $($p2Auth.token)" }
$patientBId = $p2Auth.profileId
if (-not $patientBId) { $patientBId = 7 }
Write-Host " [PASS] Patient Robert Kowalski authenticated (Patient ID: $patientBId)." -ForegroundColor Green

# Doctor 1 (Dr. Sarah Jenkins, Doctor ID 1)
$d1Auth = Invoke-LoginWithRetry -Username "dr.jenkins" -Password "Doctor@123"
$d1Headers = @{ Authorization = "Bearer $($d1Auth.token)" }
$doctor1Id = 1
Write-Host " [PASS] Doctor 1 (Dr. Sarah Jenkins) authenticated." -ForegroundColor Green

# Doctor 2 (Dr. Marcus Vance, Doctor ID 2)
$d2Auth = Invoke-LoginWithRetry -Username "dr.vance" -Password "Doctor@123"
$d2Headers = @{ Authorization = "Bearer $($d2Auth.token)" }
$doctor2Id = 2
Write-Host " [PASS] Doctor 2 (Dr. Marcus Vance) authenticated." -ForegroundColor Green

# Nurse 2 (Nurse David Miller, Doctor 1's care team)
$n2Auth = Invoke-LoginWithRetry -Username "nurse.david" -Password "Nurse@123"
$n2Headers = @{ Authorization = "Bearer $($n2Auth.token)" }
$nurse2Id = 2
Write-Host " [PASS] Nurse 2 (Nurse David Miller) authenticated." -ForegroundColor Green

# Nurse 5 (Nurse Fatima Al-Sayed, Doctor 2's care team)
$n5Auth = Invoke-LoginWithRetry -Username "nurse.fatima" -Password "Nurse@123"
$n5Headers = @{ Authorization = "Bearer $($n5Auth.token)" }
$nurse5Id = 5
Write-Host " [PASS] Nurse 5 (Nurse Fatima Al-Sayed) authenticated." -ForegroundColor Green

# --------------------------------------------------------------------------
# Clean up any existing consents between Patient A and Doctor 1
# --------------------------------------------------------------------------
Write-Host "`n[Setup] Cleaning any previous consents for clean test run..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$baseUrl/api/consents/revoke-doctor/$doctor1Id" -Method Post -Headers $pHeaders | Out-Null
    Write-Host " [PASS] Cleaned pre-existing Doctor 1 consents." -ForegroundColor Green
} catch {
    Write-Host " [INFO] No pre-existing consents to clean."
}

# Clean any existing active tasks for Nurse 2 so the test starts in a known baseline
try {
    $existingTasks = Invoke-RestMethod -Uri "$baseUrl/api/nurses/my/tasks" -Method Get -Headers $n2Headers
    foreach ($t in $existingTasks) {
        if ($t.status -in @("ASSIGNED", "ACCEPTED", "IN_PROGRESS")) {
            Invoke-RestMethod -Uri "$baseUrl/api/nurses/tasks/$($t.id)/status" -Method Patch -Headers $n2Headers `
                -Body (@{ status = "CANCELLED"; notes = "Automated test setup reset" } | ConvertTo-Json) `
                -ContentType "application/json" | Out-Null
        }
    }
    Invoke-RestMethod -Uri "$baseUrl/api/nurses/$nurse2Id/status?status=AVAILABLE" -Method Patch -Headers $n2Headers | Out-Null
    Write-Host " [PASS] Cleaned active tasks for Nurse 2 and reset to AVAILABLE." -ForegroundColor Green
} catch {
    Write-Host " [INFO] Active task cleanup skipped."
}

# --------------------------------------------------------------------------
# Step 2: Patient A searches for Doctor 1 via paged search
# --------------------------------------------------------------------------
Write-Host "`n[Step 2] Patient A searches for Doctor 1 via Paged API..." -ForegroundColor Yellow
$docSearch = Invoke-RestMethod -Uri "$baseUrl/api/doctors/paged?query=Jenkins&page=0&size=10" -Method Get -Headers $pHeaders
if ($docSearch.content.Count -ge 1 -and $docSearch.content[0].fullName -match "Jenkins") {
    Write-Host " [PASS] Found Doctor 1 via paged search: $($docSearch.content[0].fullName)" -ForegroundColor Green
} else {
    throw "Doctor search failed to return Dr. Jenkins"
}

# --------------------------------------------------------------------------
# Step 3: Patient A requests access to Doctor 1 with 3 specific categories
# --------------------------------------------------------------------------
Write-Host "`n[Step 3] Patient A requests access (Categories: LAB_REPORTS, PRESCRIPTIONS, DOCUMENTS)..." -ForegroundColor Yellow
$accessReqBody = @{
    doctorId = $doctor1Id
    categories = @("LAB_REPORTS", "PRESCRIPTIONS", "DOCUMENTS")
    notes = "Cardiology review for lipid panel, heart medications, and recent discharge summary"
    durationDays = 30
} | ConvertTo-Json

$reqRes = Invoke-RestMethod -Uri "$baseUrl/api/consents/request" -Method Post -Headers $pHeaders -Body $accessReqBody -ContentType "application/json"
$accessRequestId = $reqRes.id
Write-Host " [PASS] Access request created. ID: $accessRequestId, Status: $($reqRes.status)" -ForegroundColor Green
if ($reqRes.status -ne "PENDING") { throw "Access request status should be PENDING" }

# --------------------------------------------------------------------------
# Step 4: Doctor 1 receives pending request and approves it
# --------------------------------------------------------------------------
Write-Host "`n[Step 4] Doctor 1 receives and approves pending access request..." -ForegroundColor Yellow
$docRequests = Invoke-RestMethod -Uri "$baseUrl/api/doctors/my/requests" -Method Get -Headers $d1Headers
$pendingReq = $docRequests | Where-Object { $_.id -eq $accessRequestId }
if (-not $pendingReq) { throw "Pending request not found in Doctor 1's queue" }
Write-Host " [PASS] Request found in Doctor 1 queue. Patient: $($pendingReq.patientName), Categories: $($pendingReq.requestedCategories -join ', ')" -ForegroundColor Green

# Doctor 1 approves the request with 30 days duration
$approveBody = @{ status = "APPROVED"; durationDays = 30 } | ConvertTo-Json
Invoke-RestMethod -Uri "$baseUrl/api/doctors/requests/$accessRequestId/respond" -Method Post -Headers $d1Headers -Body $approveBody -ContentType "application/json"
Write-Host " [PASS] Doctor 1 approved access request." -ForegroundColor Green

# Verify Patient A now has active consents
$pConsents = Invoke-RestMethod -Uri "$baseUrl/api/consents/my" -Method Get -Headers $pHeaders
$activeForDoc1 = $pConsents | Where-Object { $_.doctorId -eq $doctor1Id -and $_.revoked -eq $false }
Write-Host " [PASS] Patient A has $($activeForDoc1.Count) active consent categories for Doctor 1." -ForegroundColor Green
if ($activeForDoc1.Count -lt 3) { throw "Expected 3 active consent categories" }

# --------------------------------------------------------------------------
# Step 5: Granular Category Enforcement
# --------------------------------------------------------------------------
Write-Host "`n[Step 5] Testing Granular Category Enforcement for Doctor 1..." -ForegroundColor Yellow

# A) Permitted category: LAB_REPORTS -> Must succeed (200 OK)
$labRes = Invoke-RestExpectStatus -Uri "$baseUrl/api/clinical/lab-reports/patient/$patientAId" -Method Get -Headers $d1Headers -ExpectedStatus 200
Write-Host " [PASS] LAB_REPORTS access GRANTED (200 OK)." -ForegroundColor Green

# B) Permitted category: PRESCRIPTIONS -> Must succeed (200 OK)
$rxRes = Invoke-RestExpectStatus -Uri "$baseUrl/api/prescriptions/patient/$patientAId" -Method Get -Headers $d1Headers -ExpectedStatus 200
Write-Host " [PASS] PRESCRIPTIONS access GRANTED (200 OK)." -ForegroundColor Green

# C) Permitted category: DOCUMENTS -> Must succeed (200 OK)
$docRes = Invoke-RestExpectStatus -Uri "$baseUrl/api/documents/patient/$patientAId" -Method Get -Headers $d1Headers -ExpectedStatus 200
Write-Host " [PASS] DOCUMENTS access GRANTED (200 OK)." -ForegroundColor Green

# D) UNPERMITTED category: DIAGNOSES -> Must be DENIED (403 Forbidden)
$diagRes = Invoke-RestExpectStatus -Uri "$baseUrl/api/clinical/diagnoses/patient/$patientAId" -Method Get -Headers $d1Headers -ExpectedStatus 403
Write-Host " [PASS] DIAGNOSES access strictly BLOCKED (403 Forbidden - category not consented)." -ForegroundColor Green

# E) UNPERMITTED category: CLINICAL_NOTES (Encounters) -> Must be DENIED (403 Forbidden)
$encRes = Invoke-RestExpectStatus -Uri "$baseUrl/api/clinical/encounters/patient/$patientAId" -Method Get -Headers $d1Headers -ExpectedStatus 403
Write-Host " [PASS] CLINICAL_NOTES (Encounters) access strictly BLOCKED (403 Forbidden - category not consented)." -ForegroundColor Green

# --------------------------------------------------------------------------
# Step 6: Patient Isolation (BOLA Protection)
# --------------------------------------------------------------------------
Write-Host "`n[Step 6] Testing Cross-Patient Isolation (Doctor 1 -> Patient B without consent)..." -ForegroundColor Yellow
$bolaRes = Invoke-RestExpectStatus -Uri "$baseUrl/api/clinical/lab-reports/patient/$patientBId" -Method Get -Headers $d1Headers -ExpectedStatus 403
Write-Host " [PASS] Access to unconsented Patient B strictly BLOCKED (403 Forbidden - zero trust isolation)." -ForegroundColor Green

# --------------------------------------------------------------------------
# Step 7: Care Team Boundaries (Doctor 1 cannot assign Doctor 2's nurse)
# --------------------------------------------------------------------------
Write-Host "`n[Step 7] Testing Care Team Boundaries..." -ForegroundColor Yellow

# Doctor 1 checks assigned nurses
$d1Nurses = Invoke-RestMethod -Uri "$baseUrl/api/doctors/my/nurses" -Method Get -Headers $d1Headers
$nurse2Found = $d1Nurses | Where-Object { $_.id -eq $nurse2Id }
$nurse5Found = $d1Nurses | Where-Object { $_.id -eq $nurse5Id }

if ($nurse2Found -and -not $nurse5Found) {
    Write-Host " [PASS] Doctor 1 care team verified: Nurse 2 present, Nurse 5 absent." -ForegroundColor Green
} else {
    throw "Care team list incorrect!"
}

# Doctor 1 attempts to assign Nurse 5 (belongs to Doctor 2)
Write-Host " Attempting to assign Doctor 2's nurse (Nurse 5)..."
$illegalTaskBody = @{
    doctorId = $doctor1Id
    nurseId = $nurse5Id
    patientId = $patientAId
    taskType = "VITAL_CHECK"
    priority = "ROUTINE"
    instructions = "Attempting illegal delegation"
} | ConvertTo-Json

$teamBoundaryRes = Invoke-RestExpectStatus -Uri "$baseUrl/api/nurses/tasks" -Method Post -Headers $d1Headers -Body $illegalTaskBody -ExpectedStatus @(400, 403)
Write-Host " [PASS] Cross-team delegation strictly BLOCKED ($($teamBoundaryRes.StatusCode): nurse not in care team)." -ForegroundColor Green

# --------------------------------------------------------------------------
# Step 8: Concurrency & Status Transition (Nurse 2 AVAILABLE -> BUSY)
# --------------------------------------------------------------------------
Write-Host "`n[Step 8] Testing Task Delegation & Pessimistic Lock Concurrency..." -ForegroundColor Yellow

# Ensure Nurse 2 is initially AVAILABLE
Invoke-RestMethod -Uri "$baseUrl/api/nurses/$nurse2Id/status?status=AVAILABLE" -Method Patch -Headers $n2Headers | Out-Null
$initialStatus = (Invoke-RestMethod -Uri "$baseUrl/api/nurses/me" -Method Get -Headers $n2Headers).availabilityStatus
Write-Host " Initial Nurse 2 status: $initialStatus"
if ($initialStatus -ne "AVAILABLE") { throw "Nurse 2 should be AVAILABLE initially" }

# Doctor 1 delegates task to Nurse 2
$taskBody = @{
    doctorId = $doctor1Id
    nurseId = $nurse2Id
    patientId = $patientAId
    taskType = "VITAL_CHECK"
    priority = "URGENT"
    instructions = "Record 12-lead ECG and bedside BP post-medication"
} | ConvertTo-Json

$task = Invoke-RestMethod -Uri "$baseUrl/api/nurses/tasks" -Method Post -Headers $d1Headers -Body $taskBody -ContentType "application/json"
$createdTaskId = $task.id
Write-Host " [PASS] Task created successfully. ID: $createdTaskId, Status: $($task.status), Priority: $($task.priority)" -ForegroundColor Green

# Verify Nurse 2 status transitioned to BUSY
$busyStatus = (Invoke-RestMethod -Uri "$baseUrl/api/nurses/me" -Method Get -Headers $n2Headers).availabilityStatus
Write-Host " Nurse 2 status after task assignment: $busyStatus"
if ($busyStatus -ne "BUSY") { throw "Nurse 2 should have transitioned to BUSY" }
Write-Host " [PASS] Nurse 2 availability automatically transitioned to BUSY." -ForegroundColor Green

# Step 9: Concurrency protection - Attempting to assign the BUSY nurse again
Write-Host "`n[Step 9] Testing Double-Assignment Prevention on BUSY Nurse..." -ForegroundColor Yellow
$doubleAssignBody = @{
    doctorId = $doctor1Id
    nurseId = $nurse2Id
    patientId = $patientAId
    taskType = "SAMPLE_COLLECTION"
    priority = "ROUTINE"
    instructions = "Secondary blood sample draw"
} | ConvertTo-Json

$concurrencyRes = Invoke-RestExpectStatus -Uri "$baseUrl/api/nurses/tasks" -Method Post -Headers $d1Headers -Body $doubleAssignBody -ExpectedStatus 400
Write-Host " [PASS] Double-assignment safely BLOCKED (400 Bad Request: Nurse is currently BUSY with other duties)." -ForegroundColor Green

# --------------------------------------------------------------------------
# Step 10: Nurse Task Queue & Bedside Patient Safety Context
# --------------------------------------------------------------------------
Write-Host "`n[Step 10] Nurse views task queue with Bedside Patient Safety Context..." -ForegroundColor Yellow
$nurseTasks = Invoke-RestMethod -Uri "$baseUrl/api/nurses/my/tasks" -Method Get -Headers $n2Headers
$assignedTask = $nurseTasks | Where-Object { $_.id -eq $createdTaskId }
if (-not $assignedTask) { throw "Task $createdTaskId not found in Nurse 2 queue" }

Write-Host " Task Patient Name: $($assignedTask.patientName)"
Write-Host " Task Patient Demographics: Age $($assignedTask.patientAge), Gender $($assignedTask.patientGender)"
Write-Host " Task Blood Group: $($assignedTask.bloodGroup)"
Write-Host " Task Allergies: $($assignedTask.allergies)"
Write-Host " Task Instructions: $($assignedTask.instructions)"

if ($assignedTask.bloodGroup -ne $null -or $assignedTask.patientAge -ne $null) {
    Write-Host " [PASS] Bedside safety context enriched with minimum necessary clinical information." -ForegroundColor Green
}

# --------------------------------------------------------------------------
# Step 11: Nurse Task Execution Lifecycle
# --------------------------------------------------------------------------
Write-Host "`n[Step 11] Executing Nurse Task State Machine..." -ForegroundColor Yellow

# A) ASSIGNED -> ACCEPTED
$acceptBody = @{ status = "ACCEPTED" } | ConvertTo-Json
$acceptedTask = Invoke-RestMethod -Uri "$baseUrl/api/nurses/tasks/$createdTaskId/status" -Method Patch -Headers $n2Headers -Body $acceptBody -ContentType "application/json"
Write-Host " [PASS] Task transitioned: ASSIGNED -> $($acceptedTask.status)" -ForegroundColor Green
if ($acceptedTask.status -ne "ACCEPTED") { throw "Status should be ACCEPTED" }

# B) ACCEPTED -> IN_PROGRESS
$startBody = @{ status = "IN_PROGRESS" } | ConvertTo-Json
$startedTask = Invoke-RestMethod -Uri "$baseUrl/api/nurses/tasks/$createdTaskId/status" -Method Patch -Headers $n2Headers -Body $startBody -ContentType "application/json"
Write-Host " [PASS] Task transitioned: ACCEPTED -> $($startedTask.status)" -ForegroundColor Green
if ($startedTask.status -ne "IN_PROGRESS") { throw "Status should be IN_PROGRESS" }

# C) IN_PROGRESS -> COMPLETED (with clinical notes)
$completeNotes = "12-lead ECG completed showing normal sinus rhythm. Bedside BP 118/76 mmHg, SpO2 98%. Patient alert and resting comfortably."
$completeBody = @{ status = "COMPLETED"; notes = $completeNotes } | ConvertTo-Json
$completedTask = Invoke-RestMethod -Uri "$baseUrl/api/nurses/tasks/$createdTaskId/status" -Method Patch -Headers $n2Headers -Body $completeBody -ContentType "application/json"
Write-Host " [PASS] Task transitioned: IN_PROGRESS -> $($completedTask.status)" -ForegroundColor Green
Write-Host " Completion Notes recorded: $($completedTask.completionNotes)"
if ($completedTask.status -ne "COMPLETED") { throw "Status should be COMPLETED" }

# --------------------------------------------------------------------------
# Step 12: Automatic Nurse Availability Recovery (BUSY -> AVAILABLE)
# --------------------------------------------------------------------------
Write-Host "`n[Step 12] Testing Automatic Availability Recovery..." -ForegroundColor Yellow
$recoveredStatus = (Invoke-RestMethod -Uri "$baseUrl/api/nurses/me" -Method Get -Headers $n2Headers).availabilityStatus
Write-Host " Nurse 2 availability status after completing duties: $recoveredStatus"
if ($recoveredStatus -ne "AVAILABLE") {
    throw "Nurse 2 status should automatically revert to AVAILABLE when all tasks are complete!"
}
Write-Host " [PASS] Nurse 2 status automatically returned to AVAILABLE." -ForegroundColor Green

# --------------------------------------------------------------------------
# Step 13: Immediate Patient Revocation ("Stop Sharing")
# --------------------------------------------------------------------------
Write-Host "`n[Step 13] Testing Immediate Patient Consent Revocation ('Stop Sharing')..." -ForegroundColor Yellow

# Patient A revokes all access for Doctor 1
$revokeRes = Invoke-RestMethod -Uri "$baseUrl/api/consents/revoke-doctor/$doctor1Id" -Method Post -Headers $pHeaders
Write-Host " [PASS] Patient A revoked access for Doctor 1. Revoked count: $($revokeRes.revokedCount)" -ForegroundColor Green

# Verify Doctor 1 is IMMEDIATELY blocked from accessing Patient A's records
$postRevokeLab = Invoke-RestExpectStatus -Uri "$baseUrl/api/clinical/lab-reports/patient/$patientAId" -Method Get -Headers $d1Headers -ExpectedStatus 403
Write-Host " [PASS] Post-revocation access to lab reports strictly BLOCKED (403 Forbidden)." -ForegroundColor Green

$postRevokeRx = Invoke-RestExpectStatus -Uri "$baseUrl/api/prescriptions/patient/$patientAId" -Method Get -Headers $d1Headers -ExpectedStatus 403
Write-Host " [PASS] Post-revocation access to prescriptions strictly BLOCKED (403 Forbidden)." -ForegroundColor Green

# Verify Doctor 1's authorized patient list no longer includes Patient A
$d1Patients = Invoke-RestMethod -Uri "$baseUrl/api/doctors/my/patients" -Method Get -Headers $d1Headers
$patientAFound = $d1Patients | Where-Object { $_.id -eq $patientAId }
if ($patientAFound) {
    throw "Revoked patient should not appear in doctor's authorized cohort!"
}
Write-Host " [PASS] Patient A successfully excluded from Doctor 1's authorized cohort." -ForegroundColor Green

# --------------------------------------------------------------------------
# Step 14: Testing Consent Rejection Flow
# --------------------------------------------------------------------------
Write-Host "`n[Step 14] Testing Consent Request Rejection Flow..." -ForegroundColor Yellow

# Patient A sends access request to Doctor 2 (Dr. Marcus Vance, ID 2)
$rejectReqBody = @{
    doctorId = $doctor2Id
    categories = @("DIAGNOSES")
    notes = "Requesting second opinion on endocrine conditions"
    durationDays = 14
} | ConvertTo-Json

$rejectReqRes = Invoke-RestMethod -Uri "$baseUrl/api/consents/request" -Method Post -Headers $pHeaders -Body $rejectReqBody -ContentType "application/json"
$rejectReqId = $rejectReqRes.id
Write-Host " [PASS] Access request to Doctor 2 created (ID: $rejectReqId, Status: $($rejectReqRes.status))." -ForegroundColor Green

# Doctor 2 rejects the request
$rejectBody = @{ status = "REJECTED" } | ConvertTo-Json
Invoke-RestMethod -Uri "$baseUrl/api/doctors/requests/$rejectReqId/respond" -Method Post -Headers $d2Headers -Body $rejectBody -ContentType "application/json" | Out-Null
Write-Host " [PASS] Doctor 2 rejected access request." -ForegroundColor Green

# Verify Doctor 2 CANNOT access Patient A's diagnoses
$postRejectDiag = Invoke-RestExpectStatus -Uri "$baseUrl/api/clinical/diagnoses/patient/$patientAId" -Method Get -Headers $d2Headers -ExpectedStatus 403
Write-Host " [PASS] Post-rejection access to diagnoses strictly BLOCKED (403 Forbidden)." -ForegroundColor Green

# Verify Patient A sees request status as REJECTED
$pRequests = Invoke-RestMethod -Uri "$baseUrl/api/consents/my-requests" -Method Get -Headers $pHeaders
$targetReq = $pRequests | Where-Object { $_.id -eq $rejectReqId }
if ($targetReq.status -ne "REJECTED") {
    throw "Access request should have status REJECTED, but found $($targetReq.status)"
}
Write-Host " [PASS] Access request confirmed as REJECTED in patient request queue." -ForegroundColor Green

# --------------------------------------------------------------------------
# Step 15: Persisted Real-time Notification Verification
# --------------------------------------------------------------------------
Write-Host "`n[Step 15] Verifying Persisted Real-time Notification Delivery..." -ForegroundColor Yellow

# Check Nurse 2 notifications
$nurseNotifs = Invoke-RestMethod -Uri "$baseUrl/api/notifications" -Method Get -Headers $n2Headers
$nurseAssignmentNotif = $nurseNotifs | Where-Object { $_.type -eq "NURSE_ASSIGNMENT" }
if (-not $nurseAssignmentNotif) { throw "Nurse 2 should have received a NURSE_ASSIGNMENT notification" }
Write-Host " [PASS] Nurse 2 received persisted notification: $($nurseAssignmentNotif[0].title) - $($nurseAssignmentNotif[0].message)" -ForegroundColor Green

# Check Patient A notifications
$patientNotifs = Invoke-RestMethod -Uri "$baseUrl/api/notifications" -Method Get -Headers $pHeaders
if ($patientNotifs.Count -ge 1) {
    Write-Host " [PASS] Patient A received persisted care workflow notifications ($($patientNotifs.Count) recorded)." -ForegroundColor Green
} else {
    throw "Patient A should have received notifications for care workflow updates"
}

# --------------------------------------------------------------------------
# Step 16: Unauthorized API Access & Strict RBAC Enforcement
# --------------------------------------------------------------------------
Write-Host "`n[Step 16] Testing Unauthorized API Access & Role Boundaries..." -ForegroundColor Yellow

# A) Anonymous request without token -> 401 Unauthorized or 403 Forbidden
$anonRes = Invoke-RestExpectStatus -Uri "$baseUrl/api/clinical/encounters/patient/$patientAId" -Method Get -ExpectedStatus @(401, 403)
Write-Host " [PASS] Anonymous request without JWT strictly BLOCKED ($($anonRes.StatusCode) Unauthorized/Forbidden)." -ForegroundColor Green

# B) Patient attempts to assign nurse task -> 403 Forbidden
$illegalAssignRes = Invoke-RestExpectStatus -Uri "$baseUrl/api/nurses/tasks" -Method Post -Headers $pHeaders -Body $taskBody -ExpectedStatus 403
Write-Host " [PASS] Patient attempting doctor-only task assignment strictly BLOCKED (403 Forbidden)." -ForegroundColor Green

# C) Nurse attempts to query doctor's patient list -> 403 Forbidden
$illegalPatientListRes = Invoke-RestExpectStatus -Uri "$baseUrl/api/doctors/my/patients" -Method Get -Headers $n2Headers -ExpectedStatus 403
Write-Host " [PASS] Nurse attempting doctor-only patient list query strictly BLOCKED (403 Forbidden)." -ForegroundColor Green

# D) Patient attempts to view care team nurses -> 403 Forbidden
$illegalNurseTeamRes = Invoke-RestExpectStatus -Uri "$baseUrl/api/doctors/my/nurses" -Method Get -Headers $pHeaders -ExpectedStatus 403
Write-Host " [PASS] Patient attempting doctor-only care team query strictly BLOCKED (403 Forbidden)." -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " ALL PHASE 4 VERIFICATION CHECKS PASSED WITH 100% SUCCESS!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
