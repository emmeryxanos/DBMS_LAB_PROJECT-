CREATE TABLE DoseLog (
    log_id       SERIAL      PRIMARY KEY,
    schedule_id  INT         NOT NULL REFERENCES MedicationSchedule(schedule_id) ON DELETE CASCADE,
    patient_id   INT         NOT NULL REFERENCES Patient(patient_id)             ON DELETE CASCADE,
    scheduled_at TIMESTAMP   NOT NULL,
    taken_at     TIMESTAMP,
    status       VARCHAR(10) NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('taken','missed','late','pending')),
    note         TEXT
);
 
CREATE INDEX idx_doselog_patient   ON DoseLog(patient_id);
CREATE INDEX idx_doselog_status    ON DoseLog(status);
CREATE INDEX idx_doselog_scheduled ON DoseLog(scheduled_at);
