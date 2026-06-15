CREATE TABLE PrescriptionMedicine (
    prescription_id INT         NOT NULL REFERENCES Prescription(prescription_id) ON DELETE CASCADE,
    medicine_id     INT         NOT NULL REFERENCES Medicine(medicine_id)         ON DELETE CASCADE,
    dosage          VARCHAR(50) NOT NULL,
    duration_days   INT         NOT NULL CHECK (duration_days > 0),
    instructions    TEXT,
 
    PRIMARY KEY (prescription_id, medicine_id)
);
 
