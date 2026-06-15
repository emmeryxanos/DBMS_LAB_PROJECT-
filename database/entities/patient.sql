CREATE TABLE Patient (
    patient_id  SERIAL       PRIMARY KEY,
    full_name   VARCHAR(100) NOT NULL,
    dob         DATE         NOT NULL,
    gender      CHAR(1)      NOT NULL CHECK (gender IN ('M','F','O')),
    blood_group VARCHAR(5)   CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    phone       VARCHAR(15)  NOT NULL UNIQUE,
    address     TEXT,
    created_at  TIMESTAMP    DEFAULT NOW()
);
