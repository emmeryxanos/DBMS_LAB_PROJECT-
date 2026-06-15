CREATE TABLE PatientAllergy (
    patient_id INT  NOT NULL REFERENCES Patient(patient_id) ON DELETE CASCADE,
    allergy_id INT  NOT NULL REFERENCES Allergy(allergy_id) ON DELETE CASCADE,
    noted_date DATE DEFAULT CURRENT_DATE,
 
    PRIMARY KEY (patient_id, allergy_id)
);
