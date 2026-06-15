CREATE TABLE AdherenceAlert (
    alert_id     SERIAL      PRIMARY KEY,
    patient_id   INT         NOT NULL REFERENCES Patient(patient_id) ON DELETE CASCADE,
    alert_type   VARCHAR(30) NOT NULL
                             CHECK (alert_type IN (
                                 'missed_streak',
                                 'low_adherence',
                                 'side_effect',
                                 'drug_interaction',
                                 'allergy_conflict'
                             )),
    message      TEXT        NOT NULL,
    severity     VARCHAR(10) NOT NULL CHECK (severity IN ('low','medium','high','critical')),
    triggered_at TIMESTAMP   DEFAULT NOW(),
    resolved     BOOLEAN     DEFAULT FALSE
);
 
CREATE INDEX idx_alert_patient  ON AdherenceAlert(patient_id);
CREATE INDEX idx_alert_resolved ON AdherenceAlert(resolved);
