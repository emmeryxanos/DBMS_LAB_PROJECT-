-- ============================================================
--  MedTrack | migration 001
--  Run this against an EXISTING database before re-running
--  seed.sql. Adds the appointment-request lifecycle, the
--  DoctorPatientAccess consent table, and the allergy
--  pending/confirm workflow.
-- ============================================================

-- 1. Appointment: allow the 'requested' status
ALTER TABLE Appointment DROP CONSTRAINT IF EXISTS appointment_status_check;
ALTER TABLE Appointment ADD CONSTRAINT appointment_status_check
    CHECK (status IN ('requested','scheduled','completed','cancelled'));
ALTER TABLE Appointment ALTER COLUMN status SET DEFAULT 'requested';

CREATE INDEX IF NOT EXISTS idx_appointment_doctor_patient ON Appointment(doctor_id, patient_id);

-- 2. DoctorPatientAccess: the consent gate (new table)
CREATE TABLE IF NOT EXISTS DoctorPatientAccess (
    access_id          SERIAL      PRIMARY KEY,
    doctor_id          INT         NOT NULL REFERENCES Doctor(doctor_id)   ON DELETE CASCADE,
    patient_id         INT         NOT NULL REFERENCES Patient(patient_id) ON DELETE CASCADE,
    granted_by_patient BOOLEAN     NOT NULL DEFAULT TRUE,
    status             VARCHAR(10) NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending','granted','denied','revoked')),
    requested_at       TIMESTAMP   DEFAULT NOW(),
    granted_at         TIMESTAMP,
    revoked_at         TIMESTAMP,

    UNIQUE (doctor_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_dpa_patient_status ON DoctorPatientAccess(patient_id, status);

-- 3. PatientAllergy: pending/confirmed workflow columns
ALTER TABLE PatientAllergy ADD COLUMN IF NOT EXISTS status       VARCHAR(10) NOT NULL DEFAULT 'pending';
ALTER TABLE PatientAllergy ADD COLUMN IF NOT EXISTS reported_by  VARCHAR(10) NOT NULL DEFAULT 'patient';
ALTER TABLE PatientAllergy ADD COLUMN IF NOT EXISTS confirmed_by INT REFERENCES Doctor(doctor_id);
ALTER TABLE PatientAllergy ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;

ALTER TABLE PatientAllergy DROP CONSTRAINT IF EXISTS patientallergy_status_check;
ALTER TABLE PatientAllergy ADD CONSTRAINT patientallergy_status_check
    CHECK (status IN ('pending','confirmed','rejected'));

ALTER TABLE PatientAllergy DROP CONSTRAINT IF EXISTS patientallergy_reported_by_check;
ALTER TABLE PatientAllergy ADD CONSTRAINT patientallergy_reported_by_check
    CHECK (reported_by IN ('patient','doctor'));
