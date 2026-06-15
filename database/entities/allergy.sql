
CREATE TABLE Allergy (
    allergy_id   SERIAL       PRIMARY KEY,
    allergy_name VARCHAR(100) NOT NULL UNIQUE,
    description  TEXT
);