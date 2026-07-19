CREATE TABLE PatientAllergy (
    patient_id   INT         NOT NULL REFERENCES Patient(patient_id) ON DELETE CASCADE,
    allergy_id   INT         NOT NULL REFERENCES Allergy(allergy_id) ON DELETE CASCADE,
    noted_date   DATE        DEFAULT CURRENT_DATE,
    status       VARCHAR(10) NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','confirmed','rejected')),
    reported_by  VARCHAR(10) NOT NULL DEFAULT 'patient'
                             CHECK (reported_by IN ('patient','doctor')),
    confirmed_by INT REFERENCES Doctor(doctor_id),
    confirmed_at TIMESTAMP,

    PRIMARY KEY (patient_id, allergy_id)
);
