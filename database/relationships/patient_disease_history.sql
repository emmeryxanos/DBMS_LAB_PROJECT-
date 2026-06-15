CREATE TABLE PatientDiseaseHistory (
    patient_id     INT         NOT NULL REFERENCES Patient(patient_id) ON DELETE CASCADE,
    disease_id     INT         NOT NULL REFERENCES Disease(disease_id) ON DELETE CASCADE,
    diagnosed_date DATE        NOT NULL,
    status         VARCHAR(10) NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','recovered','chronic')),
    notes          TEXT,
 
    PRIMARY KEY (patient_id, disease_id)
);
