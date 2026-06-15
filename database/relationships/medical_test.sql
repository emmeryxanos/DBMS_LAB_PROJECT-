CREATE TABLE MedicalTest (
    test_id     SERIAL       PRIMARY KEY,
    patient_id  INT          NOT NULL REFERENCES Patient(patient_id) ON DELETE CASCADE,
    doctor_id   INT          NOT NULL REFERENCES Doctor(doctor_id)   ON DELETE CASCADE,
    test_name   VARCHAR(100) NOT NULL,
    result      TEXT,
    test_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
    status      VARCHAR(10)  NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','completed','cancelled'))
);
 
