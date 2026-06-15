CREATE TABLE Prescription (
    prescription_id SERIAL      PRIMARY KEY,
    appointment_id  INT         NOT NULL REFERENCES Appointment(appointment_id) ON DELETE CASCADE,
    start_date      DATE        NOT NULL,
    end_date        DATE        NOT NULL,
    notes           TEXT,
    status          VARCHAR(10) NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','completed','cancelled')),
    created_at      TIMESTAMP   DEFAULT NOW(),
 
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);
