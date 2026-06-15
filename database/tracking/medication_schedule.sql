CREATE TABLE MedicationSchedule (
    schedule_id     SERIAL      PRIMARY KEY,
    prescription_id INT         NOT NULL REFERENCES Prescription(prescription_id) ON DELETE CASCADE,
    medicine_id     INT         NOT NULL REFERENCES Medicine(medicine_id)         ON DELETE CASCADE,
    dose_time       TIME        NOT NULL,
    frequency       VARCHAR(20) NOT NULL
                                CHECK (frequency IN ('once_daily','twice_daily','thrice_daily','weekly')),
    notes           TEXT
);
