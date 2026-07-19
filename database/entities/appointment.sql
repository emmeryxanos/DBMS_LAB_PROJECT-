

CREATE TABLE Appointment (
    appointment_id   SERIAL      PRIMARY KEY,
    patient_id       INT         NOT NULL REFERENCES Patient(patient_id) ON DELETE CASCADE,
    doctor_id        INT         NOT NULL REFERENCES Doctor(doctor_id)   ON DELETE CASCADE,
    appointment_date TIMESTAMP   NOT NULL,
    symptoms         TEXT,
    status           VARCHAR(10) NOT NULL DEFAULT 'requested'
                                 CHECK (status IN ('requested','scheduled','completed','cancelled')),
    created_at       TIMESTAMP   DEFAULT NOW()
);

CREATE INDEX idx_appointment_doctor_patient ON Appointment(doctor_id, patient_id);