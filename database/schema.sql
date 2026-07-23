-- ============================================================
--  MedTrack | schema.sql
--  Consolidated DDL for the MedTrack medication-adherence database.
--  Run this first, then seed.sql, then views.sql.
--  Tables are ordered so that every FOREIGN KEY target already exists.
-- ============================================================

-- ===================== ENTITIES =====================

CREATE TABLE Doctor (
    doctor_id      SERIAL       PRIMARY KEY,
    full_name      VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    license_no     VARCHAR(50)  NOT NULL UNIQUE,
    phone          VARCHAR(15),
    chamber        TEXT,
    created_at     TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE Patient (
    patient_id  SERIAL       PRIMARY KEY,
    full_name   VARCHAR(100) NOT NULL,
    dob         DATE         NOT NULL,
    gender      CHAR(1)      NOT NULL CHECK (gender IN ('M','F','O')),
    blood_group VARCHAR(5)   CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    phone       VARCHAR(15)  NOT NULL,
    address     TEXT,
    created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE Medicine (
    medicine_id  SERIAL       PRIMARY KEY,
    generic_name VARCHAR(100) NOT NULL,
    brand_name   VARCHAR(100),
    dosage_type  VARCHAR(20)  NOT NULL CHECK (dosage_type IN ('tablet','capsule','syrup','injection','drop')),
    manufacturer VARCHAR(100),
    description  TEXT
);

CREATE TABLE Disease (
    disease_id   SERIAL       PRIMARY KEY,
    disease_name VARCHAR(100) NOT NULL UNIQUE,
    severity     VARCHAR(10)  NOT NULL CHECK (severity IN ('mild','moderate','severe')),
    description  TEXT
);

CREATE TABLE Allergy (
    allergy_id   SERIAL       PRIMARY KEY,
    allergy_name VARCHAR(100) NOT NULL UNIQUE,
    description  TEXT
);

CREATE TABLE Appointment (
    appointment_id   SERIAL      PRIMARY KEY,
    patient_id       INT         NOT NULL REFERENCES Patient(patient_id) ON DELETE CASCADE,
    doctor_id        INT         NOT NULL REFERENCES Doctor(doctor_id)   ON DELETE CASCADE,
    appointment_date TIMESTAMP   NOT NULL,
    symptoms         TEXT,
    status           VARCHAR(10) NOT NULL DEFAULT 'requested'
                                 CHECK (status IN ('requested','scheduled','completed','cancelled')),
    created_at       TIMESTAMP   DEFAULT NOW()
);

CREATE INDEX idx_appointment_doctor_patient ON Appointment(doctor_id, patient_id);

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

-- ===================== RELATIONSHIPS =====================

CREATE TABLE PrescriptionMedicine (
    prescription_id INT         NOT NULL REFERENCES Prescription(prescription_id) ON DELETE CASCADE,
    medicine_id     INT         NOT NULL REFERENCES Medicine(medicine_id)         ON DELETE CASCADE,
    dosage          VARCHAR(50) NOT NULL,
    duration_days   INT         NOT NULL CHECK (duration_days > 0),
    instructions    TEXT,

    PRIMARY KEY (prescription_id, medicine_id)
);

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

CREATE TABLE DoctorPatientAccess (
    access_id          SERIAL      PRIMARY KEY,
    doctor_id          INT         NOT NULL REFERENCES Doctor(doctor_id)   ON DELETE CASCADE,
    patient_id         INT         NOT NULL REFERENCES Patient(patient_id) ON DELETE CASCADE,
    granted_by_patient BOOLEAN     NOT NULL DEFAULT TRUE,
    status             VARCHAR(10) NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending','granted','denied','revoked')),
    requested_at       TIMESTAMP   DEFAULT NOW(),
    granted_at         TIMESTAMP,
    revoked_at         TIMESTAMP,

    UNIQUE (doctor_id, patient_id)
);

CREATE INDEX idx_dpa_patient_status ON DoctorPatientAccess(patient_id, status);

CREATE TABLE PatientDiseaseHistory (
    patient_id     INT         NOT NULL REFERENCES Patient(patient_id) ON DELETE CASCADE,
    disease_id     INT         NOT NULL REFERENCES Disease(disease_id) ON DELETE CASCADE,
    diagnosed_date DATE        NOT NULL,
    status         VARCHAR(10) NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','recovered','chronic')),
    notes          TEXT,

    PRIMARY KEY (patient_id, disease_id)
);

CREATE TABLE MedicineAllergyConflict (
    medicine_id INT         NOT NULL REFERENCES Medicine(medicine_id) ON DELETE CASCADE,
    allergy_id  INT         NOT NULL REFERENCES Allergy(allergy_id)  ON DELETE CASCADE,
    reaction    TEXT        NOT NULL,
    severity    VARCHAR(10) NOT NULL CHECK (severity IN ('mild','moderate','severe')),

    PRIMARY KEY (medicine_id, allergy_id)
);

CREATE TABLE DrugInteraction (
    interaction_id  SERIAL      PRIMARY KEY,
    medicine1_id    INT         NOT NULL REFERENCES Medicine(medicine_id) ON DELETE CASCADE,
    medicine2_id    INT         NOT NULL REFERENCES Medicine(medicine_id) ON DELETE CASCADE,
    severity        VARCHAR(10) NOT NULL CHECK (severity IN ('mild','moderate','severe')),
    warning_message TEXT        NOT NULL,

    CONSTRAINT no_self_interaction CHECK (medicine1_id <> medicine2_id),
    CONSTRAINT unique_drug_pair    UNIQUE (medicine1_id, medicine2_id)
);

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

-- ===================== TRACKING =====================

CREATE TABLE MedicationSchedule (
    schedule_id     SERIAL      PRIMARY KEY,
    prescription_id INT         NOT NULL REFERENCES Prescription(prescription_id) ON DELETE CASCADE,
    medicine_id     INT         NOT NULL REFERENCES Medicine(medicine_id)         ON DELETE CASCADE,
    dose_time       TIME        NOT NULL,
    frequency       VARCHAR(20) NOT NULL
                                CHECK (frequency IN ('once_daily','twice_daily','thrice_daily','weekly')),
    notes           TEXT
);

CREATE TABLE DoseLog (
    log_id       SERIAL      PRIMARY KEY,
    schedule_id  INT         NOT NULL REFERENCES MedicationSchedule(schedule_id) ON DELETE CASCADE,
    patient_id   INT         NOT NULL REFERENCES Patient(patient_id)             ON DELETE CASCADE,
    scheduled_at TIMESTAMP   NOT NULL,
    taken_at     TIMESTAMP,
    status       VARCHAR(10) NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('taken','missed','late','pending')),
    note         TEXT
);

CREATE INDEX idx_doselog_patient   ON DoseLog(patient_id);
CREATE INDEX idx_doselog_status    ON DoseLog(status);
CREATE INDEX idx_doselog_scheduled ON DoseLog(scheduled_at);

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

CREATE TABLE RecoveryLog (
    recovery_id    SERIAL    PRIMARY KEY,
    patient_id     INT       NOT NULL REFERENCES Patient(patient_id) ON DELETE CASCADE,
    log_date       DATE      NOT NULL DEFAULT CURRENT_DATE,
    symptom_score  INT       NOT NULL CHECK (symptom_score  BETWEEN 1 AND 10),
    recovery_score INT       NOT NULL CHECK (recovery_score BETWEEN 1 AND 10),
    notes          TEXT,

    UNIQUE (patient_id, log_date)
);

CREATE INDEX idx_recovery_patient ON RecoveryLog(patient_id);

CREATE TABLE SideEffectReport (
    report_id   SERIAL       PRIMARY KEY,
    patient_id  INT          NOT NULL REFERENCES Patient(patient_id)   ON DELETE CASCADE,
    medicine_id INT          NOT NULL REFERENCES Medicine(medicine_id) ON DELETE CASCADE,
    effect_name VARCHAR(100) NOT NULL,
    severity    VARCHAR(10)  NOT NULL CHECK (severity IN ('low','medium','high')),
    reported_at TIMESTAMP    DEFAULT NOW(),
    notes       TEXT
);

CREATE TABLE PatientReport (
    report_id    SERIAL       PRIMARY KEY,
    patient_id   INT          NOT NULL REFERENCES Patient(patient_id) ON DELETE CASCADE,
    file_name    VARCHAR(255) NOT NULL,
    file_type    VARCHAR(10)  NOT NULL CHECK (file_type IN ('pdf','jpg','jpeg')),
    storage_path TEXT         NOT NULL,
    uploaded_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===================== OPERATIONAL =====================

CREATE TABLE PharmacyInventory (
    inventory_id SERIAL    PRIMARY KEY,
    medicine_id  INT       NOT NULL REFERENCES Medicine(medicine_id) ON DELETE CASCADE,
    stock        INT       NOT NULL DEFAULT 0 CHECK (stock >= 0),
    expiry_date  DATE      NOT NULL,
    last_updated TIMESTAMP DEFAULT NOW()
);

CREATE TABLE AuditLog (
    audit_id   SERIAL      PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    operation  VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
    record_id  INT         NOT NULL,
    old_value  TEXT,
    new_value  TEXT,
    changed_at TIMESTAMP   DEFAULT NOW()
);
