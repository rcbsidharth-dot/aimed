from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = Field(default=None, ge=0, le=120)
    weight_kg: Optional[float] = Field(default=None, gt=0, le=500)
    height_cm: Optional[float] = Field(default=None, gt=0, le=300)
    gender: Optional[str] = None
    conditions: Optional[list[str]] = None
    allergies: Optional[list[str]] = None
    medicines: Optional[list[str]] = None
    lifestyle: Optional[dict[str, Any]] = None
    family_history: Optional[list[str]] = None
    locale: Optional[str] = None
    theme: Optional[str] = None
    large_text: Optional[bool] = None
    high_contrast: Optional[bool] = None


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: Optional[str]
    age: Optional[int]
    weight_kg: Optional[float]
    height_cm: Optional[float]
    gender: Optional[str]
    conditions: Optional[list]
    allergies: Optional[list]
    medicines: Optional[list]
    lifestyle: Optional[dict]
    family_history: Optional[list]
    locale: str
    theme: str
    large_text: bool
    high_contrast: bool
    health_score: Optional[float]
    is_admin: bool


class SearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=2000)
    eli5: bool = False
    locale: str = "en"


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    conversation_id: Optional[str] = None
    eli5: bool = False
    locale: str = "en"


class SymptomStartRequest(BaseModel):
    chief_complaint: str = Field(min_length=2, max_length=2000)
    body_region: Optional[str] = None
    locale: str = "en"


class SymptomAnswerRequest(BaseModel):
    conversation_id: str
    answer: str = Field(min_length=1, max_length=4000)


class MedicationCheckRequest(BaseModel):
    medicines: list[str] = Field(min_length=1, max_length=20)
    pregnant: bool = False
    kidney_disease: bool = False
    liver_disease: bool = False


class LabValueCreate(BaseModel):
    name: str
    value: float
    unit: str
    reference_low: Optional[float] = None
    reference_high: Optional[float] = None
    measured_at: Optional[datetime] = None
    notes: Optional[str] = None


class VaccinationCreate(BaseModel):
    name: str
    category: str = "adult"
    administered_on: Optional[datetime] = None
    due_on: Optional[datetime] = None
    notes: Optional[str] = None


class MoodCreate(BaseModel):
    mood: int = Field(ge=1, le=10)
    note: Optional[str] = None
    phq9_score: Optional[int] = Field(default=None, ge=0, le=27)
    gad7_score: Optional[int] = Field(default=None, ge=0, le=21)


class WaterCreate(BaseModel):
    ml: int = Field(gt=0, le=5000)


class SleepCreate(BaseModel):
    hours: float = Field(gt=0, le=24)
    quality: Optional[int] = Field(default=None, ge=1, le=10)


class NearbyRequest(BaseModel):
    lat: float
    lng: float
    kind: str = "hospital"  # hospital | clinic | pharmacy | emergency
    radius_m: int = 5000


class RiskRequest(BaseModel):
    include_profile: bool = True


class PediatricDoseRequest(BaseModel):
    medicine: str
    weight_kg: float = Field(gt=0, le=200)
    age_years: Optional[float] = None


class PregnancyWeekRequest(BaseModel):
    week: int = Field(ge=1, le=42)


class BMIRequest(BaseModel):
    weight_kg: float
    height_cm: float
