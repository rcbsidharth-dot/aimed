import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DISCLAIMER =
  "AI Doctor in a Box provides general information only and is not a substitute for professional medical advice, diagnosis, or treatment. Call local emergency services for emergencies.";

const TEXT_MODEL = process.env.OPENROUTER_MODEL || "google/gemma-3-27b-it";
const VISION_MODEL = process.env.OPENROUTER_VISION_MODEL || "qwen/qwen2.5-vl-32b-instruct";

const EMERGENCIES: Record<string, object> = {
  "heart-attack": {
    id: "heart-attack",
    title: "Heart Attack",
    summary: "Possible myocardial infarction — act fast.",
    immediate_steps: [
      "Call emergency services immediately",
      "Have the person sit or lie comfortably",
      "Be ready to start CPR if unresponsive",
    ],
    do_not: ["Do not drive yourself if symptoms are severe", "Do not ignore chest pressure with jaw/arm pain"],
    call_emergency: true,
    visual_guide: ["Recognize symptoms", "Call emergency", "Rest + monitor", "CPR if needed"],
  },
  stroke: {
    id: "stroke",
    title: "Stroke",
    summary: "FAST: Face drooping, Arm weakness, Speech difficulty, Time to call.",
    immediate_steps: ["Call emergency services immediately", "Note the time symptoms started", "Keep the person safe and still"],
    do_not: ["Do not wait to see if symptoms pass"],
    call_emergency: true,
    visual_guide: ["FAST check", "Call now", "Note onset time", "Hospital"],
  },
  "snake-bite": {
    id: "snake-bite",
    title: "Snake Bite",
    summary: "Immobilize and get emergency care.",
    immediate_steps: ["Move away from the snake", "Keep bitten area still", "Call emergency / go to hospital"],
    do_not: ["Do not cut the wound or suck venom", "Do not apply a tight tourniquet"],
    call_emergency: true,
    visual_guide: ["Safety first", "Immobilize", "Call emergency", "Hospital"],
  },
  "dog-bite": {
    id: "dog-bite",
    title: "Dog Bite",
    summary: "Clean wound and assess rabies/tetanus risk.",
    immediate_steps: ["Wash with soap and water", "Control bleeding", "Seek care for deep wounds"],
    do_not: ["Do not ignore infection signs"],
    call_emergency: false,
    visual_guide: ["Wash", "Control bleeding", "Bandage", "Seek care"],
  },
  "bee-sting": {
    id: "bee-sting",
    title: "Bee Sting",
    summary: "Remove stinger; watch for anaphylaxis.",
    immediate_steps: ["Remove stinger by scraping", "Cool compress", "ER if breathing difficulty"],
    do_not: ["Do not squeeze the stinger sac"],
    call_emergency: false,
    visual_guide: ["Remove stinger", "Cool compress", "Watch allergy", "ER if severe"],
  },
  poison: {
    id: "poison",
    title: "Poisoning",
    summary: "Call poison control / emergency.",
    immediate_steps: ["Call poison control or emergency", "Bring container/label if going to hospital"],
    do_not: ["Do not induce vomiting unless instructed"],
    call_emergency: true,
    visual_guide: ["Identify substance", "Call poison control", "Follow advice", "ER"],
  },
  burns: {
    id: "burns",
    title: "Burns",
    summary: "Cool with water; escalate for large burns.",
    immediate_steps: ["Cool under running water 20 minutes", "Cover loosely", "Seek care for large/facial/electrical burns"],
    do_not: ["Do not apply butter/oils", "Do not use ice directly"],
    call_emergency: false,
    visual_guide: ["Cool water", "Cover", "Pain care", "ER if severe"],
  },
  "electric-shock": {
    id: "electric-shock",
    title: "Electric Shock",
    summary: "Ensure power is off before touching the person.",
    immediate_steps: ["Shut off power", "Call emergency", "CPR if needed"],
    do_not: ["Do not touch while still in contact with electricity"],
    call_emergency: true,
    visual_guide: ["Power off", "Call emergency", "CPR if needed", "Hospital"],
  },
};

function hasOpenRouterKey() {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

function parseJsonLoose(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function openRouterChat(
  messages: Array<{ role: string; content: unknown }>,
  opts: { jsonMode?: boolean; model?: string } = {},
) {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) return null;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://aidoctor.app",
      "X-Title": "AI Doctor in a Box",
    },
    body: JSON.stringify({
      model: opts.model || TEXT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are AI Doctor in a Box, an informational health assistant. NOT a licensed clinician. Always include a disclaimer. Urge emergency care for red flags.",
        },
        ...messages,
      ],
      temperature: 0.3,
      ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error: ${res.status} ${text.slice(0, 500)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content as string;
}

function mockSearch(query: string) {
  return {
    query,
    possible_diseases: [
      { name: "Tension-type headache", confidence: 0.72, severity: "low" },
      { name: "Migraine", confidence: 0.48, severity: "moderate" },
    ],
    overall_severity: /chest|stroke|breath|severe/i.test(query) ? "high" : "moderate",
    red_flags: ["Sudden worst headache", "Weakness or vision loss", "High fever with stiff neck"],
    recommended_actions: ["Rest", "Hydrate", "Monitor for red flags"],
    medicine_suggestions: [{ name: "Acetaminophen", note: "Follow label dosing" }],
    home_remedies: ["Cold compress", "Quiet room"],
    when_to_go_to_er: ["Chest pain with shortness of breath", "Sudden neurological deficits"],
    specialist: "Primary care",
    recovery_timeline: "Often improves in 24–72 hours",
    references: ["CDC general guidance"],
    disclaimer: DISCLAIMER,
    ai_mode: "mock",
  };
}

function mockVision(bodyRegion: string) {
  return {
    id: crypto.randomUUID(),
    possible_conditions: [
      { name: "Contact dermatitis", confidence: 0.61 },
      { name: "Mild inflammatory skin response", confidence: 0.28 },
    ],
    severity_score: 0.35,
    confidence: 0.55,
    urgency: "routine_to_urgent_if_spreading",
    visual_explanation: `Informational mock analysis for ${bodyRegion}. Configure OPENROUTER_API_KEY for live vision AI.`,
    bounding_boxes: [{ label: "affected_area", x: 0.2, y: 0.25, w: 0.4, h: 0.35 }],
    recommendations: [
      "Keep area clean and dry",
      "Avoid known irritants",
      "Seek care if fever, rapid spread, or pus develops",
    ],
    disclaimer: DISCLAIMER,
    ai_mode: "mock",
  };
}

async function fileToDataUrl(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const joined = path.join("/");

  if (joined === "health") {
    return NextResponse.json({
      status: "ok",
      service: "ai-doctor-vercel",
      openrouter_configured: hasOpenRouterKey(),
      text_model: TEXT_MODEL,
      vision_model: VISION_MODEL,
      disclaimer: DISCLAIMER,
    });
  }
  if (joined === "emergency") {
    return NextResponse.json({
      items: Object.values(EMERGENCIES).map((e) => {
        const x = e as { id: string; title: string; summary: string; call_emergency: boolean };
        return { id: x.id, title: x.title, summary: x.summary, call_emergency: x.call_emergency };
      }),
    });
  }
  if (joined.startsWith("emergency/")) {
    const id = joined.split("/")[1];
    const item = EMERGENCIES[id];
    if (!item) return NextResponse.json({ detail: "Not found" }, { status: 404 });
    return NextResponse.json({ ...item, disclaimer: DISCLAIMER });
  }
  if (joined === "profile") {
    return NextResponse.json({
      id: "demo",
      email: "demo@aidoctor.local",
      full_name: "Demo User",
      age: 32,
      weight_kg: 70,
      height_cm: 170,
      gender: "unspecified",
      conditions: [],
      allergies: [],
      medicines: [],
      lifestyle: {},
      family_history: [],
      locale: "en",
      theme: "system",
      large_text: false,
      high_contrast: false,
      health_score: 78,
      is_admin: true,
    });
  }
  if (joined === "meta/popular-conditions") {
    return NextResponse.json({
      items: [
        { id: "fever", name: "Fever", query: "I have fever" },
        { id: "cold", name: "Cold", query: "I have a common cold" },
      ],
    });
  }
  if (joined === "timeline") return NextResponse.json({ items: [] });
  if (joined === "vaccinations") return NextResponse.json({ items: [] });
  if (joined === "labs") return NextResponse.json({ items: [] });
  if (joined === "conversations") return NextResponse.json({ items: [] });
  if (joined === "mental/assessments") {
    return NextResponse.json({
      phq9: ["Little interest or pleasure in doing things", "Feeling down, depressed, or hopeless"],
      gad7: ["Feeling nervous, anxious, or on edge", "Not being able to stop or control worrying"],
      scoring: "0=Not at all, 1=Several days, 2=More than half the days, 3=Nearly every day",
      disclaimer: DISCLAIMER,
    });
  }
  if (joined === "admin/overview") {
    return NextResponse.json({
      user_count: 1,
      users: [{ id: "demo", email: "demo@aidoctor.local", health_score: 78 }],
      audit_logs: [],
      openrouter_configured: hasOpenRouterKey(),
    });
  }

  return NextResponse.json({ detail: `GET /${joined} not implemented on Vercel API` }, { status: 404 });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const joined = path.join("/");
  const contentType = req.headers.get("content-type") || "";

  try {
    // Multipart uploads (image scan + reports)
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ detail: "file is required" }, { status: 400 });
      }

      if (joined === "images/analyze") {
        const bodyRegion = req.nextUrl.searchParams.get("body_region") || "skin";
        if (!hasOpenRouterKey()) {
          return NextResponse.json(mockVision(bodyRegion));
        }
        const dataUrl = await fileToDataUrl(file);
        const prompt =
          "Analyze this medical photo. Return JSON with possible_conditions[{name,confidence}], severity_score (0-1), confidence (0-1), urgency, visual_explanation, bounding_boxes[{label,x,y,w,h} normalized 0-1], recommendations, disclaimer. " +
          `Body region hint: ${bodyRegion}.`;
        const raw = await openRouterChat(
          [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          { jsonMode: true, model: VISION_MODEL },
        );
        const parsed = raw ? parseJsonLoose(raw) : null;
        if (!parsed) return NextResponse.json(mockVision(bodyRegion));
        return NextResponse.json({
          id: crypto.randomUUID(),
          ...parsed,
          disclaimer: parsed.disclaimer || DISCLAIMER,
          ai_mode: "openrouter",
        });
      }

      if (joined === "reports/analyze") {
        const reportType = req.nextUrl.searchParams.get("report_type") || "lab";
        let extracted = "";
        const name = (file.name || "").toLowerCase();
        if (name.endsWith(".txt") || (file.type || "").startsWith("text/")) {
          extracted = await file.text();
        } else if ((file.type || "").startsWith("image/") || name.match(/\.(png|jpe?g|webp)$/)) {
          if (!hasOpenRouterKey()) {
            extracted = "OCR placeholder: Hemoglobin 11.2 g/dL, WBC 7.2, Platelets 245";
          } else {
            const dataUrl = await fileToDataUrl(file);
            extracted =
              (await openRouterChat(
                [
                  {
                    role: "user",
                    content: [
                      { type: "text", text: "Extract all readable lab/report text from this image. Return plain text only." },
                      { type: "image_url", image_url: { url: dataUrl } },
                    ],
                  },
                ],
                { model: VISION_MODEL },
              )) || "Unable to extract text from image.";
          }
        } else {
          extracted = `Uploaded file ${file.name} (${file.type || "unknown"}). PDF text extraction is limited on Vercel; paste values if needed.`;
        }

        const raw = await openRouterChat(
          [
            {
              role: "user",
              content:
                "Explain this medical report. Return JSON with abnormal_values, normal_highlights, lifestyle_suggestions, questions_for_doctor, disclaimer.\n" +
                `Type=${reportType}\nTEXT:\n${extracted.slice(0, 12000)}`,
            },
          ],
          { jsonMode: true },
        );
        const analysis = raw
          ? parseJsonLoose(raw) || { raw, disclaimer: DISCLAIMER }
          : {
              abnormal_values: [
                {
                  name: "Hemoglobin",
                  value: "11.2 g/dL",
                  interpretation: "Possibly low — confirm with clinician",
                },
              ],
              questions_for_doctor: ["Do I need iron studies?"],
              disclaimer: DISCLAIMER,
              ai_mode: "mock",
            };

        return NextResponse.json({
          id: crypto.randomUUID(),
          extracted_text: extracted.slice(0, 2000),
          analysis: { ...analysis, disclaimer: analysis.disclaimer || DISCLAIMER, ai_mode: hasOpenRouterKey() ? "openrouter" : "mock" },
        });
      }

      return NextResponse.json({ detail: `POST /${joined} multipart not implemented` }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    if (joined === "search") {
      const query = String(body.query || "");
      const prompt = `Analyze this symptom query and return JSON with possible_diseases (name,confidence,severity), overall_severity, red_flags, recommended_actions, medicine_suggestions, home_remedies, when_to_go_to_er, specialist, recovery_timeline, references, disclaimer. Query: ${query}`;
      const raw = await openRouterChat([{ role: "user", content: prompt }], { jsonMode: true });
      if (!raw) return NextResponse.json(mockSearch(query));
      const parsed = parseJsonLoose(raw);
      if (!parsed) return NextResponse.json(mockSearch(query));
      return NextResponse.json({ ...parsed, query, disclaimer: parsed.disclaimer || DISCLAIMER, ai_mode: "openrouter" });
    }

    if (joined === "chat") {
      const message = String(body.message || "");
      const raw = await openRouterChat([{ role: "user", content: message }]);
      return NextResponse.json({
        conversation_id: body.conversation_id || crypto.randomUUID(),
        reply:
          raw ||
          `## Guidance\n\nI understand: *${message}*\n\nRest, hydrate, and seek care for red flags.\n\n**Disclaimer:** ${DISCLAIMER}`,
        disclaimer: DISCLAIMER,
        ai_mode: raw ? "openrouter" : "mock",
      });
    }

    if (joined === "nutrition/bmi") {
      const bmi = Number(body.weight_kg) / (Number(body.height_cm) / 100) ** 2;
      const category = bmi < 18.5 ? "underweight" : bmi < 25 ? "normal" : bmi < 30 ? "overweight" : "obesity";
      return NextResponse.json({ bmi: Math.round(bmi * 10) / 10, category, disclaimer: DISCLAIMER });
    }

    if (joined === "medications/check") {
      const raw = await openRouterChat(
        [
          {
            role: "user",
            content: `Check drug interactions. Return JSON with interactions, warnings, disclaimer. Medicines=${JSON.stringify(body.medicines)}`,
          },
        ],
        { jsonMode: true },
      );
      if (raw) {
        const parsed = parseJsonLoose(raw);
        if (parsed) return NextResponse.json({ ...parsed, ai_mode: "openrouter" });
      }
      return NextResponse.json({
        interactions: [],
        warnings: ["Verify with a pharmacist or clinician"],
        disclaimer: DISCLAIMER,
        ai_mode: "mock",
      });
    }

    if (joined === "risk/predict") {
      return NextResponse.json({
        risks: [
          { condition: "Type 2 diabetes", score: 0.22, level: "low-moderate" },
          { condition: "Hypertension", score: 0.31, level: "moderate" },
        ],
        insights: ["Regular activity and blood-pressure checks help reduce risk."],
        disclaimer: DISCLAIMER,
      });
    }

    if (joined === "nearby") {
      return NextResponse.json({
        items: [],
        message: "Live Maps requires GOOGLE_MAPS_API_KEY",
        demo: [
          { name: "City General Hospital", kind: "hospital", distance_m: 1200 },
          { name: "24h Pharmacy", kind: "pharmacy", distance_m: 450 },
        ],
      });
    }

    if (joined === "symptoms/start") {
      return NextResponse.json({
        conversation_id: crypto.randomUUID(),
        question: "How long have you had these symptoms?",
        step: 0,
        total: 7,
      });
    }

    if (joined === "symptoms/answer") {
      return NextResponse.json({
        done: true,
        prediction: mockSearch(String(body.answer || "symptoms")),
      });
    }

    if (joined === "pregnancy/week") {
      return NextResponse.json({
        week: body.week,
        focus: "Prenatal vitamins, hydration, scheduled checkups",
        danger_signs: ["Severe headache with vision changes", "Heavy bleeding"],
        disclaimer: DISCLAIMER,
      });
    }

    if (joined === "pediatric/dose") {
      return NextResponse.json({
        medicine: body.medicine,
        estimated_single_dose_mg: Math.round(10 * Number(body.weight_kg || 0) * 10) / 10,
        note: "Educational estimate only",
        disclaimer: DISCLAIMER,
      });
    }

    return NextResponse.json({ detail: `POST /${joined} not implemented on Vercel API` }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ detail: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  if (path.join("/") === "profile") {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({
      id: "demo",
      email: "demo@aidoctor.local",
      full_name: body.full_name || "Demo User",
      age: body.age ?? 32,
      weight_kg: body.weight_kg ?? 70,
      height_cm: body.height_cm ?? 170,
      gender: body.gender || "unspecified",
      conditions: body.conditions || [],
      allergies: body.allergies || [],
      medicines: body.medicines || [],
      lifestyle: body.lifestyle || {},
      family_history: body.family_history || [],
      locale: body.locale || "en",
      theme: body.theme || "system",
      large_text: !!body.large_text,
      high_contrast: !!body.high_contrast,
      health_score: 78,
      is_admin: true,
    });
  }
  return NextResponse.json({ detail: "Not found" }, { status: 404 });
}
