$baseUrl = "http://localhost:8081"
$ErrorActionPreference = "Stop"

function Log-Step($msg) {
    Write-Host "`n=== $msg ===" -ForegroundColor Cyan
}

function Log-Success($msg) {
    Write-Host "  [PASS] $msg" -ForegroundColor Green
}

function Log-Failure($msg) {
    Write-Host "  [FAIL] $msg" -ForegroundColor Red
    exit 1
}

# 1. Doctor dr.vance login and baseline zero-trust verification
Log-Step "1. Baseline Zero-Trust Verification (dr.vance has no consent initially)"
$docLoginBody = @{
    username = "dr.vance"
    password = "Doctor@123"
} | ConvertTo-Json

$resDoc = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $docLoginBody -ContentType "application/json"
$doctorToken = $resDoc.token
if (-not $doctorToken) { Log-Failure "Could not log in as dr.vance" }
$docHeaders = @{ Authorization = "Bearer $doctorToken" }

try {
    $enc = Invoke-RestMethod -Uri "$baseUrl/api/clinical/encounters/patient/4" -Method Get -Headers $docHeaders
    Log-Failure "dr.vance should NOT have access prior to consent grant!"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Log-Success "dr.vance correctly received 403 Forbidden prior to consent grant."
    } else {
        Log-Failure "Expected 403 Forbidden, got: $_"
    }
}

# 2. Patient Login (patient.eleanor.vance)
Log-Step "2. Patient Login (patient.eleanor.vance)"
$loginBody = @{
    username = "patient.eleanor.vance"
    password = "Patient@123"
} | ConvertTo-Json

$res = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$patientToken = $res.token
if (-not $patientToken) { Log-Failure "Could not log in as patient" }
$headers = @{ Authorization = "Bearer $patientToken" }
Log-Success "Patient logged in successfully. Token acquired."

# 3. Grant 1-Hour Consent to Dr. Marcus Vance (doctorId: 2)
Log-Step "3. Grant 1-Hour Consent to Dr. Marcus Vance (doctorId: 2, categories: CLINICAL_NOTES, PRESCRIPTIONS)"
$grantBody = @{
    doctorId = 2
    categories = @("CLINICAL_NOTES", "PRESCRIPTIONS")
    purpose = "Urgent consultation for diabetic neuropathy review"
    durationHours = 1
} | ConvertTo-Json

$grantRes = Invoke-RestMethod -Uri "$baseUrl/api/consents/grant-batch" -Method Post -Headers $headers -Body $grantBody -ContentType "application/json"

if ($grantRes.Count -ne 2) { Log-Failure "Expected 2 consents granted, got $($grantRes.Count)" }

foreach ($c in $grantRes) {
    Write-Host "  Consent ID: $($c.id), Category: $($c.category), Status: $($c.status), ExpiresAt: $($c.expiresAt), GrantedBy: $($c.grantedBy)"
    if ($c.grantedBy -ne "patient.eleanor.vance") { Log-Failure "grantedBy attribution mismatch" }
    if ($c.status -ne "ACTIVE") { Log-Failure "Status should be ACTIVE" }
    $expires = [DateTimeOffset]::Parse($c.expiresAt)
    $now = [DateTimeOffset]::UtcNow
    $diffMinutes = ($expires - $now).TotalMinutes
    if ($diffMinutes -lt 55 -or $diffMinutes -gt 65) { Log-Failure "Expected expiration ~60 min from now, got $diffMinutes min" }
}
Log-Success "1-hour consent granted with accurate ~60 min expiresAt and grantedBy attribution."

# 4. Doctor Accesses Authorized Categories
Log-Step "4. Doctor Accesses Authorized Categories (CLINICAL_NOTES & PRESCRIPTIONS)"
try {
    $encounters = Invoke-RestMethod -Uri "$baseUrl/api/clinical/encounters/patient/4" -Method Get -Headers $docHeaders
    Log-Success "Encounters accessed successfully (200 OK, count: $($encounters.Count))."
} catch {
    Log-Failure "Doctor could not access encounters: $_"
}

try {
    $prescriptions = Invoke-RestMethod -Uri "$baseUrl/api/prescriptions/patient/4" -Method Get -Headers $docHeaders
    Log-Success "Prescriptions accessed successfully (200 OK, count: $($prescriptions.Count))."
} catch {
    Log-Failure "Doctor could not access prescriptions: $_"
}

# 5. Doctor Accesses Unauthorized Category (LAB_REPORTS)
Log-Step "5. Doctor Attempts Access to Unauthorized Category (LAB_REPORTS)"
try {
    $labs = Invoke-RestMethod -Uri "$baseUrl/api/clinical/lab-reports/patient/4" -Method Get -Headers $docHeaders
    Log-Failure "Doctor should NOT have access to lab reports without consent!"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Log-Success "Doctor correctly denied access with 403 Forbidden for unauthorized LAB_REPORTS."
    } else {
        Log-Failure "Expected 403 Forbidden, got: $_"
    }
}

# 6. Verify Doctor Received CONSENT_GRANTED Notification
Log-Step "6. Verify Doctor Received CONSENT_GRANTED Notification"
$notifications = Invoke-RestMethod -Uri "$baseUrl/api/notifications" -Method Get -Headers $docHeaders
$grantNotif = $notifications | Where-Object { $_.type -eq "CONSENT_GRANTED" } | Select-Object -First 1
if ($grantNotif) {
    Log-Success "Doctor received notification: [$($grantNotif.type)] $($grantNotif.title) - $($grantNotif.message)"
} else {
    Log-Failure "Doctor did not receive CONSENT_GRANTED notification"
}

# 7. Simulate Expiration via Postgres Time Shift
Log-Step "7. Simulate 1-Hour Expiration (Setting expires_at to 5 minutes ago in DB)"
docker exec consentcare-postgres psql -U consentcare -d consentcare -c "UPDATE consents SET expires_at = NOW() - INTERVAL '5 minutes' WHERE doctor_id = 2 AND patient_id = 4;"
Log-Success "Updated consents expires_at to past timestamp in DB."

# 8. Trigger Background Expiration Processing
Log-Step "8. Trigger Background Expiration Processing"
$procRes = Invoke-RestMethod -Uri "$baseUrl/api/consents/process-expirations" -Method Post -Headers $headers
Write-Host "  Processed Expirations: $($procRes.processedCount)"
if ($procRes.processedCount -lt 2) {
    Log-Failure "Expected at least 2 expired consents processed, got $($procRes.processedCount)"
}
Log-Success "Expiration processor transitioned expired consents to EXPIRED status."

# 9. Doctor Attempts Access After Expiry
Log-Step "9. Doctor Attempts Access to Encounters AFTER Consent Expired"
try {
    $encAfter = Invoke-RestMethod -Uri "$baseUrl/api/clinical/encounters/patient/4" -Method Get -Headers $docHeaders
    Log-Failure "Doctor should NOT have access after consent expired!"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Log-Success "Doctor strictly blocked with 403 Forbidden upon access attempt after expiration!"
    } else {
        Log-Failure "Expected 403 Forbidden after expiry, got: $_"
    }
}

# 10. Verify Expiration Notification Received by Doctor and Patient
Log-Step "10. Verify CONSENT_EXPIRED Notification Received by Both Parties"
$docNotifs = Invoke-RestMethod -Uri "$baseUrl/api/notifications" -Method Get -Headers $docHeaders
$docExpiredNotif = $docNotifs | Where-Object { $_.type -eq "CONSENT_EXPIRED" } | Select-Object -First 1
if ($docExpiredNotif) {
    Log-Success "Doctor received CONSENT_EXPIRED notification: $($docExpiredNotif.title)"
} else {
    Log-Failure "Doctor did not receive CONSENT_EXPIRED notification"
}

$patientNotifs = Invoke-RestMethod -Uri "$baseUrl/api/notifications" -Method Get -Headers $headers
$patientExpiredNotif = $patientNotifs | Where-Object { $_.type -eq "CONSENT_EXPIRED" } | Select-Object -First 1
if ($patientExpiredNotif) {
    Log-Success "Patient received CONSENT_EXPIRED notification: $($patientExpiredNotif.title)"
} else {
    Log-Failure "Patient did not receive CONSENT_EXPIRED notification"
}

# 11. Verify Audit Log for Expiration and Access Denial
Log-Step "11. Verify Access Logs for Expiration and Denial"
$auditDeny = docker exec consentcare-postgres psql -U consentcare -d consentcare -t -A -c "SELECT reason FROM access_logs WHERE patient_id = 4 AND decision = 'DENY' AND reason LIKE '%expired%' ORDER BY id DESC LIMIT 1;"
if ($auditDeny -like "*expired*") {
    Log-Success "Audit access log verified: '$auditDeny'."
} else {
    Log-Failure "Expected audit log with 'expired', found: '$auditDeny'"
}

# 12. Test Manual Revocation Flow with Attribution
Log-Step "12. Test Manual Revocation Flow with Attribution"
$reGrantBody = @{
    doctorId = 2
    categories = @("CLINICAL_NOTES")
    purpose = "Follow-up Consultation Access"
    durationHours = 24
} | ConvertTo-Json

$reGrantRes = Invoke-RestMethod -Uri "$baseUrl/api/consents/grant-batch" -Method Post -Headers $headers -Body $reGrantBody -ContentType "application/json"
Log-Success "Re-granted 24-hour consent. Status: $($reGrantRes[0].status)."

# Verify doctor access restored
$encRestore = Invoke-RestMethod -Uri "$baseUrl/api/clinical/encounters/patient/4" -Method Get -Headers $docHeaders
Log-Success "Doctor access restored after re-granting."

# Manually revoke access
$delRes = Invoke-RestMethod -Uri "$baseUrl/api/consents/revoke-doctor/2" -Method Post -Headers $headers
Log-Success "Patient manually revoked doctor access."

# Verify doctor is now blocked
try {
    $encRevoked = Invoke-RestMethod -Uri "$baseUrl/api/clinical/encounters/patient/4" -Method Get -Headers $docHeaders
    Log-Failure "Doctor should NOT have access after manual revocation!"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Log-Success "Doctor strictly blocked with 403 Forbidden after manual revocation."
    } else {
        Log-Failure "Expected 403 after revocation, got: $_"
    }
}

# Verify revoked_by attribution in database
$revokedByDb = docker exec consentcare-postgres psql -U consentcare -d consentcare -t -A -c "SELECT revoked_by FROM consents WHERE doctor_id = 2 AND patient_id = 4 AND status = 'REVOKED' ORDER BY id DESC LIMIT 1;"
if ($revokedByDb -like "*patient.eleanor.vance*") {
    Log-Success "Attribution persisted: revoked_by = '$revokedByDb'."
} else {
    Log-Failure "revoked_by in database was '$revokedByDb'"
}

Log-Step "ALL 12 END-TO-END VERIFICATION CHECKS COMPLETED AND VERIFIED!"
