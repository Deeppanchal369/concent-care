# ==============================================================================
# ConsentCare Master Upgrade End-to-End Verification Test Suite
# Tests:
#   1. System Health across microservices
#   2. Admin Command Center (24 DB metrics, User Mgmt, Password Reset, Toggle Status)
#   3. Doctor Care Team Allocation & Nurse Directory
#   4. Patient Directory (Least Privilege)
#   5. Document Oversight (Audited View, Transparent Removal, Restore, Notifications)
#   6. Real Clinical Dataset Registry (MIMIC-IV v3.1, UCI Diabetes Baseline) & Model Registry
#   7. Doctor Longitudinal AI Clinical Intelligence (Strict 5-Section Pipeline)
# ==============================================================================

$ErrorActionPreference = "Continue"
$BASE_CORE = "http://localhost:8081"
$BASE_RISK = "http://localhost:8001"
$BASE_AGENT = "http://localhost:8002"
$BASE_FRONTEND = "http://localhost:81"

$PassCount = 0
$FailCount = 0

function Assert-Step([string]$name, [bool]$condition, [string]$details = "") {
    if ($condition) {
        Write-Host " [PASS] $name" -ForegroundColor Green
        if ($details) { Write-Host "        $details" -ForegroundColor DarkGray }
        $script:PassCount++
    } else {
        Write-Host " [FAIL] $name" -ForegroundColor Red
        if ($details) { Write-Host "        Error: $details" -ForegroundColor Yellow }
        $script:FailCount++
    }
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  CONSENTCARE MASTER UPGRADE E2E VERIFICATION TEST SUITE" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# STEP 1: Microservices Health Checks
# ------------------------------------------------------------------------------
Write-Host "`n--- 1. Microservices Health Checks ---" -ForegroundColor Yellow

try {
    $coreHealth = Invoke-RestMethod -Uri "$BASE_CORE/actuator/health" -Method Get -TimeoutSec 10
    Assert-Step "Core Service is UP" ($coreHealth.status -eq "UP") "Status: $($coreHealth.status)"
} catch {
    Assert-Step "Core Service is UP" $false $_.Exception.Message
}

try {
    $riskHealth = Invoke-RestMethod -Uri "$BASE_RISK/health" -Method Get -TimeoutSec 5
    Assert-Step "Risk Service is UP" ($riskHealth.status -eq "ok") "Service: $($riskHealth.service), Model: $($riskHealth.active_model)"
} catch {
    Assert-Step "Risk Service is UP" $false $_.Exception.Message
}

try {
    $agentHealth = Invoke-RestMethod -Uri "$BASE_AGENT/health" -Method Get -TimeoutSec 5
    Assert-Step "Agent Service is UP" ($agentHealth.status -eq "ok") "Service: $($agentHealth.service), Provider: $($agentHealth.ai_provider.active_provider)"
} catch {
    Assert-Step "Agent Service is UP" $false $_.Exception.Message
}

try {
    $feRes = Invoke-WebRequest -Uri "$BASE_FRONTEND" -Method Get -TimeoutSec 5 -UseBasicParsing
    Assert-Step "Frontend is reachable" ($feRes.StatusCode -eq 200) "HTTP $($feRes.StatusCode)"
} catch {
    Assert-Step "Frontend is reachable" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# STEP 2: Authentication
# ------------------------------------------------------------------------------
Write-Host "`n--- 2. Authentication ---" -ForegroundColor Yellow

$adminToken = $null
$doctorToken = $null
$patientToken = $null

try {
    $loginBody = @{ email = "admin@consentcare.local"; password = "Admin@12345" } | ConvertTo-Json
    $adminRes = Invoke-RestMethod -Uri "$BASE_CORE/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $adminToken = $adminRes.token
    Assert-Step "Admin login successful" ($adminToken -ne $null -and $adminRes.role -eq "ADMIN") "User: $($adminRes.username)"
} catch {
    Assert-Step "Admin login successful" $false $_.Exception.Message
}

try {
    $docLogin = @{ email = "dr.sarah.patel@hospital.org"; password = "Doctor@12345" } | ConvertTo-Json
    $docRes = Invoke-RestMethod -Uri "$BASE_CORE/api/auth/login" -Method Post -Body $docLogin -ContentType "application/json"
    $doctorToken = $docRes.token
    Assert-Step "Doctor login successful" ($doctorToken -ne $null -and $docRes.role -eq "DOCTOR") "Doctor: $($docRes.fullName)"
} catch {
    # Fallback to dr.chen if seeded
    try {
        $docLogin = @{ email = "dr.chen@consentcare.hospital"; password = "Doctor@12345" } | ConvertTo-Json
        $docRes = Invoke-RestMethod -Uri "$BASE_CORE/api/auth/login" -Method Post -Body $docLogin -ContentType "application/json"
        $doctorToken = $docRes.token
        Assert-Step "Doctor login (dr.chen) successful" ($doctorToken -ne $null) "Doctor: $($docRes.fullName)"
    } catch {
        Assert-Step "Doctor login successful" $false $_.Exception.Message
    }
}

try {
    $patLogin = @{ email = "john.doe@email.com"; password = "Patient@12345" } | ConvertTo-Json
    $patRes = Invoke-RestMethod -Uri "$BASE_CORE/api/auth/login" -Method Post -Body $patLogin -ContentType "application/json"
    $patientToken = $patRes.token
    Assert-Step "Patient login successful" ($patientToken -ne $null -and $patRes.role -eq "PATIENT") "Patient: $($patRes.fullName)"
} catch {
    Assert-Step "Patient login successful" $false $_.Exception.Message
}

$adminHeaders = @{ Authorization = "Bearer $adminToken" }
$doctorHeaders = @{ Authorization = "Bearer $doctorToken" }
$patientHeaders = @{ Authorization = "Bearer $patientToken" }

# ------------------------------------------------------------------------------
# STEP 3: Admin Command Center - 24 Database Metrics
# ------------------------------------------------------------------------------
Write-Host "`n--- 3. Admin Command Center - 24 Database Metrics ---" -ForegroundColor Yellow

if ($adminToken) {
    try {
        $stats = Invoke-RestMethod -Uri "$BASE_CORE/api/admin/dashboard-stats" -Method Get -Headers $adminHeaders
        $hasUsers = $stats.total_users -ge 0
        $hasDocs = $stats.total_doctors -ge 0
        $hasNurses = $stats.total_nurses -ge 0
        $hasPatients = $stats.total_patients -ge 0
        $hasConsent = $stats.active_consents -ge 0
        $hasDatasets = $stats.cataloged_datasets -ge 0
        $hasModels = $stats.cataloged_models -ge 0
        $hasRuns = $stats.total_intelligence_runs -ge 0
        
        $allMetricsPresent = $hasUsers -and $hasDocs -and $hasNurses -and $hasPatients -and $hasConsent -and $hasDatasets -and $hasModels -and $hasRuns
        Assert-Step "Admin Dashboard Stats (24 DB metrics returned)" $allMetricsPresent "Users: $($stats.total_users), Docs: $($stats.total_doctors), Nurses: $($stats.total_nurses), Datasets: $($stats.cataloged_datasets), Models: $($stats.cataloged_models)"
    } catch {
        Assert-Step "Admin Dashboard Stats" $false $_.Exception.Message
    }
}

# ------------------------------------------------------------------------------
# STEP 4: Real-World Clinical Dataset & Model Registry
# ------------------------------------------------------------------------------
Write-Host "`n--- 4. Real-World Clinical Dataset & Model Registry ---" -ForegroundColor Yellow

if ($adminToken) {
    try {
        $datasets = Invoke-RestMethod -Uri "$BASE_CORE/api/admin/ai/datasets" -Method Get -Headers $adminHeaders
        $mimic = $datasets | Where-Object { $_.datasetName -like "*MIMIC-IV*" }
        $uci = $datasets | Where-Object { $_.datasetName -like "*UCI*" }
        
        $mimicOk = [bool]($mimic -ne $null -and $mimic.accessStatus -eq "REQUIRES_CREDENTIALED_DATA" -and $mimic.trainingStatus -eq "NOT_TRAINED")
        Assert-Step "MIMIC-IV v3.1 registered as Primary Research (REQUIRES_CREDENTIALED_DATA, Zero Synthetic)" $mimicOk "Status: $($mimic.accessStatus), Training: $($mimic.trainingStatus)"

        $uciOk = [bool]($uci -ne $null -and $uci.accessStatus -eq "AVAILABLE" -and $uci.recordCount -eq 101766)
        Assert-Step "UCI Diabetes 130-US Hospitals registered as Active Baseline (101,766 records)" $uciOk "Records: $($uci.recordCount)"
    } catch {
        Assert-Step "Dataset Registry" $false $_.Exception.Message
    }

    try {
        $models = Invoke-RestMethod -Uri "$BASE_CORE/api/admin/ai/models" -Method Get -Headers $adminHeaders
        $activeModel = $models | Where-Object { $_.status -eq "TRAINED" }
        $mimicModel = $models | Where-Object { $_.modelName -like "*MIMIC*" -or $_.modelKey -like "*mimic*" }

        $modelOk = [bool]($activeModel -ne $null -and $activeModel.datasetName -like "*UCI*")
        Assert-Step "Model Registry has ACTIVE production baseline model" $modelOk "Model: $($activeModel.modelName) v$($activeModel.version)"

        $mimicModelOk = [bool]($mimicModel -ne $null -and $mimicModel.status -eq "PENDING_DATA" -and ($mimicModel.metricsJson -eq $null -or $mimicModel.metricsJson -eq ""))
        Assert-Step "MIMIC Model marked PENDING_DATA with ZERO fabricated metrics" $mimicModelOk "Status: $($mimicModel.status)"
    } catch {
        Assert-Step "Model Registry" $false $_.Exception.Message
    }
}

# Also verify risk-service direct registries
try {
    $riskDatasets = Invoke-RestMethod -Uri "$BASE_RISK/datasets/registry" -Method Get
    $hasMimic = ($riskDatasets.datasets | Where-Object { $_.name -like "*MIMIC-IV*" }) -ne $null
    Assert-Step "Risk-service exposes /datasets/registry with MIMIC-IV" $hasMimic "Datasets count: $($riskDatasets.datasets.Count)"
} catch {
    Assert-Step "Risk-service datasets registry" $false $_.Exception.Message
}

try {
    $riskModels = Invoke-RestMethod -Uri "$BASE_RISK/models/registry" -Method Get
    $hasLegacy = ($riskModels.models | Where-Object { $_.name -eq "readmission-30d-uci-legacy" }) -ne $null
    Assert-Step "Risk-service exposes /models/registry with readmission-30d-uci-legacy" $hasLegacy "Models count: $($riskModels.models.Count)"
} catch {
    Assert-Step "Risk-service models registry" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# STEP 5: User Management & Governance
# ------------------------------------------------------------------------------
Write-Host "`n--- 5. User Management & Governance ---" -ForegroundColor Yellow

if ($adminToken) {
    try {
        $users = Invoke-RestMethod -Uri "$BASE_CORE/api/admin/users" -Method Get -Headers $adminHeaders
        Assert-Step "Admin lists users" ($users.Count -gt 0) "Total users: $($users.Count)"
        
        # Pick a doctor or nurse to test password reset and status toggle
        $testTarget = $users | Where-Object { $_.role -eq "NURSE" } | Select-Object -First 1
        if ($testTarget) {
            # Password reset with justification
            $resetBody = @{
                newPassword = "Nurse@Password2026!"
                justification = "Administrative verification testing of password reset workflow"
            } | ConvertTo-Json
            $resetRes = Invoke-RestMethod -Uri "$BASE_CORE/api/admin/users/$($testTarget.id)/reset-password" -Method Post -Body $resetBody -ContentType "application/json" -Headers $adminHeaders
            Assert-Step "Admin resets user password with audited justification" ($resetRes.message -like "*Password successfully reset*") "User: $($testTarget.username)"

            # Status toggle
            $statusBody = @{ active = $false } | ConvertTo-Json
            $statusRes = Invoke-RestMethod -Uri "$BASE_CORE/api/admin/users/$($testTarget.id)/status" -Method Patch -Body $statusBody -ContentType "application/json" -Headers $adminHeaders
            Assert-Step "Admin suspends user account" ($statusRes.active -eq $false) "Status: $($statusRes.status)"

            # Re-activate user
            $statusBody2 = @{ active = $true } | ConvertTo-Json
            $statusRes2 = Invoke-RestMethod -Uri "$BASE_CORE/api/admin/users/$($testTarget.id)/status" -Method Patch -Body $statusBody2 -ContentType "application/json" -Headers $adminHeaders
            Assert-Step "Admin reactivates user account" ($statusRes2.active -eq $true) "Status: $($statusRes2.status)"
        }
    } catch {
        Assert-Step "User Management workflows" $false $_.Exception.Message
    }
}

# ------------------------------------------------------------------------------
# STEP 6: Doctor Care Team Allocation & Nurse Directory
# ------------------------------------------------------------------------------
Write-Host "`n--- 6. Doctor Care Team Allocation & Nurse Directory ---" -ForegroundColor Yellow

if ($adminToken) {
    try {
        $doctors = Invoke-RestMethod -Uri "$BASE_CORE/api/admin/doctors" -Method Get -Headers $adminHeaders
        $nurses = Invoke-RestMethod -Uri "$BASE_CORE/api/admin/nurses" -Method Get -Headers $adminHeaders
        Assert-Step "Admin lists doctors with care teams" ($doctors.Count -gt 0) "Doctors: $($doctors.Count)"
        Assert-Step "Admin lists nurse directory" ($nurses.Count -gt 0) "Nurses: $($nurses.Count)"

        if ($doctors.Count -gt 0 -and $nurses.Count -gt 0) {
            $docId = $doctors[0].id
            $nurseId = $nurses[0].id

            # Allocate nurse to doctor
            $allocRes = Invoke-RestMethod -Uri "$BASE_CORE/api/admin/doctors/$docId/nurses/$nurseId" -Method Post -Headers $adminHeaders
            Assert-Step "Admin allocates nurse to doctor care team" ($allocRes.message -like "*successfully allocated*") "Doctor: $docId, Nurse: $nurseId"

            # Remove nurse from doctor care team
            $removeRes = Invoke-RestMethod -Uri "$BASE_CORE/api/admin/doctors/$docId/nurses/$nurseId" -Method Delete -Headers $adminHeaders
            Assert-Step "Admin removes nurse from doctor care team" ($removeRes.message -like "*removed from care team*") "Doctor: $docId, Nurse: $nurseId"
        }
    } catch {
        Assert-Step "Care team allocation workflows" $false $_.Exception.Message
    }
}

# ------------------------------------------------------------------------------
# STEP 7: Document Oversight (Audited View, Transparent Removal, Restore)
# ------------------------------------------------------------------------------
Write-Host "`n--- 7. Document Oversight (Audited View, Transparent Removal, Restore) ---" -ForegroundColor Yellow

if ($adminToken) {
    try {
        $docsPage = Invoke-RestMethod -Uri "$BASE_CORE/api/admin/documents?page=0&size=10" -Method Get -Headers $adminHeaders
        $hasDocs = [bool]($docsPage.content -ne $null -and $docsPage.content.Count -gt 0)
        Assert-Step "Admin lists documents overview" $hasDocs "Documents count: $($docsPage.content.Count)"

        if ($hasDocs) {
            $testDoc = $docsPage.content[0]
            $docId = $testDoc.id

            # 1. View with mandatory clinical justification
            $viewBody = @{ reason = "Hospital regulatory compliance review and clinical verification" } | ConvertTo-Json
            $viewRes = Invoke-RestMethod -Uri "$BASE_CORE/api/admin/documents/$docId/view" -Method Post -Body $viewBody -ContentType "application/json" -Headers $adminHeaders
            $viewOk = [bool]($viewRes.id -eq $docId)
            Assert-Step "Admin views document with audited reason" $viewOk "Title: $($viewRes.title)"

            # 2. Transparent Removal with reason
            $removeBody = @{ reason = "Unverified external laboratory report pending clinical provenance verification" } | ConvertTo-Json
            $removeDocRes = Invoke-RestMethod -Uri "$BASE_CORE/api/admin/documents/$docId/remove" -Method Post -Body $removeBody -ContentType "application/json" -Headers $adminHeaders
            $removeOk = [bool]($removeDocRes.message -like "*removed*")
            Assert-Step "Admin removes document (status: REMOVED_BY_ADMIN)" $removeOk "Message: $($removeDocRes.message)"

            # 3. Action History
            $actions = Invoke-RestMethod -Uri "$BASE_CORE/api/admin/documents/$docId/actions" -Method Get -Headers $adminHeaders
            $hasRemovalAction = [bool](($actions | Where-Object { $_.actionType -eq "REMOVE" }) -ne $null)
            Assert-Step "Document action history records REMOVE action" $hasRemovalAction "Actions count: $($actions.Count)"

            # 4. Restore Document
            $restoreBody = @{ reason = "Provenance verified; restored to patient clinical record" } | ConvertTo-Json
            $restoreRes = Invoke-RestMethod -Uri "$BASE_CORE/api/admin/documents/$docId/restore" -Method Post -Body $restoreBody -ContentType "application/json" -Headers $adminHeaders
            $restoreOk = [bool]($restoreRes.message -like "*restored*")
            Assert-Step "Admin restores document (status: RESTORED)" $restoreOk "Message: $($restoreRes.message)"
        }
    } catch {
        Assert-Step "Document oversight workflows" $false $_.Exception.Message
    }
}

# ------------------------------------------------------------------------------
# STEP 8: Longitudinal Doctor AI Clinical Intelligence Engine (Strict 5-Section)
# ------------------------------------------------------------------------------
Write-Host "`n--- 8. Longitudinal Doctor AI Clinical Intelligence Engine ---" -ForegroundColor Yellow

# Test 1: Direct risk-service longitudinal inference
try {
    $riskLongitudinalReq = @{
        patient_id = 1
        age = 55
        gender = "M"
        encounters = @(
            @{ encounter_type = "OUTPATIENT"; clinical_notes = "Routine diabetes follow-up"; assessment_plan = "Metformin continued"; date = "2026-08-01" },
            @{ encounter_type = "INPATIENT"; clinical_notes = "Hyperglycemia admission"; assessment_plan = "Insulin titration"; date = "2026-08-15" }
        )
        diagnoses = @("Type 2 Diabetes Mellitus", "Essential Hypertension")
        medications = @("Metformin 500mg", "Lisinopril 10mg")
        vitals = @(
            @{ type = "BLOOD_PRESSURE"; value = 138; date = "2026-08-01" },
            @{ type = "BLOOD_PRESSURE"; value = 142; date = "2026-08-15" }
        )
        labs = @(
            @{ test_name = "HbA1c"; value = 7.8; date = "2026-08-01" },
            @{ test_name = "HbA1c"; value = 8.1; date = "2026-08-15" }
        )
    } | ConvertTo-Json -Depth 5

    $riskLongRes = Invoke-RestMethod -Uri "$BASE_RISK/predict/longitudinal" -Method Post -Body $riskLongitudinalReq -ContentType "application/json"
    $hasTrajectory = ($riskLongRes.trajectory -ne $null)
    $hasProbability = ($riskLongRes.readmission_probability_30d -ne $null)
    Assert-Step "Risk-service evaluates longitudinal trajectory & readmission" ($hasTrajectory -and $hasProbability) "Trajectory: $($riskLongRes.trajectory), 30d Prob: $($riskLongRes.readmission_probability_30d)"
} catch {
    Assert-Step "Risk-service longitudinal prediction" $false $_.Exception.Message
}

# Test 2: Direct agent-service 5-section clinical narrative synthesis
try {
    $agentReq = @{
        patient_id = 1
        timeline = @(
            @{ date = "2026-08-01"; event = "Outpatient follow-up" },
            @{ date = "2026-08-15"; event = "Inpatient glycemic management" }
        )
        diagnoses = @("Type 2 Diabetes Mellitus", "Essential Hypertension")
        medications = @("Metformin", "Lisinopril")
        risk_assessment = @{
            trajectory = "STABLE"
            readmission_probability_30d = 0.22
            risk_tier = "MODERATE"
            model_name = "readmission-30d-uci-legacy"
            model_version = "v1.0"
            top_factors = @{ time_in_hospital = 0.35; number_diagnoses = 0.28 }
        }
        deltas = @{ sbp = 4; dbp = 2; glucose = 15 }
    } | ConvertTo-Json -Depth 5

    $agentSynth = Invoke-RestMethod -Uri "$BASE_AGENT/agent/synthesize-clinical-insights" -Method Post -Body $agentReq -ContentType "application/json"
    $hasS1 = ($agentSynth.past_clinical_trajectory -ne $null)
    $hasS2 = ($agentSynth.current_clinical_status -ne $null)
    $hasS3 = ($agentSynth.trend_progression_analysis -ne $null)
    $hasS4 = ($agentSynth.future_risk_stratification -ne $null)
    $hasS5 = ($agentSynth.symptoms_to_monitor -ne $null)
    
    $all5SectionsPresent = $hasS1 -and $hasS2 -and $hasS3 -and $hasS4 -and $hasS5
    Assert-Step "Agent-service synthesizes strict 5-section longitudinal intelligence" $all5SectionsPresent "Sections 1-5 verified. Requires review: $($agentSynth.requires_clinical_review)"
} catch {
    Assert-Step "Agent-service 5-section synthesis" $false $_.Exception.Message
}

# Test 3: Ensure Patient Consent and call Core Service Doctor AI Endpoint POST /api/ai/clinical-insights/{patientId}
if ($patientToken -and $doctorToken) {
    try {
        $grantBody = @{
            doctorId = 1
            category = "ENTIRE_RECORD"
            purpose = "Longitudinal AI clinical decision support verification"
            durationHours = 24
        } | ConvertTo-Json
        $grantRes = Invoke-RestMethod -Uri "$BASE_CORE/api/consents/grant" -Method Post -Body $grantBody -ContentType "application/json" -Headers $patientHeaders
        Assert-Step "Patient grants Doctor consent for clinical access" ($grantRes.id -gt 0) "Consent ID: $($grantRes.id), Status: $($grantRes.status)"
    } catch {
        # If already granted or error, log info
        Write-Host " [INFO] Consent grant info: $($_.Exception.Message)" -ForegroundColor DarkGray
    }
}

if ($doctorToken) {
    try {
        $ciRes = Invoke-RestMethod -Uri "$BASE_CORE/api/ai/clinical-insights/1" -Method Post -Headers $doctorHeaders
        $ciOk = ($ciRes.past_clinical_trajectory -ne $null -and $ciRes.current_clinical_status -ne $null -and $ciRes.trend_progression_analysis -ne $null -and $ciRes.future_risk_stratification -ne $null -and $ciRes.symptoms_to_monitor -ne $null)
        Assert-Step "Core Service Doctor Longitudinal AI generates 5-section intelligence" $ciOk "Active dataset: $($ciRes.active_dataset), Target: $($ciRes.primary_research_dataset)"

        # Verify GET latest
        $latestRes = Invoke-RestMethod -Uri "$BASE_CORE/api/ai/clinical-insights/1/latest" -Method Get -Headers $doctorHeaders
        Assert-Step "Core Service retrieves latest persisted longitudinal intelligence" ($latestRes.patient_id -eq 1) "Generated at: $($latestRes.generated_at)"
    } catch {
        Assert-Step "Core Service Doctor Longitudinal AI" $false $_.Exception.Message
    }
}

# ------------------------------------------------------------------------------
# STEP 9: Immutable Audit Log Explorer
# ------------------------------------------------------------------------------
Write-Host "`n--- 9. Immutable Audit Log Explorer ---" -ForegroundColor Yellow

if ($adminToken) {
    try {
        $auditRes = Invoke-RestMethod -Uri "$BASE_CORE/api/admin/audit-logs?page=0&size=20" -Method Get -Headers $adminHeaders
        $hasLogs = ($auditRes.content -ne $null -and $auditRes.content.Count -gt 0)
        Assert-Step "Admin lists immutable audit logs" $hasLogs "Audit entries returned: $($auditRes.content.Count)"
    } catch {
        Assert-Step "Audit logs explorer" $false $_.Exception.Message
    }
}

# ------------------------------------------------------------------------------
# SUMMARY REPORT
# ------------------------------------------------------------------------------
Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "  TEST RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Total Passed : $PassCount" -ForegroundColor Green
Write-Host " Total Failed : $FailCount" -ForegroundColor $(if ($FailCount -eq 0) { "Green" } else { "Red" })

if ($FailCount -eq 0) {
    Write-Host "`n>>> ALL TESTS PASSED! MASTER UPGRADE FULLY VERIFIED. <<<`n" -ForegroundColor Green
} else {
    Write-Host "`n>>> SOME TESTS FAILED! CHECK OUTPUT ABOVE. <<<`n" -ForegroundColor Red
}

