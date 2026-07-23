CREATE TABLE PatientReport (
    report_id    SERIAL       PRIMARY KEY,
    patient_id   INT          NOT NULL REFERENCES Patient(patient_id) ON DELETE CASCADE,
    file_name    VARCHAR(255) NOT NULL,
    file_type    VARCHAR(10)  NOT NULL CHECK (file_type IN ('pdf','jpg','jpeg')),
    storage_path TEXT         NOT NULL,
    uploaded_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
