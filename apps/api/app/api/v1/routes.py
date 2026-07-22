from __future__ import annotations

import base64
import json
import re
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.core.security import get_current_user_or_demo, rate_limit, require_admin, write_audit
from app.db.session import get_db
from app.models import (
    AuditLog,
    Conversation,
    ImageScan,
    LabValue,
    MedicationCheck,
    Message,
    MoodEntry,
    ReportAnalysis,
    SleepLog,
    TimelineEvent,
    UserProfile,
    Vaccination,
    WaterLog,
)
from app.schemas import (
    BMIRequest,
    ChatRequest,
    LabValueCreate,
    MedicationCheckRequest,
    MoodCreate,
    NearbyRequest,
    PediatricDoseRequest,
    PregnancyWeekRequest,
    ProfileOut,
    ProfileUpdate,
    RiskRequest,
    SearchRequest,
    SleepCreate,
    SymptomAnswerRequest,
    SymptomStartRequest,
    VaccinationCreate,
    WaterCreate,
)
from app.services.ai import DISCLAIMER, get_ai
from app.services.emergency_data import BODY_REGIONS, EMERGENCIES, POPULAR_CONDITIONS

router = APIRouter()


def _parse_json(text: str) -> dict[str, Any]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        return {"raw": text, "disclaimer": DISCLAIMER}


async def _add_timeline(
    db: AsyncSession,
    user_id: str,
    event_type: str,
    title: str,
    summary: str | None = None,
    payload: dict | None = None,
    severity: str | None = None,
) -> None:
    db.add(
        TimelineEvent(
            user_id=user_id,
            event_type=event_type,
            title=title,
            summary=summary,
            payload=payload,
            severity=severity,
        )
    )
    await db.commit()


@router.get("/health")
async def health():
    return {"status": "ok", "service": "ai-doctor-api", "disclaimer": DISCLAIMER}


@router.get("/meta/popular-conditions")
async def popular_conditions(_: None = Depends(rate_limit)):
    return {"items": POPULAR_CONDITIONS}


@router.get("/meta/body-regions")
async def body_regions(_: None = Depends(rate_limit)):
    return {"regions": BODY_REGIONS}


@router.get("/emergency")
async def list_emergencies(_: None = Depends(rate_limit)):
    return {
        "items": [
            {"id": e["id"], "title": e["title"], "summary": e["summary"], "call_emergency": e["call_emergency"]}
            for e in EMERGENCIES.values()
        ]
    }


@router.get("/emergency/{emergency_id}")
async def get_emergency(emergency_id: str, _: None = Depends(rate_limit)):
    item = EMERGENCIES.get(emergency_id)
    if not item:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Emergency guide not found")
    return {**item, "disclaimer": DISCLAIMER}


@router.get("/profile", response_model=ProfileOut)
async def get_profile(user: UserProfile = Depends(get_current_user_or_demo)):
    return user


@router.patch("/profile", response_model=ProfileOut)
async def update_profile(
    body: ProfileUpdate,
    user: UserProfile = Depends(get_current_user_or_demo),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit),
):
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(user, k, v)
    # Simple health score heuristic
    score = 70.0
    if user.age and user.age > 60:
        score -= 5
    if user.conditions:
        score -= min(20, 4 * len(user.conditions))
    if user.allergies:
        score -= min(5, len(user.allergies))
    if user.weight_kg and user.height_cm:
        bmi = user.weight_kg / ((user.height_cm / 100) ** 2)
        if 18.5 <= bmi <= 24.9:
            score += 5
        elif bmi >= 30 or bmi < 17:
            score -= 10
    user.health_score = max(0, min(100, score))
    await db.commit()
    await db.refresh(user)
    await write_audit(db, user_id=user.id, action="profile.update", resource="profile")
    return user


@router.post("/search")
async def search_symptoms(
    body: SearchRequest,
    user: UserProfile = Depends(get_current_user_or_demo),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit),
):
    ai = get_ai()
    prompt = (
        f"Analyze this symptom/disease query and return JSON with keys: "
        f"possible_diseases (name,confidence,severity), overall_severity, red_flags, recommended_actions, "
        f"medicine_suggestions, home_remedies, when_to_go_to_er, specialist, recovery_timeline, references, disclaimer. "
        f"Locale={body.locale}. ELI5={body.eli5}. Query: {body.query}"
    )
    if body.eli5:
        prompt += " Explain findings in very simple language."
    raw = await ai.chat([{"role": "user", "content": prompt}], json_mode=True)
    result = _parse_json(raw)
    result["query"] = body.query
    await _add_timeline(
        db,
        user.id,
        "search",
        f"Search: {body.query[:80]}",
        summary=str(result.get("overall_severity", "")),
        payload=result,
        severity=str(result.get("overall_severity")),
    )
    await write_audit(db, user_id=user.id, action="search", resource="symptoms", details={"query": body.query[:200]})
    return result


@router.post("/chat")
async def chat(
    body: ChatRequest,
    user: UserProfile = Depends(get_current_user_or_demo),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit),
):
    conv: Optional[Conversation] = None
    if body.conversation_id:
        conv = await db.get(Conversation, body.conversation_id)
    if not conv:
        conv = Conversation(user_id=user.id, title=body.message[:60], kind="chat")
        db.add(conv)
        await db.commit()
        await db.refresh(conv)

    db.add(Message(conversation_id=conv.id, role="user", content=body.message))
    await db.commit()

    memory = (
        f"Patient memory: age={user.age}, gender={user.gender}, conditions={user.conditions}, "
        f"allergies={user.allergies}, medicines={user.medicines}, locale={body.locale}, eli5={body.eli5}"
    )
    msg = body.message
    if body.eli5:
        msg = f"Explain like I'm five. {msg}"

    ai = get_ai()
    reply = await ai.chat(
        [
            {"role": "system", "content": memory},
            {"role": "user", "content": msg},
        ]
    )
    db.add(Message(conversation_id=conv.id, role="assistant", content=reply))
    await db.commit()
    return {"conversation_id": conv.id, "reply": reply, "disclaimer": DISCLAIMER}


@router.post("/chat/stream")
async def chat_stream(
    body: ChatRequest,
    user: UserProfile = Depends(get_current_user_or_demo),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit),
):
    conv: Optional[Conversation] = None
    if body.conversation_id:
        conv = await db.get(Conversation, body.conversation_id)
    if not conv:
        conv = Conversation(user_id=user.id, title=body.message[:60], kind="chat")
        db.add(conv)
        await db.commit()
        await db.refresh(conv)

    db.add(Message(conversation_id=conv.id, role="user", content=body.message))
    await db.commit()

    memory = (
        f"Patient memory: age={user.age}, gender={user.gender}, conditions={user.conditions}, "
        f"allergies={user.allergies}, medicines={user.medicines}"
    )
    msg = body.message if not body.eli5 else f"Explain simply. {body.message}"
    ai = get_ai()

    async def event_gen():
        yield {"event": "meta", "data": json.dumps({"conversation_id": conv.id})}
        parts: list[str] = []
        async for chunk in ai.stream_chat(
            [{"role": "system", "content": memory}, {"role": "user", "content": msg}]
        ):
            parts.append(chunk)
            yield {"event": "token", "data": json.dumps({"token": chunk})}
        full = "".join(parts)
        db.add(Message(conversation_id=conv.id, role="assistant", content=full))
        await db.commit()
        yield {"event": "done", "data": json.dumps({"disclaimer": DISCLAIMER})}

    return EventSourceResponse(event_gen())


@router.get("/conversations")
async def list_conversations(
    user: UserProfile = Depends(get_current_user_or_demo),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).where(Conversation.user_id == user.id).order_by(desc(Conversation.updated_at))
    )
    items = result.scalars().all()
    return {
        "items": [
            {"id": c.id, "title": c.title, "kind": c.kind, "updated_at": c.updated_at.isoformat()} for c in items
        ]
    }


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    user: UserProfile = Depends(get_current_user_or_demo),
    db: AsyncSession = Depends(get_db),
):
    conv = await db.get(Conversation, conversation_id)
    if not conv or conv.user_id != user.id:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Not found")
    result = await db.execute(
        select(Message).where(Message.conversation_id == conv.id).order_by(Message.created_at)
    )
    messages = result.scalars().all()
    return {
        "id": conv.id,
        "title": conv.title,
        "messages": [
            {"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
            for m in messages
        ],
    }


@router.post("/symptoms/start")
async def symptom_start(
    body: SymptomStartRequest,
    user: UserProfile = Depends(get_current_user_or_demo),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit),
):
    conv = Conversation(user_id=user.id, title=f"Symptoms: {body.chief_complaint[:40]}", kind="symptom")
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    questions = [
        "How long have you had these symptoms?",
        "On a scale of 0–10, how bad is the pain/discomfort?",
        "Do you have fever? If yes, approximate temperature.",
        "Any relevant medical history?",
        "Are you pregnant or could you be?",
        "What is your age and weight?",
        "What medications are you currently taking?",
    ]
    first = questions[0]
    db.add(Message(conversation_id=conv.id, role="user", content=body.chief_complaint, meta={"body_region": body.body_region}))
    db.add(Message(conversation_id=conv.id, role="assistant", content=first, meta={"step": 0, "questions": questions}))
    await db.commit()
    return {"conversation_id": conv.id, "question": first, "step": 0, "total": len(questions)}


@router.post("/symptoms/answer")
async def symptom_answer(
    body: SymptomAnswerRequest,
    user: UserProfile = Depends(get_current_user_or_demo),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit),
):
    conv = await db.get(Conversation, body.conversation_id)
    if not conv or conv.user_id != user.id:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Not found")
    db.add(Message(conversation_id=conv.id, role="user", content=body.answer))
    result = await db.execute(
        select(Message).where(Message.conversation_id == conv.id).order_by(Message.created_at)
    )
    messages = result.scalars().all()
    assistant_msgs = [m for m in messages if m.role == "assistant"]
    last_meta = assistant_msgs[-1].meta if assistant_msgs else {}
    questions = (last_meta or {}).get("questions") or []
    step = int((last_meta or {}).get("step", 0)) + 1

    if step < len(questions):
        q = questions[step]
        db.add(Message(conversation_id=conv.id, role="assistant", content=q, meta={"step": step, "questions": questions}))
        await db.commit()
        return {"done": False, "question": q, "step": step, "total": len(questions)}

    transcript = "\n".join([f"{m.role}: {m.content}" for m in messages] + [f"user: {body.answer}"])
    ai = get_ai()
    raw = await ai.chat(
        [
            {
                "role": "user",
                "content": (
                    "Based on this symptom checker transcript, return JSON prediction with possible_diseases, "
                    f"overall_severity, red_flags, recommended_actions, specialist, when_to_go_to_er, disclaimer.\n{transcript}"
                ),
            }
        ],
        json_mode=True,
    )
    prediction = _parse_json(raw)
    summary = json.dumps(prediction)[:1500]
    db.add(Message(conversation_id=conv.id, role="assistant", content=summary, meta={"prediction": prediction}))
    await db.commit()
    await _add_timeline(db, user.id, "symptom_check", "Symptom checker completed", payload=prediction)
    return {"done": True, "prediction": prediction}


@router.post("/images/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    body_region: str = "skin",
    user: UserProfile = Depends(get_current_user_or_demo),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit),
):
    content = await file.read()
    b64 = base64.b64encode(content).decode("utf-8")
    mime = file.content_type or "image/jpeg"
    prompt = (
        "Analyze this medical photo. Return JSON with possible_conditions, severity_score (0-1), confidence (0-1), "
        "urgency, visual_explanation, bounding_boxes [{label,x,y,w,h} normalized 0-1], recommendations, disclaimer. "
        f"Body region hint: {body_region}."
    )
    ai = get_ai()
    raw = await ai.vision_analyze(prompt, b64, mime)
    result = _parse_json(raw)
    path = f"local/{user.id}/{file.filename or 'scan.jpg'}"
    scan = ImageScan(
        user_id=user.id,
        storage_path=path,
        body_region=body_region,
        result=result,
        severity_score=float(result.get("severity_score") or 0),
        confidence=float(result.get("confidence") or 0),
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)
    await _add_timeline(
        db,
        user.id,
        "image_scan",
        "AI image scan",
        summary=result.get("visual_explanation"),
        payload=result,
        severity=str(result.get("urgency")),
    )
    return {"id": scan.id, "storage_path": path, **result}


@router.post("/reports/analyze")
async def analyze_report(
    file: UploadFile = File(...),
    report_type: str = "lab",
    user: UserProfile = Depends(get_current_user_or_demo),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit),
):
    content = await file.read()
    extracted = ""
    filename = (file.filename or "").lower()
    if filename.endswith(".pdf") or (file.content_type or "").endswith("pdf"):
        try:
            from io import BytesIO

            from PyPDF2 import PdfReader

            reader = PdfReader(BytesIO(content))
            extracted = "\n".join([(p.extract_text() or "") for p in reader.pages])[:12000]
        except Exception:
            extracted = "Unable to extract PDF text; treating as unscanned document."
    else:
        # Lightweight OCR stand-in: decode text if utf-8, else mock OCR note
        try:
            extracted = content.decode("utf-8")[:12000]
        except Exception:
            extracted = (
                "OCR placeholder (EasyOCR/DocTR in production): sample CBC values detected — "
                "Hemoglobin 11.2 g/dL, WBC 7.2 x10^9/L, Platelets 245 x10^9/L."
            )

    ai = get_ai()
    raw = await ai.chat(
        [
            {
                "role": "user",
                "content": (
                    "Explain this medical report. Return JSON with abnormal_values, normal_highlights, "
                    "lifestyle_suggestions, questions_for_doctor, disclaimer.\n"
                    f"Type={report_type}\nTEXT:\n{extracted}"
                ),
            }
        ],
        json_mode=True,
    )
    analysis = _parse_json(raw)
    path = f"local/{user.id}/{file.filename or 'report'}"
    row = ReportAnalysis(
        user_id=user.id,
        storage_path=path,
        report_type=report_type,
        extracted_text=extracted,
        analysis=analysis,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    await _add_timeline(db, user.id, "report", "Report analyzed", payload=analysis)
    return {"id": row.id, "extracted_text": extracted[:2000], "analysis": analysis}


@router.post("/medications/check")
async def check_medications(
    body: MedicationCheckRequest,
    user: UserProfile = Depends(get_current_user_or_demo),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit),
):
    ai = get_ai()
    raw = await ai.chat(
        [
            {
                "role": "user",
                "content": (
                    "Check drug interactions and safety. Return JSON with interactions, food_interactions, "
                    "alcohol_interactions, pregnancy_safety, kidney_safety, liver_safety, dosage_guidance, warnings, disclaimer. "
                    f"Medicines={body.medicines}, pregnant={body.pregnant}, kidney={body.kidney_disease}, liver={body.liver_disease}"
                ),
            }
        ],
        json_mode=True,
    )
    result = _parse_json(raw)
    row = MedicationCheck(user_id=user.id, medicines=body.medicines, result=result)
    db.add(row)
    await db.commit()
    return result


@router.get("/timeline")
async def timeline(
    user: UserProfile = Depends(get_current_user_or_demo),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TimelineEvent).where(TimelineEvent.user_id == user.id).order_by(desc(TimelineEvent.created_at)).limit(100)
    )
    items = result.scalars().all()
    return {
        "items": [
            {
                "id": i.id,
                "event_type": i.event_type,
                "title": i.title,
                "summary": i.summary,
                "severity": i.severity,
                "payload": i.payload,
                "created_at": i.created_at.isoformat(),
            }
            for i in items
        ]
    }


@router.post("/labs")
async def create_lab(
    body: LabValueCreate,
    user: UserProfile = Depends(get_current_user_or_demo),
    db: AsyncSession = Depends(get_db),
):
    row = LabValue(user_id=user.id, **body.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    status = "normal"
    if body.reference_low is not None and body.value < body.reference_low:
        status = "low"
    if body.reference_high is not None and body.value > body.reference_high:
        status = "high"
    return {
        "id": row.id,
        "status": status,
        "plain_english": f"Your {body.name} is {body.value} {body.unit} ({status}).",
        "disclaimer": DISCLAIMER,
    }


@router.get("/labs")
async def list_labs(
    name: Optional[str] = None,
    user: UserProfile = Depends(get_current_user_or_demo),
    db: AsyncSession = Depends(get_db),
):
    q = select(LabValue).where(LabValue.user_id == user.id)
    if name:
        q = q.where(LabValue.name == name)
    q = q.order_by(LabValue.measured_at)
    result = await db.execute(q)
    items = result.scalars().all()
    return {
        "items": [
            {
                "id": i.id,
                "name": i.name,
                "value": i.value,
                "unit": i.unit,
                "reference_low": i.reference_low,
                "reference_high": i.reference_high,
                "measured_at": i.measured_at.isoformat(),
            }
            for i in items
        ]
    }


@router.post("/vaccinations")
async def create_vax(
    body: VaccinationCreate,
    user: UserProfile = Depends(get_current_user_or_demo),
    db: AsyncSession = Depends(get_db),
):
    row = Vaccination(user_id=user.id, **body.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "name": row.name, "category": row.category}


@router.get("/vaccinations")
async def list_vax(
    user: UserProfile = Depends(get_current_user_or_demo),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vaccination).where(Vaccination.user_id == user.id))
    items = result.scalars().all()
    return {
        "items": [
            {
                "id": i.id,
                "name": i.name,
                "category": i.category,
                "administered_on": i.administered_on.isoformat() if i.administered_on else None,
                "due_on": i.due_on.isoformat() if i.due_on else None,
                "notes": i.notes,
            }
            for i in items
        ]
    }


@router.post("/mental/mood")
async def mood(
    body: MoodCreate,
    user: UserProfile = Depends(get_current_user_or_demo),
    db: AsyncSession = Depends(get_db),
):
    row = MoodEntry(user_id=user.id, **body.model_dump())
    db.add(row)
    await db.commit()
    crisis = False
    guidance = "Thanks for checking in. Consider a short breathing exercise."
    if (body.phq9_score is not None and body.phq9_score >= 20) or body.mood <= 2:
        crisis = True
        guidance = (
            "Your responses suggest significant distress. Please contact local emergency services or a crisis line. "
            "In the US: 988 Suicide & Crisis Lifeline."
        )
    return {"id": row.id, "crisis": crisis, "guidance": guidance, "resources": ["https://www.iasp.info/suicidalthoughts/"]}


@router.get("/mental/assessments")
async def assessments(_: None = Depends(rate_limit)):
    return {
        "phq9": [
            "Little interest or pleasure in doing things",
            "Feeling down, depressed, or hopeless",
            "Trouble falling/staying asleep or sleeping too much",
            "Feeling tired or having little energy",
            "Poor appetite or overeating",
            "Feeling bad about yourself",
            "Trouble concentrating",
            "Moving/speaking slowly or being fidgety",
            "Thoughts that you would be better off dead or of hurting yourself",
        ],
        "gad7": [
            "Feeling nervous, anxious, or on edge",
            "Not being able to stop or control worrying",
            "Worrying too much about different things",
            "Trouble relaxing",
            "Being so restless that it is hard to sit still",
            "Becoming easily annoyed or irritable",
            "Feeling afraid as if something awful might happen",
        ],
        "scoring": "0=Not at all, 1=Several days, 2=More than half the days, 3=Nearly every day",
        "disclaimer": DISCLAIMER,
    }


@router.post("/nutrition/bmi")
async def bmi(body: BMIRequest, _: None = Depends(rate_limit)):
    val = body.weight_kg / ((body.height_cm / 100) ** 2)
    if val < 18.5:
        cat = "underweight"
    elif val < 25:
        cat = "normal"
    elif val < 30:
        cat = "overweight"
    else:
        cat = "obesity"
    return {"bmi": round(val, 1), "category": cat, "disclaimer": DISCLAIMER}


@router.post("/nutrition/water")
async def water(
    body: WaterCreate,
    user: UserProfile = Depends(get_current_user_or_demo),
    db: AsyncSession = Depends(get_db),
):
    row = WaterLog(user_id=user.id, ml=body.ml)
    db.add(row)
    await db.commit()
    return {"ok": True, "ml": body.ml}


@router.post("/fitness/sleep")
async def sleep(
    body: SleepCreate,
    user: UserProfile = Depends(get_current_user_or_demo),
    db: AsyncSession = Depends(get_db),
):
    row = SleepLog(user_id=user.id, hours=body.hours, quality=body.quality)
    db.add(row)
    await db.commit()
    tip = "Aim for 7–9 hours for most adults."
    return {"ok": True, "tip": tip}


@router.post("/pregnancy/week")
async def pregnancy_week(body: PregnancyWeekRequest, _: None = Depends(rate_limit)):
    week = body.week
    return {
        "week": week,
        "baby_size": "approx fruit-size metaphor varies by week",
        "focus": "Prenatal vitamins, hydration, scheduled checkups" if week < 28 else "Birth plan and hospital checklist",
        "safe_medicine_note": "Only take medications approved by your obstetric clinician.",
        "nutrition": ["Folate-rich foods", "Adequate protein", "Limit high-mercury fish"],
        "danger_signs": [
            "Severe headache with vision changes",
            "Heavy bleeding",
            "Decreased fetal movement (later pregnancy)",
            "Severe abdominal pain",
        ],
        "hospital_checklist": ["ID", "Insurance", "Hospital bag", "Birth preferences", "Support person contacts"],
        "disclaimer": DISCLAIMER,
    }


@router.post("/pediatric/dose")
async def pediatric_dose(body: PediatricDoseRequest, _: None = Depends(rate_limit)):
    # Educational calculator stub — not prescribing
    med = body.medicine.lower()
    mg_per_kg = 10 if "acetaminophen" in med or "paracetamol" in med else 5 if "ibuprofen" in med else None
    if not mg_per_kg:
        return {
            "message": "No built-in calculator for this medicine. Ask a pediatric clinician/pharmacist.",
            "disclaimer": DISCLAIMER,
        }
    dose = round(mg_per_kg * body.weight_kg, 1)
    return {
        "medicine": body.medicine,
        "estimated_single_dose_mg": dose,
        "note": "Educational estimate only — verify concentration and max daily dose with a clinician.",
        "emergency_signs": ["Lethargy", "Seizure", "Difficulty breathing", "Persistent vomiting"],
        "disclaimer": DISCLAIMER,
    }


@router.post("/risk/predict")
async def risk_predict(
    body: RiskRequest,
    user: UserProfile = Depends(get_current_user_or_demo),
    _: None = Depends(rate_limit),
):
    ai = get_ai()
    profile = ""
    if body.include_profile:
        profile = f"age={user.age}, weight={user.weight_kg}, height={user.height_cm}, conditions={user.conditions}, lifestyle={user.lifestyle}"
    raw = await ai.chat(
        [
            {
                "role": "user",
                "content": (
                    "Estimate informational risk scores 0-1 for diabetes, heart disease, stroke, obesity, "
                    f"hypertension, sleep apnea. Return JSON risks[], insights, disclaimer. Profile: {profile}"
                ),
            }
        ],
        json_mode=True,
    )
    return _parse_json(raw)


@router.post("/specialists/recommend")
async def specialists(body: SearchRequest, _: None = Depends(rate_limit)):
    mapping = [
        ("skin", "Dermatologist"),
        ("rash", "Dermatologist"),
        ("heart", "Cardiologist"),
        ("chest", "Cardiologist"),
        ("headache", "Neurologist"),
        ("seizure", "Neurologist"),
        ("tooth", "Dentist"),
        ("bone", "Orthopedic"),
        ("joint", "Orthopedic"),
        ("ear", "ENT"),
        ("sinus", "ENT"),
        ("eye", "Ophthalmologist"),
        ("pregnancy", "Obstetrician"),
        ("child", "Pediatrician"),
        ("anxiety", "Psychiatrist / Mental health clinician"),
        ("depression", "Psychiatrist / Mental health clinician"),
    ]
    q = body.query.lower()
    hits = [spec for key, spec in mapping if key in q]
    if not hits:
        hits = ["Primary care clinician"]
    return {"specialists": list(dict.fromkeys(hits)), "disclaimer": DISCLAIMER}


@router.post("/nearby")
async def nearby(body: NearbyRequest, _: None = Depends(rate_limit)):
    from app.core.config import get_settings

    settings = get_settings()
    if not settings.google_maps_api_key:
        return {
            "items": [],
            "message": "Configure GOOGLE_MAPS_API_KEY to enable live Places results.",
            "demo": [
                {"name": "City General Hospital", "kind": "hospital", "distance_m": 1200},
                {"name": "CarePlus Clinic", "kind": "clinic", "distance_m": 800},
                {"name": "24h Pharmacy", "kind": "pharmacy", "distance_m": 450},
                {"name": "Emergency Department", "kind": "emergency", "distance_m": 1300},
            ],
        }
    import httpx

    typemap = {
        "hospital": "hospital",
        "clinic": "doctor",
        "pharmacy": "pharmacy",
        "emergency": "hospital",
    }
    place_type = typemap.get(body.kind, "hospital")
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(
            "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
            params={
                "location": f"{body.lat},{body.lng}",
                "radius": body.radius_m,
                "type": place_type,
                "key": settings.google_maps_api_key,
            },
        )
        data = r.json()
    items = [
        {
            "name": p.get("name"),
            "address": p.get("vicinity"),
            "rating": p.get("rating"),
            "location": p.get("geometry", {}).get("location"),
        }
        for p in data.get("results", [])[:15]
    ]
    return {"items": items}


@router.get("/admin/overview")
async def admin_overview(
    _: UserProfile = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    users = (await db.execute(select(UserProfile))).scalars().all()
    audits = (
        await db.execute(select(AuditLog).order_by(desc(AuditLog.created_at)).limit(50))
    ).scalars().all()
    return {
        "user_count": len(users),
        "users": [{"id": u.id, "email": u.email, "health_score": u.health_score} for u in users],
        "audit_logs": [
            {
                "id": a.id,
                "action": a.action,
                "resource": a.resource,
                "user_id": a.user_id,
                "created_at": a.created_at.isoformat(),
            }
            for a in audits
        ],
    }


@router.websocket("/ws/chat")
async def ws_chat(websocket: WebSocket):
    await websocket.accept()
    ai = get_ai()
    try:
        while True:
            data = await websocket.receive_json()
            message = data.get("message", "")
            async for token in ai.stream_chat([{"role": "user", "content": message}]):
                await websocket.send_json({"type": "token", "token": token})
            await websocket.send_json({"type": "done", "disclaimer": DISCLAIMER})
    except WebSocketDisconnect:
        return
