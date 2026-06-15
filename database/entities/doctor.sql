CREATE TABLE Doctor (
    doctor_id      SERIAL       PRIMARY KEY,
    full_name      VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    license_no     VARCHAR(50)  NOT NULL UNIQUE,
    phone          VARCHAR(15)  UNIQUE,
    chamber        TEXT,
    created_at     TIMESTAMP    DEFAULT NOW()
);
 
