import logging
from typing import Dict, Any, List, Optional
from providers.ai_factory import AIFactory

logger = logging.getLogger("agent-service.longitudinal-synthesizer")


class LongitudinalClinicalSynthesizer:
    """
    Synthesizes a 5-section longitudinal clinical intelligence report for doctors:
    1. Past Clinical Trajectory
    2. Current Clinical Status
    3. Trend & Progression Analysis
    4. Future Risk Stratification (with explicit Model & Dataset provenance)
    5. Personalized Symptoms & Warning Signs to Monitor (grounded strictly in active diagnoses/trends)
    + Evidence & Provenance citations.
    """

    @classmethod
    def synthesize(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        patient_id = payload.get("patient_id", "")
        age = payload.get("age")
        gender = payload.get("gender")
        diagnoses = payload.get("diagnoses", [])
        medications = payload.get("medications", [])
        vitals = payload.get("vitals_timeline", [])
        labs = payload.get("labs_timeline", [])
        encounters = payload.get("encounters_timeline", [])
        risk = payload.get("risk_assessment", {}) or {}
        signals = payload.get("longitudinal_signals", {}) or {}

        # 1. Attempt synthesis via provider chain (Ollama -> Gemini -> deterministic)
        providers = AIFactory.get_provider_chain()
        for provider in providers:
            try:
                ai_result = cls._prompt_llm(provider, payload)
                if ai_result and isinstance(ai_result, dict):
                    return cls._format_response(ai_result, payload, provider_name=f"{type(provider).__name__.replace('Provider', '').lower()} ({provider.model})")
            except Exception as e:
                logger.warning(f"LLM synthesis failed with {type(provider).__name__}: {e}")

        # 2. Deterministic, clinically grounded synthesis
        return cls._deterministic_synthesis(payload)

    @classmethod
    def _prompt_llm(cls, provider, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        lang = str(payload.get("language", "en")).lower()
        lang_instruction = ""
        if lang == "gu":
            lang_instruction = """
6. LANGUAGE REQUIREMENT: You MUST generate all clinical narratives, descriptions, and recommendations in clear, formal Gujarati (ગુજરાતી).
CRITICAL CLINICAL INTEGRITY RULES:
- PRESERVE all pharmacological and drug names exactly as written in English (e.g. Metformin HCl 500 mg, Atorvastatin 20 mg, Amlodipine 5 mg, Lisinopril, Insulin). Do NOT translate brand or generic drug names.
- PRESERVE all physiological measurements, laboratory test names, numerical values, and units in English/Latin script (e.g. mg/dL, mmHg, bpm, %, mmol/L, g/dL, HbA1c, Serum Creatinine).
- Write section narrative, clinical explanations, and warning symptoms in dignified, professional Gujarati.
"""

        prompt = f"""You are ConsentCare's Senior Clinical AI Assistant.
Synthesize a 5-section Longitudinal Clinical Intelligence brief for attending physicians.

STRICT MEDICAL & SAFETY RULES:
1. Ground every statement strictly in the provided patient data.
2. DO NOT invent, assume, or fabricate any future diseases, unconfirmed diagnoses, or lab results.
3. The Future Risk section must state the model provenance: 'readmission-30d-uci-legacy v1.0' trained on the UCI Diabetes 130-US Hospitals cohort.
4. 'Symptoms to monitor' must be grounded strictly in the patient's existing diagnoses and observed worsening trends.
5. Provide quantitative deltas for vitals and labs wherever data permits. Keep each narrative section concise and focused (1-2 sentences).{lang_instruction}

PATIENT DATA:
Demographics: Age {payload.get('age')}, Gender {payload.get('gender')}
Confirmed Diagnoses: {payload.get('diagnoses')}
Active Medications: {payload.get('medications')}
Latest Vitals: {payload.get('vitals_timeline', [])[-3:]}
Latest Labs: {payload.get('labs_timeline', [])[-5:]}
Encounters Count: {len(payload.get('encounters_timeline', []))}
Risk Assessment: {payload.get('risk_assessment')}
Longitudinal Signals: {payload.get('longitudinal_signals')}

Return JSON with exact keys:
{{
  "past_clinical_trajectory": "<chronological milestones, past encounters and confirmed chronic conditions>",
  "current_clinical_status": "<latest vitals, active medications, confirmed lab values, active problems>",
  "trend_progression_analysis": "<objective deltas in BP/glucose/creatinine, directionality: IMPROVING | STABLE | WORSENING>",
  "future_risk_stratification": "<calibrated risk % and tier, model provenance citation, top contributing factors>",
  "symptoms_to_monitor": ["<specific warning signs grounded in confirmed diagnoses and worsening trends>"],
  "evidence_provenance": ["<citations of dates, encounters, labs, and model>"]
}}
"""
        return provider.generate_structured(prompt)

    @classmethod
    def _deterministic_synthesis(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        lang = str(payload.get("language", "en")).lower()
        is_gu = (lang == "gu")

        age = payload.get("age")
        gender = payload.get("gender")
        diagnoses = payload.get("diagnoses", [])
        medications = payload.get("medications", [])
        vitals = payload.get("vitals_timeline", [])
        labs = payload.get("labs_timeline", [])
        encounters = payload.get("encounters_timeline", [])
        risk = payload.get("risk_assessment", {}) or {}
        signals = payload.get("longitudinal_signals", {}) or {}

        # 1. Past Clinical Trajectory
        past_parts = []
        if encounters:
            if is_gu:
                past_parts.append(f"લૉન્જિટ્યુડિનલ તબીબી ઇતિહાસમાં {len(encounters)} નોંધાયેલ ક્લિનિકલ મુલાકાતોનો સમાવેશ થાય છે.")
            else:
                past_parts.append(f"Longitudinal history encompasses {len(encounters)} documented clinical encounter(s).")
        else:
            if is_gu:
                past_parts.append("ઈલેક્ટ્રોનિક હેલ્થ રેકોર્ડ્સમાં પ્રારંભિક બેઝલાઇન મુલાકાત નોંધાયેલ છે.")
            else:
                past_parts.append("Initial baseline encounter documented in electronic health records.")

        if diagnoses:
            if is_gu:
                past_parts.append(f"પુષ્ટિ થયેલ ક્રોનિક સ્થિતિઓ: {', '.join(diagnoses)}.")
            else:
                past_parts.append(f"Confirmed chronic diagnoses include: {', '.join(diagnoses)}.")
        else:
            if is_gu:
                past_parts.append("ઐતિહાસિક સમસ્યા યાદીમાં કોઈ અગાઉની ક્રોનિક સ્થિતિ નોંધાયેલ નથી.")
            else:
                past_parts.append("No prior chronic conditions recorded in historical problem list.")

        past_trajectory = " ".join(past_parts)

        # 2. Current Clinical Status
        curr_parts = []
        latest_vital = vitals[-1] if vitals else {}
        if latest_vital:
            bp_sys = latest_vital.get("systolic")
            bp_dia = latest_vital.get("diastolic")
            hr = latest_vital.get("heart_rate")
            vital_str = f"BP: {bp_sys}/{bp_dia} mmHg" if bp_sys and bp_dia else ""
            if hr:
                vital_str += f", HR: {hr} bpm" if vital_str else f"HR: {hr} bpm"
            if vital_str:
                if is_gu:
                    curr_parts.append(f"નવીનતમ શારીરિક મોનિટરિંગ: {vital_str} દર્શાવે છે.")
                else:
                    curr_parts.append(f"Latest physiological monitoring indicates {vital_str}.")

        if medications:
            if is_gu:
                curr_parts.append(f"ચાલુ ફાર્માકોલોજિકલ દવાઓ: {', '.join(medications)}.")
            else:
                curr_parts.append(f"Active pharmacological regimen includes: {', '.join(medications)}.")
        else:
            if is_gu:
                curr_parts.append("ઓપરેશનલ રિકન્સિલેશનમાં કોઈ સક્રિય દવાઓ નોંધાયેલ નથી.")
            else:
                curr_parts.append("No active medications listed in outpatient reconciliation.")

        if labs:
            latest_labs = labs[-3:]
            lab_strs = [f"{l.get('test_name', 'Lab')}: {l.get('value')} {l.get('unit', '')}".strip() for l in latest_labs]
            if is_gu:
                curr_parts.append(f"તાજેતરના લેબોરેટરી પરીક્ષણો: {'; '.join(lab_strs)}.")
            else:
                curr_parts.append(f"Recent laboratory assays: {'; '.join(lab_strs)}.")

        if is_gu:
            current_status = " ".join(curr_parts) if curr_parts else "દર્દીનું બેઝલાઇન મૂલ્યાંકન હાલમાં સક્રિય છે."
        else:
            current_status = " ".join(curr_parts) if curr_parts else "Patient baseline assessment is currently active."

        # 3. Trend & Progression Analysis
        trajectory = signals.get("trajectory", "STABLE")
        sbp_delta = signals.get("sbp_delta", 0.0)
        dbp_delta = signals.get("dbp_delta", 0.0)
        glucose_delta = signals.get("glucose_delta", 0.0)
        creat_delta = signals.get("creatinine_delta", 0.0)

        if is_gu:
            traj_map = {"STABLE": "સ્થિર (STABLE)", "IMPROVING": "સુધારો (IMPROVING)", "WORSENING": "વધતો જોખમ (WORSENING)"}
            traj_text = traj_map.get(trajectory, trajectory)
            trend_parts = [f"નોંધાયેલા મોનિટરિંગ સમયગાળા દરમિયાન એકંદર સ્વાસ્થ્ય વલણ {traj_text} તરીકે મૂલ્યાંકન કરવામાં આવ્યું છે."]
            if sbp_delta != 0.0:
                trend_parts.append(f"સિસ્ટોલિક બ્લડ પ્રેશર ફેરફાર: {sbp_delta:+.1f} mmHg.")
            if glucose_delta != 0.0:
                trend_parts.append(f"બ્લડ ગ્લુકોઝ ફેરફાર: {glucose_delta:+.1f} mg/dL.")
            if creat_delta != 0.0:
                trend_parts.append(f"સીરમ ક્રિએટિનાઇન ફેરફાર: {creat_delta:+.2f} mg/dL.")
            if len(trend_parts) == 1:
                trend_parts.append("મુખ્ય હેમોડાયનેમિક અને બાયોકેમિકલ પરિમાણો સ્થિર લૉન્જિટ્યુડિનલ મર્યાદામાં રહે છે.")
        else:
            trend_parts = [f"Overall trajectory assessed as {trajectory} across recorded monitoring intervals."]
            if sbp_delta != 0.0:
                trend_parts.append(f"Systolic blood pressure delta: {sbp_delta:+.1f} mmHg.")
            if glucose_delta != 0.0:
                trend_parts.append(f"Blood glucose delta: {glucose_delta:+.1f} mg/dL.")
            if creat_delta != 0.0:
                trend_parts.append(f"Serum creatinine delta: {creat_delta:+.2f} mg/dL.")
            if len(trend_parts) == 1:
                trend_parts.append("Key hemodynamic and biochemical parameters remain within stable longitudinal variance.")

        trend_analysis = " ".join(trend_parts)

        # 4. Future Risk Stratification
        risk_label = risk.get("risk_label", "INSUFFICIENT_DATA")
        risk_prob = risk.get("risk_probability")
        model_name = risk.get("model_name", "readmission-30d-uci-legacy")
        model_version = risk.get("model_version", "v1.0")
        dataset_name = risk.get("dataset_name", "UCI Diabetes 130-US Hospitals (1999–2008)")
        top_factors = risk.get("top_contributing_factors", {})

        if is_gu:
            risk_label_gu = {"LOW": "ઓછું (LOW)", "MODERATE": "મધ્યમ (MODERATE)", "HIGH": "ઉચ્ચ (HIGH)"}.get(risk_label, risk_label)
            if risk_prob is not None:
                pct = round(risk_prob * 100, 1)
                risk_parts = [
                    f"હોસ્પિટલમાં ૩૦ દિવસમાં પુનઃદાખલ થવાનું જોખમ {risk_label_gu} ({pct}% સંભાવના) તરીકે વર્ગીકૃત થયેલ છે.",
                    f"મૂલ્યાંકન {dataset_name} કોહોર્ટ પર પ્રશિક્ષિત {model_name} ({model_version}) મોડેલ દ્વારા સંચાલિત છે."
                ]
                if top_factors:
                    factors_str = ", ".join([f"{k} (weight: {v})" for k, v in top_factors.items()])
                    risk_parts.append(f"ટોચના જોખમી પરિબળો: {factors_str}.")
            else:
                risk_parts = [
                    f"જોખમ સ્તરીકરણ સ્થિતિ: {risk_label_gu}.",
                    f"મોડેલ મૂલ્યાંકન પાઇપલાઇન: {model_name} ({model_version})."
                ]
        else:
            if risk_prob is not None:
                pct = round(risk_prob * 100, 1)
                risk_parts = [
                    f"30-day hospital readmission risk is stratified as {risk_label} ({pct}% probability).",
                    f"Evaluation driven by {model_name} ({model_version}) trained on the {dataset_name} cohort."
                ]
                if top_factors:
                    factors_str = ", ".join([f"{k} (weight: {v})" for k, v in top_factors.items()])
                    risk_parts.append(f"Top contributing risk factors: {factors_str}.")
            else:
                risk_parts = [
                    f"Risk stratification status: {risk_label}.",
                    f"Model evaluation pipeline: {model_name} ({model_version})."
                ]

        future_risk = " ".join(risk_parts)

        # 5. Personalized Symptoms & Warning Signs To Monitor
        symptoms_to_monitor = []
        diag_lower = [str(d).lower() for d in diagnoses]
        med_lower = [str(m).lower() for m in medications]

        has_diabetes = any("diabetes" in d for d in diag_lower) or any("metformin" in m or "insulin" in m or "glipizide" in m for m in med_lower)
        has_hypertension = any("hypertens" in d for d in diag_lower) or sbp_delta > 10
        has_renal = any("kidney" in d or "renal" in d for d in diag_lower) or creat_delta > 0.2
        has_cardiac = any("heart" in d or "cardiac" in d or "failure" in d for d in diag_lower)

        if is_gu:
            if has_diabetes:
                symptoms_to_monitor.append("હાઈપોગ્લાયકેમિયા (ઓછી શર્કરા) ના સંકેતો: વધુ પડતો પરસેવો, ધ્રુજારી, અચાનક ચક્કર આવવા, મૂંઝવણ અથવા ઝડપી ધબકારા.")
                symptoms_to_monitor.append("હાઈપરગ્લાયકેમિયા (વધુ શર્કરા) ના ચિહ્નો: વધુ પડતી તરસ, વારંવાર પેશાબ થવો, ઝાંખી દ્રષ્ટિ અથવા અસામાન્ય થાક.")
            if has_hypertension:
                symptoms_to_monitor.append("હાયપરટેન્શન (હાઈ બીપી) ના ચેતવણી સંકેતો: માથાનો પાછળનો દુખાવો, દ્રષ્ટિમાં અસ્પષ્ટતા, નાકમાંથી રક્તસ્ત્રાવ અથવા છાતીમાં જકડાઈ જવું.")
            if has_renal:
                symptoms_to_monitor.append("કિડની સંબંધિત ચેતવણીઓ: પેશાબના પ્રમાણમાં નોંધપાત્ર ઘટાડો, પગની ઘૂંટી/પગમાં સોજો (પેરિફેરલ એડીમા) અથવા ચહેરા પર સોજો.")
            if has_cardiac:
                symptoms_to_monitor.append("કાર્ડિયોવેસ્ક્યુલર ચેતવણીઓ: શ્વાસ લેવામાં તકલીફ (ડિસ્પ્નિયા), સૂતી વખતે શ્વાસ લેવામાં તકલીફ અથવા 48 કલાકમાં 2 કિલોથી વધુ વજન વધવું.")
            symptoms_to_monitor.append("સામાન્ય જોખમી ચિહ્નો: સતત તાવ (>38.3°C), માનસિક સ્થિતિમાં ફેરફાર અથવા અચાનક શારીરિક અસમર્થતા.")
        else:
            if has_diabetes:
                symptoms_to_monitor.append("Hypoglycemia indicators: diaphoresis, tremors, acute dizziness, confusion, or tachycardia.")
                symptoms_to_monitor.append("Hyperglycemia signs: marked polydipsia, polyuria, blurred vision, or uncharacteristic fatigue.")
            if has_hypertension:
                symptoms_to_monitor.append("Hypertensive warning signs: occipital headache, visual blurring, epistaxis, or chest tightness.")
            if has_renal:
                symptoms_to_monitor.append("Renal alerts: noticeable decrease in urinary output, peripheral edema (ankles/feet), or facial puffiness.")
            if has_cardiac:
                symptoms_to_monitor.append("Cardiovascular decompensation: progressive exertional dyspnea, orthopnea, or sudden weight gain >2kg in 48 hours.")
            symptoms_to_monitor.append("General red flags: sustained pyrexia (>38.3°C), altered mental status, or sudden functional decline.")

        # 6. Evidence & Provenance
        evidence = [
            f"Active Model: {model_name} ({model_version})",
            f"Training Cohort: {dataset_name}",
            f"Clinical Encounters Analyzed: {len(encounters)}",
            f"Vitals Observations Analyzed: {len(vitals)}",
            f"Laboratory Reports Analyzed: {len(labs)}"
        ]

        disclaimer = (
            "માત્ર સલાહકારી ક્લિનિકલ નિર્ણય-સહાય. આ સારાંશ ચિકિત્સકની સમીક્ષા માટે તૈયાર કરવામાં આવ્યો છે અને તે સ્વાયત્ત તબીબી નિદાન અથવા સારવાર યોજના રચતો નથી."
            if is_gu else
            "Advisory clinical decision-support only. This synthesis is generated for physician review and does not constitute an autonomous medical diagnosis or treatment plan."
        )

        return {
            "past_clinical_trajectory": past_trajectory,
            "current_clinical_status": current_status,
            "trend_progression_analysis": trend_analysis,
            "future_risk_stratification": future_risk,
            "symptoms_to_monitor": symptoms_to_monitor,
            "evidence_provenance": evidence,
            "synthesis_type": "SAFE NON-LLM FALLBACK",
            "model_provider": "SAFE NON-LLM FALLBACK (deterministic-clinical-synthesizer)",
            "clinical_disclaimer": disclaimer
        }

    @classmethod
    def _format_response(cls, ai_result: Dict[str, Any], payload: Dict[str, Any], provider_name: str) -> Dict[str, Any]:
        lang = str(payload.get("language", "en")).lower()
        disclaimer = (
            "માત્ર સલાહકારી ક્લિનિકલ નિર્ણય-સહાય. આ સારાંશ ચિકિત્સકની સમીક્ષા માટે તૈયાર કરવામાં આવ્યો છે અને તે સ્વાયત્ત તબીબી નિદાન અથવા સારવાર યોજના રચતો નથી."
            if lang == "gu" else
            "Advisory clinical decision-support only. This synthesis is generated for physician review and does not constitute an autonomous medical diagnosis or treatment plan."
        )
        return {
            "past_clinical_trajectory": str(ai_result.get("past_clinical_trajectory", "")).strip(),
            "current_clinical_status": str(ai_result.get("current_clinical_status", "")).strip(),
            "trend_progression_analysis": str(ai_result.get("trend_progression_analysis", "")).strip(),
            "future_risk_stratification": str(ai_result.get("future_risk_stratification", "")).strip(),
            "symptoms_to_monitor": ai_result.get("symptoms_to_monitor", []),
            "evidence_provenance": ai_result.get("evidence_provenance", []),
            "model_provider": provider_name,
            "clinical_disclaimer": disclaimer
        }

