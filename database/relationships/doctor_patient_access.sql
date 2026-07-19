CREATE TABLE DoctorPatientAccess (
    access_id           SERIAL      PRIMARY KEY,
    doctor_id           INT         NOT NULL REFERENCES Doctor(doctor_id)   ON DELETE CASCADE,
    patient_id          INT         NOT NULL REFERENCES Patient(patient_id) ON DELETE CASCADE,
    granted_by_patient  BOOLEAN     NOT NULL DEFAULT TRUE,
    status              VARCHAR(10) NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending','granted','denied','revoked')),
    requested_at        TIMESTAMP   DEFAULT NOW(),
    granted_at          TIMESTAMP,
    revoked_at          TIMESTAMP,

    UNIQUE (doctor_id, patient_id)
);

CREATE INDEX idx_dpa_patient_status ON DoctorPatientAccess(patient_id, status);
