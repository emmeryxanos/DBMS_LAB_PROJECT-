from pydantic import BaseModel
from typing import Optional, Literal


class RecoveryLogIn(BaseModel):
    patient_id: int
    log_date: str
    symptom_score: int
    recovery_score: int
    notes: Optional[str] = None


class SideEffectIn(BaseModel):
    patient_id: int
    medicine_id: int
    effect_name: str
    severity: str
    notes: Optional[str] = None


class PatientIn(BaseModel):
    full_name: str
    dob: str
    gender: str
    blood_group: Optional[str] = None
    phone: str
    address: Optional[str] = None


class PatientAllergyIn(BaseModel):
    patient_id: int
    allergy_id: Optional[int] = None
    new_allergy_name: Optional[str] = None
    description: Optional[str] = None


class PatientSignupIn(BaseModel):
    full_name: str
    phone: str
    dob: str
    gender: str
    blood_group: Optional[str] = None
    address: Optional[str] = None


class DoctorSignupIn(BaseModel):
    full_name: str
    phone: Optional[str] = None
    specialization: str
    license_no: str
    chamber: Optional[str] = None


class AppointmentIn(BaseModel):
    patient_id: int
    appointment_date: str
    symptoms: Optional[str] = None


class AppointmentRequestIn(BaseModel):
    doctor_id: int
    appointment_date: str
    symptoms: Optional[str] = None


class AccessRequestIn(BaseModel):
    patient_id: int


class PrescriptionMedicineIn(BaseModel):
    medicine_id: int
    dosage: str
    duration_days: int
    instructions: Optional[str] = None
    dose_time: str  # "HH:MM"
    frequency: Literal["once_daily", "twice_daily", "thrice_daily", "weekly"]


class PrescriptionIn(BaseModel):
    appointment_id: int
    start_date: str
    end_date: str
    notes: Optional[str] = None
    medicines: list[PrescriptionMedicineIn]
