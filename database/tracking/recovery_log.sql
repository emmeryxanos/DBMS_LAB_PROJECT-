CREATE TABLE RecoveryLog (
    recovery_id    SERIAL    PRIMARY KEY,
    patient_id     INT       NOT NULL REFERENCES Patient(patient_id) ON DELETE CASCADE,
    log_date       DATE      NOT NULL DEFAULT CURRENT_DATE,
    symptom_score  INT       NOT NULL CHECK (symptom_score  BETWEEN 1 AND 10),
    recovery_score INT       NOT NULL CHECK (recovery_score BETWEEN 1 AND 10),
    notes          TEXT,
 
    UNIQUE (patient_id, log_date)
);
 
CREATE INDEX idx_recovery_patient ON RecoveryLog(patient_id);
