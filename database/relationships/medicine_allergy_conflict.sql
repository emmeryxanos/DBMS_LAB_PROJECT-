CREATE TABLE MedicineAllergyConflict (
    medicine_id INT         NOT NULL REFERENCES Medicine(medicine_id) ON DELETE CASCADE,
    allergy_id  INT         NOT NULL REFERENCES Allergy(allergy_id)  ON DELETE CASCADE,
    reaction    TEXT        NOT NULL,
    severity    VARCHAR(10) NOT NULL CHECK (severity IN ('mild','moderate','severe')),
 
    PRIMARY KEY (medicine_id, allergy_id)
);
