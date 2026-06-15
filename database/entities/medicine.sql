CREATE TABLE Medicine (
    medicine_id  SERIAL       PRIMARY KEY,
    generic_name VARCHAR(100) NOT NULL,
    brand_name   VARCHAR(100),
    dosage_type  VARCHAR(20)  NOT NULL CHECK (dosage_type IN ('tablet','capsule','syrup','injection','drop')),
    manufacturer VARCHAR(100),
    description  TEXT
);
