from __future__ import annotations

import json
from typing import Any, AsyncGenerator, Optional

import httpx

from app.core.config import Settings, get_settings

MEDICAL_SYSTEM_PROMPT = """You are AI Doctor in a Box, an informational health assistant.
You are NOT a licensed medical professional and do NOT replace emergency services or clinical care.
Always include a clear disclaimer.
Be careful, evidence-aware, and urge urgent care for red-flag symptoms (chest pain, stroke signs, severe bleeding, anaphylaxis, suicidal crisis).
Respond in clear structured markdown unless JSON is requested.
Never invent lab reference ranges wildly; use common clinical ranges and label uncertainty.
Prefer free/open medical knowledge; cite general references when possible.
"""


class AIGateway:
    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()

    async def chat(
        self,
        messages: list[dict[str, Any]],
        *,
        temperature: float = 0.3,
        json_mode: bool = False,
        model: Optional[str] = None,
    ) -> str:
        if self.settings.mock_ai or (not self.settings.groq_api_key and not self.settings.openrouter_api_key):
            return self._mock_response(messages, json_mode=json_mode)

        full_messages = [{"role": "system", "content": MEDICAL_SYSTEM_PROMPT}, *messages]
        models = [model or self.settings.primary_llm, *self.settings.fallback_model_list]

        last_error: Exception | None = None
        for m in models:
            try:
                if m == self.settings.primary_llm and self.settings.groq_api_key and "/" not in m:
                    return await self._groq_chat(full_messages, m, temperature, json_mode)
                if self.settings.openrouter_api_key:
                    return await self._openrouter_chat(full_messages, m, temperature, json_mode)
                if self.settings.groq_api_key:
                    return await self._groq_chat(full_messages, m.split("/")[-1], temperature, json_mode)
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                continue
        if last_error:
            return self._mock_response(messages, json_mode=json_mode)
        return self._mock_response(messages, json_mode=json_mode)

    async def stream_chat(
        self,
        messages: list[dict[str, Any]],
        *,
        temperature: float = 0.3,
    ) -> AsyncGenerator[str, None]:
        if self.settings.mock_ai or (not self.settings.groq_api_key and not self.settings.openrouter_api_key):
            text = self._mock_response(messages, json_mode=False)
            for i in range(0, len(text), 24):
                yield text[i : i + 24]
            return

        full_messages = [{"role": "system", "content": MEDICAL_SYSTEM_PROMPT}, *messages]
        try:
            if self.settings.groq_api_key:
                async for chunk in self._groq_stream(full_messages, self.settings.primary_llm, temperature):
                    yield chunk
                return
            if self.settings.openrouter_api_key:
                async for chunk in self._openrouter_stream(
                    full_messages, self.settings.fallback_model_list[0], temperature
                ):
                    yield chunk
                return
        except Exception:
            text = self._mock_response(messages, json_mode=False)
            yield text

    async def vision_analyze(self, prompt: str, image_b64: str, mime: str = "image/jpeg") -> str:
        if self.settings.mock_ai or (not self.settings.groq_api_key and not self.settings.openrouter_api_key):
            return json.dumps(self._mock_vision())

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{image_b64}"},
                    },
                ],
            }
        ]
        try:
            if self.settings.groq_api_key:
                return await self._groq_chat(
                    [{"role": "system", "content": MEDICAL_SYSTEM_PROMPT}, *messages],
                    self.settings.vision_model.split("/")[-1]
                    if "/" in self.settings.vision_model
                    else self.settings.vision_model,
                    0.2,
                    True,
                )
            return await self._openrouter_chat(
                [{"role": "system", "content": MEDICAL_SYSTEM_PROMPT}, *messages],
                "qwen/qwen2.5-vl-72b-instruct",
                0.2,
                True,
            )
        except Exception:
            return json.dumps(self._mock_vision())

    async def _groq_chat(
        self, messages: list[dict], model: str, temperature: float, json_mode: bool
    ) -> str:
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        async with httpx.AsyncClient(timeout=90) as client:
            r = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.settings.groq_api_key}"},
                json=payload,
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]

    async def _openrouter_chat(
        self, messages: list[dict], model: str, temperature: float, json_mode: bool
    ) -> str:
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        async with httpx.AsyncClient(timeout=90) as client:
            r = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.settings.openrouter_api_key}",
                    "HTTP-Referer": "https://aidoctor.app",
                    "X-Title": "AI Doctor in a Box",
                },
                json=payload,
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]

    async def _groq_stream(
        self, messages: list[dict], model: str, temperature: float
    ) -> AsyncGenerator[str, None]:
        async with httpx.AsyncClient(timeout=90) as client:
            async with client.stream(
                "POST",
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.settings.groq_api_key}"},
                json={"model": model, "messages": messages, "temperature": temperature, "stream": True},
            ) as r:
                r.raise_for_status()
                async for line in r.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data = line[6:]
                    if data.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk["choices"][0]["delta"].get("content")
                        if delta:
                            yield delta
                    except Exception:
                        continue

    async def _openrouter_stream(
        self, messages: list[dict], model: str, temperature: float
    ) -> AsyncGenerator[str, None]:
        async with httpx.AsyncClient(timeout=90) as client:
            async with client.stream(
                "POST",
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.settings.openrouter_api_key}",
                    "HTTP-Referer": "https://aidoctor.app",
                    "X-Title": "AI Doctor in a Box",
                },
                json={"model": model, "messages": messages, "temperature": temperature, "stream": True},
            ) as r:
                r.raise_for_status()
                async for line in r.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data = line[6:]
                    if data.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk["choices"][0]["delta"].get("content")
                        if delta:
                            yield delta
                    except Exception:
                        continue

    def _mock_response(self, messages: list[dict[str, Any]], *, json_mode: bool) -> str:
        last = ""
        for m in reversed(messages):
            content = m.get("content")
            if isinstance(content, str) and content.strip():
                last = content
                break
            if isinstance(content, list):
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "text":
                        last = part.get("text", "")
                        break
        lower = last.lower()

        if json_mode and ("symptom" in lower or "disease" in lower or "search" in lower or "headache" in lower or "fever" in lower or "pain" in lower):
            return json.dumps(self._mock_search(last))
        if json_mode and ("medication" in lower or "drug" in lower or "interaction" in lower):
            return json.dumps(self._mock_meds())
        if json_mode and ("report" in lower or "lab" in lower or "cbc" in lower):
            return json.dumps(self._mock_report())
        if json_mode and "risk" in lower:
            return json.dumps(self._mock_risk())
        if json_mode:
            return json.dumps({"summary": "Informational assessment complete.", "disclaimer": DISCLAIMER})

        if "eli5" in lower or "explain like" in lower:
            return (
                "## Simple explanation\n\n"
                "Your body is like a busy city. Sometimes traffic (symptoms) gets stuck. "
                "Rest, water, and a check-up with a real doctor help keep roads clear.\n\n"
                f"**Disclaimer:** {DISCLAIMER}"
            )

        return (
            f"## Health guidance\n\n"
            f"I understand you said: *{last[:280]}*\n\n"
            "### What this might mean\n"
            "- Common, often self-limited causes are possible\n"
            "- Watch for worsening or red-flag symptoms\n\n"
            "### Suggested next steps\n"
            "1. Rest, hydrate, and track symptoms\n"
            "2. Use OTC care only if appropriate for you\n"
            "3. Seek urgent care for chest pain, breathing trouble, stroke signs, or severe distress\n\n"
            f"**Disclaimer:** {DISCLAIMER}"
        )

    def _mock_search(self, query: str) -> dict:
        severity = "moderate"
        if any(w in query.lower() for w in ["chest", "stroke", "breath", "unconscious", "severe"]):
            severity = "high"
        return {
            "query": query,
            "possible_diseases": [
                {"name": "Tension-type headache", "confidence": 0.72, "severity": "low"},
                {"name": "Migraine", "confidence": 0.48, "severity": "moderate"},
                {"name": "Viral illness", "confidence": 0.35, "severity": "low"},
            ],
            "overall_severity": severity,
            "red_flags": [
                "Sudden worst headache of life",
                "Weakness, confusion, or vision loss",
                "High fever with stiff neck",
            ],
            "recommended_actions": [
                "Rest in a quiet dark room",
                "Hydrate and consider acetaminophen if safe for you",
                "Monitor for red flags for 24–48 hours",
            ],
            "medicine_suggestions": [
                {"name": "Acetaminophen", "note": "Follow label dosing; avoid if liver disease"},
                {"name": "Ibuprofen", "note": "Take with food; avoid if kidney disease / ulcers"},
            ],
            "home_remedies": ["Cold compress", "Gentle neck stretches", "Consistent sleep"],
            "when_to_go_to_er": [
                "Chest pain with shortness of breath",
                "Sudden neurological deficits",
                "Uncontrolled bleeding or fainting",
            ],
            "specialist": "Primary care; Neurology if recurrent migraines",
            "recovery_timeline": "Many mild cases improve in 24–72 hours",
            "references": [
                "CDC general symptom guidance",
                "WHO primary care symptom approaches",
            ],
            "disclaimer": DISCLAIMER,
        }

    def _mock_vision(self) -> dict:
        return {
            "possible_conditions": [
                {"name": "Contact dermatitis", "confidence": 0.61},
                {"name": "Mild cellulitis risk", "confidence": 0.28},
            ],
            "severity_score": 0.35,
            "confidence": 0.55,
            "urgency": "routine_to_urgent_if_spreading",
            "visual_explanation": "Redness and surface irritation pattern consistent with inflammatory skin response.",
            "bounding_boxes": [{"label": "affected_area", "x": 0.2, "y": 0.25, "w": 0.4, "h": 0.35}],
            "recommendations": [
                "Keep area clean and dry",
                "Avoid known irritants",
                "Seek care if fever, rapid spread, or pus develops",
            ],
            "disclaimer": DISCLAIMER,
        }

    def _mock_meds(self) -> dict:
        return {
            "interactions": [
                {
                    "pair": ["Ibuprofen", "Aspirin"],
                    "severity": "moderate",
                    "detail": "Additive bleeding risk; consult clinician before combining.",
                }
            ],
            "food_interactions": ["Avoid excess alcohol with acetaminophen"],
            "alcohol_interactions": ["NSAIDs + alcohol increase GI bleed risk"],
            "pregnancy_safety": "Many OTC analgesics need clinician review in pregnancy",
            "kidney_safety": "NSAIDs may reduce kidney function in vulnerable patients",
            "liver_safety": "Acetaminophen overdose risks liver injury",
            "dosage_guidance": "Never exceed labeled maximum daily doses",
            "warnings": ["This is informational only — verify with a pharmacist or clinician"],
            "disclaimer": DISCLAIMER,
        }

    def _mock_report(self) -> dict:
        return {
            "abnormal_values": [
                {
                    "name": "Hemoglobin",
                    "value": "11.2 g/dL",
                    "range": "12–16 g/dL (typical adult female reference; varies)",
                    "interpretation": "Mildly low — possible anemia; confirm with clinician",
                    "possible_causes": ["Iron deficiency", "Chronic disease", "Lab variation"],
                }
            ],
            "normal_highlights": ["WBC within common reference range in sample data"],
            "lifestyle_suggestions": ["Iron-rich foods if appropriate", "Follow-up labs as advised"],
            "questions_for_doctor": [
                "Do I need iron studies?",
                "Should I repeat CBC in a few weeks?",
            ],
            "disclaimer": DISCLAIMER,
        }

    def _mock_risk(self) -> dict:
        return {
            "risks": [
                {"condition": "Type 2 diabetes", "score": 0.22, "level": "low-moderate"},
                {"condition": "Hypertension", "score": 0.31, "level": "moderate"},
                {"condition": "Heart disease", "score": 0.18, "level": "low"},
                {"condition": "Stroke", "score": 0.12, "level": "low"},
                {"condition": "Obesity", "score": 0.27, "level": "low-moderate"},
                {"condition": "Sleep apnea", "score": 0.15, "level": "low"},
            ],
            "insights": ["Regular activity, sleep, and blood-pressure checks help reduce risk."],
            "disclaimer": DISCLAIMER,
        }


DISCLAIMER = (
    "AI Doctor in a Box provides general information only and is not a substitute for "
    "professional medical advice, diagnosis, or treatment. Call local emergency services for emergencies."
)


def get_ai() -> AIGateway:
    return AIGateway()
