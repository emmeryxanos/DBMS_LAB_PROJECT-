CREATE TABLE SideEffectReport (
    report_id   SERIAL       PRIMARY KEY,
    patient_id  INT          NOT NULL REFERENCES Patient(patient_id)   ON DELETE CASCADE,
    medicine_id INT          NOT NULL REFERENCES Medicine(medicine_id) ON DELETE CASCADE,
    effect_name VARCHAR(100) NOT NULL,
    severity    VARCHAR(10)  NOT NULL CHECK (severity IN ('low','medium','high')),
    reported_at TIMESTAMP    DEFAULT NOW(),
    notes       TEXT
);
